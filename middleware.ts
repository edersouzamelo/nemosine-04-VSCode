import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "./auth.config";
import { isAdminEmail } from "./app/lib/accessControl";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
    if (!req.auth) {
        const accessUrl = new URL("/access", req.nextUrl);
        accessUrl.searchParams.set("callbackUrl", `${req.nextUrl.pathname}${req.nextUrl.search}`);
        return NextResponse.redirect(accessUrl);
    }

    if (req.nextUrl.pathname.startsWith("/admin") && !isAdminEmail(req.auth.user?.email)) {
        return NextResponse.redirect(new URL("/space", req.nextUrl));
    }
});

export const config = {
    matcher: ["/admin/:path*", "/agents/:path*", "/inicio/:path*", "/places/:path*", "/space/:path*"],
};
