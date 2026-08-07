"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/submit-button";

import { createUserAction, updateUserAction, type UserFormState } from "./actions";

type EventOption = { id: string; name: string };

function Feedback({ state }: { state: UserFormState }) {
  if (state.error) {
    return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>;
  }
  if (state.ok) {
    return <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{state.ok}</p>;
  }
  return null;
}

function EventAccessFields({ events, selected = [] }: { events: EventOption[]; selected?: string[] }) {
  return (
    <fieldset className="rounded-lg border border-slate-200 p-3">
      <legend className="px-1 text-xs font-semibold tracking-wide text-slate-500 uppercase">
        Eventos permitidos ao operador
      </legend>
      {events.length === 0 ? (
        <p className="text-xs text-slate-500">Nenhum evento disponível.</p>
      ) : (
        <div className="mt-1 grid gap-2 sm:grid-cols-2">
          {events.map((event) => (
            <label key={event.id} className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                name="eventIds"
                value={event.id}
                defaultChecked={selected.includes(event.id)}
                className="h-4 w-4 accent-brand-600"
              />
              <span>{event.name}</span>
            </label>
          ))}
        </div>
      )}
      <p className="mt-2 text-xs text-slate-400">
        Administradores têm acesso a todos os eventos, independentemente desta seleção.
      </p>
    </fieldset>
  );
}

export function NewUserForm({ events }: { events: EventOption[] }) {
  const [state, formAction] = useActionState<UserFormState, FormData>(createUserAction, {});

  return (
    <form action={formAction} className="card-pad space-y-4">
      <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">Novo usuário</h2>

      <div>
        <label className="label" htmlFor="name">Nome</label>
        <input id="name" name="name" className="input" required />
      </div>

      <div>
        <label className="label" htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" className="input" required />
      </div>

      <div>
        <label className="label" htmlFor="password">Senha</label>
        <input id="password" name="password" type="password" className="input" minLength={6} required />
      </div>

      <div>
        <label className="label" htmlFor="role">Perfil</label>
        <select id="role" name="role" className="input" defaultValue="OPERADOR">
          <option value="OPERADOR">Operador</option>
          <option value="ADMIN">Administrador</option>
        </select>
      </div>

      <EventAccessFields events={events} />

      <Feedback state={state} />
      <SubmitButton>Criar usuário</SubmitButton>
    </form>
  );
}

export function EditUserForm({
  user,
  events,
}: {
  user: { id: string; name: string; email: string; role: string; active: boolean; eventIds: string[] };
  events: EventOption[];
}) {
  const [state, formAction] = useActionState<UserFormState, FormData>(updateUserAction, {});

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="id" value={user.id} />

      <div className="grid gap-3 sm:grid-cols-4">
        <input name="name" className="input" defaultValue={user.name} required />
        <select name="role" className="input" defaultValue={user.role}>
          <option value="OPERADOR">Operador</option>
          <option value="ADMIN">Administrador</option>
        </select>
        <input
          name="password"
          type="password"
          className="input"
          placeholder="Nova senha (opcional)"
          minLength={6}
        />
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name="active"
              defaultChecked={user.active}
              className="h-4 w-4 accent-brand-600"
            />
            Ativo
          </label>
          <SubmitButton className="btn-secondary btn-sm">Salvar</SubmitButton>
        </div>
      </div>

      {user.role === "OPERADOR" ? (
        <EventAccessFields events={events} selected={user.eventIds} />
      ) : (
        <EventAccessFields events={events} selected={user.eventIds} />
      )}

      <Feedback state={state} />
    </form>
  );
}
