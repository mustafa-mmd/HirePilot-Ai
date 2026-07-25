import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Haqdar | HirePilot AI",
    template: "%s | Haqdar",
  },
  description:
    "Haqdar (HirePilot AI) — Evidence-led recruiting workflows with human decisions at every stage.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} dark h-full`}
    >
      <body className="flex min-h-full flex-col antialiased">{children}</body>
    </html>
  );
}
