import { Logo } from "@/components/logo";
import { prisma } from "@/lib/db";
import { formatDateLong, formatPeriod } from "@/lib/utils";

export const metadata = { title: "Validar certificado" };

/** Página pública: qualquer pessoa pode conferir um código de certificado. */
export default async function ValidatePage(props: PageProps<"/validar">) {
  const searchParams = await props.searchParams;
  const code = typeof searchParams.codigo === "string" ? searchParams.codigo.trim() : "";

  const certificate = code
    ? await prisma.certificate.findUnique({
        where: { code: code.toUpperCase() },
        include: { participant: { include: { event: true, attendances: true } } },
      })
    : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-lg space-y-5">
        <div className="flex flex-col items-center gap-2">
          <Logo size="lg" />
          <p className="text-sm text-slate-500">Validação de certificado</p>
        </div>

        <form className="card-pad flex flex-wrap items-end gap-3" action="/validar">
          <div className="min-w-48 flex-1">
            <label className="label" htmlFor="codigo">
              Código de validação
            </label>
            <input
              id="codigo"
              name="codigo"
              className="input font-mono"
              defaultValue={code}
              placeholder="CERT-XXXXXXXX"
              autoFocus
            />
          </div>
          <button type="submit" className="btn-primary">
            Validar
          </button>
        </form>

        {code ? (
          certificate ? (
            <div className="card-pad space-y-3">
              <p className="badge bg-emerald-50 text-emerald-700">Certificado autêntico</p>
              <dl className="space-y-2 text-sm">
                <Row label="Nome" value={certificate.participant.name} />
                <Row label="Qualificação" value={certificate.participant.qualification} />
                <Row label="Evento" value={certificate.participant.event.name} />
                <Row
                  label="Período"
                  value={formatPeriod(
                    certificate.participant.event.startDate,
                    certificate.participant.event.endDate,
                  )}
                />
                {certificate.participant.event.workloadHours != null ? (
                  <Row
                    label="Carga horária"
                    value={`${String(certificate.participant.event.workloadHours).replace(".", ",")} h`}
                  />
                ) : null}
                <Row label="Dias de presença" value={String(certificate.participant.attendances.length)} />
                <Row label="Emitido em" value={formatDateLong(certificate.issuedAt)} />
              </dl>
            </div>
          ) : (
            <div className="card-pad">
              <p className="badge bg-red-50 text-red-700">Código não encontrado</p>
              <p className="mt-2 text-sm text-slate-600">
                Confira se o código foi digitado exatamente como aparece no certificado.
              </p>
            </div>
          )
        ) : null}
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 pb-1.5">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-900">{value}</dd>
    </div>
  );
}
