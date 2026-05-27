import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
    if (!req.auth) {
        const accessUrl = new URL("/access", req.nextUrl);
        accessUrl.searchParams.set("callbackUrl", `${req.nextUrl.pathname}${req.nextUrl.search}`);
        return NextResponse.redirect(accessUrl);
    }
});

export const config = {
    matcher: ["/admin/:path*", "/agents/:path*", "/inicio/:path*", "/places/:path*", "/space/:path*"],
};
