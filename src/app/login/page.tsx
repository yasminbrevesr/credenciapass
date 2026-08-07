import { Logo } from "@/components/logo";
import { SiteFooter } from "@/components/site-footer";

import { LoginForm } from "./login-form";

export const metadata = { title: "Entrar" };

export default async function LoginPage(props: PageProps<"/login">) {
  const params = await props.searchParams;
  const raw = params.redirect;
  const redirectTo = typeof raw === "string" && raw.startsWith("/") ? raw : "/";

  return (
    <div className="flex min-h-screen flex-col bg-stone-100">
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex flex-col items-center gap-2">
            <Logo size="lg" />
            <p className="text-sm text-slate-500">Credenciamento e presença em eventos</p>
          </div>

          <div className="card-pad">
            <LoginForm redirectTo={redirectTo} />
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">
            Precisa validar um certificado?{" "}
            <a className="font-medium text-brand-600 hover:text-brand-700 hover:underline" href="/validar">
              Clique aqui
            </a>
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
