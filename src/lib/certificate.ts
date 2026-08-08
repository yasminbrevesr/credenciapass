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

type Token = {
  text: string;
  highlight: boolean;
};

type WrappedToken = Token & {
  width: number;
};

function workloadLabel(hours: number | null) {
  if (hours == null) return "carga horária não informada";
  return `${String(hours).replace(".", ",")} hora${hours === 1 ? "" : "s"}`;
}

function placeholderMap(data: CertificateData) {
  return {
    "{{nome}}": data.participantName,
    "{{documento}}": formatDocument(data.participantDocument),
    "{{qualificacao}}": data.qualification,
    "{{evento}}": data.eventName,
    "{{local}}": data.eventLocation ?? "—",
    "{{periodo}}": formatPeriod(data.startDate, data.endDate),
    "{{carga_horaria}}": workloadLabel(data.workloadHours),
    "{{dias_presenca}}": String(data.attendedDays),
    "{{data_emissao}}": formatDateLong(data.issuedAt),
    "{{organizador}}": data.organizer ?? "",
  } satisfies Record<string, string>;
}

function tokenizeTemplate(template: string, replacements: Record<string, string>): Token[] {
  const keys = Object.keys(replacements).sort((a, b) => b.length - a.length);
  const tokens: Token[] = [];

  let cursor = 0;
  while (cursor < template.length) {
    let matchedKey: string | null = null;
    for (const key of keys) {
      if (template.startsWith(key, cursor)) {
        matchedKey = key;
        break;
      }
    }

    if (matchedKey) {
      tokens.push({ text: replacements[matchedKey], highlight: true });
      cursor += matchedKey.length;
      continue;
    }

    let next = template.length;
    for (const key of keys) {
      const found = template.indexOf(key, cursor);
      if (found !== -1 && found < next) next = found;
    }

    tokens.push({ text: template.slice(cursor, next), highlight: false });
    cursor = next;
  }

  return tokens.filter((token) => token.text.length > 0);
}

function splitTokenIntoWords(token: Token): Token[] {
  return token.text
    .split(/(\s+)/)
    .filter(Boolean)
    .map((part) => ({ text: part, highlight: token.highlight }));
}

function wrapRichText(
  tokens: Token[],
  font: PDFFont,
  size: number,
  maxWidth: number,
): WrappedToken[][] {
  const lines: WrappedToken[][] = [];
  let line: WrappedToken[] = [];
  let lineWidth = 0;

  const pushLine = () => {
    while (line.length > 0 && /^\s+$/.test(line[line.length - 1].text)) {
      lineWidth -= line[line.length - 1].width;
      line.pop();
    }
    if (line.length > 0) lines.push(line);
    line = [];
    lineWidth = 0;
  };

  for (const raw of tokens.flatMap(splitTokenIntoWords)) {
    if (raw.text.includes("\n")) {
      const parts = raw.text.split("\n");
      parts.forEach((part, index) => {
        if (part) {
          const width = font.widthOfTextAtSize(part, size);
          if (lineWidth + width > maxWidth && line.length > 0) pushLine();
          if (!(line.length === 0 && /^\s+$/.test(part))) {
            line.push({ ...raw, text: part, width });
            lineWidth += width;
          }
        }
        if (index < parts.length - 1) pushLine();
      });
      continue;
    }

    if (line.length === 0 && /^\s+$/.test(raw.text)) continue;

    const width = font.widthOfTextAtSize(raw.text, size);
    if (lineWidth + width > maxWidth && line.length > 0 && !/^\s+$/.test(raw.text)) pushLine();
    if (line.length === 0 && /^\s+$/.test(raw.text)) continue;
    line.push({ ...raw, width });
    lineWidth += width;
  }

  if (line.length > 0) pushLine();
  return lines;
}

function fitRichText(
  tokens: Token[],
  font: PDFFont,
  maxWidth: number,
  maxLines: number,
  initialSize: number,
  minSize: number,
) {
  let size = initialSize;
  let lines = wrapRichText(tokens, font, size, maxWidth);

  while (lines.length > maxLines && size > minSize) {
    size -= 0.5;
    lines = wrapRichText(tokens, font, size, maxWidth);
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

function drawCenteredRichLine(
  page: PDFPage,
  line: WrappedToken[],
  options: {
    y: number;
    size: number;
    font: PDFFont;
    normalColor: ReturnType<typeof rgb>;
    highlightColor: ReturnType<typeof rgb>;
  },
) {
  const totalWidth = line.reduce((sum, token) => sum + token.width, 0);
  let x = (page.getWidth() - totalWidth) / 2;

  for (const token of line) {
    page.drawText(token.text, {
      x,
      y: options.y,
      size: options.size,
      font: options.font,
      color: token.highlight ? options.highlightColor : options.normalColor,
    });
    x += token.width;
  }
}

/** Desenha uma página de certificado (A4 paisagem) em estilo clean, com destaques em âmbar. */
export async function drawCertificatePage(pdf: PDFDocument, data: CertificateData) {
  const page = pdf.addPage([841.89, 595.28]);
  const { width, height } = page.getSize();

  const regular = await pdf.embedFont(StandardFonts.TimesRoman);
  const bold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const italic = await pdf.embedFont(StandardFonts.TimesRomanItalic);

  const paper = rgb(0.985, 0.982, 0.975);
  const white = rgb(1, 1, 1);
  const ink = rgb(0.12, 0.12, 0.12);
  const muted = rgb(0.45, 0.43, 0.40);
  const line = rgb(0.89, 0.87, 0.84);
  const amber = rgb(216 / 255, 154 / 255, 80 / 255);
  const amberDark = rgb(177 / 255, 118 / 255, 51 / 255);

  page.drawRectangle({ x: 0, y: 0, width, height, color: paper });
  page.drawRectangle({
    x: 30,
    y: 30,
    width: width - 60,
    height: height - 60,
    color: white,
    borderColor: line,
    borderWidth: 0.9,
  });

  page.drawLine({
    start: { x: 68, y: height - 68 },
    end: { x: 142, y: height - 68 },
    thickness: 2,
    color: amber,
  });
  page.drawLine({
    start: { x: width - 142, y: height - 68 },
    end: { x: width - 68, y: height - 68 },
    thickness: 2,
    color: amber,
  });

  drawCentered(page, "CERTIFICADO", {
    y: height - 108,
    size: 29,
    font: bold,
    color: ink,
  });

  drawCentered(page, "Reconhecimento de participação", {
    y: height - 128,
    size: 10.5,
    font: regular,
    color: muted,
  });

  drawCentered(page, "Certificamos que", {
    y: height - 174,
    size: 15,
    font: italic,
    color: muted,
  });

  const name = data.participantName.toUpperCase();
  const nameSize = fitTextSize(name, bold, width - 180, 28, 15);
  drawCentered(page, name, {
    y: height - 214,
    size: nameSize,
    font: bold,
    color: amberDark,
  });

  page.drawLine({
    start: { x: width / 2 - 120, y: height - 225 },
    end: { x: width / 2 + 120, y: height - 225 },
    thickness: 0.9,
    color: amber,
  });

  const template = data.certificateText || DEFAULT_CERTIFICATE_TEXT;
  const richTokens = tokenizeTemplate(template, placeholderMap(data));
  const fittedBody = fitRichText(richTokens, regular, width - 190, 6, 17, 12);
  const lineHeight = fittedBody.size * 1.7;
  let cursorY = height - 278;

  for (const richLine of fittedBody.lines) {
    drawCenteredRichLine(page, richLine, {
      y: cursorY,
      size: fittedBody.size,
      font: regular,
      normalColor: ink,
      highlightColor: amberDark,
    });
    cursorY -= lineHeight;
  }

  const signatureY = 140;
  page.drawLine({
    start: { x: width / 2 - 125, y: signatureY },
    end: { x: width / 2 + 125, y: signatureY },
    thickness: 0.8,
    color: line,
  });

  if (data.organizer) {
    drawCentered(page, data.organizer, {
      y: signatureY - 19,
      size: 11.5,
      font: bold,
      color: ink,
    });
  }

  drawCentered(page, "Organização do evento", {
    y: signatureY - (data.organizer ? 34 : 18),
    size: 9.5,
    font: regular,
    color: muted,
  });

  page.drawLine({
    start: { x: 66, y: 76 },
    end: { x: width - 66, y: 76 },
    thickness: 0.7,
    color: line,
  });

  page.drawText(`Emitido em ${formatDateLong(data.issuedAt)}`, {
    x: 66,
    y: 54,
    size: 8.5,
    font: regular,
    color: muted,
  });

  const validationLabel = `Código de validação: ${data.validationCode}`;
  const validationSize = 9.2;
  const validationWidth = bold.widthOfTextAtSize(validationLabel, validationSize);

  page.drawText(validationLabel, {
    x: width - 66 - validationWidth,
    y: 54,
    size: validationSize,
    font: bold,
    color: amberDark,
  });

  drawCentered(page, "Confira a autenticidade em /validar", {
    y: 40,
    size: 7.8,
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
