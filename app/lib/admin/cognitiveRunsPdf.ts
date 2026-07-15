import { PDFDocument, PDFPage, PDFFont, StandardFonts, rgb } from "pdf-lib";
import {
  deliveryLabel,
  executionProfileLabel,
  formatCoherence,
  formatDuration,
  promotionLabel,
  runtimeModeLabel,
  sideEffectLabel,
  transitionLabel,
} from "@/app/lib/admin/cognitiveRunsUi";

type PdfRow = Array<string | number | null | undefined>;

type PdfValidationResult = {
  pageCount: number;
  textLength: number;
};

export class PdfValidationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "PdfValidationError";
  }
}

function formatDateTimeBR(value: string | Date | null | undefined) {
  if (!value) return "nao informado";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "nao informado";
  return date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "medium", timeZone: "America/Cuiaba" });
}

function formatNumberBR(value: number | null | undefined, digits = 2) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "sem dados";
  return value.toLocaleString("pt-BR", { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

function formatPercentBR(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "sem dados";
  return value.toLocaleString("pt-BR", { style: "percent", maximumFractionDigits: 1 });
}

function short(value: unknown, max = 120) {
  const text = value == null ? "" : String(value);
  return text.length > max ? `${text.slice(0, max - 3).trim()}...` : text;
}

function safeText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[–—]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "?")
    .replace(/\s+/g, " ")
    .trim();
}

function filtersText(activeFilters: Record<string, string | number | boolean>) {
  const entries = Object.entries(activeFilters || {});
  return entries.length === 0 ? "sem filtros ativos" : entries.map(([key, value]) => `${key}=${String(value)}`).join("; ");
}

function distributionRows(values: Record<string, number>, labeler: (value: string) => string) {
  return Object.entries(values || {}).map(([key, value]) => [labeler(key), key, value]);
}

class PdfCanvas {
  private readonly document: PDFDocument;
  private readonly regular: PDFFont;
  private readonly bold: PDFFont;
  private readonly width: number;
  private readonly height: number;
  private readonly margin = 36;
  private readonly title: string;
  private readonly runtimeVersion: string;
  private readonly exportedAt: Date;
  private page: PDFPage;
  private y: number;

  private constructor(input: {
    document: PDFDocument;
    regular: PDFFont;
    bold: PDFFont;
    orientation: "portrait" | "landscape";
    title: string;
    runtimeVersion: string;
    exportedAt: Date;
  }) {
    this.document = input.document;
    this.regular = input.regular;
    this.bold = input.bold;
    this.width = input.orientation === "landscape" ? 841.89 : 595.28;
    this.height = input.orientation === "landscape" ? 595.28 : 841.89;
    this.title = input.title;
    this.runtimeVersion = input.runtimeVersion;
    this.exportedAt = input.exportedAt;
    this.page = this.document.addPage([this.width, this.height]);
    this.y = this.height - this.margin;
    this.drawPageHeader();
  }

  static async create(input: {
    orientation: "portrait" | "landscape";
    title: string;
    runtimeVersion: string;
    exportedAt: Date;
  }) {
    const document = await PDFDocument.create();
    document.setTitle(input.title);
    document.setAuthor("Nemosine Nous");
    document.setSubject("Casa de Maquinas metadata-only export");
    document.setCreator("Nemosine Casa de Maquinas");
    document.setProducer("pdf-lib");
    document.setCreationDate(input.exportedAt);
    document.setModificationDate(input.exportedAt);
    const regular = await document.embedFont(StandardFonts.Helvetica);
    const bold = await document.embedFont(StandardFonts.HelveticaBold);
    return new PdfCanvas({ document, regular, bold, ...input });
  }

  private get bodyWidth() {
    return this.width - this.margin * 2;
  }

  private drawPageHeader() {
    this.page.drawText(safeText(this.title), {
      x: this.margin,
      y: this.y,
      size: 12,
      font: this.bold,
      color: rgb(0.78, 0.58, 0.22),
    });
    this.y -= 18;
    this.page.drawLine({
      start: { x: this.margin, y: this.y },
      end: { x: this.width - this.margin, y: this.y },
      thickness: 0.6,
      color: rgb(0.78, 0.58, 0.22),
      opacity: 0.55,
    });
    this.y -= 18;
  }

  private newPage() {
    this.page = this.document.addPage([this.width, this.height]);
    this.y = this.height - this.margin;
    this.drawPageHeader();
  }

  private ensure(height: number) {
    if (this.y - height < this.margin + 32) this.newPage();
  }

  private wrap(value: unknown, font: PDFFont, size: number, maxWidth: number, maxLines?: number) {
    const words = safeText(value).split(" ").filter(Boolean);
    const lines: string[] = [];
    let current = "";
    const pushCurrent = () => {
      if (current) lines.push(current);
      current = "";
    };

    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) <= maxWidth) {
        current = next;
        continue;
      }
      pushCurrent();
      if (font.widthOfTextAtSize(word, size) <= maxWidth) {
        current = word;
        continue;
      }
      let fragment = "";
      for (const char of word) {
        const nextFragment = `${fragment}${char}`;
        if (font.widthOfTextAtSize(nextFragment, size) > maxWidth && fragment) {
          lines.push(fragment);
          fragment = char;
        } else {
          fragment = nextFragment;
        }
      }
      current = fragment;
    }
    pushCurrent();
    const output = lines.length > 0 ? lines : [""];
    if (!maxLines || output.length <= maxLines) return output;
    const limited = output.slice(0, maxLines);
    limited[maxLines - 1] = short(limited[maxLines - 1], Math.max(8, limited[maxLines - 1].length - 3));
    return limited;
  }

  text(value: unknown, size = 9, weight: "regular" | "bold" = "regular", indent = 0) {
    const font = weight === "bold" ? this.bold : this.regular;
    const lines = this.wrap(value, font, size, this.bodyWidth - indent);
    const lineHeight = size * 1.35;
    this.ensure(lines.length * lineHeight + 4);
    for (const line of lines) {
      this.page.drawText(line || " ", {
        x: this.margin + indent,
        y: this.y,
        size,
        font,
        color: weight === "bold" ? rgb(0.95, 0.82, 0.45) : rgb(0.1, 0.1, 0.1),
      });
      this.y -= lineHeight;
    }
    this.y -= 4;
  }

  heading(value: string) {
    this.ensure(28);
    this.y -= 6;
    this.text(value, 13, "bold");
  }

  keyValue(label: string, value: unknown) {
    this.text(`${label}: ${value == null || value === "" ? "nao informado" : String(value)}`, 8.5);
  }

  table(headers: string[], rows: PdfRow[], widths?: number[], options: { maxCellLines?: number } = {}) {
    const columnWidths = widths || headers.map(() => this.bodyWidth / headers.length);
    const maxCellLines = options.maxCellLines || 3;
    const drawHeader = () => {
      this.ensure(26);
      this.page.drawRectangle({
        x: this.margin - 2,
        y: this.y - 3,
        width: this.bodyWidth + 4,
        height: 15,
        color: rgb(0.95, 0.9, 0.78),
        opacity: 0.75,
      });
      let x = this.margin;
      headers.forEach((header, index) => {
        this.page.drawText(safeText(header), {
          x,
          y: this.y,
          size: 7,
          font: this.bold,
          color: rgb(0.16, 0.12, 0.04),
        });
        x += columnWidths[index];
      });
      this.y -= 18;
    };

    drawHeader();
    for (const row of rows) {
      const cells = row.map((cell, index) => this.wrap(short(cell, 220), this.regular, 7, columnWidths[index] - 5, maxCellLines));
      const rowLines = Math.max(...cells.map((cell) => cell.length), 1);
      const rowHeight = rowLines * 9 + 7;
      if (this.y - rowHeight < this.margin + 32) {
        this.newPage();
        drawHeader();
      }
      const rowTop = this.y;
      let x = this.margin;
      cells.forEach((cell, column) => {
        cell.forEach((line, lineIndex) => {
          this.page.drawText(line || " ", {
            x,
            y: rowTop - lineIndex * 9,
            size: 7,
            font: this.regular,
            color: rgb(0.08, 0.08, 0.08),
          });
        });
        x += columnWidths[column];
      });
      this.y -= rowHeight;
      this.page.drawLine({
        start: { x: this.margin, y: this.y + 3 },
        end: { x: this.width - this.margin, y: this.y + 3 },
        thickness: 0.25,
        color: rgb(0.72, 0.72, 0.72),
        opacity: 0.7,
      });
    }
  }

  async render() {
    const pages = this.document.getPages();
    pages.forEach((page, index) => {
      page.drawLine({
        start: { x: this.margin, y: 30 },
        end: { x: this.width - this.margin, y: 30 },
        thickness: 0.35,
        color: rgb(0.78, 0.58, 0.22),
        opacity: 0.45,
      });
      page.drawText(safeText(`Runtime ${this.runtimeVersion} - exportado em ${formatDateTimeBR(this.exportedAt)}`), {
        x: this.margin,
        y: 18,
        size: 7,
        font: this.regular,
        color: rgb(0.22, 0.22, 0.22),
      });
      page.drawText(`Pagina ${index + 1}/${pages.length}`, {
        x: this.width - this.margin - 64,
        y: 18,
        size: 7,
        font: this.regular,
        color: rgb(0.22, 0.22, 0.22),
      });
    });
    const bytes = await this.document.save({ useObjectStreams: false });
    return Buffer.from(bytes);
  }
}

export async function validatePdfBuffer(buffer: Buffer, input: { expectedText?: string[]; semanticText?: string[] } = {}): Promise<PdfValidationResult> {
  if (!Buffer.isBuffer(buffer) || buffer.length < 1024) {
    throw new PdfValidationError("PDF_INVALID_SIZE", "PDF vazio ou pequeno demais para exportacao.");
  }
  if (buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
    throw new PdfValidationError("PDF_INVALID_HEADER", "Arquivo gerado nao comeca com %PDF-.");
  }

  let loaded: PDFDocument;
  try {
    loaded = await PDFDocument.load(buffer);
  } catch (error) {
    throw new PdfValidationError("PDFLIB_PARSE_FAILED", error instanceof Error ? error.message : String(error));
  }
  const pages = loaded.getPages();
  if (pages.length === 0) {
    throw new PdfValidationError("PDF_EMPTY_PAGE_TREE", "PDF sem paginas.");
  }
  for (const page of pages) {
    const { width, height } = page.getSize();
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      throw new PdfValidationError("PDF_INVALID_MEDIABOX", "PDF contem pagina com MediaBox invalido.");
    }
  }

  try {
    const serialized = await loaded.save({ useObjectStreams: false });
    if (!serialized || serialized.length < 1024) {
      throw new PdfValidationError("PDF_RESERIALIZE_FAILED", "PDF nao pode ser serializado novamente com tamanho coerente.");
    }
  } catch (error) {
    if (error instanceof PdfValidationError) throw error;
    throw new PdfValidationError("PDFLIB_RESERIALIZE_FAILED", error instanceof Error ? error.message : String(error));
  }

  const text = (input.semanticText || input.expectedText || []).map((term) => safeText(term)).filter(Boolean).join(" ");
  if (text.length < 40) {
    throw new PdfValidationError("PDF_SEMANTIC_CONTENT_MISSING", "Dados semanticos insuficientes para gerar PDF nao vazio.");
  }
  for (const term of input.expectedText || []) {
    if (!text.toLowerCase().includes(safeText(term).toLowerCase())) {
      throw new PdfValidationError("PDF_EXPECTED_TEXT_MISSING", `PDF validado, mas sem o texto esperado: ${term}.`);
    }
  }

  return { pageCount: pages.length, textLength: text.trim().length };
}

export async function generateCognitiveRunsReportPdf(input: {
  data: any;
  runtimeConfig: { runtimeVersion: string; deployVersion: string | null; coherenceThreshold: number };
  activeFilters: Record<string, string | number | boolean>;
  exportScope: "page" | "all";
  origin: string;
}) {
  const exportedAt = new Date();
  const rows = Array.isArray(input.data.rows) ? input.data.rows : [];
  const summary = input.data.summary || {};
  if (summary.hasData && rows.length === 0) {
    throw new PdfValidationError("PDF_EXPORT_ROWS_UNEXPECTEDLY_EMPTY", "A consulta possui dados agregados, mas nenhuma execucao foi enviada ao gerador.");
  }
  const semanticText = [
    "Casa de Maquinas",
    "Relatorio completo",
    "C(m)",
    "Resumo das metricas",
    "Periodo e filtros",
    "Execucoes filtradas",
    `Execucoes ${summary.totalRuns ?? 0}`,
    `Theta ${formatNumberBR(input.runtimeConfig.coherenceThreshold)}`,
    filtersText(input.activeFilters),
    ...rows.slice(0, 5).flatMap((row: any) => [
      row.id,
      row.personaId,
      row.runtimeMode,
      row.executionProfile,
      row.promotionDecision,
      row.deliveryStatus,
      formatCoherence(row.coherence),
      formatCoherence(row.coherenceThreshold),
    ]),
  ].map(safeText).filter(Boolean);
  const pdf = await PdfCanvas.create({
    orientation: "landscape",
    title: "Nemosine Nous - Casa de Maquinas",
    runtimeVersion: input.runtimeConfig.runtimeVersion,
    exportedAt,
  });
  pdf.heading("Relatorio completo");
  pdf.keyValue("Data e hora da exportacao", formatDateTimeBR(exportedAt));
  pdf.keyValue("Ambiente", input.origin);
  pdf.keyValue("Versao do deploy", input.runtimeConfig.deployVersion || "nao disponivel");
  pdf.keyValue("Periodo e filtros", filtersText(input.activeFilters));
  pdf.keyValue("Escopo", input.exportScope === "all" ? "todas as execucoes ate o limite tecnico seguro" : "pagina filtrada atual");

  pdf.heading("Resumo das metricas");
  [
    ["Execucoes", summary.totalRuns],
    ["Promocao", formatPercentBR(summary.promotionRate)],
    ["Rejeicao", formatPercentBR(summary.rejectionRate)],
    ["Recuperacao", formatPercentBR(summary.recoveryRate)],
    ["Failed-safe", formatPercentBR(summary.failedSafeRate)],
    ["C(m) medio", formatCoherence(summary.averageCoherence)],
    ["Theta", formatNumberBR(input.runtimeConfig.coherenceThreshold)],
    ["Iteracoes medias", formatNumberBR(summary.averageIterations, 1)],
    ["Latencia total media", formatDuration(summary.latency?.averageTotalMs ?? summary.averageLatencyMs)],
    ["Latencia runtime media", formatDuration(summary.latency?.averageRuntimeMs)],
    ["Falhas de auditoria", summary.auditPersistenceFailureCount],
    ["Efeitos bloqueados", summary.optionalEffectBlockedCount],
    ["Efeitos revertidos", summary.optionalEffectRollbackCount],
  ].forEach(([label, value]) => pdf.keyValue(String(label), value));

  pdf.heading("Distribuicoes");
  pdf.table(["Tipo", "Rotulo", "Codigo", "Quantidade"], [
    ...distributionRows(summary.runtimeModeDistribution, runtimeModeLabel).map((row) => ["Modo", ...row]),
    ...distributionRows(summary.executionProfileDistribution, executionProfileLabel).map((row) => ["Perfil", ...row]),
  ], [60, 190, 170, 80]);

  pdf.heading("Execucoes filtradas");
  pdf.table(
    ["Data", "Persona", "Modo", "Perfil", "C(m)", "Theta", "Iter.", "Decisao", "Entrega", "Lat.", "Causa"],
    rows.map((row: any) => [
      formatDateTimeBR(row.createdAt),
      row.personaId,
      runtimeModeLabel(row.runtimeMode),
      executionProfileLabel(row.executionProfile),
      formatCoherence(row.coherence),
      formatCoherence(row.coherenceThreshold),
      row.iterationCount,
      promotionLabel(row.promotionDecision),
      deliveryLabel(row.deliveryStatus),
      formatDuration(row.latency?.totalMs ?? row.latencyMs),
      row.dominantCause || row.blockingCategory || (row.findingCodes || []).slice(0, 3).join(", "),
    ]),
    [72, 86, 62, 56, 42, 42, 32, 72, 64, 48, 185],
    { maxCellLines: 2 },
  );

  pdf.heading("Legenda e proveniencia");
  pdf.text("C(m) e indice operacional de coerencia para promocao. Nao mede consciencia, inteligencia nem verdade.");
  pdf.text("Os dados vem da tabela cognitive_run_audits e da API administrativa metadata-only da Casa de Maquinas. Prompts brutos, mensagens integrais, chaves, tokens e conteudo privado nao sao exportados.");
  pdf.text(input.data.exportTruncated ? `Exportacao limitada a ${input.data.exportLimit} linhas por seguranca operacional.` : "Exportacao sem truncamento dentro do limite tecnico aplicado.");
  const buffer = await pdf.render();
  await validatePdfBuffer(buffer, {
    expectedText: ["Casa de Maquinas", "Relatorio completo", "Resumo das metricas"],
    semanticText,
  });
  return buffer;
}

export async function generateCognitiveRunDetailPdf(input: {
  detail: any;
  runtimeConfig: { runtimeVersion: string; deployVersion: string | null };
  origin: string;
}) {
  const exportedAt = new Date();
  const detail = input.detail;
  const semanticText = [
    "Casa de Maquinas",
    "Detalhe da execucao",
    "C(m)",
    "Theta",
    detail.identity?.runId,
    detail.identity?.personaId,
    detail.identity?.runtimeMode,
    detail.identity?.executionProfile,
    detail.identity?.promotionDecision,
    detail.persistence?.deliveryStatus,
    detail.persistence?.assistantMessagePersisted ? "mensagem persistida" : "mensagem nao persistida",
    detail.persistence?.auditPersisted ? "auditoria persistida" : "auditoria nao persistida",
    formatCoherence(detail.vigia?.finalCoherence),
    formatCoherence(detail.vigia?.threshold),
    String((detail.iterations || []).length),
    ...(detail.findingCodes || []),
    ...(detail.timeline || []).map((transition: any) => `${transition.from} ${transition.to}`),
  ].map(safeText).filter(Boolean);
  if (!detail.identity?.runId || !detail.identity?.personaId) {
    throw new PdfValidationError("PDF_DETAIL_IDENTITY_MISSING", "Detalhe sem ID ou persona para exportacao.");
  }
  if ((detail.timeline || []).length === 0 && (detail.iterations || []).length === 0) {
    throw new PdfValidationError("PDF_DETAIL_OPERATIONAL_DATA_MISSING", "Detalhe sem linha operacional ou iteracoes.");
  }
  const pdf = await PdfCanvas.create({
    orientation: "portrait",
    title: "Nemosine Nous - Casa de Maquinas",
    runtimeVersion: input.runtimeConfig.runtimeVersion,
    exportedAt,
  });
  pdf.heading("Detalhe da execucao");
  pdf.keyValue("ID da execucao", detail.identity?.runId);
  pdf.keyValue("Data e hora", formatDateTimeBR(detail.identity?.createdAt));
  pdf.keyValue("Persona", detail.identity?.personaId);
  pdf.keyValue("Lugar", detail.identity?.placeId || "sem Place");
  pdf.keyValue("Modo", `${runtimeModeLabel(detail.identity?.runtimeMode)} (${detail.identity?.runtimeMode || "n/a"})`);
  pdf.keyValue("Perfil", `${executionProfileLabel(detail.identity?.executionProfile)} (${detail.identity?.executionProfile || "n/a"})`);
  pdf.keyValue("Modelo", (detail.identity?.modelIdentifiers || []).join(", ") || "nao registrado");
  pdf.keyValue("Deploy", input.runtimeConfig.deployVersion || "nao disponivel");
  pdf.text(detail.narrative || "Sem resumo narrativo registrado.");

  pdf.heading("Linha operacional completa");
  pdf.table(["De", "Para", "Permitida", "Latencia", "Nota"], (detail.timeline || []).map((transition: any) => [
    transitionLabel(transition.from),
    transitionLabel(transition.to),
    transition.allowed ? "sim" : "nao",
    formatDuration(transition.latencyMs),
    transition.note || "",
  ]), [92, 112, 58, 58, 195], { maxCellLines: 3 });

  pdf.heading("Iteracoes");
  pdf.table(["Iteracao", "C(m)", "Theta", "Revisao", "Modelo", "Findings"], (detail.iterations || []).map((iteration: any) => [
    iteration.index + 1,
    formatCoherence(iteration.coherence),
    formatCoherence(detail.vigia?.threshold),
    iteration.retryRequested ? "sim" : "nao",
    iteration.candidateModelIdentifier || "nao registrado",
    (iteration.findingCodes || []).join(", ") || iteration.coherenceUnavailableReason || "",
  ]), [50, 45, 45, 50, 120, 205], { maxCellLines: 3 });

  pdf.heading("Vigia, Cientista e Filosofo");
  pdf.keyValue("Theta", formatCoherence(detail.vigia?.threshold));
  pdf.keyValue("C(m) final", formatCoherence(detail.vigia?.finalCoherence));
  pdf.keyValue("Cientista", (detail.doubleVigilance?.scientist?.findingCodes || []).join(", ") || "avaliacao deterministica registrada");
  pdf.keyValue("Filosofo", (detail.doubleVigilance?.philosopher?.findingCodes || []).join(", ") || "avaliacao deterministica registrada");
  pdf.table(["Dimensao", "Status", "Score", "Peso", "Razao"], (detail.vigia?.dimensions || []).map((dimension: any) => [
    dimension.name,
    dimension.status === "NOT_APPLICABLE" ? "Nao aplicavel" : "Pontuada",
    formatCoherence(dimension.score),
    dimension.weight == null ? "" : formatNumberBR(dimension.weight, 2),
    dimension.reason || "",
  ]), [110, 75, 45, 45, 240], { maxCellLines: 3 });

  pdf.heading("Promocao, recuperacao e persistencia");
  pdf.keyValue("Decisao", promotionLabel(detail.identity?.promotionDecision));
  pdf.keyValue("Causa dominante", detail.recovery?.dominantCause || detail.identity?.failureReason || "nao registrada");
  pdf.keyValue("Degradacoes de infraestrutura", detail.recovery?.infrastructureDegraded ? "sim" : "nao");
  pdf.keyValue("Recuperacao entregue", detail.recovery?.delivered ? "sim" : "nao");
  pdf.keyValue("Entrega", deliveryLabel(detail.persistence?.deliveryStatus));
  pdf.keyValue("Mensagem persistida", detail.persistence?.assistantMessagePersisted ? "sim" : "nao");
  pdf.keyValue("Auditoria persistida", detail.persistence?.auditPersisted ? "sim" : "nao");
  pdf.keyValue("Efeitos opcionais", sideEffectLabel(detail.persistence?.sideEffectStatus));
  pdf.keyValue("Latencia total", formatDuration(detail.latency?.totalMs));
  pdf.keyValue("Latencia runtime", formatDuration(detail.latency?.runtimeMs));

  pdf.heading("Finding codes");
  pdf.table(["Codigo tecnico", "Traducao segura"], (detail.findingCodes || []).map((code: string) => [
    code,
    short(code.replace(/_/g, " ").toLowerCase(), 160),
  ]), [210, 305], { maxCellLines: 3 });

  pdf.heading("Proveniencia e limitacoes");
  pdf.text("Somente metadados, hashes, comprimentos, estados e codigos seguros foram usados. Nenhum texto bruto sensivel foi incluido.");
  pdf.text("C(m) e indice operacional, nao medida de consciencia, inteligencia ou verdade.");
  pdf.keyValue("Origem", input.origin);
  const buffer = await pdf.render();
  await validatePdfBuffer(buffer, {
    expectedText: ["Casa de Maquinas", "Detalhe da execucao", "C(m)"],
    semanticText,
  });
  return buffer;
}
