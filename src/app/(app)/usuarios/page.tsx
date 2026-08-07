import { SubmitButton } from "@/components/submit-button";
import { PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";

import { deleteUserAction } from "./actions";
import { EditUserForm, NewUserForm } from "./user-forms";

export const metadata = { title: "Administradores" };

export default async function UsersPage() {
  const admin = await requireAdmin();
  const users = await prisma.user.findMany({
    where: { role: "ADMIN" },
    orderBy: { name: "asc" },
  });

  return (
    <>
      <PageHeader
        title="Administradores"
        subtitle="Gerencie apenas acessos administrativos. Operadores são cadastrados dentro de cada evento, na aba Operadores."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="card divide-y divide-slate-100">
            {users.map((user) => (
              <div key={user.id} className="p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-900">
                      {user.name}
                      {user.id === admin.id ? <span className="ml-2 text-xs text-slate-400">(você)</span> : null}
                    </p>
                    <p className="text-sm text-slate-500">{user.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">criado em {formatDate(user.createdAt)}</span>
                    {user.id === admin.id ? null : (
                      <form action={deleteUserAction}>
                        <input type="hidden" name="id" value={user.id} />
                        <SubmitButton
                          className="btn-danger btn-sm"
                          pendingLabel="..."
                          confirm={`Excluir o administrador ${user.name}?`}
                        >
                          Excluir
                        </SubmitButton>
                      </form>
                    )}
                  </div>
                </div>

                <EditUserForm
                  user={{
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    active: user.active,
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        <NewUserForm />
      </div>
    </>
  );
}
