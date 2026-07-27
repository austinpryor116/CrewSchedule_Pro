import { NextRequest, NextResponse } from "next/server";

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

    return parsed.toString();
  } catch {
    return rawUrl;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetUrlParam = searchParams.get("url");

  if (!targetUrlParam) {
    return new NextResponse(
      `<!DOCTYPE html><html><body style="background:#090d16;color:#94a3b8;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><div style="text-align:center;"><h2>No URL Specified</h2><p>Please enter a URL or search query in the browser address bar above.</p></div></body></html>`,
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

  try {
    const response = await fetch(parsedUrl.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Sec-Ch-Ua": '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
        "Upgrade-Insecure-Requests": "1",
      },
      cache: "no-store",
      redirect: "follow",
    });

    // If Google still returned 429, fall back to DuckDuckGo search if query exists
    if (response.status === 429 && parsedUrl.hostname.includes("google")) {
      const q = parsedUrl.searchParams.get("q") || "search";
      const fallbackUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`;
      return NextResponse.redirect(new URL(`/api/proxy?url=${encodeURIComponent(fallbackUrl)}`, request.url));
    }

    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("text/html") || contentType.includes("application/xhtml+xml") || !contentType) {
      let html = await response.text();

      // Check if Cloudflare or bot security challenge page ("Just a moment...", 403 status, cf-mitigated)
      const isCloudflareChallenge =
        response.status === 403 ||
        response.headers.get("cf-mitigated") === "challenge" ||
        html.includes("Just a moment...") ||
        html.includes("challenges.cloudflare.com");

      if (isCloudflareChallenge) {
        const cloudflareCard = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { background: #090d16; color: #f8fafc; font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
                .card { max-width: 520px; width: 100%; background: #1e293b; border: 1px solid #334155; border-radius: 24px; padding: 36px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.6); text-align: center; }
                .badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.3); color: #fbbf24; font-size: 11px; font-weight: 800; text-transform: uppercase; padding: 4px 12px; border-radius: 999px; margin-bottom: 16px; }
                h2 { color: #f8fafc; font-size: 20px; font-weight: 800; margin: 0 0 12px 0; }
                p { color: #94a3b8; font-size: 13px; line-height: 1.6; margin: 0 0 20px 0; }
                code { background: #0f172a; border: 1px solid #334155; padding: 4px 8px; border-radius: 8px; color: #38bdf8; font-family: monospace; font-size: 12px; word-break: break-all; }
                .btn-primary { display: inline-flex; align-items: center; justify-content: center; gap: 8px; background: #4f46e5; color: white; padding: 12px 24px; border-radius: 14px; text-decoration: none; font-weight: 700; font-size: 13px; box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.3); transition: all 0.2s; }
                .btn-primary:hover { background: #4338ca; transform: translateY(-1px); }
              </style>
            </head>
            <body>
              <div class="card">
                <div class="badge">🛡 Cloudflare Bot Protection</div>
                <h2>Security Challenge Required</h2>
                <p><strong>${parsedUrl.hostname}</strong> requires a direct browser session for security verification.</p>
                <p>Target URL: <code>${parsedUrl.toString()}</code></p>
                <a href="${parsedUrl.toString()}" target="_blank" class="btn-primary">
                  <span>Open ${parsedUrl.hostname} in New Tab</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                </a>
              </div>
            </body>
          </html>
        `;
        return new NextResponse(cloudflareCard, {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }

      // Rewrite any <meta http-equiv="refresh" content="...url=..."> redirects to route through /api/proxy
      html = html.replace(/<meta[^>]*http-equiv=["']?refresh["']?[^>]*content=["']?([^"'>]+)["']?[^>]*>/gi, (match, contentAttr) => {
        const urlMatch = contentAttr.match(/url=\s*['"]?([^'"]+)['"]?/i);
        if (urlMatch && urlMatch[1]) {
          const redirectTarget = unwrapTargetUrl(urlMatch[1]);
          const proxyRedirect = `/api/proxy?url=${encodeURIComponent(redirectTarget)}`;
          return `<meta http-equiv="refresh" content="0; url=${proxyRedirect}">`;
        }
        return match;
      });

      // Inject base URL tag so relative links, images, and CSS load relative to target domain
      const baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;
      const baseTag = `<base href="${baseUrl}/">`;

      // Inject client-side script to intercept link clicks, form submissions, tracking redirects, and patch History API
      const proxyInterceptorScript = `
        <script>
          (function() {
            // Silently absorb cross-origin History API SecurityErrors from Cloudflare & SPA frameworks
            var origPushState = history.pushState;
            history.pushState = function(state, title, url) {
              try {
                return origPushState.call(this, state, title, null);
              } catch(err) {
                // Ignore cross-origin history errors
              }
            };

            var origReplaceState = history.replaceState;
            history.replaceState = function(state, title, url) {
              try {
                return origReplaceState.call(this, state, title, null);
              } catch(err) {
                // Ignore cross-origin history errors
              }
            };

            function getProxyUrl(rawHref) {
              if (!rawHref || rawHref.startsWith('javascript:') || rawHref.startsWith('#') || rawHref.includes('/api/proxy')) {
                return null;
              }
              try {
                var urlObj = new URL(rawHref, window.location.href);

                // Extract DuckDuckGo / Google redirect tracking parameters if present
                if (urlObj.searchParams.has('uddg')) {
                  var target = urlObj.searchParams.get('uddg');
                  if (target) return '/api/proxy?url=' + encodeURIComponent(target);
                }
                if (urlObj.searchParams.has('rut')) {
                  var target = urlObj.searchParams.get('rut');
                  if (target) return '/api/proxy?url=' + encodeURIComponent(target);
                }
                if (urlObj.hostname.includes('google.') && urlObj.pathname.includes('/url')) {
                  var q = urlObj.searchParams.get('q') || urlObj.searchParams.get('url');
                  if (q) return '/api/proxy?url=' + encodeURIComponent(q);
                }

                return '/api/proxy?url=' + encodeURIComponent(urlObj.href);
              } catch(err) {
                return '/api/proxy?url=' + encodeURIComponent(rawHref);
              }
            }

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

            document.addEventListener('submit', function(e) {
              var form = e.target;
              if (form) {
                e.preventDefault();
                var action = form.action || window.location.href;
                var formData = new FormData(form);
                var params = new URLSearchParams();
                for (var pair of formData.entries()) {
                  params.append(pair[0], pair[1]);
                }
                var finalUrl = action + (action.includes('?') ? '&' : '?') + params.toString();
                var proxyUrl = getProxyUrl(finalUrl);
                if (proxyUrl) {
                  window.location.href = proxyUrl;
                }
              }
            }, true);

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

      if (html.includes("<head>")) {
        html = html.replace("<head>", `<head>${baseTag}${proxyInterceptorScript}`);
      } else if (html.includes("<html>")) {
        html = html.replace("<html>", `<html><head>${baseTag}${proxyInterceptorScript}</head>`);
      } else {
        html = `${baseTag}${proxyInterceptorScript}${html}`;
      }

      // Return HTML with stripped security headers to allow iframe rendering
      const res = new NextResponse(html, {
        status: response.status,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
        },
      });

      res.headers.delete("X-Frame-Options");
      res.headers.delete("Content-Security-Policy");
      res.headers.delete("Frame-Options");
      return res;
    } else {
      // Non-HTML response (images, json, text, css, js)
      const data = await response.arrayBuffer();
      const res = new NextResponse(data, {
        status: response.status,
        headers: {
          "Content-Type": contentType || "application/octet-stream",
        },
      });
      res.headers.delete("X-Frame-Options");
      res.headers.delete("Content-Security-Policy");
      return res;
    }
  } catch (error: any) {
    console.error("Proxy fetch error:", error);
    const searchFallbackUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(parsedUrl.toString())}`;
    const htmlError = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { background: #090d16; color: #f8fafc; font-family: system-ui, -apple-system, sans-serif; padding: 40px; }
            .card { max-width: 560px; margin: 0 auto; background: #1e293b; border: 1px solid #334155; border-radius: 20px; padding: 32px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
            h2 { color: #818cf8; margin-top: 0; }
            code { background: #0f172a; padding: 4px 8px; border-radius: 6px; color: #38bdf8; font-family: monospace; word-break: break-all; }
            .btn { display: inline-block; background: #4f46e5; color: white; padding: 10px 18px; border-radius: 12px; text-decoration: none; font-weight: bold; margin-top: 16px; margin-right: 12px; }
            .btn-secondary { background: #334155; color: #cbd5e1; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>Connection Refused or Blocked</h2>
            <p>Target URL: <code>${parsedUrl.toString()}</code></p>
            <p style="color: #94a3b8; font-size: 14px;">The target web server refused direct proxy connection or restricted embedded framing. Error details: ${error?.message || "Network Error"}</p>
            <a href="/api/proxy?url=${encodeURIComponent(searchFallbackUrl)}" class="btn">Search on DuckDuckGo</a>
            <a href="${parsedUrl.toString()}" target="_blank" class="btn btn-secondary">Open Directly in New Tab</a>
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


