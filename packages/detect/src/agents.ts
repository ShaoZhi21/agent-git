import { collectAgentSignals, type AgentFramework, type RepoTreeEntry } from './signals';

export type { RepoTreeEntry } from './signals';

export type AgentCandidate = {
  name: string;
  path: string;
  framework?: AgentFramework;
  signals: string[];
};

export function detectAgents(tree: RepoTreeEntry[]): AgentCandidate[] {
  const byPath = new Map<
    string,
    {
      framework?: AgentFramework;
      signals: Set<string>;
    }
  >();

  for (const signal of collectAgentSignals(tree)) {
    const existing = byPath.get(signal.candidatePath) ?? { signals: new Set<string>() };
    existing.signals.add(signal.signal);
    existing.framework ??= signal.framework;
    byPath.set(signal.candidatePath, existing);
  }

  return [...byPath.entries()]
    .map(([path, candidate]) => ({
      name: path.split('/').filter(Boolean).at(-1) ?? path,
      path,
      ...(candidate.framework ? { framework: candidate.framework } : {}),
      signals: [...candidate.signals].sort(),
    }))
    .sort((left, right) => left.path.localeCompare(right.path));
}
