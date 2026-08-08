import { notFound } from "next/navigation";

import { Logo } from "@/components/logo";
import { prisma } from "@/lib/db";
import { formatPeriod, parseQualifications } from "@/lib/utils";

import { RegistrationForm } from "./registration-form";

export const metadata = { title: "Inscrição" };

export default async function PublicRegistrationPage(
  props: PageProps<"/inscricao/[eventId]">,
) {
  const { eventId } = await props.params;
  const searchParams = await props.searchParams;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      name: true,
      description: true,
      location: true,
      organizer: true,
      startDate: true,
      endDate: true,
      qualifications: true,
      archived: true,
    },
  });

  if (!event) notFound();

  const success = searchParams.ok === "1";
  const qualifications = parseQualifications(event.qualifications);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-6 flex justify-center">
          <Logo size="lg" />
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <header className="border-b border-slate-200 bg-slate-50 px-5 py-6 sm:px-8">
            <p className="mb-2 text-xs font-semibold tracking-[0.18em] text-brand-600 uppercase">
              Inscrição no evento
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              {event.name}
            </h1>
            <div className="mt-3 space-y-1 text-sm text-slate-600">
              <p>{formatPeriod(event.startDate, event.endDate)}</p>
              {event.location ? <p>{event.location}</p> : null}
              {event.organizer ? <p>Organização: {event.organizer}</p> : null}
            </div>
            {event.description ? (
              <p className="mt-4 text-sm leading-6 text-slate-600">{event.description}</p>
            ) : null}
          </header>

          <div className="px-5 py-6 sm:px-8 sm:py-8">
            {event.archived ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
                <h2 className="font-semibold text-amber-900">Inscrições encerradas</h2>
                <p className="mt-1 text-sm text-amber-800">
                  Este formulário não está mais recebendo novas inscrições.
                </p>
              </div>
            ) : success ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700">
                  ✓
                </div>
                <h2 className="text-xl font-bold text-emerald-950">Inscrição confirmada!</h2>
                <p className="mt-2 text-sm leading-6 text-emerald-800">
                  Seus dados foram recebidos com sucesso. Você não precisa criar senha nem acessar o sistema.
                </p>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-slate-900">Seus dados</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Preencha o formulário abaixo para concluir sua inscrição.
                  </p>
                </div>
                <RegistrationForm
                  eventId={event.id}
                  qualifications={qualifications.length ? qualifications : ["Participante"]}
                />
              </>
            )}
          </div>
        </section>

        <p className="mt-5 text-center text-xs text-slate-400">
          Página pública de inscrição · sem acesso às áreas internas do CredenciaPass
        </p>
      </div>
    </main>
  );
}
