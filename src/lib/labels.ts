/** Formatos de etiqueta disponíveis para impressão em folha A4. */
export type LabelFormat = {
  id: string;
  name: string;
  description: string;
  /** Colunas por folha. */
  columns: number;
  /** Largura e altura da etiqueta, em milímetros. */
  width: number;
  height: number;
  /** Margem da folha, em milímetros. */
  pageMargin: number;
  /** Escala tipográfica base (rem) usada dentro da etiqueta. */
  nameSize: number;
};

export const LABEL_FORMATS: LabelFormat[] = [
  {
    id: "cracha",
    name: "Crachá (2 por linha)",
    description: "99 × 67 mm — 8 por folha. Ideal para crachá adesivo.",
    columns: 2,
    width: 99,
    height: 67,
    pageMargin: 6,
    nameSize: 15,
  },
  {
    id: "media",
    name: "Etiqueta média (3 por linha)",
    description: "63,5 × 38,1 mm — 21 por folha (padrão Pimaco 6180).",
    columns: 3,
    width: 63.5,
    height: 38.1,
    pageMargin: 5,
    nameSize: 10,
  },
  {
    id: "pequena",
    name: "Etiqueta pequena (3 por linha)",
    description: "66,7 × 25,4 mm — 33 por folha (padrão Pimaco 6081).",
    columns: 3,
    width: 66.7,
    height: 25.4,
    pageMargin: 5,
    nameSize: 8,
  },
];

export function getLabelFormat(id?: string | null): LabelFormat {
  return LABEL_FORMATS.find((format) => format.id === id) ?? LABEL_FORMATS[0];
}

export type CodeType = "qrcode" | "barras" | "nenhum";

export function getCodeType(value?: string | null): CodeType {
  return value === "barras" || value === "nenhum" ? value : "qrcode";
}
