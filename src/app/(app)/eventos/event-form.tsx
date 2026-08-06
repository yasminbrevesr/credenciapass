"use client";

import Link from "next/link";
import { useActionState } from "react";

import { SubmitButton } from "@/components/submit-button";

import { createEventAction, updateEventAction, type EventFormState } from "./actions";

export type EventFormValues = {
  id?: string;
  name: string;
  description: string;
  location: string;
  organizer: string;
  startDate: string;
  endDate: string;
  workloadHours: string;
  qualifications: string;
  certificateText: string;
  minAttendanceDays: number;
};

/** Corpo padrão do certificado — o nome já é impresso em destaque acima dele. */
export const CERTIFICATE_PLACEHOLDER =
  "portador(a) do documento {{documento}}, participou do evento {{evento}}, realizado em {{local}} no período de {{periodo}}, com carga horária de {{carga_horaria}}, na qualidade de {{qualificacao}}.";

export function EventForm({ values, cancelHref }: { values: EventFormValues; cancelHref: string }) {
  const isEdit = Boolean(values.id);
  const [state, formAction] = useActionState<EventFormState, FormData>(
    isEdit ? updateEventAction : createEventAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-6">
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}

      <section className="card-pad space-y-4">
        <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">Dados do evento</h2>

        <div>
          <label className="label" htmlFor="name">
            Nome do evento *
          </label>
          <input
            id="name"
            name="name"
            className="input"
            defaultValue={values.name}
            required
            autoFocus
            placeholder="Ex.: 12º Congresso de Tecnologia"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="location">
              Local
            </label>
            <input
              id="location"
              name="location"
              className="input"
              defaultValue={values.location}
              placeholder="Centro de Convenções"
            />
          </div>
          <div>
            <label className="label" htmlFor="organizer">
              Realizador / organizador
            </label>
            <input
              id="organizer"
              name="organizer"
              className="input"
              defaultValue={values.organizer}
              placeholder="Nome que assina o certificado"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="startDate">
              Início *
            </label>
            <input
              id="startDate"
              name="startDate"
              type="date"
              className="input"
              defaultValue={values.startDate}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="endDate">
              Término
            </label>
            <input
              id="endDate"
              name="endDate"
              type="date"
              className="input"
              defaultValue={values.endDate}
            />
          </div>
          <div>
            <label className="label" htmlFor="workloadHours">
              Carga horária (horas)
            </label>
            <input
              id="workloadHours"
              name="workloadHours"
              className="input"
              inputMode="decimal"
              defaultValue={values.workloadHours}
              placeholder="16"
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="description">
            Descrição
          </label>
          <textarea
            id="description"
            name="description"
            className="input min-h-20"
            defaultValue={values.description}
          />
        </div>

        <p className="text-xs text-slate-500">
          Os dias de presença são criados automaticamente a partir do período informado.
        </p>
      </section>

      <section className="card-pad space-y-4">
        <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">
          Qualificações e certificado
        </h2>

        <div>
          <label className="label" htmlFor="qualifications">
            Qualificações aceitas (uma por linha)
          </label>
          <textarea
            id="qualifications"
            name="qualifications"
            className="input min-h-28 font-mono text-xs"
            defaultValue={values.qualifications}
          />
          <p className="mt-1 text-xs text-slate-500">
            Aparecem na etiqueta do crachá e nos relatórios. Ex.: Participante, Professor, Colaborador,
            Palestrante, Staff.
          </p>
        </div>

        <div>
          <label className="label" htmlFor="certificateText">
            Texto do certificado
          </label>
          <textarea
            id="certificateText"
            name="certificateText"
            className="input min-h-32"
            defaultValue={values.certificateText}
            placeholder={CERTIFICATE_PLACEHOLDER}
          />
          <p className="mt-1 text-xs text-slate-500">
            O PDF já imprime <em>&ldquo;Certificamos que&rdquo;</em> e o nome do participante em
            destaque; escreva abaixo apenas o restante do texto. Marcadores disponíveis:{" "}
            <code>{"{{nome}}"}</code>, <code>{"{{documento}}"}</code>,{" "}
            <code>{"{{qualificacao}}"}</code>, <code>{"{{evento}}"}</code>, <code>{"{{local}}"}</code>,{" "}
            <code>{"{{periodo}}"}</code>, <code>{"{{carga_horaria}}"}</code>,{" "}
            <code>{"{{dias_presenca}}"}</code>, <code>{"{{data_emissao}}"}</code>.
          </p>
        </div>

        <div className="max-w-xs">
          <label className="label" htmlFor="minAttendanceDays">
            Presença mínima para certificado (dias)
          </label>
          <input
            id="minAttendanceDays"
            name="minAttendanceDays"
            type="number"
            min={0}
            className="input"
            defaultValue={values.minAttendanceDays}
          />
          <p className="mt-1 text-xs text-slate-500">0 = emitir para qualquer inscrito.</p>
        </div>
      </section>

      {state.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}

      <div className="flex items-center gap-3">
        <SubmitButton>{isEdit ? "Salvar alterações" : "Criar evento"}</SubmitButton>
        <Link href={cancelHref} className="btn-secondary">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
