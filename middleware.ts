import NextAuth from "next-auth"
import { authConfig } from "./auth.config"

const { auth } = NextAuth(authConfig)

export default auth((req) => {
    // Authentication disabled by request.
    // Allow all traffic through.
})

export const config = {
    // Disable middleware matcher entirely
    matcher: [],
}
