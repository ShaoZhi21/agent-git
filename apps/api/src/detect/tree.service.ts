import { Injectable } from '@nestjs/common';

export type GitTreeEntry = {
  path?: string;
  type?: string;
};

export type GitTreeClient = {
  git: {
    getTree(request: {
      owner: string;
      repo: string;
      tree_sha: string;
      recursive: '1';
    }): Promise<{
      data: {
        tree: GitTreeEntry[];
      };
    }>;
  };
};

export type GitTreeClientFactory = (
  installationId: number,
) => GitTreeClient | Promise<GitTreeClient>;

@Injectable()
export class TreeService {
  constructor(private readonly clientForInstallation: GitTreeClientFactory) {}

  async readTree(
    installationId: number,
    repoFullName: string,
    ref: string,
  ): Promise<Array<{ path: string }>> {
    const { owner, repo } = parseRepoFullName(repoFullName);
    const client = await this.clientForInstallation(installationId);
    const response = await client.git.getTree({
      owner,
      repo,
      tree_sha: ref,
      recursive: '1',
    });

    return response.data.tree
      .filter((entry): entry is GitTreeEntry & { path: string } => {
        return entry.type === 'blob' && typeof entry.path === 'string';
      })
      .map((entry) => ({ path: entry.path }));
  }
}

function parseRepoFullName(repoFullName: string): { owner: string; repo: string } {
  const [owner, repo, ...rest] = repoFullName.split('/');

  if (!owner || !repo || rest.length > 0) {
    throw new Error(`Invalid GitHub repo full name: ${repoFullName}`);
  }

  return { owner, repo };
}
