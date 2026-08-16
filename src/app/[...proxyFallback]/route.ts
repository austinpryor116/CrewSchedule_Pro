import { NextRequest, NextResponse } from "next/server";

const DEFAULT_UPSTREAM = "https://webfos.aa.com";

export async function GET(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const search = request.nextUrl.search;
  
  // Forward root-relative security scripts (Akamai telemetry / Scripts / WebSabre / styles)
  const targetUrl = `${DEFAULT_UPSTREAM}${pathname}${search}`;
  const proxyUrl = new URL(`/api/proxy?url=${encodeURIComponent(targetUrl)}`, request.url);

  return NextResponse.rewrite(proxyUrl);
}

export async function POST(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const search = request.nextUrl.search;
  
  const targetUrl = `${DEFAULT_UPSTREAM}${pathname}${search}`;
  const proxyUrl = new URL(`/api/proxy?url=${encodeURIComponent(targetUrl)}`, request.url);

  return NextResponse.rewrite(proxyUrl);
}
