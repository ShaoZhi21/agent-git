import { describe, expect, it } from 'vitest';
import { detectAgents } from '../src';
import {
  langGraphImportTree,
  skillBasedAgentTree,
  twoAgentsTree,
} from './fixtures/agents';

describe('detectAgents', () => {
  it('detects a skill-based agent under agents/*', () => {
    expect(detectAgents(skillBasedAgentTree)).toEqual([
      {
        name: 'support',
        path: 'agents/support',
        signals: ['agents-dir', 'skill.md'],
      },
    ]);
  });

  it('detects framework imports when file content is available', () => {
    expect(detectAgents(langGraphImportTree)).toEqual([
      {
        name: 'research',
        path: 'services/research',
        framework: 'langgraph',
        signals: ['framework-import:langgraph'],
      },
    ]);
  });

  it('returns no candidates for an empty repo', () => {
    expect(detectAgents([])).toEqual([]);
  });

  it('detects two agents under agents/* as separate candidates', () => {
    expect(detectAgents(twoAgentsTree)).toEqual([
      {
        name: 'sre',
        path: 'agents/sre',
        signals: ['agent.yaml', 'agents-dir', 'prompt-dir'],
      },
      {
        name: 'support',
        path: 'agents/support',
        signals: ['agents-dir', 'skill.md'],
      },
    ]);
  });
});
