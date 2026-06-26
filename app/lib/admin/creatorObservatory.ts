import crypto from "crypto";
import dns from "dns/promises";
import fs from "fs/promises";
import path from "path";
import tls from "tls";
import { prisma } from "@/app/lib/nemosine/session_store";
import { DEFAULT_CHAT_MAX_OUTPUT_TOKENS, DEFAULT_CHAT_MODEL, DEFAULT_CHAT_TEMPERATURE } from "@/app/lib/nemosine/llm_client";

export type DiagnosticStatus = "healthy" | "warning" | "critical" | "unknown";

export type DiagnosticCheck = {
  id: string;
  label: string;
  status: DiagnosticStatus;
  summary: string;
  latencyMs?: number;
  details?: Record<string, unknown>;
  remediation?: string;
};

export type DiagnosticSection = {
  id: string;
  title: string;
  status: DiagnosticStatus;
  summary: string;
  checks: DiagnosticCheck[];
};

export type CreatorObservatoryReport = {
  reportId: string;
  generatedAt: string;
  generatedBy: string | null;
  overallStatus: DiagnosticStatus;
  app: {
    name: string;
    version: string;
    nodeEnv: string;
    vercelEnv: string | null;
    commitSha: string | null;
  };
  sections: DiagnosticSection[];
  preventiveActions: string[];
  correctiveActions: string[];
  incidentTaxonomy: Array<{
    code: string;
    label: string;
    firstResponse: string;
  }>;
};

type ReportOptions = {
  generatedBy?: string | null;
  liveChecks?: boolean;
};

const REQUIRED_ENV_VARS = [
  "DATABASE_URL",
  "OPENAI_API_KEY",
  "AUTH_SECRET",
  "NEXTAUTH_SECRET",
  "NEXTAUTH_URL",
  "NEXT_PUBLIC_APP_URL",
];

const OPTIONAL_ENV_VARS = [
  "DIRECT_URL",
  "OPENAI_FALLBACK_API_KEY",
  "LLM_FALLBACK_PROVIDER",
  "LLM_FALLBACK_BASE_URL",
  "LLM_FALLBACK_API_KEY",
  "ANTHROPIC_API_KEY",
  "GOOGLE_GENERATIVE_AI_API_KEY",
  "RESEND_API_KEY",
  "SMTP_HOST",
  "VAPID_PUBLIC_KEY",
  "VAPID_PRIVATE_KEY",
  "VERCEL_TOKEN",
  "VERCEL_PROJECT_ID",
  "VERCEL_TEAM_ID",
];

const STATUS_WEIGHT: Record<DiagnosticStatus, number> = {
  healthy: 0,
  unknown: 1,
  warning: 2,
  critical: 3,
};

function worstStatus(statuses: DiagnosticStatus[]): DiagnosticStatus {
  return statuses.reduce<DiagnosticStatus>((worst, status) => (
    STATUS_WEIGHT[status] > STATUS_WEIGHT[worst] ? status : worst
  ), "healthy");
}

function nowIso() {
  return new Date().toISOString();
}

function latencySince(startedAt: number) {
  return Date.now() - startedAt;
}

function envPresence(name: string) {
  return Boolean(process.env[name]?.trim());
}

function maskedEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) return { present: false, masked: "ausente" };
  if (value.length <= 8) return { present: true, masked: "***" };
  return {
    present: true,
    masked: `${value.slice(0, 4)}...${value.slice(-3)}`,
  };
}

function cleanError(error: unknown) {
  if (error instanceof Error) return error.message.slice(0, 500);
  return String(error).slice(0, 500);
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}

async function hashFile(relativePath: string) {
  try {
    const buffer = await fs.readFile(path.join(process.cwd(), relativePath));
    return crypto.createHash("sha256").update(buffer).digest("hex");
  } catch {
    return null;
  }
}

async function listManualMigrations() {
  try {
    const dir = path.join(process.cwd(), "prisma", "manual_migrations");
    return (await fs.readdir(dir)).filter((file) => file.endsWith(".sql")).sort();
  } catch {
    return [];
  }
}

function normalizeAppUrl(value?: string | null) {
  if (!value?.trim()) return null;
  try {
    const raw = value.trim();
    return new URL(raw.startsWith("http") ? raw : `https://${raw}`);
  } catch {
    return null;
  }
}

function getCandidateAppUrls() {
  return [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXTAUTH_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
  ]
    .map(normalizeAppUrl)
    .filter((url): url is URL => Boolean(url));
}

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function inspectTlsCertificate(hostname: string, timeoutMs = 7000): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({
      host: hostname,
      port: 443,
      servername: hostname,
      rejectUnauthorized: false,
    });

    const timeout = setTimeout(() => {
      socket.destroy();
      reject(new Error("TLS timeout"));
    }, timeoutMs);

    socket.once("secureConnect", () => {
      clearTimeout(timeout);
      const cert = socket.getPeerCertificate();
      socket.end();

      const validTo = typeof cert.valid_to === "string" ? new Date(cert.valid_to) : null;
      const daysUntilExpiry = validTo ? Math.floor((validTo.getTime() - Date.now()) / 86_400_000) : null;

      resolve({
        authorized: socket.authorized,
        authorizationError: socket.authorizationError ? String(socket.authorizationError) : null,
        subject: cert.subject || null,
        issuer: cert.issuer || null,
        validFrom: cert.valid_from || null,
        validTo: cert.valid_to || null,
        daysUntilExpiry,
      });
    });

    socket.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

async function queryRdapExpiration(hostname: string) {
  const labels = hostname.split(".").filter(Boolean);
  const domain = labels.length >= 2 ? labels.slice(-2).join(".") : hostname;
  const response = await fetchWithTimeout(`https://rdap.org/domain/${encodeURIComponent(domain)}`, {}, 8000);
  if (!response.ok) {
    return {
      domain,
      statusCode: response.status,
      expiration: null,
    };
  }

  const body = await response.json();
  const event = Array.isArray(body?.events)
    ? body.events.find((item: any) => String(item?.eventAction || "").toLowerCase().includes("expir"))
    : null;

  return {
    domain,
    statusCode: response.status,
    expiration: event?.eventDate || null,
  };
}

async function collectEnvironmentSection(): Promise<DiagnosticSection> {
  const packageJson = await readJsonFile<{ name?: string; version?: string }>(path.join(process.cwd(), "package.json"));
  const required = REQUIRED_ENV_VARS.map((name) => ({
    name,
    ...maskedEnv(name),
  }));
  const optional = OPTIONAL_ENV_VARS.map((name) => ({
    name,
    ...maskedEnv(name),
  }));
  const missingRequired = required.filter((item) => !item.present);
  const authSecretPresent = envPresence("AUTH_SECRET") || envPresence("NEXTAUTH_SECRET");
  const effectiveMissingRequired = missingRequired.filter((item) => {
    if ((item.name === "AUTH_SECRET" || item.name === "NEXTAUTH_SECRET") && authSecretPresent) return false;
    return true;
  });
  const checks: DiagnosticCheck[] = [
    {
      id: "environment.required",
      label: "Variáveis essenciais",
      status: effectiveMissingRequired.length === 0 ? "healthy" : "warning",
      summary: effectiveMissingRequired.length === 0
        ? "Variáveis essenciais presentes."
        : `Variáveis ausentes: ${effectiveMissingRequired.map((item) => item.name).join(", ")}.`,
      details: {
        required,
        note: "Valores mascarados por segurança.",
      },
      remediation: "Configurar variáveis ausentes no ambiente local e na Vercel antes do próximo deploy.",
    },
    {
      id: "environment.optional",
      label: "Variáveis subsidiárias",
      status: optional.some((item) => item.present) ? "healthy" : "warning",
      summary: optional.some((item) => item.present)
        ? "Há integrações opcionais ou subsidiárias configuradas."
        : "Nenhuma integração opcional/subsidiária foi detectada.",
      details: {
        optional,
        package: {
          name: packageJson?.name || "desconhecido",
          version: packageJson?.version || "desconhecida",
        },
      },
      remediation: "Configurar pelo menos uma API subsidiária para reduzir risco de silêncio do persona.",
    },
  ];

  return {
    id: "environment",
    title: "Ambiente e Segredos",
    status: worstStatus(checks.map((check) => check.status)),
    summary: "Valida a presença de variáveis críticas sem expor segredos.",
    checks,
  };
}

async function collectDatabaseSection(): Promise<DiagnosticSection> {
  const checks: DiagnosticCheck[] = [];
  const schemaHash = await hashFile("prisma/schema.prisma");
  const migrations = await listManualMigrations();

  checks.push({
    id: "database.schema",
    label: "Schema e migrations locais",
    status: schemaHash ? "healthy" : "warning",
    summary: schemaHash
      ? `${migrations.length} migration(s) manual(is) detectada(s); schema hash calculado.`
      : "Não foi possível calcular o hash do schema Prisma.",
    details: {
      schemaHash,
      manualMigrations: migrations,
    },
    remediation: "Manter alterações de banco versionadas em SQL ou migrations antes de publicar novas features.",
  });

  if (!envPresence("DATABASE_URL")) {
    checks.push({
      id: "database.connection",
      label: "Conexão com banco",
      status: "critical",
      summary: "DATABASE_URL ausente.",
      remediation: "Configurar DATABASE_URL antes de tentar chat, login ou auditorias.",
    });
    return {
      id: "database",
      title: "Banco de Dados",
      status: worstStatus(checks.map((check) => check.status)),
      summary: "Sem DATABASE_URL não é possível testar o banco.",
      checks,
    };
  }

  const pingStarted = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.push({
      id: "database.connection",
      label: "Conexão com banco",
      status: "healthy",
      summary: "Banco respondeu ao ping SQL.",
      latencyMs: latencySince(pingStarted),
      details: {
        directUrlPresent: envPresence("DIRECT_URL"),
      },
    });

    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [
      users,
      threads,
      messages,
      memories,
      termsAcceptances,
      audits,
      failedDeliveries24h,
      lastAudit,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.thread.count(),
      prisma.message.count(),
      prisma.userMemory.count(),
      prisma.termsAcceptance.count(),
      prisma.cognitiveRunAudit.count().catch(() => null),
      prisma.cognitiveRunAudit.count({
        where: {
          createdAt: { gte: since24h },
          OR: [
            { deliveryStatus: "failed" },
            { promotionDecision: { in: ["rejected", "failed_safe"] } },
          ],
        },
      }).catch(() => null),
      prisma.cognitiveRunAudit.findFirst({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          personaId: true,
          runtimeMode: true,
          promotionDecision: true,
          deliveryStatus: true,
          failureReason: true,
          createdAt: true,
        },
      }).catch(() => null),
    ]);

    checks.push({
      id: "database.critical-tables",
      label: "Tabelas críticas",
      status: audits === null ? "warning" : "healthy",
      summary: audits === null
        ? "Tabelas principais responderam, mas auditoria cognitiva não pôde ser consultada."
        : "Tabelas principais responderam.",
      details: {
        counts: {
          users,
          threads,
          messages,
          memories,
          termsAcceptances,
          cognitiveRunAudits: audits,
        },
      },
      remediation: "Se alguma contagem falhar, revisar migrations manuais e schema Prisma antes de novas publicações.",
    });

    checks.push({
      id: "database.recent-incidents",
      label: "Falhas recentes do runtime",
      status: failedDeliveries24h && failedDeliveries24h > 0 ? "warning" : "healthy",
      summary: failedDeliveries24h && failedDeliveries24h > 0
        ? `${failedDeliveries24h} ocorrência(s) problemática(s) nas últimas 24h.`
        : "Nenhuma falha crítica de entrega ou promoção nas últimas 24h.",
      details: {
        failedDeliveries24h,
        lastAudit: lastAudit
          ? {
              id: lastAudit.id,
              personaId: lastAudit.personaId,
              runtimeMode: lastAudit.runtimeMode,
              promotionDecision: lastAudit.promotionDecision,
              deliveryStatus: lastAudit.deliveryStatus,
              failureReason: lastAudit.failureReason,
              createdAt: lastAudit.createdAt.toISOString(),
            }
          : null,
      },
    });
  } catch (error) {
    checks.push({
      id: "database.connection",
      label: "Conexão com banco",
      status: "critical",
      summary: "Banco não respondeu ao ping SQL.",
      latencyMs: latencySince(pingStarted),
      details: {
        error: cleanError(error),
      },
      remediation: "Verificar DATABASE_URL, pooler, Supabase/Postgres, firewall e migrations recentes.",
    });
  }

  return {
    id: "database",
    title: "Banco de Dados",
    status: worstStatus(checks.map((check) => check.status)),
    summary: "Confere conexão, integridade operacional e trilhas de auditoria.",
    checks,
  };
}

async function collectDomainSection(liveChecks: boolean): Promise<DiagnosticSection> {
  const checks: DiagnosticCheck[] = [];
  const urls = getCandidateAppUrls();
  const primaryUrl = urls[0] || null;

  checks.push({
    id: "domain.configuration",
    label: "Domínio configurado",
    status: primaryUrl ? "healthy" : "warning",
    summary: primaryUrl ? `Domínio principal detectado: ${primaryUrl.hostname}.` : "Nenhum domínio principal detectado nas variáveis públicas.",
    details: {
      candidates: urls.map((url) => ({
        origin: url.origin,
        hostname: url.hostname,
      })),
    },
    remediation: "Definir NEXT_PUBLIC_APP_URL e NEXTAUTH_URL com o domínio canônico do produto.",
  });

  if (!primaryUrl) {
    return {
      id: "domain",
      title: "Domínio e HTTPS",
      status: worstStatus(checks.map((check) => check.status)),
      summary: "Não há domínio canônico suficiente para checagens externas.",
      checks,
    };
  }

  if (!liveChecks) {
    checks.push({
      id: "domain.live-skipped",
      label: "Checagens externas",
      status: "unknown",
      summary: "Checagens DNS, TLS e RDAP foram puladas nesta execução.",
    });
    return {
      id: "domain",
      title: "Domínio e HTTPS",
      status: worstStatus(checks.map((check) => check.status)),
      summary: "Domínio detectado; checagens externas não executadas.",
      checks,
    };
  }

  const dnsStarted = Date.now();
  try {
    const records = await dns.lookup(primaryUrl.hostname, { all: true });
    checks.push({
      id: "domain.dns",
      label: "DNS",
      status: records.length > 0 ? "healthy" : "warning",
      summary: records.length > 0 ? "DNS resolveu o domínio." : "DNS não retornou endereços.",
      latencyMs: latencySince(dnsStarted),
      details: {
        records,
      },
      remediation: "Se DNS falhar, revisar registros A/CNAME e configuração do domínio na Vercel.",
    });
  } catch (error) {
    checks.push({
      id: "domain.dns",
      label: "DNS",
      status: "warning",
      summary: "Não foi possível resolver DNS a partir do servidor.",
      latencyMs: latencySince(dnsStarted),
      details: {
        error: cleanError(error),
      },
    });
  }

  const tlsStarted = Date.now();
  try {
    const certificate = await inspectTlsCertificate(primaryUrl.hostname);
    const daysUntilExpiry = Number(certificate.daysUntilExpiry);
    const tlsStatus: DiagnosticStatus = Number.isFinite(daysUntilExpiry) && daysUntilExpiry < 7
      ? "critical"
      : Number.isFinite(daysUntilExpiry) && daysUntilExpiry < 21
        ? "warning"
        : certificate.authorized === false
          ? "warning"
          : "healthy";
    checks.push({
      id: "domain.tls",
      label: "Certificado HTTPS",
      status: tlsStatus,
      summary: Number.isFinite(daysUntilExpiry)
        ? `Certificado expira em ${daysUntilExpiry} dia(s).`
        : "Certificado encontrado, mas validade não foi interpretada.",
      latencyMs: latencySince(tlsStarted),
      details: certificate,
      remediation: "Se o certificado estiver perto do vencimento, revisar domínio na Vercel e emissão automática de TLS.",
    });
  } catch (error) {
    checks.push({
      id: "domain.tls",
      label: "Certificado HTTPS",
      status: "warning",
      summary: "Não foi possível inspecionar o certificado HTTPS.",
      latencyMs: latencySince(tlsStarted),
      details: {
        error: cleanError(error),
      },
    });
  }

  const rdapStarted = Date.now();
  try {
    const rdap = await queryRdapExpiration(primaryUrl.hostname);
    const expiration = rdap.expiration ? new Date(String(rdap.expiration)) : null;
    const daysUntilExpiry = expiration ? Math.floor((expiration.getTime() - Date.now()) / 86_400_000) : null;
    const rdapStatus: DiagnosticStatus = typeof daysUntilExpiry === "number"
      ? daysUntilExpiry < 30 ? "critical" : daysUntilExpiry < 60 ? "warning" : "healthy"
      : "unknown";
    checks.push({
      id: "domain.registration",
      label: "Validade do domínio",
      status: rdapStatus,
      summary: daysUntilExpiry === null
        ? "RDAP não informou data de expiração do domínio."
        : `Registro do domínio expira em ${daysUntilExpiry} dia(s).`,
      latencyMs: latencySince(rdapStarted),
      details: rdap,
      remediation: "Renovar o domínio antes de 60 dias do vencimento e manter alertas no registrador.",
    });
  } catch (error) {
    checks.push({
      id: "domain.registration",
      label: "Validade do domínio",
      status: "unknown",
      summary: "Não foi possível consultar RDAP/validade do domínio.",
      latencyMs: latencySince(rdapStarted),
      details: {
        error: cleanError(error),
      },
    });
  }

  return {
    id: "domain",
    title: "Domínio e HTTPS",
    status: worstStatus(checks.map((check) => check.status)),
    summary: "Confere DNS, certificado TLS e expiração registral quando disponível.",
    checks,
  };
}

async function checkOpenAiReachability(apiKey: string, label: string): Promise<DiagnosticCheck> {
  const started = Date.now();
  try {
    const response = await fetchWithTimeout("https://api.openai.com/v1/models", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    }, 8000);
    const text = await response.text();
    let parsed: any = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }

    const openAiError = parsed?.error;
    const status: DiagnosticStatus = response.ok
      ? "healthy"
      : response.status === 401 ? "critical" : response.status === 429 ? "warning" : "warning";

    return {
      id: `api.${label}.reachability`,
      label: `API ${label}`,
      status,
      summary: response.ok
        ? "OpenAI respondeu ao teste de autenticação/modelos."
        : `OpenAI retornou HTTP ${response.status}.`,
      latencyMs: latencySince(started),
      details: {
        statusCode: response.status,
        errorType: openAiError?.type || null,
        errorCode: openAiError?.code || null,
        creditVisibility: "A OpenAI não expõe saldo/crédito por endpoint público estável; quota é inferida por erros 429/insufficient_quota.",
      },
      remediation: response.status === 401
        ? "Revisar chave OPENAI_API_KEY no ambiente."
        : response.status === 429
          ? "Verificar limites, quota/crédito e configurar fallback subsidiário."
          : "Se persistir, testar status do provedor e chave no painel da OpenAI.",
    };
  } catch (error) {
    return {
      id: `api.${label}.reachability`,
      label: `API ${label}`,
      status: "warning",
      summary: "Não foi possível alcançar a OpenAI a partir do servidor.",
      latencyMs: latencySince(started),
      details: {
        error: cleanError(error),
      },
      remediation: "Verificar conectividade, DNS, status do provedor e restrições de rede.",
    };
  }
}

async function collectApiSection(liveChecks: boolean): Promise<DiagnosticSection> {
  const checks: DiagnosticCheck[] = [];
  const primaryKey = process.env.OPENAI_API_KEY?.trim();
  const fallbackOpenAiKey = process.env.OPENAI_FALLBACK_API_KEY?.trim();
  const genericFallbackKey = process.env.LLM_FALLBACK_API_KEY?.trim();
  const fallbackProvider = process.env.LLM_FALLBACK_PROVIDER?.trim();
  const fallbackBaseUrl = process.env.LLM_FALLBACK_BASE_URL?.trim();
  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();
  const googleKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();

  checks.push({
    id: "api.primary-config",
    label: "API primária",
    status: primaryKey ? "healthy" : "critical",
    summary: primaryKey ? `OpenAI configurada com modelo ${DEFAULT_CHAT_MODEL}.` : "OPENAI_API_KEY ausente.",
    details: {
      model: DEFAULT_CHAT_MODEL,
      temperature: DEFAULT_CHAT_TEMPERATURE,
      maxOutputTokens: DEFAULT_CHAT_MAX_OUTPUT_TOKENS,
      openAiKey: maskedEnv("OPENAI_API_KEY"),
    },
    remediation: "Sem API primária válida, o persona não consegue responder.",
  });

  const fallbackConfigured = Boolean(fallbackOpenAiKey || genericFallbackKey || anthropicKey || googleKey || fallbackProvider || fallbackBaseUrl);
  checks.push({
    id: "api.fallback-config",
    label: "API subsidiária",
    status: fallbackConfigured ? "healthy" : "warning",
    summary: fallbackConfigured
      ? "Há sinais de API subsidiária configurada."
      : "Nenhuma API subsidiária foi detectada.",
    details: {
      openAiFallbackKey: maskedEnv("OPENAI_FALLBACK_API_KEY"),
      genericFallbackProvider: fallbackProvider || null,
      genericFallbackBaseUrl: fallbackBaseUrl ? "presente" : "ausente",
      genericFallbackKey: maskedEnv("LLM_FALLBACK_API_KEY"),
      anthropicKey: maskedEnv("ANTHROPIC_API_KEY"),
      googleKey: maskedEnv("GOOGLE_GENERATIVE_AI_API_KEY"),
    },
    remediation: "Configurar OPENAI_FALLBACK_API_KEY ou LLM_FALLBACK_API_KEY; o chat já consegue selecionar fallback por LLM_PREFERRED_PROVIDER=fallback ou LLM_FORCE_FALLBACK=true.",
  });

  if (!liveChecks) {
    checks.push({
      id: "api.live-skipped",
      label: "Teste vivo de API",
      status: "unknown",
      summary: "Teste externo da API foi pulado nesta execução.",
    });
  } else if (primaryKey) {
    checks.push(await checkOpenAiReachability(primaryKey, "primaria"));
  }

  if (liveChecks && fallbackOpenAiKey) {
    checks.push(await checkOpenAiReachability(fallbackOpenAiKey, "subsidiaria"));
  }

  return {
    id: "api",
    title: "APIs de IA",
    status: worstStatus(checks.map((check) => check.status)),
    summary: "Confere chave primária, rota subsidiária e alcance do provedor quando habilitado.",
    checks,
  };
}

async function collectVercelSection(liveChecks: boolean): Promise<DiagnosticSection> {
  const checks: DiagnosticCheck[] = [];
  const vercelDetected = process.env.VERCEL === "1" || Boolean(process.env.VERCEL_URL);
  const commitSha = process.env.VERCEL_GIT_COMMIT_SHA || null;

  checks.push({
    id: "vercel.environment",
    label: "Ambiente Vercel",
    status: vercelDetected ? "healthy" : "unknown",
    summary: vercelDetected
      ? `Executando em ambiente Vercel ${process.env.VERCEL_ENV || "desconhecido"}.`
      : "Ambiente Vercel não detectado nesta execução.",
    details: {
      vercel: process.env.VERCEL || null,
      vercelEnv: process.env.VERCEL_ENV || null,
      vercelUrl: process.env.VERCEL_URL || null,
      productionUrl: process.env.VERCEL_PROJECT_PRODUCTION_URL || null,
      projectIdPresent: envPresence("VERCEL_PROJECT_ID"),
      teamIdPresent: envPresence("VERCEL_TEAM_ID"),
      commitSha,
      commitRef: process.env.VERCEL_GIT_COMMIT_REF || null,
    },
  });

  const canQueryVercel = liveChecks && envPresence("VERCEL_TOKEN") && envPresence("VERCEL_PROJECT_ID");
  if (!canQueryVercel) {
    checks.push({
      id: "vercel.deployment-api",
      label: "Status de deployment",
      status: envPresence("VERCEL_TOKEN") ? "warning" : "unknown",
      summary: envPresence("VERCEL_TOKEN")
        ? "VERCEL_TOKEN presente, mas falta VERCEL_PROJECT_ID para consulta detalhada."
        : "Consulta detalhada de deployment não configurada.",
      details: {
        liveChecks,
        vercelToken: maskedEnv("VERCEL_TOKEN"),
        vercelProjectId: maskedEnv("VERCEL_PROJECT_ID"),
      },
      remediation: "Adicionar VERCEL_TOKEN e VERCEL_PROJECT_ID se desejar consultar deployments via API.",
    });
  } else {
    const started = Date.now();
    try {
      const params = new URLSearchParams({
        projectId: String(process.env.VERCEL_PROJECT_ID),
        limit: "1",
      });
      const response = await fetchWithTimeout(`https://api.vercel.com/v6/deployments?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
        },
      }, 8000);
      const body = await response.json();
      const latest = Array.isArray(body?.deployments) ? body.deployments[0] : null;
      checks.push({
        id: "vercel.deployment-api",
        label: "Status de deployment",
        status: response.ok ? "healthy" : "warning",
        summary: response.ok && latest
          ? `Último deployment: ${latest.state || "estado desconhecido"}.`
          : `API da Vercel retornou HTTP ${response.status}.`,
        latencyMs: latencySince(started),
        details: {
          statusCode: response.status,
          latest: latest
            ? {
                uid: latest.uid,
                name: latest.name,
                state: latest.state,
                url: latest.url,
                createdAt: latest.createdAt,
              }
            : null,
        },
      });
    } catch (error) {
      checks.push({
        id: "vercel.deployment-api",
        label: "Status de deployment",
        status: "warning",
        summary: "Não foi possível consultar a API da Vercel.",
        latencyMs: latencySince(started),
        details: {
          error: cleanError(error),
        },
      });
    }
  }

  return {
    id: "vercel",
    title: "Deployment e Vercel",
    status: worstStatus(checks.map((check) => check.status)),
    summary: "Confere ambiente de publicação, commit e consulta de deployment quando configurada.",
    checks,
  };
}

function operationalSection(): DiagnosticSection {
  const checks: DiagnosticCheck[] = [
    {
      id: "operation.incident-id",
      label: "Identificação de incidente",
      status: "warning",
      summary: "O diagnóstico já gera reportId, mas o chat ainda precisa anexar incidentId nas falhas ao usuário.",
      remediation: "Adicionar taxonomia de erro e incidentId no /api/chat para toda falha de streaming ou persistência.",
    },
    {
      id: "operation.fallback-gateway",
      label: "Gateway LLM",
      status: "healthy",
      summary: "O chat usa um gateway central com provider primário, fallback configurável, timeout e classificação de incidentes.",
      remediation: "Adicionar circuit breaker persistente para alternar automaticamente após falhas repetidas do provedor primário.",
    },
    {
      id: "operation.database-guardrails",
      label: "Travas de banco",
      status: "warning",
      summary: "Há schema e migrations manuais; falta uma checagem bloqueante pré-deploy de drift/migration.",
      remediation: "Adicionar script predeploy com prisma validate, migrate status, smoke test de tabelas críticas e backup antes de migration sensível.",
    },
  ];

  return {
    id: "operation",
    title: "Continuidade Operacional",
    status: worstStatus(checks.map((check) => check.status)),
    summary: "Mapa das proteções preventivas/corretivas que ainda precisam virar trava automática.",
    checks,
  };
}

function preventiveActions() {
  return [
    "Bloquear deploy se DATABASE_URL, OPENAI_API_KEY ou segredo de autenticação estiverem ausentes.",
    "Rodar smoke test de banco antes e depois de migrations.",
    "Gerar backup/snapshot antes de qualquer alteração estrutural de banco.",
    "Manter rota subsidiária de LLM configurada e testada.",
    "Executar canário periódico de persona para detectar silêncio antes do usuário.",
    "Registrar incidentId em toda falha de chat, streaming, persistência ou auditoria.",
  ];
}

function correctiveActions() {
  return [
    "Quando o persona silenciar, baixar este relatório e checar Banco, APIs de IA e Vercel nesta ordem.",
    "Se API primária falhar, alternar para rota subsidiária ou modo degradado.",
    "Se banco falhar, pausar deploys, restaurar backup/snapshot e validar migrations recentes.",
    "Se Vercel/domínio falhar, usar URL de preview/produção direta enquanto DNS/TLS é corrigido.",
    "Se o erro for de prompt/contexto, reduzir payload e reexecutar com prompt auditável.",
  ];
}

function incidentTaxonomy() {
  return [
    {
      code: "AUTH_ERROR",
      label: "Sessão ou permissão inválida",
      firstResponse: "Reautenticar usuário e validar segredo de auth.",
    },
    {
      code: "DB_UNAVAILABLE",
      label: "Banco indisponível",
      firstResponse: "Verificar DATABASE_URL, pooler, Supabase/Postgres e migrations.",
    },
    {
      code: "PROMPT_ASSEMBLY_FAILED",
      label: "Falha na montagem do contexto",
      firstResponse: "Inspecionar persona, place, memórias, anexos e prompt debug.",
    },
    {
      code: "LLM_AUTH",
      label: "Falha de autenticação na API de IA",
      firstResponse: "Revisar chave da API primária e ativar fallback.",
    },
    {
      code: "LLM_RATE_LIMIT",
      label: "Rate limit ou quota",
      firstResponse: "Aguardar janela de limite, revisar crédito/quota e alternar provider.",
    },
    {
      code: "LLM_TIMEOUT",
      label: "Timeout do provedor",
      firstResponse: "Retry com backoff, reduzir payload e acionar API subsidiária.",
    },
    {
      code: "STREAM_INTERRUPTED",
      label: "Stream interrompido",
      firstResponse: "Persistir falha recuperável e oferecer tentar novamente.",
    },
    {
      code: "PERSISTENCE_FAILED",
      label: "Resposta gerada, mas não persistida",
      firstResponse: "Salvar mensagem de contingência, auditar banco e reconciliar thread.",
    },
    {
      code: "VERCEL_TIMEOUT",
      label: "Timeout ou falha no runtime da Vercel",
      firstResponse: "Checar logs do deployment, maxDuration e cold starts.",
    },
  ];
}

export async function createCreatorObservatoryReport(options: ReportOptions = {}): Promise<CreatorObservatoryReport> {
  const packageJson = await readJsonFile<{ name?: string; version?: string }>(path.join(process.cwd(), "package.json"));
  const sections = await Promise.all([
    collectEnvironmentSection(),
    collectDatabaseSection(),
    collectDomainSection(options.liveChecks !== false),
    collectApiSection(options.liveChecks !== false),
    collectVercelSection(options.liveChecks !== false),
  ]);

  sections.push(operationalSection());

  return {
    reportId: crypto.randomUUID(),
    generatedAt: nowIso(),
    generatedBy: options.generatedBy || null,
    overallStatus: worstStatus(sections.map((section) => section.status)),
    app: {
      name: packageJson?.name || "nemosine",
      version: packageJson?.version || "desconhecida",
      nodeEnv: process.env.NODE_ENV || "unknown",
      vercelEnv: process.env.VERCEL_ENV || null,
      commitSha: process.env.VERCEL_GIT_COMMIT_SHA || null,
    },
    sections,
    preventiveActions: preventiveActions(),
    correctiveActions: correctiveActions(),
    incidentTaxonomy: incidentTaxonomy(),
  };
}

function stringifyDetail(value: unknown) {
  if (value === null || typeof value === "undefined") return "null";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value, null, 2);
}

export function buildCreatorObservatoryMarkdown(report: CreatorObservatoryReport) {
  const lines: string[] = [
    `# Observatório do Criador`,
    "",
    `- Relatório: ${report.reportId}`,
    `- Gerado em: ${report.generatedAt}`,
    `- Gerado por: ${report.generatedBy || "admin"}`,
    `- Status geral: ${report.overallStatus}`,
    `- Aplicação: ${report.app.name} ${report.app.version}`,
    `- Ambiente: ${report.app.nodeEnv}${report.app.vercelEnv ? ` / ${report.app.vercelEnv}` : ""}`,
    "",
    "## Seções",
  ];

  for (const section of report.sections) {
    lines.push("", `### ${section.title} (${section.status})`, "", section.summary, "");
    for (const check of section.checks) {
      lines.push(`- **${check.label}** [${check.status}]: ${check.summary}`);
      if (typeof check.latencyMs === "number") lines.push(`  - Latência: ${check.latencyMs}ms`);
      if (check.remediation) lines.push(`  - Ação sugerida: ${check.remediation}`);
      if (check.details) {
        lines.push("  - Detalhes:");
        lines.push("```json");
        lines.push(stringifyDetail(check.details));
        lines.push("```");
      }
    }
  }

  lines.push("", "## Medidas Preventivas", "");
  report.preventiveActions.forEach((action) => lines.push(`- ${action}`));

  lines.push("", "## Medidas Corretivas", "");
  report.correctiveActions.forEach((action) => lines.push(`- ${action}`));

  lines.push("", "## Taxonomia de Incidentes", "");
  report.incidentTaxonomy.forEach((item) => {
    lines.push(`- **${item.code}**: ${item.label}. Primeira resposta: ${item.firstResponse}`);
  });

  return `${lines.join("\n")}\n`;
}
