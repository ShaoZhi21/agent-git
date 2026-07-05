import Link from 'next/link';

// Public landing page → route "/".
export default function LandingPage() {
  return (
    <main>
      <h1>AgentGit</h1>
      <p>The system of record for a company&apos;s AI agents.</p>
      <Link href="/login">Sign in</Link>
    </main>
  );
}
