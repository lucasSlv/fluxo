import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", weight: ["400", "500", "600", "700", "800"] });

export const metadata: Metadata = {
  title: { default: "Fluxo — Finanças pessoais", template: "%s · Fluxo" },
  description: "Controle total da sua vida financeira.",
};

export const viewport: Viewport = { themeColor: "#ededed" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={jakarta.variable}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
