import "server-only";

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

import { formatDateLong, formatDocument, formatPeriod } from "@/lib/utils";

/**
 * Texto padrão do corpo do certificado. O nome do participante é impresso em
 * destaque logo acima, após a linha "Certificamos que".
 */
export const DEFAULT_CERTIFICATE_TEXT =
  "portador(a) do documento {{documento}}, participou do evento {{evento}}, realizado em {{local}} no período de {{periodo}}, com carga horária de {{carga_horaria}}, na qualidade de {{qualificacao}}.";

export type CertificateData = {
  participantName: string;
  participantDocument: string;
  qualification: string;
  eventName: string;
  eventLocation: string | null;
  organizer: string | null;
  startDate: Date;
  endDate: Date;
  workloadHours: number | null;
  attendedDays: number;
  certificateText: string | null;
  validationCode: string;
  issuedAt: Date;
};

function applyPlaceholders(template: string, data: CertificateData) {
  const workload =
    data.workloadHours != null
      ? `${String(data.workloadHours).replace(".", ",")} hora${data.workloadHours === 1 ? "" : "s"}`
      : "carga horária não informada";

  const replacements: Record<string, string> = {
    "{{nome}}": data.participantName,
    "{{documento}}": formatDocument(data.participantDocument),
    "{{qualificacao}}": data.qualification,
    "{{evento}}": data.eventName,
    "{{local}}": data.eventLocation ?? "—",
    "{{periodo}}": formatPeriod(data.startDate, data.endDate),
    "{{carga_horaria}}": workload,
    "{{dias_presenca}}": String(data.attendedDays),
    "{{data_emissao}}": formatDateLong(data.issuedAt),
    "{{organizador}}": data.organizer ?? "",
  };

  return Object.entries(replacements).reduce(
    (text, [key, value]) => text.split(key).join(value),
    template,
  );
}

/** Quebra o texto em linhas que caibam na largura disponível. */
function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];

  for (const paragraph of text.split("\n")) {
    let current = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    lines.push(current);
  }

  return lines;
}

function drawCentered(page: PDFPage, text: string, options: { y: number; size: number; font: PDFFont; color?: ReturnType<typeof rgb> }) {
  const width = options.font.widthOfTextAtSize(text, options.size);
  page.drawText(text, {
    x: (page.getWidth() - width) / 2,
    y: options.y,
    size: options.size,
    font: options.font,
    color: options.color ?? rgb(0.1, 0.12, 0.17),
  });
}

/** Desenha uma página de certificado (A4 paisagem) no documento informado. */
export async function drawCertificatePage(pdf: PDFDocument, data: CertificateData) {
  const page = pdf.addPage([841.89, 595.28]);
  const { width, height } = page.getSize();

  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);

  const brand = rgb(0.12, 0.29, 0.85);
  const ink = rgb(0.1, 0.12, 0.17);
  const muted = rgb(0.42, 0.45, 0.5);

  // Moldura
  page.drawRectangle({
    x: 24,
    y: 24,
    width: width - 48,
    height: height - 48,
    borderColor: brand,
    borderWidth: 3,
  });
  page.drawRectangle({
    x: 34,
    y: 34,
    width: width - 68,
    height: height - 68,
    borderColor: rgb(0.8, 0.85, 0.95),
    borderWidth: 1,
  });

  drawCentered(page, "CERTIFICADO", { y: height - 110, size: 34, font: bold, color: brand });
  page.drawLine({
    start: { x: width / 2 - 60, y: height - 124 },
    end: { x: width / 2 + 60, y: height - 124 },
    thickness: 2,
    color: brand,
  });

  drawCentered(page, "Certificamos que", { y: height - 180, size: 13, font: italic, color: muted });

  // O nome diminui quando é muito longo, para nunca estourar a moldura.
  const name = data.participantName.toUpperCase();
  let nameSize = 26;
  while (bold.widthOfTextAtSize(name, nameSize) > width - 200 && nameSize > 13) nameSize -= 1;
  drawCentered(page, name, { y: height - 215, size: nameSize, font: bold, color: ink });

  const body = applyPlaceholders(data.certificateText || DEFAULT_CERTIFICATE_TEXT, data);
  const bodySize = body.length > 520 ? 13 : 15;
  const lines = wrapText(body, regular, bodySize, width - 220);

  let cursor = height - 260;
  for (const line of lines) {
    drawCentered(page, line, { y: cursor, size: bodySize, font: regular, color: ink });
    cursor -= bodySize * 1.9;
  }

  // Assinatura
  const signatureY = 130;
  page.drawLine({
    start: { x: width / 2 - 130, y: signatureY },
    end: { x: width / 2 + 130, y: signatureY },
    thickness: 1,
    color: muted,
  });
  if (data.organizer) {
    drawCentered(page, data.organizer, { y: signatureY - 16, size: 12, font: bold, color: ink });
  }
  drawCentered(page, "Organização do evento", {
    y: signatureY - (data.organizer ? 30 : 16),
    size: 10,
    font: italic,
    color: muted,
  });

  // Rodapé com dados de validação
  drawCentered(page, `Emitido em ${formatDateLong(data.issuedAt)}`, {
    y: 76,
    size: 10,
    font: regular,
    color: muted,
  });
  drawCentered(page, `Código de validação: ${data.validationCode}`, {
    y: 62,
    size: 10,
    font: bold,
    color: muted,
  });
  drawCentered(page, "Confira a autenticidade em /validar", {
    y: 48,
    size: 8,
    font: italic,
    color: muted,
  });

  return page;
}

export async function buildCertificatePdf(items: CertificateData[]): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle("Certificado");
  pdf.setProducer("CredenciaPass");

  for (const item of items) {
    await drawCertificatePage(pdf, item);
  }

  return pdf.save();
}
