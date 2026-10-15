// Small presentational building blocks shared by server and client components.
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

type Variant = "primary" | "secondary" | "danger" | "ghost" | "accent";
const VARIANTS: Record<Variant, string> = {
  primary: "bg-slate-900 text-slate-50 hover:bg-slate-700 shadow-sm",
  accent: "bg-accent-500 text-black hover:bg-accent-600 shadow-[0_6px_20px_-6px_rgba(43,255,136,.6)]",
  secondary: "bg-surface text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50 shadow-sm",
  danger: "bg-surface text-red-600 ring-1 ring-red-200 hover:bg-red-50",
  ghost: "text-slate-700 hover:bg-slate-100",
};
const BTN =
  "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition active:scale-[.98] disabled:opacity-50 disabled:cursor-not-allowed";

export function Button({ variant = "primary", className, ...props }: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={cx(BTN, VARIANTS[variant], className)} {...props} />;
}

export function ButtonLink({ variant = "primary", className, ...props }: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={cx(BTN, VARIANTS[variant], className)} {...props} />;
}

export function Card({ className, children, ...rest }: ComponentProps<"div">) {
  return (
    <div className={cx("rounded-2xl border border-slate-200/80 bg-surface shadow-[0_1px_3px_rgba(16,24,40,.05)]", className)} {...rest}>
      {children}
    </div>
  );
}

export function CardHeader({ title, description, action }: { title: ReactNode; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-6 py-4">
      <div>
        <h2 className="text-[15px] font-semibold text-slate-900">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

type Tone = "gray" | "blue" | "green" | "amber" | "red" | "purple";
const TONES: Record<Tone, string> = {
  gray: "bg-slate-100 text-slate-700",
  blue: "bg-blue-50 text-blue-700",
  green: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-800",
  red: "bg-red-50 text-red-700",
  purple: "bg-violet-50 text-violet-700",
};
export function Badge({ tone = "gray", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={cx("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", TONES[tone])}>{children}</span>;
}

export function statusTone(status: string): Tone {
  if (["DELIVERED", "SHIPPED", "IN_PRODUCTION"].includes(status)) return "green";
  if (["PROOF_READY", "AWAITING_PAYMENT", "PENDING_APPROVAL"].includes(status)) return "amber";
  if (["QUOTE_REVIEW", "PROOF_REVISION", "PAID", "INVOICED"].includes(status)) return "blue";
  if (status === "CANCELLED") return "red";
  return "gray";
}

export function Field({ label, hint, children, htmlFor }: { label: string; hint?: ReactNode; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block">{label}</label>
      {children}
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function Notice({ tone = "blue", title, children }: { tone?: "blue" | "amber" | "green" | "red"; title?: ReactNode; children?: ReactNode }) {
  const t = {
    blue: "border-blue-100 bg-blue-50/70 text-blue-950",
    amber: "border-amber-200 bg-amber-50 text-amber-950",
    green: "border-emerald-200 bg-emerald-50 text-emerald-950",
    red: "border-red-200 bg-red-50 text-red-950",
  }[tone];
  return (
    <div className={cx("rounded-xl border px-4 py-3 text-sm", t)}>
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={title ? "mt-1" : ""}>{children}</div>}
    </div>
  );
}

export function PageHeader({ title, description, actions, back }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-8">
      {back && (
        <Link href={back.href} className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900">
          ← {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
          {description && <p className="mt-1.5 max-w-2xl text-slate-500">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-surface/50 px-6 py-12 text-center">
      <p className="font-semibold text-slate-800">{title}</p>
      {description && <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export { cx };
