"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/submit-button";

import { createEventOperatorAction, type OperatorFormState } from "./actions";

export function EventOperatorForm({ eventId }: { eventId: string }) {
  const [state, formAction] = useActionState<OperatorFormState, FormData>(createEventOperatorAction, {});

  return (
    <form action={formAction} className="card-pad space-y-4">
      <input type="hidden" name="eventId" value={eventId} />
      <div>
        <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">Cadastrar operador</h2>
        <p className="mt-1 text-sm text-slate-500">
          O acesso criado aqui fica vinculado a este evento.
        </p>
      </div>

      <div>
        <label className="label" htmlFor="operator-name">Nome</label>
        <input id="operator-name" name="name" className="input" required />
      </div>

      <div>
        <label className="label" htmlFor="operator-email">E-mail de acesso</label>
        <input id="operator-email" name="email" type="email" className="input" required />
      </div>

      <div>
        <label className="label" htmlFor="operator-password">Senha inicial</label>
        <input id="operator-password" name="password" type="password" minLength={6} className="input" required />
        <p className="mt-1 text-xs text-slate-500">Mínimo de 6 caracteres.</p>
      </div>

      {state.error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p> : null}
      {state.ok ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{state.ok}</p> : null}

      <SubmitButton>Cadastrar operador</SubmitButton>
    </form>
  );
}
