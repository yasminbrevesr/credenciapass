"use client";

import Link from "next/link";
import { useActionState } from "react";

import { SubmitButton } from "@/components/submit-button";

import {
  createParticipantAction,
  updateParticipantAction,
  type ParticipantFormState,
} from "./actions";

export type ParticipantFormValues = {
  id?: string;
  name: string;
  document: string;
  email: string;
  phone: string;
  qualification: string;
  organization: string;
  position: string;
  notes: string;
};

export function ParticipantForm({
  eventId,
  qualifications,
  values,
  cancelHref,
}: {
  eventId: string;
  qualifications: string[];
  values: ParticipantFormValues;
  cancelHref: string;
}) {
  const isEdit = Boolean(values.id);
  const [state, formAction] = useActionState<ParticipantFormState, FormData>(
    isEdit ? updateParticipantAction : createParticipantAction,
    {},
  );

  const options = qualifications.includes(values.qualification) || !values.qualification
    ? qualifications
    : [...qualifications, values.qualification];

  return (
    <form action={formAction} className="card-pad space-y-4">
      <input type="hidden" name="eventId" value={eventId} />
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="name">Nome completo *</label>
          <input id="name" name="name" className="input" defaultValue={values.name} required autoFocus />
        </div>

        <div>
          <label className="label" htmlFor="document">CPF *</label>
          <input
            id="document"
            name="document"
            className="input"
            defaultValue={values.document}
            placeholder="000.000.000-00"
            inputMode="numeric"
            maxLength={14}
            required
          />
        </div>

        <div>
          <label className="label" htmlFor="qualification">Qualificação *</label>
          <select
            id="qualification"
            name="qualification"
            className="input"
            defaultValue={values.qualification || options[0]}
          >
            {options.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="email">E-mail</label>
          <input id="email" name="email" type="email" className="input" defaultValue={values.email} />
        </div>

        <div>
          <label className="label" htmlFor="phone">Celular</label>
          <input
            id="phone"
            name="phone"
            className="input"
            inputMode="tel"
            defaultValue={values.phone}
            placeholder="(11) 90000-0000"
          />
        </div>

        <div>
          <label className="label" htmlFor="organization">Instituição / empresa</label>
          <input id="organization" name="organization" className="input" defaultValue={values.organization} />
        </div>

        <div>
          <label className="label" htmlFor="position">Cargo / função</label>
          <input id="position" name="position" className="input" defaultValue={values.position} />
        </div>

        <div className="sm:col-span-2">
          <label className="label" htmlFor="notes">Observações</label>
          <textarea id="notes" name="notes" className="input min-h-20" defaultValue={values.notes} />
        </div>
      </div>

      {state.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton>{isEdit ? "Salvar alterações" : "Inscrever"}</SubmitButton>
        {isEdit ? null : (
          <SubmitButton className="btn-secondary" name="intent" value="save-and-new">
            Inscrever e cadastrar outro
          </SubmitButton>
        )}
        <Link href={cancelHref} className="btn-secondary">Cancelar</Link>
      </div>
    </form>
  );
}
