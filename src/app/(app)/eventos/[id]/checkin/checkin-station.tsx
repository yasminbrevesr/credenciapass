"use client";

import { useEffect, useRef, useState } from "react";

import { classNames } from "@/lib/utils";

import {
  checkInByCode,
  getRecentCheckIns,
  type CheckInResult,
  type RecentCheckIn,
} from "./actions";

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
  dayLabel,
}: {
  eventId: string;
  eventDayId: string;
  dayLabel: string;
}) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [history, setHistory] = useState<RecentCheckIn[]>([]);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const scanLockedRef = useRef(false);

  async function refreshHistory() {
    try {
      setHistory(await getRecentCheckIns(eventId, eventDayId));
    } catch {}
  }

  useEffect(() => {
    void refreshHistory();
    const timer = window.setInterval(() => void refreshHistory(), 3000);
    return () => window.clearInterval(timer);
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
          { fps: 10, qrbox: { width: 240, height: 240 } },
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
      if (scanner) {
        scanner
          .stop()
          .then(() => scanner?.clear())
          .catch(() => {});
      }
    };
  }, [cameraOn, eventDayId]);

  const tone =
    result?.status === "ok"
      ? "border-emerald-300 bg-emerald-50"
      : result?.status === "duplicado"
        ? "border-amber-300 bg-amber-50"
        : result
          ? "border-red-300 bg-red-50"
          : "border-slate-200 bg-white";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="card-pad space-y-4">
        <div>
          <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">Leitura do crachá</h2>
          <p className="text-sm text-slate-500">Registrando presença de {dayLabel}.</p>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submitCode(code, "MANUAL");
          }}
          className="flex gap-2"
        >
          <input
            ref={inputRef}
            className="input flex-1 text-lg"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="Passe o leitor ou digite o código / documento"
            autoFocus
            autoComplete="off"
            disabled={busy}
          />
          <button type="submit" className="btn-primary" disabled={busy || !code.trim()}>
            {busy ? "..." : "Confirmar"}
          </button>
        </form>

        <div>
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={() => {
              setCameraError("");
              setCameraOn((current) => !current);
            }}
          >
            {cameraOn ? "Desligar câmera" : "Ler próximo crachá"}
          </button>
          {cameraError ? <p className="mt-2 text-xs text-red-600">{cameraError}</p> : null}
        </div>

        <div id="leitor-camera" className={classNames("overflow-hidden rounded-lg", cameraOn ? "block" : "hidden")} />

        <div className={classNames("rounded-xl border p-4 transition", tone)}>
          {result ? (
            <>
              <p className="text-sm font-semibold text-slate-900">
                {result.status === "ok" ? "Presença confirmada" : result.status === "duplicado" ? "Já registrado" : "Não registrado"}
              </p>
              {result.participant ? (
                <>
                  <p className="mt-1 text-xl font-bold text-slate-900">{result.participant.name}</p>
                  <p className="text-sm text-slate-600">
                    {result.participant.qualification}
                    {result.participant.organization ? ` · ${result.participant.organization}` : ""}
                  </p>
                </>
              ) : null}
              <p className="mt-1 text-sm text-slate-600">{result.message}</p>
            </>
          ) : (
            <p className="text-sm text-slate-500">Aguardando leitura...</p>
          )}
        </div>
      </section>

      <section className="card-pad">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">Últimas leituras</h2>
          <button type="button" className="btn-secondary btn-sm" onClick={() => void refreshHistory()}>
            Atualizar
          </button>
        </div>

        {history.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhuma presença registrada neste dia.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {history.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">{item.participant.name}</p>
                  <p className="truncate text-xs text-slate-500">
                    {item.participant.qualification}
                    {item.operator?.name ? ` · por ${item.operator.name}` : ""}
                  </p>
                </div>
                <span className="badge shrink-0 bg-emerald-50 text-emerald-700">
                  {new Date(item.checkedInAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
