import Link from "next/link";
import { Logo } from "./SiteHeader";
import { Card } from "./ui";

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <main className="flex min-h-[90vh] flex-col items-center justify-center px-4 py-10">
      <Link href="/" className="mb-6 text-brand-900"><Logo className="text-xl" /></Link>
      <Card className="w-full max-w-md p-6">
        <h1 className="text-xl font-bold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
        <div className="mt-5">{children}</div>
      </Card>
      {footer && <div className="mt-4 text-sm text-slate-600">{footer}</div>}
    </main>
  );
}
