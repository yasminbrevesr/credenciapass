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

function drawCentered(
  page: PDFPage,
  text: string,
  options: { y: number; size: number; font: PDFFont; color?: ReturnType<typeof rgb> },
) {
  const width = options.font.widthOfTextAtSize(text, options.size);
  page.drawText(text, {
    x: (page.getWidth() - width) / 2,
    y: options.y,
    size: options.size,
    font: options.font,
    color: options.color ?? rgb(0.96, 0.95, 0.93),
  });
}

function drawCornerAccents(page: PDFPage, width: number, height: number, color: ReturnType<typeof rgb>) {
  const inset = 34;
  const length = 54;
  const thickness = 3;

  // Superior esquerdo
  page.drawLine({ start: { x: inset, y: height - inset }, end: { x: inset + length, y: height - inset }, thickness, color });
  page.drawLine({ start: { x: inset, y: height - inset }, end: { x: inset, y: height - inset - length }, thickness, color });

  // Superior direito
  page.drawLine({ start: { x: width - inset, y: height - inset }, end: { x: width - inset - length, y: height - inset }, thickness, color });
  page.drawLine({ start: { x: width - inset, y: height - inset }, end: { x: width - inset, y: height - inset - length }, thickness, color });

  // Inferior esquerdo
  page.drawLine({ start: { x: inset, y: inset }, end: { x: inset + length, y: inset }, thickness, color });
  page.drawLine({ start: { x: inset, y: inset }, end: { x: inset, y: inset + length }, thickness, color });

  // Inferior direito
  page.drawLine({ start: { x: width - inset, y: inset }, end: { x: width - inset - length, y: inset }, thickness, color });
  page.drawLine({ start: { x: width - inset, y: inset }, end: { x: width - inset, y: inset + length }, thickness, color });
}

/** Desenha uma página de certificado (A4 paisagem) no tema visual Breves. */
export async function drawCertificatePage(pdf: PDFDocument, data: CertificateData) {
  const page = pdf.addPage([841.89, 595.28]);
  const { width, height } = page.getSize();

  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);

  // Paleta Breves — alinhada às cores brand do sistema.
  const background = rgb(0.02, 0.02, 0.02);
  const panel = rgb(0.055, 0.05, 0.045);
  const brand = rgb(216 / 255, 154 / 255, 80 / 255); // #D89A50
  const brandLight = rgb(237 / 255, 184 / 255, 116 / 255); // #EDB874
  const brandDark = rgb(116 / 255, 73 / 255, 31 / 255); // #74491F
  const ink = rgb(0.97, 0.96, 0.94);
  const muted = rgb(0.65, 0.62, 0.58);
  const subtle = rgb(0.20, 0.17, 0.13);

  // Fundo preto profundo.
  page.drawRectangle({ x: 0, y: 0, width, height, color: background });

  // Moldura dupla e cantos Breves.
  page.drawRectangle({
    x: 24,
    y: 24,
    width: width - 48,
    height: height - 48,
    borderColor: brand,
    borderWidth: 1.8,
  });
  page.drawRectangle({
    x: 31,
    y: 31,
    width: width - 62,
    height: height - 62,
    borderColor: subtle,
    borderWidth: 0.8,
  });
  drawCornerAccents(page, width, height, brandLight);

  // Cabeçalho.
  page.drawLine({
    start: { x: width / 2 - 34, y: height - 74 },
    end: { x: width / 2 + 34, y: height - 74 },
    thickness: 2,
    color: brand,
  });
  drawCentered(page, "CERTIFICADO", {
    y: height - 116,
    size: 34,
    font: bold,
    color: brandLight,
  });
  page.drawLine({
    start: { x: width / 2 - 92, y: height - 130 },
    end: { x: width / 2 + 92, y: height - 130 },
    thickness: 1,
    color: brandDark,
  });

  // Área central com contraste sutil.
  page.drawRectangle({
    x: 66,
    y: 176,
    width: width - 132,
    height: 250,
    color: panel,
    borderColor: subtle,
    borderWidth: 0.8,
  });

  drawCentered(page, "Certificamos que", {
    y: height - 180,
    size: 13,
    font: italic,
    color: brand,
  });

  // O nome diminui quando é muito longo, para nunca estourar a moldura.
  const name = data.participantName.toUpperCase();
  let nameSize = 27;
  while (bold.widthOfTextAtSize(name, nameSize) > width - 190 && nameSize > 13) nameSize -= 1;
  drawCentered(page, name, {
    y: height - 218,
    size: nameSize,
    font: bold,
    color: ink,
  });

  page.drawLine({
    start: { x: width / 2 - 150, y: height - 230 },
    end: { x: width / 2 + 150, y: height - 230 },
    thickness: 0.7,
    color: brandDark,
  });

  const body = applyPlaceholders(data.certificateText || DEFAULT_CERTIFICATE_TEXT, data);
  const bodySize = body.length > 520 ? 12.5 : 14.5;
  const lines = wrapText(body, regular, bodySize, width - 210);

  let cursor = height - 270;
  for (const line of lines) {
    drawCentered(page, line, { y: cursor, size: bodySize, font: regular, color: ink });
    cursor -= bodySize * 1.85;
  }

  // Assinatura.
  const signatureY = 145;
  page.drawLine({
    start: { x: width / 2 - 130, y: signatureY },
    end: { x: width / 2 + 130, y: signatureY },
    thickness: 1,
    color: brand,
  });
  if (data.organizer) {
    drawCentered(page, data.organizer, {
      y: signatureY - 17,
      size: 12,
      font: bold,
      color: ink,
    });
  }
  drawCentered(page, "Organização do evento", {
    y: signatureY - (data.organizer ? 32 : 18),
    size: 10,
    font: italic,
    color: muted,
  });

  // Rodapé de validação em faixa discreta.
  page.drawRectangle({
    x: 66,
    y: 48,
    width: width - 132,
    height: 48,
    color: panel,
    borderColor: subtle,
    borderWidth: 0.7,
  });
  drawCentered(page, `Emitido em ${formatDateLong(data.issuedAt)}`, {
    y: 79,
    size: 9,
    font: regular,
    color: muted,
  });
  drawCentered(page, `Código de validação: ${data.validationCode}`, {
    y: 64,
    size: 10,
    font: bold,
    color: brandLight,
  });
  drawCentered(page, "Confira a autenticidade em /validar", {
    y: 51,
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
