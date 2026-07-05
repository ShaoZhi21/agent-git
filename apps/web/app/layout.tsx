import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'AgentGit',
  description: "The system of record for a company's AI agents.",
};

// Root layout — required. Wraps every route. See docs/conventions/frontend-routing.md.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
