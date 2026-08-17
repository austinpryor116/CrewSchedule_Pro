import { NextRequest, NextResponse } from "next/server";

const DEFAULT_UPSTREAM = "https://webfos.aa.com";

const ALLOWED_PREFIXES = [
  "/WebSabre",
  "/Scripts",
  "/Content",
  "/Styles",
  "/WebResource",
  "/ScriptResource",
  "/akam/",
  "/_sec/",
  "/images/",
];

function isAllowedProxyPath(pathname: string): boolean {
  return ALLOWED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function GET(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const search = request.nextUrl.search;
  
  if (!isAllowedProxyPath(pathname)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Forward root-relative security scripts (Akamai telemetry / Scripts / WebSabre / styles)
  const targetUrl = `${DEFAULT_UPSTREAM}${pathname}${search}`;
  const proxyUrl = new URL(`/api/proxy?url=${encodeURIComponent(targetUrl)}`, request.url);

  return NextResponse.rewrite(proxyUrl);
}

export async function POST(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const search = request.nextUrl.search;
  
  if (!isAllowedProxyPath(pathname)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const targetUrl = `${DEFAULT_UPSTREAM}${pathname}${search}`;
  const proxyUrl = new URL(`/api/proxy?url=${encodeURIComponent(targetUrl)}`, request.url);

  return NextResponse.rewrite(proxyUrl);
}
