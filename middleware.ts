import NextAuth from "next-auth";
import { NextRequest, NextResponse } from "next/server";
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

function requestOrigin(req: NextRequest) {
    const forwardedHost = req.headers.get("x-forwarded-host") || req.headers.get("host");
    const forwardedProtocol = req.headers.get("x-forwarded-proto") || req.nextUrl.protocol.replace(":", "") || "https";
    return forwardedHost ? `${forwardedProtocol}://${forwardedHost}` : req.nextUrl.origin;
}

export default auth((req) => {
    const { pathname } = req.nextUrl;

    // Permitir livre acesso a assets estáticos (imagens, áudios e manifestos) das pastas protegidas
    if (
        pathname.endsWith(".png") ||
        pathname.endsWith(".jpg") ||
        pathname.endsWith(".jpeg") ||
        pathname.endsWith(".svg") ||
        pathname.endsWith(".mp3") ||
        pathname.endsWith(".m4a") ||
        pathname.endsWith(".json")
    ) {
        return NextResponse.next();
    }

    if (
        req.nextUrl.pathname.startsWith("/agents/")
        && isSocialPreviewBot(req.headers.get("user-agent"))
    ) {
        return NextResponse.next();
    }

    if (!req.auth) {
        // Keep authentication on the exact deployment host. Using a canonical
        // production origin here made preview tests silently return to production.
        const accessUrl = new URL("/access", requestOrigin(req));
        accessUrl.searchParams.set("callbackUrl", `${req.nextUrl.pathname}${req.nextUrl.search}`);
        return NextResponse.redirect(accessUrl);
    }

    if (
        (req.nextUrl.pathname.startsWith("/admin") || req.nextUrl.pathname.startsWith("/developer/messages"))
        && !isAdminEmail(req.auth.user?.email)
    ) {
        return NextResponse.redirect(new URL("/space", requestOrigin(req)));
    }
});

export const config = {
    matcher: ["/admin/:path*", "/agents/:path*", "/developer/messages/:path*", "/inicio/:path*", "/places/:path*", "/space/:path*"],
};
