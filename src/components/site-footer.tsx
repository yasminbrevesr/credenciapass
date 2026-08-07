export function SiteFooter() {
  return (
    <footer className="no-print border-t border-black bg-black">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-5 text-center text-xs text-stone-300 sm:flex-row sm:text-left">
        <p>
          © {new Date().getFullYear()} {" "}
          <a
            href="https://brevestech.com/"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-brand-600 transition hover:text-brand-400 hover:underline"
          >
            BrevesCorp
          </a>
          . Todos os direitos reservados.
        </p>
        <p className="text-brand-600">CNPJ 68.054.344/0001-17</p>
      </div>
    </footer>
  );
}
