import type { Metadata } from "next";
import { CATALOG } from "@/lib/catalog";
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
          <div className="bg-amber-400 px-4 py-1.5 text-center text-xs font-semibold text-amber-950">
            Preview mode: catalog prices are sample placeholders, not real supplier pricing.
          </div>
        )}
        {children}
      </body>
    </html>
  );
}
