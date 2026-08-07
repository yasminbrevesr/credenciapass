export function ReportExportMenu({ eventId }: { eventId: string }) {
  return (
    <details className="group relative z-30">
      <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-xl border border-brand-300/25 bg-white/[0.055] px-3.5 py-2.5 text-xs font-semibold text-zinc-200 shadow-inner shadow-white/[0.025] backdrop-blur-xl transition hover:border-brand-300/45 hover:bg-brand-400/10 hover:text-white [&::-webkit-details-marker]:hidden">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 text-brand-300" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0 4-4m-4 4-4-4M5 19h14" />
        </svg>
        Exportar Excel
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 text-zinc-500 transition group-open:rotate-180" aria-hidden="true">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.51a.75.75 0 0 1-1.08 0l-4.25-4.51a.75.75 0 0 1 .02-1.06Z" clipRule="evenodd" />
        </svg>
      </summary>

      <div className="absolute right-0 mt-2 w-[20rem] max-w-[calc(100vw-3rem)] overflow-hidden rounded-2xl border border-white/10 bg-[#0b0b0b]/95 p-2 shadow-2xl shadow-black/50 backdrop-blur-2xl">
        <div className="px-3 pb-2 pt-1">
          <p className="text-xs font-semibold text-white">Exportar relatórios</p>
          <p className="mt-0.5 text-[11px] text-zinc-500">Planilhas .xlsx prontas para análise.</p>
        </div>

        <a
          href={`/api/eventos/${eventId}/relatorios/inscritos`}
          className="flex items-center justify-between gap-4 rounded-xl border border-transparent px-3 py-2.5 transition hover:border-white/5 hover:bg-white/[0.055]"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium text-zinc-100">Inscritos por qualificação</p>
            <p className="mt-0.5 text-[11px] text-zinc-500">Listagem e resumo por categoria.</p>
          </div>
          <span className="shrink-0 rounded-md border border-brand-300/20 bg-brand-400/10 px-2 py-1 text-[10px] font-bold text-brand-300">XLSX</span>
        </a>

        <a
          href={`/api/eventos/${eventId}/relatorios/presenca`}
          className="flex items-center justify-between gap-4 rounded-xl border border-transparent px-3 py-2.5 transition hover:border-white/5 hover:bg-white/[0.055]"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium text-zinc-100">Presença por dia e geral</p>
            <p className="mt-0.5 text-[11px] text-zinc-500">Resumo diário e presença consolidada.</p>
          </div>
          <span className="shrink-0 rounded-md border border-brand-300/20 bg-brand-400/10 px-2 py-1 text-[10px] font-bold text-brand-300">XLSX</span>
        </a>
      </div>
    </details>
  );
}
