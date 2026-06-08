import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "BugTriage AI — Multi-Role Triage Workspace",
  description:
    "A polished multi-page bug triage workspace with role-specific reports, assignment boards, confidence scoring, and free AI analysis.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="text-slate-900 antialiased">{children}</body>
    </html>
  );
}
