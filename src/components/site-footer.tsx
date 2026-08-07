export function SiteFooter() {
  return (
    <footer className="no-print border-t border-stone-200 bg-white/70">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-1 px-4 py-5 text-center text-xs text-slate-500 sm:flex-row sm:gap-2">
        <span>© {new Date().getFullYear()} BrevesCorp. Todos os direitos reservados.</span>
        <span className="hidden sm:inline" aria-hidden>·</span>
        <span>CNPJ 68.054.344/0001-17</span>
      </div>
    </footer>
  );
}
