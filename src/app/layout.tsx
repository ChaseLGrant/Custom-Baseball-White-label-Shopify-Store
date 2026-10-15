import type { Metadata } from "next";
import { CATALOG } from "@/lib/catalog";
import "@fontsource-variable/inter";
import "@fontsource/barlow-condensed/700.css";
import "@fontsource/barlow-condensed/800.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Club Custom — Team uniforms without the sales calls", template: "%s · Club Custom" },
  description:
    "Self-service custom team uniforms for schools, colleges and club programs. Upload your logo once, import your roster, see real prices and pay online.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        {CATALOG.isSample && (
          <div className="border-b border-slate-200 bg-black px-4 py-1.5 text-center text-[11px] font-semibold tracking-widest text-accent-500">
            PREVIEW — <span className="sm:hidden">sample prices</span><span className="hidden sm:inline">prices shown are samples, not real supplier pricing</span>
          </div>
        )}
        {children}
      </body>
    </html>
  );
}
