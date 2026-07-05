import { describe, expect, it } from 'vitest';
import { TreeService, type GitTreeClient } from '../src/detect/tree.service';

describe('TreeService', () => {
  it('reads a recursive GitHub tree and returns flat file paths', async () => {
    const requests: Array<{
      owner: string;
      repo: string;
      tree_sha: string;
      recursive: '1';
    }> = [];
    const client: GitTreeClient = {
      git: {
        getTree: async (request) => {
          requests.push(request);
          return {
            data: {
              tree: [
                { path: 'agents/support', type: 'tree' },
                { path: 'agents/support/SKILL.md', type: 'blob' },
                { path: 'agents/support/main.py', type: 'blob' },
                { path: undefined, type: 'blob' },
                { path: 'README.md', type: 'blob' },
              ],
            },
          };
        },
      },
    };

    const service = new TreeService(() => client);

    await expect(
      service.readTree(123, 'agentgit/example', 'main'),
    ).resolves.toEqual([
      { path: 'agents/support/SKILL.md' },
      { path: 'agents/support/main.py' },
      { path: 'README.md' },
    ]);
    expect(requests).toEqual([
      {
        owner: 'agentgit',
        repo: 'example',
        tree_sha: 'main',
        recursive: '1',
      },
    ]);
  });
});
