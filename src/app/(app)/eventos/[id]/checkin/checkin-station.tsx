"use client";

import { useEffect, useRef, useState } from "react";

import { classNames } from "@/lib/utils";

import {
  checkInByCode,
  getRecentCheckIns,
  type CheckInResult,
  type RecentCheckIn,
} from "./actions";

const HISTORY_REFRESH_MS = 10_000;

function beep(ok: boolean) {
  try {
    const AudioContextClass =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.frequency.value = ok ? 880 : 260;
    gain.gain.setValueAtTime(0.12, context.currentTime);
    oscillator.start();
    oscillator.stop(context.currentTime + (ok ? 0.12 : 0.3));
    oscillator.onended = () => context.close();
  } catch {}
}

export function CheckinStation({
  eventId,
  eventDayId,
  initialHistory = [],
}: {
  eventId: string;
  eventDayId: string;
  initialHistory?: RecentCheckIn[];
}) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [history, setHistory] = useState<RecentCheckIn[]>(initialHistory);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const scanLockedRef = useRef(false);
  const refreshingHistoryRef = useRef(false);

  async function refreshHistory() {
    if (refreshingHistoryRef.current) return;
    refreshingHistoryRef.current = true;
    try {
      setHistory(await getRecentCheckIns(eventId, eventDayId));
    } catch {
      // Mantém o histórico atual se uma atualização em segundo plano falhar.
    } finally {
      refreshingHistoryRef.current = false;
    }
  }

  useEffect(() => {
    setHistory(initialHistory);
  }, [eventDayId, initialHistory]);

  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") void refreshHistory();
    };

    const timer = window.setInterval(refreshIfVisible, HISTORY_REFRESH_MS);
    document.addEventListener("visibilitychange", refreshIfVisible);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshIfVisible);
    };
  }, [eventId, eventDayId]);

  async function submitCode(value: string, method: "QRCODE" | "MANUAL") {
    const trimmed = value.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      const response = await checkInByCode({ eventId, eventDayId, code: trimmed, method });
      setResult(response);
      beep(response.status === "ok");
      await refreshHistory();
    } catch {
      setResult({ status: "erro", message: "Falha ao registrar. Tente novamente." });
      beep(false);
    } finally {
      setBusy(false);
      setCode("");
      inputRef.current?.focus();
    }
  }

  useEffect(() => {
    if (!cameraOn) return;
    let scanner: { stop: () => Promise<void>; clear: () => void } | null = null;
    let cancelled = false;
    scanLockedRef.current = false;

    (async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        const instance = new Html5Qrcode("leitor-camera");
        scanner = instance as unknown as { stop: () => Promise<void>; clear: () => void };
        await instance.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decoded: string) => {
            if (scanLockedRef.current) return;
            scanLockedRef.current = true;
            setCameraOn(false);
            void submitCode(decoded, "QRCODE");
          },
          () => {},
        );
        if (cancelled) await instance.stop();
      } catch {
        setCameraError("Não foi possível acessar a câmera. Use o leitor USB ou digite o código.");
        setCameraOn(false);
      }
    })();

    return () => {
      cancelled = true;
      if (scanner) scanner.stop().then(() => scanner?.clear()).catch(() => {});
    };
  }, [cameraOn, eventDayId]);

  const tone = result?.status === "ok" ? "border-emerald-300 bg-emerald-50" : result?.status === "duplicado" ? "border-amber-300 bg-amber-50" : "border-red-300 bg-red-50";

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,.85fr)]">
      <section className="card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">Leitura do crachá</h2>
            <p className="text-sm text-slate-500">Escaneie o QR-Code ou informe o código do crachá.</p>
          </div>
          <button type="button" className="btn-secondary btn-sm" onClick={() => { setCameraError(""); setCameraOn((current) => !current); }}>
            {cameraOn ? "Cancelar leitura" : "Escanear QR-Code"}
          </button>
        </div>

        <form onSubmit={(event) => { event.preventDefault(); void submitCode(code, "MANUAL"); }} className="flex flex-col gap-2 sm:flex-row">
          <input ref={inputRef} className="input flex-1" value={code} onChange={(event) => setCode(event.target.value)} placeholder="Código do crachá ou documento" autoFocus autoComplete="off" disabled={busy} />
          <button type="submit" className="btn-primary sm:w-28" disabled={busy || !code.trim()}>{busy ? "..." : "Confirmar"}</button>
        </form>

        {cameraError ? <p className="mt-2 text-xs text-red-600">{cameraError}</p> : null}
        <div id="leitor-camera" className={classNames("mx-auto mt-4 max-w-sm overflow-hidden rounded-xl border border-slate-200", cameraOn ? "block" : "hidden")} />

        {result ? (
          <div className={classNames("mt-4 rounded-xl border p-3", tone)}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-900">{result.status === "ok" ? "Presença confirmada" : result.status === "duplicado" ? "Já registrado" : "Não registrado"}</p>
                {result.participant ? <p className="mt-0.5 font-semibold text-slate-900">{result.participant.name}</p> : null}
              </div>
              {result.participant ? <span className="badge bg-white/70 text-slate-700">{result.participant.qualification}</span> : null}
            </div>
            {result.participant?.organization ? <p className="mt-1 text-xs text-slate-600">{result.participant.organization}</p> : null}
            <p className="mt-1 text-sm text-slate-600">{result.message}</p>
          </div>
        ) : null}
      </section>

      <section className="card p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">Últimas leituras</h2>
            <p className="text-xs text-slate-400">Atualização automática a cada 10 segundos</p>
          </div>
          <button type="button" className="btn-secondary btn-sm" onClick={() => void refreshHistory()}>Atualizar</button>
        </div>

        {history.length === 0 ? <p className="text-sm text-slate-500">Nenhuma presença registrada.</p> : (
          <ul className="divide-y divide-slate-100">
            {history.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">{item.participant.name}</p>
                  <p className="truncate text-xs text-slate-500">{item.participant.qualification}{item.operator?.name ? ` · ${item.operator.name}` : ""}</p>
                </div>
                <span className="shrink-0 text-xs font-medium text-emerald-700">{new Date(item.checkedInAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
