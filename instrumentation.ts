export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return

  const databaseUrl = process.env.DATABASE_URL?.trim() || process.env.DIRECT_URL?.trim()
  if (!process.env.DATABASE_URL?.trim() && databaseUrl) {
    process.env.DATABASE_URL = databaseUrl
    console.info("[runtime-env] DATABASE_URL restored from DIRECT_URL")
  }
}
