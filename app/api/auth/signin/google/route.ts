import { NextRequest, NextResponse } from "next/server";

function callbackPath(request: NextRequest) {
  const requested = request.nextUrl.searchParams.get("callbackUrl");
  if (!requested || !requested.startsWith("/") || requested.startsWith("//")) return "/inicio";
  return requested;
}

export async function GET(request: NextRequest) {
  if (process.env.AUTH_GOOGLE_ID?.trim() && process.env.AUTH_GOOGLE_SECRET?.trim()) {
    return NextResponse.redirect(new URL(`/api/auth/signin?callbackUrl=${encodeURIComponent(callbackPath(request))}`, request.url));
  }

  const target = new URL("/access", request.url);
  target.searchParams.set("error", "OAuthSignin");
  target.searchParams.set("reason", "google-preview-unconfigured");
  target.searchParams.set("callbackUrl", callbackPath(request));
  return NextResponse.redirect(target);
}

export const POST = GET;
