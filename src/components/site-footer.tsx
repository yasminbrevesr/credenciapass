export function SiteFooter() {
  return (
    <footer className="no-print bg-black">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-1 px-4 py-5 text-center text-xs text-white sm:flex-row sm:gap-2">
        <span>
          © {new Date().getFullYear()}{" "}
          <a
            href="https://brevestech.com/"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-[#D89A50] hover:underline"
          >
            BrevesCorp
          </a>
          . Todos os direitos reservados.
        </span>

        <span className="hidden sm:inline text-[#D89A50]" aria-hidden>
          ·
        </span>

        <span className="text-[#D89A50]">CNPJ 68.054.344/0001-17</span>
      </div>
    </footer>
  );
}
