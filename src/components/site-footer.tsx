export function SiteFooter() {
  return (
    <footer className="no-print relative overflow-hidden border-t border-brand-300/15 bg-[#050505] text-white">
      <div className="pointer-events-none absolute -right-20 -top-24 h-48 w-48 rounded-full bg-brand-400/10 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-300/40 to-transparent" />

      <div className="relative mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-brand-300/20 bg-brand-400/10 shadow-[0_0_18px_rgba(216,154,80,.12)]">
            <span className="text-sm font-black tracking-tight text-brand-300">CP</span>
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight text-white">
              Credencia<span className="text-brand-300">Pass</span>
            </p>
            <p className="mt-0.5 text-[11px] text-zinc-500">Credenciamento e presença em eventos</p>
          </div>
        </div>

        <div className="flex flex-col gap-1 text-[11px] text-zinc-500 sm:items-end sm:text-right">
          <p>
            © {new Date().getFullYear()}{" "}
            <a
              href="https://brevestech.com/"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-brand-300 transition hover:text-brand-200"
            >
              BrevesCorp
            </a>
            . Todos os direitos reservados.
          </p>
          <p className="text-zinc-600">CNPJ 68.054.344/0001-17</p>
        </div>
      </div>
    </footer>
  );
}
