"use client";
// A <form> bound to a server action that shows pending state and the action's
// success/error message inline — so every form behaves the same way.
import { useActionState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/lib/actions/util";
import { Button, cx } from "./ui";

export function ActionForm({
  action,
  children,
  submitLabel,
  submitVariant = "primary",
  className,
  resetOnSuccess = false,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  children?: ReactNode;
  submitLabel?: string;
  submitVariant?: "primary" | "secondary" | "danger" | "accent" | "ghost";
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form
      action={formAction}
      className={cx("space-y-3", className)}
      key={resetOnSuccess && state.ok ? state.ok + (state.at ?? "") : undefined}
    >
      {children}
      {state.error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      {state.ok && <p role="status" className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{state.ok}</p>}
      {submitLabel && <SubmitButton variant={submitVariant}>{submitLabel}</SubmitButton>}
    </form>
  );
}

export function SubmitButton({ children, variant = "primary", className }: { children: ReactNode; variant?: "primary" | "secondary" | "danger" | "accent" | "ghost"; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} disabled={pending} className={className}>
      {pending ? "Working…" : children}
    </Button>
  );
}
