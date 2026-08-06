"use client";

import { useEffect, useRef } from "react";

import type { CodeType, LabelFormat } from "@/lib/labels";

type Label = {
  id: string;
  name: string;
  qualification: string;
  organization: string | null;
  code: string;
  qrCode: string | null;
};

/** Nomes longos diminuem de tamanho para caber na etiqueta. */
function nameFontSize(name: string, base: number) {
  if (name.length > 34) return base * 0.62;
  if (name.length > 26) return base * 0.75;
  if (name.length > 18) return base * 0.88;
  return base;
}

function Barcode({ value, height }: { value: string; height: number }) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const JsBarcode = (await import("jsbarcode")).default;
      if (cancelled || !ref.current) return;
      JsBarcode(ref.current, value, {
        format: "CODE128",
        displayValue: false,
        margin: 0,
        height: height * 3,
        width: 1.6,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [value, height]);

  return <svg ref={ref} style={{ width: "100%", height: `${height}mm` }} />;
}

export function LabelSheet({
  eventName,
  format,
  codeType,
  labels,
}: {
  eventName: string;
  format: LabelFormat;
  codeType: CodeType;
  labels: Label[];
}) {
  const big = format.height >= 60;
  const codeHeight = big ? 18 : format.height >= 35 ? 11 : 8;

  return (
    <>
      <style>{`
        @page { size: A4; margin: ${format.pageMargin}mm; }
        @media print { .no-print { display: none !important; } }
      `}</style>

      <div className="no-print flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-slate-800">
            {labels.length} {labels.length === 1 ? "etiqueta" : "etiquetas"} · {format.name}
          </p>
          <p className="text-xs text-slate-500">
            Ao imprimir, use margens &ldquo;padrão/nenhuma&rdquo; e escala 100% para o tamanho ficar exato.
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={() => window.print()}>
          Imprimir
        </button>
      </div>

      <div
        className="print-area mx-auto"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${format.columns}, ${format.width}mm)`,
          justifyContent: "center",
          padding: `${format.pageMargin}mm 0`,
        }}
      >
        {labels.map((label) => (
          <div
            key={label.id}
            style={{
              width: `${format.width}mm`,
              height: `${format.height}mm`,
              padding: big ? "5mm" : "2.5mm",
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              overflow: "hidden",
              breakInside: "avoid",
              pageBreakInside: "avoid",
            }}
          >
            {big ? (
              <p style={{ fontSize: "9pt", color: "#64748b", marginBottom: "2mm" }}>{eventName}</p>
            ) : null}

            <p
              style={{
                fontSize: `${nameFontSize(label.name, format.nameSize)}pt`,
                fontWeight: 700,
                lineHeight: 1.15,
                color: "#0f172a",
              }}
            >
              {label.name}
            </p>

            <p
              style={{
                marginTop: "1.5mm",
                fontSize: big ? "12pt" : "8pt",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "#1f4bd8",
              }}
            >
              {label.qualification}
            </p>

            {label.organization && format.height >= 35 ? (
              <p style={{ fontSize: big ? "9pt" : "7pt", color: "#475569", marginTop: "1mm" }}>
                {label.organization}
              </p>
            ) : null}

            {codeType === "qrcode" && label.qrCode ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={label.qrCode}
                alt=""
                style={{ height: `${codeHeight}mm`, width: `${codeHeight}mm`, marginTop: "1.5mm" }}
              />
            ) : null}

            {codeType === "barras" ? (
              <div style={{ width: "80%", marginTop: "1.5mm" }}>
                <Barcode value={label.code} height={codeHeight * 0.6} />
              </div>
            ) : null}

            {codeType !== "nenhum" ? (
              <p
                style={{
                  fontSize: big ? "8pt" : "6pt",
                  fontFamily: "monospace",
                  color: "#64748b",
                  marginTop: "0.5mm",
                }}
              >
                {label.code}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </>
  );
}
