"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/submit-button";

import { createUserAction, updateUserAction, type UserFormState } from "./actions";

function Feedback({ state }: { state: UserFormState }) {
  if (state.error) {
    return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>;
  }
  if (state.ok) {
    return <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{state.ok}</p>;
  }
  return null;
}

export function NewUserForm() {
  const [state, formAction] = useActionState<UserFormState, FormData>(createUserAction, {});

  return (
    <form action={formAction} className="card-pad space-y-4">
      <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">Novo usuário</h2>

      <div>
        <label className="label" htmlFor="name">
          Nome
        </label>
        <input id="name" name="name" className="input" required />
      </div>

      <div>
        <label className="label" htmlFor="email">
          E-mail
        </label>
        <input id="email" name="email" type="email" className="input" required />
      </div>

      <div>
        <label className="label" htmlFor="password">
          Senha
        </label>
        <input id="password" name="password" type="password" className="input" minLength={6} required />
      </div>

      <div>
        <label className="label" htmlFor="role">
          Perfil
        </label>
        <select id="role" name="role" className="input" defaultValue="OPERADOR">
          <option value="OPERADOR">Operador (credenciamento e consultas)</option>
          <option value="ADMIN">Administrador (acesso total)</option>
        </select>
      </div>

      <Feedback state={state} />
      <SubmitButton>Criar usuário</SubmitButton>
    </form>
  );
}

export function EditUserForm({
  user,
}: {
  user: { id: string; name: string; email: string; role: string; active: boolean };
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

      <Feedback state={state} />
    </form>
  );
}
