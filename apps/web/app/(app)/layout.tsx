import Link from 'next/link';
import type { ReactNode } from 'react';

// Shared shell for the authenticated area. "(app)" is a route GROUP —
// it wraps these routes in this layout WITHOUT adding a URL segment.
// So the routes below are "/dashboard" and "/agents/[agentId]", not "/app/...".
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <header>
        <Link href="/dashboard">AgentGit</Link>
      </header>
      {children}
    </div>
  );
}
