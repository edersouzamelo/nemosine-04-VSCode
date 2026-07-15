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

const pageWidth = 595.28;
const pageHeight = 841.89;
const margin = 40;
const bodyWidth = pageWidth - margin * 2;

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
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}

function winAnsi(input: string) {
  const map: Record<string, number> = {
    "€": 0x80,
    "‘": 0x91,
    "’": 0x92,
    "“": 0x93,
    "”": 0x94,
    "–": 0x96,
    "—": 0x97,
    "…": 0x85,
  };
  let output = "";
  for (const char of input) {
    const mapped = map[char];
    if (mapped) {
      output += String.fromCharCode(mapped);
      continue;
    }
    const code = char.charCodeAt(0);
    output += code <= 255 ? char : "?";
  }
  return output;
}

function escapePdfText(value: string) {
  return winAnsi(value)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/\r?\n/g, " ");
}

function wrapText(value: string, width: number, size: number) {
  const words = value.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const maxChars = Math.max(8, Math.floor(width / (size * 0.52)));
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else if (word.length > maxChars) {
      if (current) lines.push(current);
      for (let index = 0; index < word.length; index += maxChars) lines.push(word.slice(index, index + maxChars));
      current = "";
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

class PdfBuilder {
  private pages: string[][] = [];
  private ops: string[] = [];
  private y = pageHeight - margin;

  constructor(private readonly exportedAt: Date, private readonly runtimeVersion: string) {
    this.newPage();
  }

  private newPage() {
    if (this.ops.length > 0) this.pages.push(this.ops);
    this.ops = [];
    this.y = pageHeight - margin;
    this.text("Nemosine Nous — Casa de Maquinas", 12, "bold");
    this.rule();
  }

  private ensure(height: number) {
    if (this.y - height < margin + 36) this.newPage();
  }

  private emit(text: string) {
    this.ops.push(text);
  }

  text(value: string, size = 10, weight: "regular" | "bold" = "regular", indent = 0) {
    const lines = wrapText(value, bodyWidth - indent, size);
    const lineHeight = size * 1.35;
    this.ensure(lines.length * lineHeight + 4);
    for (const line of lines) {
      this.emit(`BT /${weight === "bold" ? "F2" : "F1"} ${size} Tf ${margin + indent} ${this.y.toFixed(2)} Td (${escapePdfText(line)}) Tj ET`);
      this.y -= lineHeight;
    }
    this.y -= 3;
  }

  heading(value: string) {
    this.y -= 8;
    this.text(value, 13, "bold");
  }

  keyValue(label: string, value: string | number | null | undefined) {
    this.text(`${label}: ${value == null || value === "" ? "nao informado" : String(value)}`, 9);
  }

  rule() {
    this.ensure(12);
    this.emit(`${margin} ${this.y.toFixed(2)} m ${pageWidth - margin} ${this.y.toFixed(2)} l S`);
    this.y -= 12;
  }

  table(headers: string[], rows: PdfRow[], widths?: number[]) {
    const columnWidths = widths || headers.map(() => bodyWidth / headers.length);
    const drawHeader = () => {
      this.ensure(28);
      let x = margin;
      for (let index = 0; index < headers.length; index += 1) {
        this.emit(`BT /F2 7 Tf ${x} ${this.y.toFixed(2)} Td (${escapePdfText(headers[index])}) Tj ET`);
        x += columnWidths[index];
      }
      this.y -= 13;
      this.rule();
    };
    drawHeader();
    for (const row of rows) {
      const cells = row.map((cell, index) => wrapText(short(cell, 180), columnWidths[index] - 4, 7));
      const rowLines = Math.max(...cells.map((cell) => cell.length));
      const rowHeight = rowLines * 9 + 8;
      if (this.y - rowHeight < margin + 36) {
        this.newPage();
        drawHeader();
      }
      const rowTop = this.y;
      let x = margin;
      for (let column = 0; column < cells.length; column += 1) {
        cells[column].forEach((line, lineIndex) => {
          this.emit(`BT /F1 7 Tf ${x} ${(rowTop - lineIndex * 9).toFixed(2)} Td (${escapePdfText(line)}) Tj ET`);
        });
        x += columnWidths[column];
      }
      this.y -= rowHeight;
    }
  }

  render() {
    if (this.ops.length > 0) this.pages.push(this.ops);
    const totalPages = this.pages.length;
    const pageObjects: string[] = [];
    const contentObjects: string[] = [];
    const firstPageObjectId = 5;
    const firstContentObjectId = firstPageObjectId + totalPages;

    this.pages.forEach((ops, index) => {
      const footer = [
        `BT /F1 7 Tf ${margin} 24 Td (${escapePdfText(`Runtime ${this.runtimeVersion} - exportado em ${formatDateTimeBR(this.exportedAt)}`)}) Tj ET`,
        `BT /F1 7 Tf ${pageWidth - margin - 60} 24 Td (${escapePdfText(`Pagina ${index + 1}/${totalPages}`)}) Tj ET`,
      ];
      const content = [...ops, ...footer].join("\n");
      const contentId = firstContentObjectId + index;
      contentObjects.push(`<< /Length ${Buffer.byteLength(content, "binary")} >>\nstream\n${content}\nendstream`);
      pageObjects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`);
    });

    const objects = [
      `<< /Type /Catalog /Pages 2 0 R >>`,
      `<< /Type /Pages /Count ${totalPages} /Kids ${pageObjects.map((_, index) => `${firstPageObjectId + index} 0 R`).join(" ")} >>`,
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
      ...pageObjects,
      ...contentObjects,
    ];

    let output = "%PDF-1.4\n";
    const offsets = [0];
    objects.forEach((object, index) => {
      offsets.push(Buffer.byteLength(output, "binary"));
      output += `${index + 1} 0 obj\n${object}\nendobj\n`;
    });
    const xrefOffset = Buffer.byteLength(output, "binary");
    output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    offsets.slice(1).forEach((offset) => {
      output += `${String(offset).padStart(10, "0")} 00000 n \n`;
    });
    output += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    return Buffer.from(output, "binary");
  }
}

function distributionRows(values: Record<string, number>, labeler: (value: string) => string) {
  return Object.entries(values || {}).map(([key, value]) => [labeler(key), key, value]);
}

function filtersText(activeFilters: Record<string, string | number | boolean>) {
  const entries = Object.entries(activeFilters || {});
  return entries.length === 0 ? "sem filtros ativos" : entries.map(([key, value]) => `${key}=${String(value)}`).join("; ");
}

export function generateCognitiveRunsReportPdf(input: {
  data: any;
  runtimeConfig: { runtimeVersion: string; deployVersion: string | null; coherenceThreshold: number };
  activeFilters: Record<string, string | number | boolean>;
  exportScope: "page" | "all";
  origin: string;
}) {
  const exportedAt = new Date();
  const pdf = new PdfBuilder(exportedAt, input.runtimeConfig.runtimeVersion);
  const summary = input.data.summary || {};
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
    ["Latencia media", formatDuration(summary.averageLatencyMs)],
    ["Falhas de auditoria", summary.auditPersistenceFailureCount],
    ["Efeitos bloqueados", summary.optionalEffectBlockedCount],
    ["Efeitos revertidos", summary.optionalEffectRollbackCount],
  ].forEach(([label, value]) => pdf.keyValue(String(label), value));

  pdf.heading("Distribuicoes");
  pdf.table(["Tipo", "Rotulo", "Codigo", "Quantidade"], [
    ...distributionRows(summary.runtimeModeDistribution, runtimeModeLabel).map((row) => ["Modo", ...row]),
    ...distributionRows(summary.executionProfileDistribution, executionProfileLabel).map((row) => ["Perfil", ...row]),
  ], [70, 170, 140, 90]);

  pdf.heading("Execucoes filtradas");
  pdf.table(
    ["Data", "Persona", "Modo", "Perfil", "C(m)", "Theta", "Decisao", "Entrega", "Causa"],
    (input.data.rows || []).map((row: any) => [
      formatDateTimeBR(row.createdAt),
      row.personaId,
      runtimeModeLabel(row.runtimeMode),
      executionProfileLabel(row.executionProfile),
      formatCoherence(row.coherence),
      formatCoherence(row.coherenceThreshold),
      promotionLabel(row.promotionDecision),
      deliveryLabel(row.deliveryStatus),
      row.dominantCause || row.blockingCategory || "",
    ]),
    [62, 80, 68, 55, 38, 38, 70, 65, 78],
  );

  pdf.heading("Legenda e proveniencia");
  pdf.text("C(m) e indice operacional de coerencia para promocao. Nao mede consciencia, inteligencia nem verdade.");
  pdf.text("Os dados vem da tabela cognitive_run_audits e da API administrativa metadata-only da Casa de Maquinas. Prompts brutos, mensagens integrais, chaves, tokens e conteudo privado nao sao exportados.");
  pdf.text(input.data.exportTruncated ? `Exportacao limitada a ${input.data.exportLimit} linhas por seguranca operacional.` : "Exportacao sem truncamento dentro do limite tecnico aplicado.");
  return pdf.render();
}

export function generateCognitiveRunDetailPdf(input: {
  detail: any;
  runtimeConfig: { runtimeVersion: string; deployVersion: string | null };
  origin: string;
}) {
  const exportedAt = new Date();
  const detail = input.detail;
  const pdf = new PdfBuilder(exportedAt, input.runtimeConfig.runtimeVersion);
  pdf.heading("Detalhe da Execucao");
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
  ]), [100, 115, 55, 55, 190]);

  pdf.heading("Iteracoes O-C-V");
  pdf.table(["Iteracao", "C(m)", "Retry", "Modelo", "Findings"], (detail.iterations || []).map((iteration: any) => [
    iteration.index + 1,
    formatCoherence(iteration.coherence),
    iteration.retryRequested ? "sim" : "nao",
    iteration.candidateModelIdentifier || "nao registrado",
    (iteration.findingCodes || []).join(", "),
  ]), [48, 45, 42, 120, 260]);

  pdf.heading("Vigia, Cientista e Filosofo");
  pdf.keyValue("Theta", formatCoherence(detail.vigia?.threshold));
  pdf.keyValue("C(m) final", formatCoherence(detail.vigia?.finalCoherence));
  pdf.table(["Dimensao", "Status", "Score", "Peso", "Razao"], (detail.vigia?.dimensions || []).map((dimension: any) => [
    dimension.name,
    dimension.status === "NOT_APPLICABLE" ? "Nao aplicavel" : "Pontuada",
    formatCoherence(dimension.score),
    dimension.weight == null ? "" : formatNumberBR(dimension.weight, 2),
    dimension.reason || "",
  ]), [110, 75, 45, 45, 240]);
  pdf.keyValue("Cientista", (detail.doubleVigilance?.scientist?.findingCodes || []).join(", ") || "sem finding registrado");
  pdf.keyValue("Filosofo", (detail.doubleVigilance?.philosopher?.findingCodes || []).join(", ") || "sem finding registrado");

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

  pdf.heading("Finding codes");
  pdf.table(["Codigo tecnico", "Traducao segura"], (detail.findingCodes || []).map((code: string) => [
    code,
    short(code.replace(/_/g, " ").toLowerCase(), 160),
  ]), [210, 305]);

  pdf.heading("Proveniencia e limitacoes");
  pdf.text("Somente metadados, hashes, comprimentos, estados e codigos seguros foram usados. Nenhum texto bruto sensivel foi incluido.");
  pdf.text("C(m) e indice operacional, nao medida de consciencia, inteligencia ou verdade.");
  pdf.keyValue("Origem", input.origin);
  return pdf.render();
}
