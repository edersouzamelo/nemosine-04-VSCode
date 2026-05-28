import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "./auth.config";
import { isAdminEmail } from "./app/lib/accessControl";

const { auth } = NextAuth(authConfig);

const SOCIAL_PREVIEW_BOTS = [
    "facebookexternalhit",
    "facebot",
    "whatsapp",
    "telegrambot",
    "twitterbot",
    "linkedinbot",
    "slackbot",
    "discordbot",
    "pinterest",
];

function isSocialPreviewBot(userAgent: string | null) {
    const normalized = (userAgent || "").toLowerCase();
    return SOCIAL_PREVIEW_BOTS.some((bot) => normalized.includes(bot));
}

export default auth((req) => {
    if (req.nextUrl.pathname.startsWith("/agents/") && isSocialPreviewBot(req.headers.get("user-agent"))) {
        return NextResponse.next();
    }

    if (!req.auth) {
        const accessUrl = new URL("/access", req.nextUrl);
        accessUrl.searchParams.set("callbackUrl", `${req.nextUrl.pathname}${req.nextUrl.search}`);
        return NextResponse.redirect(accessUrl);
    }

    if (
        (req.nextUrl.pathname.startsWith("/admin") || req.nextUrl.pathname.startsWith("/developer/messages"))
        && !isAdminEmail(req.auth.user?.email)
    ) {
        return NextResponse.redirect(new URL("/space", req.nextUrl));
    }
});

export const config = {
    matcher: ["/admin/:path*", "/agents/:path*", "/developer/messages/:path*", "/inicio/:path*", "/places/:path*", "/space/:path*"],
};
