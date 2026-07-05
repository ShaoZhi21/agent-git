import type { RepoTreeEntry } from '../../src';

export const skillBasedAgentTree: RepoTreeEntry[] = [
  { path: 'agents/support/SKILL.md' },
  { path: 'agents/support/main.py' },
  { path: 'README.md' },
];

export const langGraphImportTree: RepoTreeEntry[] = [
  {
    path: 'services/research/agent.py',
    content: "from langgraph.graph import StateGraph\n",
  },
];

export const twoAgentsTree: RepoTreeEntry[] = [
  { path: 'agents/support/SKILL.md' },
  { path: 'agents/support/main.py' },
  { path: 'agents/sre/agent.yaml' },
  { path: 'agents/sre/prompts/system.md' },
];
