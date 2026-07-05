export type AgentFramework =
  | 'agno'
  | 'anthropic'
  | 'autogen'
  | 'crewai'
  | 'langchain'
  | 'langgraph'
  | 'llama_index'
  | 'openai';

export type RepoTreeEntry = {
  path: string;
  content?: string;
};

export type AgentSignal = {
  candidatePath: string;
  signal: string;
  framework?: AgentFramework;
};

const FRAMEWORK_IMPORTS: Array<{
  framework: AgentFramework;
  patterns: RegExp[];
}> = [
  { framework: 'langgraph', patterns: [/\blanggraph\b/] },
  { framework: 'langchain', patterns: [/\blangchain\b/] },
  { framework: 'crewai', patterns: [/\bcrewai\b/] },
  { framework: 'autogen', patterns: [/\bautogen\b/] },
  { framework: 'llama_index', patterns: [/\bllama_index\b/, /\bllama-index\b/] },
  { framework: 'agno', patterns: [/\bagno\b/] },
  { framework: 'openai', patterns: [/\bopenai\b/] },
  { framework: 'anthropic', patterns: [/\banthropic\b/] },
];

export function collectAgentSignals(tree: RepoTreeEntry[]): AgentSignal[] {
  const signals: AgentSignal[] = [];

  for (const entry of tree) {
    const normalizedPath = normalizePath(entry.path);
    const segments = normalizedPath.split('/').filter(Boolean);

    if (segments.length === 0) {
      continue;
    }

    if (lastSegment(segments).toLowerCase() === 'skill.md') {
      signals.push({
        candidatePath: dirname(normalizedPath),
        signal: 'skill.md',
      });
    }

    if (segments[0] === 'agents' && segments.length >= 2) {
      signals.push({
        candidatePath: segments.slice(0, 2).join('/'),
        signal: 'agents-dir',
      });
    }

    if (lastSegment(segments).toLowerCase() === 'agent.yaml') {
      signals.push({
        candidatePath: dirname(normalizedPath),
        signal: 'agent.yaml',
      });
    }

    if (/\.agent\.py$/i.test(lastSegment(segments))) {
      signals.push({
        candidatePath: dirname(normalizedPath),
        signal: 'agent-file',
      });
    }

    const promptsIndex = segments.indexOf('prompts');
    if (promptsIndex >= 0) {
      signals.push({
        candidatePath:
          promptsIndex === 0 ? 'prompts' : segments.slice(0, promptsIndex).join('/'),
        signal: 'prompt-dir',
      });
    }

    const framework = detectFrameworkImport(entry.content);
    if (framework) {
      signals.push({
        candidatePath: inferCodeCandidatePath(segments),
        signal: `framework-import:${framework}`,
        framework,
      });
    }
  }

  return signals.filter((signal) => signal.candidatePath.length > 0);
}

function detectFrameworkImport(content: string | undefined): AgentFramework | undefined {
  if (!content) {
    return undefined;
  }

  for (const framework of FRAMEWORK_IMPORTS) {
    if (framework.patterns.some((pattern) => pattern.test(content))) {
      return framework.framework;
    }
  }

  return undefined;
}

function inferCodeCandidatePath(segments: string[]): string {
  if (segments[0] === 'agents' && segments.length >= 2) {
    return segments.slice(0, 2).join('/');
  }

  if (/^agent\.[cm]?[jt]s$|^agent\.py$|\.agent\.py$/i.test(lastSegment(segments))) {
    return dirname(segments.join('/'));
  }

  return dirname(segments.join('/'));
}

function dirname(path: string): string {
  const segments = path.split('/').filter(Boolean);
  return segments.slice(0, -1).join('/');
}

function lastSegment(segments: string[]): string {
  return segments[segments.length - 1] ?? '';
}

function normalizePath(path: string): string {
  return path.replaceAll('\\', '/').replace(/^\/+/, '').replace(/\/+$/, '');
}
