import Link from "next/link";
import { Logo } from "./SiteHeader";
import { Card } from "./ui";

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <main className="flex min-h-[92vh] flex-col items-center justify-center px-5 py-12">
      <Link href="/" className="mb-10" aria-label="Club Custom home"><Logo size="lg" priority className="!w-[220px] sm:!w-[260px]" /></Link>
      <Card className="w-full max-w-md p-8 shadow-2xl shadow-black/60">
        <h1 className="font-display text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
        <div className="mt-5">{children}</div>
      </Card>
      {footer && <div className="mt-4 text-sm text-slate-600">{footer}</div>}
    </main>
  );
}
