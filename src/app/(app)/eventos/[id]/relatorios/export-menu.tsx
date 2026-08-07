export function ReportExportMenu({ eventId }: { eventId: string }) {
  return (
    <details className="group relative z-20">
      <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-brand-300 hover:bg-brand-50/60 hover:text-slate-950 [&::-webkit-details-marker]:hidden">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0 4-4m-4 4-4-4M5 19h14" />
        </svg>
        Exportar Excel
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 text-slate-400 transition group-open:rotate-180" aria-hidden="true">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.51a.75.75 0 0 1-1.08 0l-4.25-4.51a.75.75 0 0 1 .02-1.06Z" clipRule="evenodd" />
        </svg>
      </summary>

      <div className="absolute right-0 mt-2 w-[21rem] overflow-hidden rounded-2xl border border-stone-200 bg-white p-2 shadow-xl shadow-slate-900/10">
        <div className="px-3 pb-2 pt-1">
          <p className="text-xs font-semibold text-slate-800">Exportar relatórios</p>
          <p className="mt-0.5 text-[11px] text-slate-500">Arquivos .xlsx prontos para análise e compartilhamento.</p>
        </div>

        <a
          href={`/api/eventos/${eventId}/relatorios/inscritos`}
          className="flex items-center justify-between gap-4 rounded-xl px-3 py-2.5 transition hover:bg-stone-50"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-800">Inscritos por qualificação</p>
            <p className="mt-0.5 text-[11px] text-slate-500">Listagem de inscritos e resumo por categoria.</p>
          </div>
          <span className="shrink-0 rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">XLSX</span>
        </a>

        <a
          href={`/api/eventos/${eventId}/relatorios/presenca`}
          className="flex items-center justify-between gap-4 rounded-xl px-3 py-2.5 transition hover:bg-stone-50"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-800">Presença por dia e geral</p>
            <p className="mt-0.5 text-[11px] text-slate-500">Resumo diário, matriz geral e detalhamento por dia.</p>
          </div>
          <span className="shrink-0 rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">XLSX</span>
        </a>
      </div>
    </details>
  );
}
