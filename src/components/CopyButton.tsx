"use client";
import { useState } from "react";

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); })}
      className="whitespace-nowrap rounded-full bg-accent-500 px-4 py-2 text-sm font-semibold text-black hover:bg-accent-600"
    >
      {copied ? "Copied ✓" : label}
    </button>
  );
}
