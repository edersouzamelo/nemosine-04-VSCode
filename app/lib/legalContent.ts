import { readFile } from "fs/promises";
import path from "path";
import { getLegalDocumentMeta, type LegalDocumentMeta, type LegalDocumentStatus } from "../data/legalDocuments";

export type LegalDocumentContent = {
  meta: LegalDocumentMeta;
  title: string;
  version: string;
  effectiveDate: string;
  updatedAt: string;
  status: LegalDocumentStatus;
  pdfHref?: string;
  body: string;
};

const frontmatterPattern = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

function parseFrontmatter(source: string) {
  const match = source.match(frontmatterPattern);
  if (!match) return { data: {} as Record<string, string>, body: source };

  const data = match[1].split(/\r?\n/).reduce<Record<string, string>>((acc, line) => {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) return acc;

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim().replace(/^"|"$/g, "");
    if (key) acc[key] = value;
    return acc;
  }, {});

  return { data, body: source.slice(match[0].length).trim() };
}

function resolveVersion(document: LegalDocumentMeta, version?: string) {
  if (version) return version;
  return document.currentVersion === "latest" ? "latest" : document.currentVersion;
}

export async function getLegalDocumentContent(slug: string, version?: string): Promise<LegalDocumentContent | null> {
  const meta = getLegalDocumentMeta(slug);
  if (!meta) return null;

  const resolvedVersion = resolveVersion(meta, version);
  let source: string;
  const candidates = [
    path.join(process.cwd(), "content", "legal", slug, `${resolvedVersion}.mdx`),
    path.join(process.cwd(), "content", "legal", slug, `${resolvedVersion}.md`),
  ];

  try {
    source = await readFile(candidates[0], "utf8");
  } catch {
    try {
      source = await readFile(candidates[1], "utf8");
    } catch {
      return null;
    }
  }
  const parsed = parseFrontmatter(source);

  return {
    meta,
    title: parsed.data.title || meta.title,
    version: parsed.data.version || resolvedVersion,
    effectiveDate: parsed.data.effectiveDate || meta.effectiveDate,
    updatedAt: parsed.data.lastUpdated || parsed.data.updatedAt || meta.updatedAt,
    status: (parsed.data.status as LegalDocumentStatus | undefined) || meta.status,
    pdfHref: parsed.data.pdf || parsed.data.pdfHref || meta.pdfHref,
    body: parsed.body,
  };
}
