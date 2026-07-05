// Agent detail → dynamic route "/agents/[agentId]". Placeholder.
// Note: in Next 15, `params` is a Promise — await it.
// TODO(F5): render the checkpoint timeline for this agent.
export default async function AgentTimelinePage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = await params;
  return (
    <main>
      <h1>Agent {agentId}</h1>
      <p>Checkpoint timeline will render here.</p>
    </main>
  );
}
