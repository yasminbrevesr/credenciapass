"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

import { classNames } from "@/lib/utils";

/** Botão de envio que se desabilita sozinho enquanto a ação do servidor roda. */
export function SubmitButton({
  children,
  pendingLabel = "Salvando...",
  className = "btn-primary",
  confirm,
  name,
  value,
}: {
  children: ReactNode;
  pendingLabel?: string;
  className?: string;
  confirm?: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      className={classNames(className)}
      onClick={(event) => {
        if (confirm && !window.confirm(confirm)) event.preventDefault();
      }}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
