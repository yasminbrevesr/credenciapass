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

function workloadLabel(hours: number | null) {
  if (hours == null) return "Não informada";
  return `${String(hours).replace(".", ",")} hora${hours === 1 ? "" : "s"}`;
}

function applyPlaceholders(template: string, data: CertificateData) {
  const replacements: Record<string, string> = {
    "{{nome}}": data.participantName,
    "{{documento}}": formatDocument(data.participantDocument),
    "{{qualificacao}}": data.qualification,
    "{{evento}}": data.eventName,
    "{{local}}": data.eventLocation ?? "—",
    "{{periodo}}": formatPeriod(data.startDate, data.endDate),
    "{{carga_horaria}}": data.workloadHours != null
      ? workloadLabel(data.workloadHours).toLocaleLowerCase("pt-BR")
      : "carga horária não informada",
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

function fitWrappedText(
  text: string,
  font: PDFFont,
  maxWidth: number,
  maxLines: number,
  initialSize: number,
  minSize: number,
) {
  let size = initialSize;
  let lines = wrapText(text, font, size, maxWidth);

  while (lines.length > maxLines && size > minSize) {
    size -= 0.5;
    lines = wrapText(text, font, size, maxWidth);
  }

  return { size, lines };
}

function fitTextSize(text: string, font: PDFFont, maxWidth: number, initialSize: number, minSize: number) {
  let size = initialSize;
  while (font.widthOfTextAtSize(text, size) > maxWidth && size > minSize) size -= 0.5;
  return size;
}

function drawCentered(
  page: PDFPage,
  text: string,
  options: { y: number; size: number; font: PDFFont; color: ReturnType<typeof rgb> },
) {
  const width = options.font.widthOfTextAtSize(text, options.size);
  page.drawText(text, {
    x: (page.getWidth() - width) / 2,
    y: options.y,
    size: options.size,
    font: options.font,
    color: options.color,
  });
}

function drawInfoBlock(
  page: PDFPage,
  options: {
    x: number;
    y: number;
    width: number;
    label: string;
    value: string;
    regular: PDFFont;
    bold: PDFFont;
    labelColor: ReturnType<typeof rgb>;
    valueColor: ReturnType<typeof rgb>;
    background: ReturnType<typeof rgb>;
    border: ReturnType<typeof rgb>;
  },
) {
  page.drawRectangle({
    x: options.x,
    y: options.y,
    width: options.width,
    height: 58,
    color: options.background,
    borderColor: options.border,
    borderWidth: 0.7,
  });

  const labelSize = 8.5;
  const labelWidth = options.bold.widthOfTextAtSize(options.label, labelSize);
  page.drawText(options.label, {
    x: options.x + (options.width - labelWidth) / 2,
    y: options.y + 37,
    size: labelSize,
    font: options.bold,
    color: options.labelColor,
  });

  const valueSize = fitTextSize(options.value, options.bold, options.width - 24, 12, 8.5);
  const valueWidth = options.bold.widthOfTextAtSize(options.value, valueSize);
  page.drawText(options.value, {
    x: options.x + (options.width - valueWidth) / 2,
    y: options.y + 17,
    size: valueSize,
    font: options.bold,
    color: options.valueColor,
  });
}

/** Desenha uma página de certificado (A4 paisagem) em estilo Breves clean. */
export async function drawCertificatePage(pdf: PDFDocument, data: CertificateData) {
  const page = pdf.addPage([841.89, 595.28]);
  const { width, height } = page.getSize();

  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);

  const paper = rgb(250 / 255, 249 / 255, 247 / 255);
  const white = rgb(1, 1, 1);
  const ink = rgb(31 / 255, 31 / 255, 29 / 255);
  const muted = rgb(112 / 255, 108 / 255, 102 / 255);
  const border = rgb(229 / 255, 224 / 255, 216 / 255);
  const amber = rgb(216 / 255, 154 / 255, 80 / 255); // #D89A50
  const amberDark = rgb(184 / 255, 118 / 255, 51 / 255); // #B87633
  const amberSoft = rgb(255 / 255, 248 / 255, 239 / 255); // #FFF8EF

  // Papel claro com moldura mínima.
  page.drawRectangle({ x: 0, y: 0, width, height, color: paper });
  page.drawRectangle({
    x: 28,
    y: 28,
    width: width - 56,
    height: height - 56,
    color: white,
    borderColor: border,
    borderWidth: 0.9,
  });

  // Assinatura visual Breves: apenas duas linhas âmbar, sem ornamentos pesados.
  page.drawRectangle({ x: 55, y: height - 58, width: 74, height: 3, color: amber });
  page.drawRectangle({ x: width - 129, y: height - 58, width: 74, height: 3, color: amber });

  drawCentered(page, "CERTIFICADO", {
    y: height - 102,
    size: 30,
    font: bold,
    color: ink,
  });
  drawCentered(page, "Reconhecimento de participação", {
    y: height - 124,
    size: 9.5,
    font: regular,
    color: muted,
  });

  drawCentered(page, "Certificamos que", {
    y: height - 169,
    size: 12,
    font: italic,
    color: muted,
  });

  // Nome é o principal destaque em âmbar.
  const name = data.participantName.toUpperCase();
  const nameSize = fitTextSize(name, bold, width - 170, 27, 14);
  drawCentered(page, name, {
    y: height - 207,
    size: nameSize,
    font: bold,
    color: amberDark,
  });

  page.drawLine({
    start: { x: width / 2 - 95, y: height - 220 },
    end: { x: width / 2 + 95, y: height - 220 },
    thickness: 1.2,
    color: amber,
  });

  // Corpo mantém o texto configurado no evento, com leitura limpa e neutra.
  const body = applyPlaceholders(data.certificateText || DEFAULT_CERTIFICATE_TEXT, data);
  const fittedBody = fitWrappedText(body, regular, width - 190, 5, 14, 11);
  const lineHeight = fittedBody.size * 1.65;
  let bodyY = height - 263;

  for (const line of fittedBody.lines) {
    drawCentered(page, line, {
      y: bodyY,
      size: fittedBody.size,
      font: regular,
      color: ink,
    });
    bodyY -= lineHeight;
  }

  // Dados-chave em âmbar, separados do texto corrido para leitura rápida.
  const gap = 10;
  const rowX = 64;
  const totalWidth = width - 128;
  const eventWidth = 310;
  const qualificationWidth = 185;
  const workloadWidth = totalWidth - eventWidth - qualificationWidth - gap * 2;
  const infoY = 181;

  drawInfoBlock(page, {
    x: rowX,
    y: infoY,
    width: eventWidth,
    label: "EVENTO",
    value: data.eventName,
    regular,
    bold,
    labelColor: muted,
    valueColor: amberDark,
    background: amberSoft,
    border,
  });
  drawInfoBlock(page, {
    x: rowX + eventWidth + gap,
    y: infoY,
    width: qualificationWidth,
    label: "QUALIFICAÇÃO",
    value: data.qualification || "Participante",
    regular,
    bold,
    labelColor: muted,
    valueColor: amberDark,
    background: amberSoft,
    border,
  });
  drawInfoBlock(page, {
    x: rowX + eventWidth + qualificationWidth + gap * 2,
    y: infoY,
    width: workloadWidth,
    label: "CARGA HORÁRIA",
    value: workloadLabel(data.workloadHours),
    regular,
    bold,
    labelColor: muted,
    valueColor: amberDark,
    background: amberSoft,
    border,
  });

  // Assinatura/organização sem competir com os dados principais.
  const signatureY = 133;
  page.drawLine({
    start: { x: width / 2 - 118, y: signatureY },
    end: { x: width / 2 + 118, y: signatureY },
    thickness: 0.8,
    color: border,
  });
  if (data.organizer) {
    drawCentered(page, data.organizer, {
      y: signatureY - 18,
      size: 11,
      font: bold,
      color: ink,
    });
  }
  drawCentered(page, "Organização do evento", {
    y: signatureY - (data.organizer ? 32 : 18),
    size: 9,
    font: regular,
    color: muted,
  });

  // Rodapé discreto; somente o código de validação recebe destaque âmbar.
  page.drawLine({
    start: { x: 64, y: 72 },
    end: { x: width - 64, y: 72 },
    thickness: 0.7,
    color: border,
  });

  page.drawText(`Emitido em ${formatDateLong(data.issuedAt)}`, {
    x: 64,
    y: 51,
    size: 8.5,
    font: regular,
    color: muted,
  });

  const validationText = `Código de validação: ${data.validationCode}`;
  const validationSize = 9;
  const validationWidth = bold.widthOfTextAtSize(validationText, validationSize);
  page.drawText(validationText, {
    x: width - 64 - validationWidth,
    y: 51,
    size: validationSize,
    font: bold,
    color: amberDark,
  });

  drawCentered(page, "Confira a autenticidade em /validar", {
    y: 37,
    size: 7.5,
    font: regular,
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
