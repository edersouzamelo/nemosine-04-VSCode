import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
    if (!req.auth) {
        return NextResponse.redirect(new URL("/", req.nextUrl));
    }
});

export const config = {
    matcher: ["/admin/:path*", "/agents/:path*", "/places/:path*", "/space/:path*"],
};
