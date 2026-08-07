/** Utilidades de data, texto e códigos usadas em todo o sistema. */

const TZ = "America/Sao_Paulo";

/**
 * Datas de dias de evento são guardadas como "meio-dia UTC" do dia escolhido.
 * Isso evita que o fuso horário empurre a data para o dia anterior/seguinte.
 */
export function dateOnly(value: string | Date): Date {
  if (value instanceof Date) {
    return new Date(
      Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(), 12, 0, 0),
    );
  }
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

/** Formato aceito por <input type="date"> (YYYY-MM-DD). */
export function toInputDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", dateStyle: "short" }).format(date);
}

export function formatDateLong(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", dateStyle: "long" }).format(date);
}

export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ,
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, timeStyle: "short" }).format(date);
}

export function formatPeriod(start: Date, end: Date): string {
  return start.getTime() === end.getTime()
    ? formatDateLong(start)
    : `${formatDateLong(start)} a ${formatDateLong(end)}`;
}

/** Lista todos os dias entre duas datas (inclusive), normalizados por dateOnly. */
export function eachDay(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const cursor = dateOnly(start);
  const last = dateOnly(end);
  while (cursor.getTime() <= last.getTime()) {
    days.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem I, O, 0 e 1

/** Código curto e legível usado no QR Code / código de barras do crachá. */
export function generateCode(prefix = "CP"): string {
  let body = "";
  for (let i = 0; i < 8; i += 1) {
    body += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return `${prefix}-${body}`;
}

export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function onlyDigits(value: string): string {
  return value.replace(/\D+/g, "");
}

const LOWERCASE_NAME_WORDS = new Set(["da", "das", "de", "do", "dos", "e"]);

/** Padroniza nomes e textos curtos, preservando conectivos comuns em minúsculo. */
export function titleCase(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("pt-BR")
    .split(" ")
    .map((word, index) => {
      if (index > 0 && LOWERCASE_NAME_WORDS.has(word)) return word;
      return word
        .split("-")
        .map((part) => (part ? part.charAt(0).toLocaleUpperCase("pt-BR") + part.slice(1) : part))
        .join("-");
    })
    .join(" ");
}

/**
 * CPF sempre no padrão 000.000.000-00. Se vier de célula numérica do Excel e
 * perder um zero à esquerda, ele é restaurado até completar 11 dígitos.
 */
export function formatCpf(value: string): string {
  const rawDigits = onlyDigits(value);
  if (!rawDigits) return "";
  const digits = rawDigits.length <= 11 ? rawDigits.padStart(11, "0") : rawDigits;
  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }
  return value.trim();
}

/** Formata CPF/CNPJ quando o documento parece ser um deles; senão devolve como veio. */
export function formatDocument(value: string): string {
  const digits = onlyDigits(value);
  if (digits.length === 11 || (digits.length === 10 && !value.includes("/"))) {
    return formatCpf(value);
  }
  if (digits.length === 14) {
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  }
  return value.trim();
}

export function formatPhone(value?: string | null): string {
  if (!value) return "";
  const digits = onlyDigits(value);
  if (digits.length === 11) return digits.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  if (digits.length === 10) return digits.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  return value.trim();
}

export function normalizeEmail(value?: string | null): string | null {
  const normalized = value?.trim().toLocaleLowerCase("pt-BR") ?? "";
  return normalized || null;
}

export function parseQualifications(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const list = parsed.map((item) => String(item).trim()).filter(Boolean);
      if (list.length > 0) return list;
    }
  } catch {
    // valor inválido no banco: cai no padrão abaixo
  }
  return DEFAULT_QUALIFICATIONS;
}

export const DEFAULT_QUALIFICATIONS = ["Participante", "Professor", "Colaborador"];

/** Converte o texto do textarea de qualificações (uma por linha) em JSON. */
export function serializeQualifications(raw: string): string {
  const list = raw
    .split(/[\n,;]/)
    .map((item) => item.trim())
    .filter(Boolean);
  return JSON.stringify(list.length > 0 ? Array.from(new Set(list)) : DEFAULT_QUALIFICATIONS);
}

export function classNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

/** Slug simples usado em nomes de arquivos exportados. */
export function slugify(value: string): string {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "credenciapass";
}
