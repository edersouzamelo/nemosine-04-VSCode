function resolveRuntimeDatabaseUrl() {
  const configured = process.env.DATABASE_URL?.trim()
  if (configured) return { url: configured, source: "DATABASE_URL" }

  const direct = process.env.DIRECT_URL?.trim()
  if (!direct) return { url: undefined, source: "missing" }

  if (process.env.VERCEL_ENV !== "preview") {
    return { url: direct, source: "DIRECT_URL" }
  }

  try {
    const url = new URL(direct)
    const match = /^db\.([a-z0-9]+)\.supabase\.co$/i.exec(url.hostname)
    const projectRef = match?.[1]

    if (projectRef !== "jhxdlzecuqxpkiodowdf") {
      return { url: direct, source: "DIRECT_URL" }
    }

    url.username = `postgres.${projectRef}`
    url.hostname = "aws-0-us-east-1.pooler.supabase.com"
    url.port = "6543"
    url.searchParams.set("pgbouncer", "true")
    url.searchParams.set("connection_limit", "1")
    url.searchParams.set("sslmode", "require")

    return { url: url.toString(), source: "SUPAVISOR_TRANSACTION_POOLER" }
  } catch {
    return { url: direct, source: "DIRECT_URL" }
  }
}

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return

  const resolved = resolveRuntimeDatabaseUrl()
  if (!process.env.DATABASE_URL?.trim() && resolved.url) {
    process.env.DATABASE_URL = resolved.url
    console.info(`[runtime-env] DATABASE_URL restored from ${resolved.source}`)
  }
}
