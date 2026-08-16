import { NextRequest, NextResponse } from "next/server";

// Global in-memory cookie jar to maintain authenticated sessions across all aa.com subdomains & proxy hops
const globalCookieJar = new Map<string, string>();

// Live flight recorder of last 30 proxy network events for real-time debugging
export interface ProxyLogEvent {
  timestamp: string;
  method: string;
  url: string;
  status: number;
  durationMs: number;
  redirectUrl?: string;
  error?: string;
  cookiesSaved: number;
}
export const proxyDiagnosticLogs: ProxyLogEvent[] = [];

function recordDiagnostic(event: ProxyLogEvent) {
  proxyDiagnosticLogs.unshift(event);
  if (proxyDiagnosticLogs.length > 30) {
    proxyDiagnosticLogs.pop();
  }
}

const DESKTOP_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function saveCookiesFromResponse(response: Response, host: string): number {
  let count = 0;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const setCookies: string[] = (response.headers as any).getSetCookie
      ? (response.headers as any).getSetCookie()
      : response.headers.get("set-cookie")
      ? [response.headers.get("set-cookie")!]
      : [];

    for (const raw of setCookies) {
      if (!raw) continue;
      const firstPart = raw.split(";")[0].trim();
      const eqIdx = firstPart.indexOf("=");
      if (eqIdx > 0) {
        const k = firstPart.substring(0, eqIdx).trim();
        const v = firstPart.substring(eqIdx + 1).trim();
        globalCookieJar.set(k, v);
        count++;
      }
    }
  } catch (e) {
    console.error("Error saving cookies:", e);
  }
  return count;
}

function buildCookieHeader(clientCookie: string): string {
  const map = new Map<string, string>();

  // Add global saved cookies
  for (const [k, v] of globalCookieJar.entries()) {
    map.set(k, v);
  }

  // Override with incoming client cookies
  if (clientCookie) {
    const pairs = clientCookie.split(";");
    for (const p of pairs) {
      const eqIdx = p.indexOf("=");
      if (eqIdx > 0) {
        map.set(p.substring(0, eqIdx).trim(), p.substring(eqIdx + 1).trim());
      }
    }
  }

  const result: string[] = [];
  for (const [k, v] of map.entries()) {
    result.push(`${k}=${v}`);
  }
  return result.join("; ");
}

function forwardCookiesToResponse(response: Response, nextRes: NextResponse) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const setCookies: string[] = (response.headers as any).getSetCookie
      ? (response.headers as any).getSetCookie()
      : response.headers.get("set-cookie")
      ? [response.headers.get("set-cookie")!]
      : [];

    for (const cookie of setCookies) {
      if (!cookie) continue;
      // Relax cookie for mobile WebView iframe embedding: SameSite=None; Secure
      const relaxed = cookie
        .replace(/SameSite=(Strict|Lax)/gi, "SameSite=None; Secure")
        .replace(/Domain=[^;]+;?/gi, "");
      nextRes.headers.append("Set-Cookie", relaxed);
    }
  } catch (e) {
    console.error("Error forwarding cookies:", e);
  }
}

/**
 * Unwraps tracking redirect URLs (such as DuckDuckGo's uddg/rut params or Google's /url?q= params)
 * to get the direct target destination URL.
 */
function unwrapTargetUrl(rawUrl: string): string {
  try {
    let clean = rawUrl.trim();
    if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
      clean = `https://${clean}`;
    }
    const parsed = new URL(clean);

    // 1. DuckDuckGo redirect tracking params (uddg, rut)
    if (parsed.searchParams.has("uddg")) {
      const target = parsed.searchParams.get("uddg");
      if (target) return unwrapTargetUrl(target);
    }
    if (parsed.searchParams.has("rut")) {
      const target = parsed.searchParams.get("rut");
      if (target) return unwrapTargetUrl(target);
    }

    // 2. Google redirect tracking params (/url?q=...)
    if (parsed.hostname.includes("google.") && parsed.pathname.includes("/url")) {
      const q = parsed.searchParams.get("q") || parsed.searchParams.get("url");
      if (q) return unwrapTargetUrl(q);
    }

    // 3. Remove proxy cache-busting _t param from target
    if (parsed.searchParams.has("_t")) {
      parsed.searchParams.delete("_t");
    }

    return parsed.toString();
  } catch {
    return rawUrl;
  }
}

function processHtmlContent(html: string, parsedUrl: URL): string {
  // 1. Strip CSP and X-Frame-Options meta tags
  let cleaned = html.replace(/<meta[^>]*http-equiv=["']?(Content-Security-Policy|X-Frame-Options)["']?[^>]*>/gi, "");

  // 2. Rewrite meta refresh tags
  cleaned = cleaned.replace(/<meta[^>]*http-equiv=["']?refresh["']?[^>]*content=["']?([^"'>]+)["']?[^>]*>/gi, (match, contentAttr) => {
    const urlMatch = contentAttr.match(/url=\s*['"]?([^'"]+)['"]?/i);
    if (urlMatch && urlMatch[1]) {
      const redirectTarget = unwrapTargetUrl(urlMatch[1]);
      const proxyRedirect = `/api/proxy?url=${encodeURIComponent(redirectTarget)}`;
      return `<meta http-equiv="refresh" content="0; url=${proxyRedirect}">`;
    }
    return match;
  });

  // 3. Statically rewrite form action attributes to go through proxy
  cleaned = cleaned.replace(/<form\b([^>]*?)\baction=(['"])(.*?)\2([^>]*)>/gi, (match, before, quote, actionUrl, after) => {
    try {
      const fullAction = new URL(actionUrl, parsedUrl.toString()).toString();
      return `<form${before}action=${quote}/api/proxy?url=${encodeURIComponent(fullAction)}${quote}${after}>`;
    } catch {
      return match;
    }
  });

  // 4. Statically rewrite external link tags to preserve session inside proxy
  cleaned = cleaned.replace(/<a\b([^>]*?)\bhref=(['"])(.*?)\2([^>]*)>/gi, (match, before, quote, hrefUrl, after) => {
    if (!hrefUrl || hrefUrl.startsWith("#") || hrefUrl.startsWith("javascript:") || hrefUrl.startsWith("data:") || hrefUrl.startsWith("blob:") || hrefUrl.startsWith("/api/proxy")) {
      return match;
    }
    try {
      const fullHref = new URL(hrefUrl, parsedUrl.toString()).toString();
      return `<a${before}href=${quote}/api/proxy?url=${encodeURIComponent(fullHref)}${quote}${after}>`;
    } catch {
      return match;
    }
  });

  // 5. Statically rewrite script src attributes (for Akamai / PerimeterX bot telemetry scripts & WebSabre scripts)
  cleaned = cleaned.replace(/<script\b([^>]*?)\bsrc=(['"])(.*?)\2([^>]*)>/gi, (match, before, quote, srcUrl, after) => {
    if (!srcUrl || srcUrl.startsWith("data:") || srcUrl.startsWith("blob:") || srcUrl.startsWith("/api/proxy")) {
      return match;
    }
    try {
      const fullSrc = new URL(srcUrl, parsedUrl.toString()).toString();
      return `<script${before}src=${quote}/api/proxy?url=${encodeURIComponent(fullSrc)}${quote}${after}>`;
    } catch {
      return match;
    }
  });

  // 6. Statically rewrite stylesheet link href attributes
  cleaned = cleaned.replace(/<link\b([^>]*?)\bhref=(['"])(.*?)\2([^>]*)>/gi, (match, before, quote, hrefUrl, after) => {
    if (!hrefUrl || hrefUrl.startsWith("data:") || hrefUrl.startsWith("blob:") || hrefUrl.startsWith("/api/proxy")) {
      return match;
    }
    try {
      const fullHref = new URL(hrefUrl, parsedUrl.toString()).toString();
      return `<link${before}href=${quote}/api/proxy?url=${encodeURIComponent(fullHref)}${quote}${after}>`;
    } catch {
      return match;
    }
  });

  // 7. Statically rewrite img src attributes (so logos, icons, SVGs display cleanly)
  cleaned = cleaned.replace(/<img\b([^>]*?)\bsrc=(['"])(.*?)\2([^>]*)>/gi, (match, before, quote, srcUrl, after) => {
    if (!srcUrl || srcUrl.startsWith("data:") || srcUrl.startsWith("blob:") || srcUrl.startsWith("/api/proxy")) {
      return match;
    }
    try {
      const fullSrc = new URL(srcUrl, parsedUrl.toString()).toString();
      return `<img${before}src=${quote}/api/proxy?url=${encodeURIComponent(fullSrc)}${quote}${after}>`;
    } catch {
      return match;
    }
  });

  // 8. Statically rewrite inline script redirects: window.location = 'https://...'
  cleaned = cleaned.replace(/(window\.)?location(\.href|\.replace|\.assign)?\s*(\=|\()\s*(['"`])(https?:\\?\/\\?\/[^'"`]+)\4\)?/gi, (match, win, method, op, quote, rawTarget) => {
    try {
      const cleanTarget = rawTarget.replace(/\\\//g, "/").replace(/\\x26/g, "&").replace(/\\-/g, "-");
      const fullTarget = new URL(cleanTarget, parsedUrl.toString()).toString();
      const proxyUrl = `/api/proxy?url=${encodeURIComponent(fullTarget)}`;
      if (op === "=") {
        return `window.location = ${quote}${proxyUrl}${quote}`;
      } else {
        return `window.location.replace(${quote}${proxyUrl}${quote})`;
      }
    } catch {
      return match;
    }
  });

  // 5. Inject full runtime interceptor script with Absolute URL routing, Desktop spoofing, anti-framebusting, AJAX, fetch, XHR, and programmatic form submit
  const proxyInterceptorScript = `
    <script>
      (function() {
        var PROXY_ORIGIN = window.location.origin;

        // Neutralize framebusting: make top and parent return window so if (top !== self) evaluates to false
        try {
          Object.defineProperty(window, 'top', { get: function() { return window; }, configurable: true });
          Object.defineProperty(window, 'parent', { get: function() { return window; }, configurable: true });
          Object.defineProperty(window, 'frameElement', { get: function() { return null; }, configurable: true });
        } catch(e) {}

        // Spoof desktop browser on window.navigator to completely bypass WebFOS mobile restrictions
        try {
          Object.defineProperty(navigator, 'userAgent', {
            get: function() { return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'; },
            configurable: true
          });
          Object.defineProperty(navigator, 'platform', {
            get: function() { return 'Win32'; },
            configurable: true
          });
          Object.defineProperty(navigator, 'maxTouchPoints', {
            get: function() { return 0; },
            configurable: true
          });
          if (navigator.userAgentData) {
            Object.defineProperty(navigator.userAgentData, 'mobile', {
              get: function() { return false; },
              configurable: true
            });
            Object.defineProperty(navigator.userAgentData, 'platform', {
              get: function() { return 'Windows'; },
              configurable: true
            });
          }
        } catch(e) {}

        // Silently absorb cross-origin History API SecurityErrors
        var origPushState = history.pushState;
        history.pushState = function(state, title, url) {
          try {
            return origPushState.call(this, state, title, null);
          } catch(err) {}
        };

        var origReplaceState = history.replaceState;
        history.replaceState = function(state, title, url) {
          try {
            return origReplaceState.call(this, state, title, null);
          } catch(err) {}
        };

        function getProxyUrl(rawHref) {
          if (!rawHref || typeof rawHref !== 'string' || rawHref.startsWith('javascript:') || rawHref.startsWith('#') || rawHref.startsWith('data:') || rawHref.startsWith('blob:')) {
            return null;
          }
          if (rawHref.startsWith(PROXY_ORIGIN + '/api/proxy') || rawHref.startsWith('/api/proxy')) {
            return rawHref;
          }
          try {
            var urlObj = new URL(rawHref, '${parsedUrl.toString()}');

            // Extract tracking redirect params
            if (urlObj.searchParams.has('uddg')) {
              var target = urlObj.searchParams.get('uddg');
              if (target) return PROXY_ORIGIN + '/api/proxy?url=' + encodeURIComponent(target);
            }
            if (urlObj.searchParams.has('rut')) {
              var target = urlObj.searchParams.get('rut');
              if (target) return PROXY_ORIGIN + '/api/proxy?url=' + encodeURIComponent(target);
            }

            return PROXY_ORIGIN + '/api/proxy?url=' + encodeURIComponent(urlObj.href);
          } catch(err) {
            return PROXY_ORIGIN + '/api/proxy?url=' + encodeURIComponent(rawHref);
          }
        }

        // Patch Location.prototype.assign and replace
        try {
          var origAssign = Location.prototype.assign;
          if (origAssign) {
            Location.prototype.assign = function(url) {
              var p = getProxyUrl(url);
              return origAssign.call(this, p || url);
            };
          }
          var origReplace = Location.prototype.replace;
          if (origReplace) {
            Location.prototype.replace = function(url) {
              var p = getProxyUrl(url);
              return origReplace.call(this, p || url);
            };
          }
        } catch(e) {}

        // Patch window.fetch for AJAX / Duo / SAML auth requests
        var origFetch = window.fetch;
        if (origFetch) {
          window.fetch = function(input, init) {
            try {
              var urlStr = typeof input === 'string' ? input : (input && input.url ? input.url : '');
              if (urlStr && !urlStr.startsWith(PROXY_ORIGIN + '/api/proxy') && !urlStr.startsWith('/api/proxy') && !urlStr.startsWith('data:') && !urlStr.startsWith('blob:')) {
                var fullUrl = new URL(urlStr, '${parsedUrl.toString()}').toString();
                var proxyUrl = PROXY_ORIGIN + '/api/proxy?url=' + encodeURIComponent(fullUrl);
                if (typeof input === 'string') {
                  input = proxyUrl;
                } else if (input && input.url) {
                  input = new Request(proxyUrl, init || input);
                }
              }
            } catch(e) {}
            return origFetch.call(this, input, init);
          };
        }

        // Patch XMLHttpRequest for AJAX / Duo auth requests
        var origXhrOpen = XMLHttpRequest.prototype.open;
        if (origXhrOpen) {
          XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
            try {
              if (url && typeof url === 'string' && !url.startsWith(PROXY_ORIGIN + '/api/proxy') && !url.startsWith('/api/proxy') && !url.startsWith('data:') && !url.startsWith('blob:')) {
                var fullUrl = new URL(url, '${parsedUrl.toString()}').toString();
                url = PROXY_ORIGIN + '/api/proxy?url=' + encodeURIComponent(fullUrl);
              }
            } catch(e) {}
            return origXhrOpen.call(this, method, url, async !== false, user, password);
          };
        }

        // Patch HTMLFormElement.prototype.submit for Duo / SAML programmatic submits
        var origFormSubmit = HTMLFormElement.prototype.submit;
        HTMLFormElement.prototype.submit = function() {
          try {
            var rawAction = this.getAttribute('action') || this.action || window.location.href;
            var proxyAction = getProxyUrl(rawAction);
            if (proxyAction) {
              this.setAttribute('action', proxyAction);
              this.action = proxyAction;
            }
          } catch(e) {}
          return origFormSubmit.call(this);
        };

        // Intercept user-initiated form submissions
        document.addEventListener('submit', function(e) {
          var form = e.target;
          if (form) {
            var rawAction = form.getAttribute('action') || form.action || window.location.href;
            var proxyAction = getProxyUrl(rawAction);
            if (proxyAction) {
              form.setAttribute('action', proxyAction);
              form.action = proxyAction;
            }
          }
        }, true);

        // Intercept link clicks
        document.addEventListener('click', function(e) {
          var anchor = e.target.closest('a');
          if (anchor) {
            var rawHref = anchor.getAttribute('href') || anchor.href;
            var proxyUrl = getProxyUrl(rawHref);
            if (proxyUrl) {
              e.preventDefault();
              e.stopPropagation();
              window.location.href = proxyUrl;
            }
          }
        }, true);

        // Intercept window.open
        var origOpen = window.open;
        window.open = function(url, target, features) {
          var proxyUrl = getProxyUrl(url);
          if (proxyUrl) {
            window.location.href = proxyUrl;
            return window;
          }
          return origOpen.call(this, url, target, features);
        };

        // Notify parent frame of active URL and live page text content
        if (window.parent && window.parent !== window) {
          try {
            window.parent.postMessage({ type: 'PROXY_URL_CHANGE', url: '${parsedUrl.toString()}' }, '*');
          } catch(err) {}

          function sendPageText() {
            try {
              var text = document.body ? (document.body.innerText || document.body.textContent || '') : '';
              if (text && text.trim().length > 0) {
                window.parent.postMessage({ type: 'PROXY_PAGE_TEXT', url: '${parsedUrl.toString()}', text: text }, '*');
              }
            } catch(err) {}
          }

          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', sendPageText);
          } else {
            sendPageText();
          }
          window.addEventListener('load', sendPageText);
          window.addEventListener('scroll', sendPageText);
        }
      })();
    </script>
  `;

  if (cleaned.includes("<head>")) {
    return cleaned.replace("<head>", `<head>${proxyInterceptorScript}`);
  } else if (cleaned.includes("<html>")) {
    return cleaned.replace("<html>", `<html><head>${proxyInterceptorScript}</head>`);
  } else {
    return `${proxyInterceptorScript}${cleaned}`;
  }
}

function extractTargetUrl(requestUrl: string): string {
  try {
    const urlObj = new URL(requestUrl);
    const rawQuery = urlObj.search.startsWith("?") ? urlObj.search.substring(1) : urlObj.search;
    const urlParamIdx = rawQuery.indexOf("url=");
    if (urlParamIdx !== -1) {
      let target = rawQuery.substring(urlParamIdx + 4);
      // Remove cache buster _t if attached to the proxy call itself
      const tIdx = target.lastIndexOf("&_t=");
      if (tIdx !== -1) {
        target = target.substring(0, tIdx);
      }
      try {
        if (target.startsWith("http%3A") || target.startsWith("https%3A")) {
          target = decodeURIComponent(target);
        }
      } catch {}
      return target;
    }
    return urlObj.searchParams.get("url") || "";
  } catch {
    return "";
  }
}

function getProxyBaseUrl(request: NextRequest): string {
  const host = request.headers.get("host") || "localhost:3000";
  const cleanHost = host.includes("0.0.0.0") ? host.replace("0.0.0.0", "localhost") : host;
  const proto = request.headers.get("x-forwarded-proto") || "http";
  return `${proto}://${cleanHost}`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Return diagnostic flight recorder logs
  if (searchParams.get("diagnostics") === "true") {
    return NextResponse.json({
      logs: proxyDiagnosticLogs,
      activeCookieCount: globalCookieJar.size,
      cookieKeys: Array.from(globalCookieJar.keys()),
    });
  }

  const targetUrlParam = extractTargetUrl(request.url);

  if (!targetUrlParam) {
    return new NextResponse(
      `<!DOCTYPE html><html><body style="background:#090d16;color:#94a3b8;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><div style="text-align:center;"><h2>No URL Specified</h2><p>Please enter a URL in the browser address bar above.</p></div></body></html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  const unwrappedUrlStr = unwrapTargetUrl(targetUrlParam);

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(unwrappedUrlStr);
  } catch {
    return new NextResponse(
      `<!DOCTYPE html><html><body style="background:#090d16;color:#f43f5e;font-family:sans-serif;padding:40px;"><div style="max-width:500px;margin:0 auto;background:#1e293b;padding:24px;border-radius:16px;border:1px solid #334155;"><h2>Invalid URL Format</h2><p style="color:#cbd5e1;">Unable to parse the requested URL: <code>${targetUrlParam}</code></p></div></body></html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  // Rewrite Google Search requests to DuckDuckGo HTML Search to prevent 429 bot blocks
  if (
    (parsedUrl.hostname.includes("google.com") || parsedUrl.hostname.includes("google.")) &&
    parsedUrl.pathname.includes("/search")
  ) {
    const q = parsedUrl.searchParams.get("q");
    if (q) {
      parsedUrl = new URL(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`);
    }
  }

  const clientCookie = request.headers.get("cookie") || "";
  const fetchCookie = buildCookieHeader(clientCookie);

  // Send pure Desktop Windows Chrome headers to bypass WebFOS mobile blocks
  const fetchHeaders: Record<string, string> = {
    "User-Agent": DESKTOP_USER_AGENT,
    "Accept": request.headers.get("accept") || "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": request.headers.get("accept-language") || "en-US,en;q=0.9",
    "Sec-Ch-Ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
    "Origin": parsedUrl.origin,
    "Referer": parsedUrl.origin + "/",
  };

  // Forward custom application headers (PingFederate / Duo auth tokens)
  const forwardHeaderKeys = [
    "content-type",
    "x-requested-with",
    "x-csrf-token",
    "x-xsrf-token",
    "authorization",
    "x-pf-flow-id",
    "x-duo-signature",
  ];
  for (const key of forwardHeaderKeys) {
    const val = request.headers.get(key);
    if (val) {
      fetchHeaders[key] = val;
    }
  }

  if (fetchCookie) {
    fetchHeaders["Cookie"] = fetchCookie;
  }

  const startTime = Date.now();

  try {
    const response = await fetch(parsedUrl.toString(), {
      headers: fetchHeaders,
      cache: "no-store",
      redirect: "manual",
    });

    const cookiesSaved = saveCookiesFromResponse(response, parsedUrl.hostname);
    const durationMs = Date.now() - startTime;

    // If upstream server sent a 301/302/303/307 redirect (like Duo or PingFederate redirecting back to WebFOS)
    if (response.status >= 300 && response.status < 400) {
      const locationHeader = response.headers.get("location");
      if (locationHeader) {
        const fullRedirectUrl = new URL(locationHeader, parsedUrl.toString()).toString();
        const proxyRedirectUrl = `/api/proxy?url=${encodeURIComponent(fullRedirectUrl)}`;
        
        recordDiagnostic({
          timestamp: new Date().toLocaleTimeString(),
          method: "GET",
          url: parsedUrl.toString(),
          status: response.status,
          durationMs,
          redirectUrl: fullRedirectUrl,
          cookiesSaved,
        });

        const baseUrl = getProxyBaseUrl(request);
        const res = NextResponse.redirect(new URL(proxyRedirectUrl, baseUrl));
        forwardCookiesToResponse(response, res);
        return res;
      }
    }

    recordDiagnostic({
      timestamp: new Date().toLocaleTimeString(),
      method: "GET",
      url: parsedUrl.toString(),
      status: response.status,
      durationMs,
      cookiesSaved,
    });

    // If Google returned 429, fall back to DuckDuckGo search
    if (response.status === 429 && parsedUrl.hostname.includes("google")) {
      const q = parsedUrl.searchParams.get("q") || "search";
      const fallbackUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`;
      return NextResponse.redirect(new URL(`/api/proxy?url=${encodeURIComponent(fallbackUrl)}`, request.url));
    }

    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("text/html") || contentType.includes("application/xhtml+xml") || !contentType) {
      const rawHtml = await response.text();
      const processedHtml = processHtmlContent(rawHtml, parsedUrl);

      // Normalize 401/403 auth challenge responses to 200 so the iframe renders the login page HTML
      const statusToReturn = (response.status === 401 || response.status === 403) ? 200 : response.status;
      const res = new NextResponse(processedHtml, {
        status: statusToReturn,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
        },
      });

      res.headers.delete("X-Frame-Options");
      res.headers.delete("x-frame-options");
      res.headers.delete("Content-Security-Policy");
      res.headers.delete("content-security-policy");
      res.headers.delete("Frame-Options");
      res.headers.delete("Cross-Origin-Opener-Policy");
      res.headers.delete("cross-origin-opener-policy");
      res.headers.delete("Cross-Origin-Embedder-Policy");
      res.headers.delete("cross-origin-embedder-policy");
      res.headers.delete("Cross-Origin-Resource-Policy");
      res.headers.delete("cross-origin-resource-policy");
      res.headers.delete("WWW-Authenticate");
      res.headers.delete("www-authenticate");
      res.headers.set("Access-Control-Allow-Origin", "*");

      forwardCookiesToResponse(response, res);

      return res;
    } else {
      // Non-HTML response (images, json, text, css, js)
      const data = await response.arrayBuffer();
      const res = new NextResponse(data, {
        status: response.status,
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=3600",
        },
      });

      res.headers.delete("X-Frame-Options");
      res.headers.delete("x-frame-options");
      res.headers.delete("Content-Security-Policy");
      res.headers.delete("content-security-policy");
      res.headers.delete("Frame-Options");
      res.headers.delete("Cross-Origin-Opener-Policy");
      res.headers.delete("cross-origin-opener-policy");
      res.headers.delete("Cross-Origin-Embedder-Policy");
      res.headers.delete("cross-origin-embedder-policy");
      res.headers.delete("Cross-Origin-Resource-Policy");
      res.headers.delete("cross-origin-resource-policy");
      res.headers.set("Access-Control-Allow-Origin", "*");

      forwardCookiesToResponse(response, res);

      return res;
    }
  } catch (error: any) {
    const durationMs = Date.now() - startTime;
    recordDiagnostic({
      timestamp: new Date().toLocaleTimeString(),
      method: "GET",
      url: parsedUrl.toString(),
      status: 500,
      durationMs,
      error: error?.message || "Unknown error",
      cookiesSaved: 0,
    });
    console.error("Proxy GET Error:", error);
    const searchFallbackUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(parsedUrl.hostname)}`;
    const htmlError = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { background: #090d16; color: #f8fafc; font-family: system-ui, -apple-system, sans-serif; padding: 30px; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
            .card { max-width: 520px; width: 100%; background: #1e293b; border: 1px solid #334155; border-radius: 20px; padding: 28px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); text-align: center; }
            h3 { color: #38bdf8; margin-top: 0; font-size: 18px; }
            code { background: #0f172a; padding: 4px 8px; border-radius: 6px; color: #38bdf8; font-family: monospace; font-size: 12px; word-break: break-all; }
            .btn-group { display: flex; gap: 10px; justify-content: center; margin-top: 20px; }
            .btn { display: inline-flex; align-items: center; gap: 6px; background: #0284c7; color: white; padding: 10px 18px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 12px; transition: background 0.2s; }
            .btn:hover { background: #0369a1; }
            .btn-secondary { background: #334155; color: #f8fafc; border: 1px solid #475569; }
            .btn-secondary:hover { background: #475569; }
          </style>
        </head>
        <body>
          <div class="card">
            <h3>Web Proxy Navigation</h3>
            <p style="color: #94a3b8; font-size: 13px;">Target URL: <code>${parsedUrl.toString()}</code></p>
            <div class="btn-group">
              <a href="/api/proxy?url=${encodeURIComponent(searchFallbackUrl)}" class="btn">Search Web</a>
              <a href="${parsedUrl.toString()}" target="_blank" class="btn btn-secondary">Open Directly in New Tab ↗</a>
            </div>
          </div>
        </body>
      </html>
    `;
    return new NextResponse(htmlError, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
}

export async function POST(request: NextRequest) {
  const targetUrlParam = extractTargetUrl(request.url);

  if (!targetUrlParam) {
    return new NextResponse("No target URL specified", { status: 400 });
  }

  const unwrappedUrlStr = unwrapTargetUrl(targetUrlParam);
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(unwrappedUrlStr);
  } catch {
    return new NextResponse("Invalid URL", { status: 400 });
  }

  const clientCookie = request.headers.get("cookie") || "";
  const contentType = request.headers.get("content-type") || "application/x-www-form-urlencoded";

  const fetchCookie = buildCookieHeader(clientCookie);

  // Send pure Desktop Windows Chrome headers to bypass WebFOS mobile blocks
  const fetchHeaders: Record<string, string> = {
    "User-Agent": DESKTOP_USER_AGENT,
    "Accept": request.headers.get("accept") || "*/*",
    "Accept-Language": request.headers.get("accept-language") || "en-US,en;q=0.9",
    "Content-Type": contentType,
    "Sec-Ch-Ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
    "Origin": parsedUrl.origin,
    "Referer": parsedUrl.origin + "/",
  };

  // Forward custom application headers (PingFederate / Duo auth tokens)
  const forwardHeaderKeys = [
    "x-requested-with",
    "x-csrf-token",
    "x-xsrf-token",
    "authorization",
    "x-pf-flow-id",
    "x-duo-signature",
  ];
  for (const key of forwardHeaderKeys) {
    const val = request.headers.get(key);
    if (val) {
      fetchHeaders[key] = val;
    }
  }

  if (fetchCookie) {
    fetchHeaders["Cookie"] = fetchCookie;
  }

  const startTime = Date.now();

  try {
    const bodyData = await request.arrayBuffer();
    const response = await fetch(parsedUrl.toString(), {
      method: "POST",
      headers: fetchHeaders,
      body: bodyData,
      cache: "no-store",
      redirect: "manual",
    });

    const cookiesSaved = saveCookiesFromResponse(response, parsedUrl.hostname);
    const durationMs = Date.now() - startTime;

    // If upstream POST sent a 301/302/303/307 redirect (like Duo POST callback redirecting back to WebFOS)
    if (response.status >= 300 && response.status < 400) {
      const locationHeader = response.headers.get("location");
      if (locationHeader) {
        const fullRedirectUrl = new URL(locationHeader, parsedUrl.toString()).toString();
        const proxyRedirectUrl = `/api/proxy?url=${encodeURIComponent(fullRedirectUrl)}`;
        
        recordDiagnostic({
          timestamp: new Date().toLocaleTimeString(),
          method: "POST",
          url: parsedUrl.toString(),
          status: response.status,
          durationMs,
          redirectUrl: fullRedirectUrl,
          cookiesSaved,
        });

        const baseUrl = getProxyBaseUrl(request);
        const res = NextResponse.redirect(new URL(proxyRedirectUrl, baseUrl));
        forwardCookiesToResponse(response, res);
        return res;
      }
    }

    recordDiagnostic({
      timestamp: new Date().toLocaleTimeString(),
      method: "POST",
      url: parsedUrl.toString(),
      status: response.status,
      durationMs,
      cookiesSaved,
    });

    const resContentType = response.headers.get("content-type") || "";
    if (resContentType.includes("text/html") || !resContentType) {
      const rawHtml = await response.text();
      const processedHtml = processHtmlContent(rawHtml, parsedUrl);

      const statusToReturn = (response.status === 401 || response.status === 403) ? 200 : response.status;
      const res = new NextResponse(processedHtml, {
        status: statusToReturn,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
      res.headers.delete("X-Frame-Options");
      res.headers.delete("x-frame-options");
      res.headers.delete("Content-Security-Policy");
      res.headers.delete("content-security-policy");
      res.headers.delete("Frame-Options");
      res.headers.delete("Cross-Origin-Opener-Policy");
      res.headers.delete("cross-origin-opener-policy");
      res.headers.delete("Cross-Origin-Embedder-Policy");
      res.headers.delete("cross-origin-embedder-policy");
      res.headers.delete("Cross-Origin-Resource-Policy");
      res.headers.delete("cross-origin-resource-policy");
      res.headers.delete("WWW-Authenticate");
      res.headers.delete("www-authenticate");
      res.headers.set("Access-Control-Allow-Origin", "*");

      forwardCookiesToResponse(response, res);

      return res;
    } else {
      const data = await response.arrayBuffer();
      const res = new NextResponse(data, {
        status: response.status,
        headers: { "Content-Type": resContentType },
      });
      res.headers.delete("X-Frame-Options");
      res.headers.delete("x-frame-options");
      res.headers.delete("Content-Security-Policy");
      res.headers.delete("content-security-policy");
      res.headers.delete("Frame-Options");
      res.headers.delete("Cross-Origin-Opener-Policy");
      res.headers.delete("cross-origin-opener-policy");
      res.headers.delete("Cross-Origin-Embedder-Policy");
      res.headers.delete("cross-origin-embedder-policy");
      res.headers.delete("Cross-Origin-Resource-Policy");
      res.headers.delete("cross-origin-resource-policy");
      res.headers.set("Access-Control-Allow-Origin", "*");

      forwardCookiesToResponse(response, res);

      return res;
    }
  } catch (error: any) {
    const durationMs = Date.now() - startTime;
    recordDiagnostic({
      timestamp: new Date().toLocaleTimeString(),
      method: "POST",
      url: parsedUrl.toString(),
      status: 500,
      durationMs,
      error: error?.message || "Unknown error",
      cookiesSaved: 0,
    });
    return new NextResponse(`Proxy POST Error: ${error?.message || "Unknown"}`, { status: 500 });
  }
}
