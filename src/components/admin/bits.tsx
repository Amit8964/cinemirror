"use client";

import { useState, type ReactNode } from "react";
import { CheckIcon, CopyIcon } from "../icons";

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-ghost !px-3 !py-1.5 !text-xs"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {}
      }}
    >
      {done ? <CheckIcon className="text-ok" /> : <CopyIcon />}
      {done ? "Copied" : label}
    </button>
  );
}

/** Submit button that asks for confirmation first. Use inside a <form action={...}>. */
export function ConfirmSubmit({ message, className, children }: { message: string; className?: string; children: ReactNode }) {
  return (
    <button
      className={className}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
