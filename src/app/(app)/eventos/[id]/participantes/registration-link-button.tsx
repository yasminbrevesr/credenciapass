"use client";

import { useState } from "react";

export function RegistrationLinkButton({ eventId }: { eventId: string }) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    const url = `${window.location.origin}/inscricao/${eventId}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button type="button" className="btn-secondary btn-sm" onClick={copyLink}>
      {copied ? "Link copiado!" : "Copiar link de inscrição"}
    </button>
  );
}
