"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/submit-button";

import { publicRegistrationAction, type PublicRegistrationState } from "./actions";

export function RegistrationForm({
  eventId,
  qualifications,
}: {
  eventId: string;
  qualifications: string[];
}) {
  const [state, formAction] = useActionState<PublicRegistrationState, FormData>(
    publicRegistrationAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="eventId" value={eventId} />
      <div className="hidden" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <div>
        <label className="label" htmlFor="name">Nome completo *</label>
        <input id="name" name="name" className="input" autoComplete="name" required autoFocus />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="document">CPF *</label>
          <input
            id="document"
            name="document"
            className="input"
            placeholder="000.000.000-00"
            inputMode="numeric"
            autoComplete="off"
            maxLength={14}
            required
          />
        </div>

        <div>
          <label className="label" htmlFor="qualification">Qualificação *</label>
          <select id="qualification" name="qualification" className="input" required>
            {qualifications.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="email">E-mail *</label>
          <input id="email" name="email" type="email" className="input" autoComplete="email" required />
        </div>

        <div>
          <label className="label" htmlFor="phone">Celular *</label>
          <input
            id="phone"
            name="phone"
            className="input"
            inputMode="tel"
            autoComplete="tel"
            placeholder="(11) 90000-0000"
            required
          />
        </div>

        <div>
          <label className="label" htmlFor="organization">Instituição / empresa</label>
          <input id="organization" name="organization" className="input" autoComplete="organization" />
        </div>

        <div>
          <label className="label" htmlFor="position">Cargo / função</label>
          <input id="position" name="position" className="input" autoComplete="organization-title" />
        </div>
      </div>

      {state.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}

      <SubmitButton pendingLabel="Enviando inscrição..." className="btn-primary w-full sm:w-auto">
        Confirmar inscrição
      </SubmitButton>

      <p className="text-xs leading-5 text-slate-500">
        Seus dados serão utilizados exclusivamente para a gestão desta inscrição e do credenciamento do evento.
      </p>
    </form>
  );
}
