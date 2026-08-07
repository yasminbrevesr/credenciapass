export function SiteFooter() {
  return (
    <footer className="no-print relative overflow-hidden border-t border-brand-300/15 bg-[#050505] text-white">
      <div className="pointer-events-none absolute -right-20 -top-24 h-48 w-48 rounded-full bg-brand-400/10 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-300/40 to-transparent" />

      <div className="relative mx-auto flex max-w-7xl flex-col gap-2 px-4 py-4 text-[11px] text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
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

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 sm:justify-end">
          <span>CNPJ 68.054.344/0001-17</span>
          <span className="hidden text-brand-300/50 sm:inline" aria-hidden>
            ·
          </span>
          <a
            href="https://brevestech.com/"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-zinc-400 transition hover:text-brand-300"
          >
            brevestech.com
          </a>
        </div>
      </div>
    </footer>
  );
}
