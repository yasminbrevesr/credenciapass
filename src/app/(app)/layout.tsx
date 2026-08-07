import Link from "next/link";

import { Logo } from "@/components/logo";
import { NavLink } from "@/components/nav-link";
import { SiteFooter } from "@/components/site-footer";
import { requireUser } from "@/lib/auth";

import { logoutAction } from "./actions";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="no-print border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-3">
          <Link href="/" className="shrink-0">
            <Logo />
          </Link>

          <nav className="flex flex-1 items-center gap-1">
            <NavLink href="/" exact>Eventos</NavLink>
            {user.role === "ADMIN" ? <NavLink href="/usuarios">Administradores</NavLink> : null}
          </nav>

          <div className="flex items-center gap-3">
            <div className="text-right leading-tight">
              <p className="text-sm font-medium text-slate-800">{user.name}</p>
              <p className="text-xs text-slate-500">
                {user.role === "ADMIN" ? "Administrador" : "Operador"}
              </p>
            </div>
            <form action={logoutAction}>
              <button type="submit" className="btn-secondary btn-sm">Sair</button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>
      <SiteFooter />
    </div>
  );
}
