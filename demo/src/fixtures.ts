/**
 * Virtual file system for the demo: every fixture XML (and its sibling *.trace.json
 * scenarios) is bundled at build time. Paths are repo-relative, e.g.
 * `fixtures/showcase/warehouse_delivery.xml`.
 */
import type { TraceScenario } from '../../src/btcpp/exec/trace';

const xmlModules = import.meta.glob('../../fixtures/**/*.xml', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const traceModules = import.meta.glob('../../fixtures/**/*.trace.json', {
  import: 'default',
  eager: true,
}) as Record<string, TraceScenario | TraceScenario[]>;

function repoPath(globKey: string): string {
  return globKey.replace(/^(\.\.\/)+/, '');
}

export const initialFiles: Record<string, string> = Object.fromEntries(
  Object.entries(xmlModules).map(([key, text]) => [repoPath(key), text]),
);

const scenariosByXml = new Map<string, TraceScenario[]>(
  Object.entries(traceModules).map(([key, value]) => [
    repoPath(key).replace(/\.trace\.json$/, '.xml'),
    Array.isArray(value) ? value : [value],
  ]),
);

export function scenariosFor(path: string): TraceScenario[] {
  return scenariosByXml.get(path) ?? [];
}

export interface FixtureEntry {
  path: string;
  label: string;
  group: string;
}

/** Curated picker entries first; any other fixture is appended under "More fixtures". */
const CURATED: FixtureEntry[] = [
  {
    path: 'fixtures/showcase/warehouse_delivery.xml',
    label: 'Warehouse delivery — v4, subtrees, typed ports',
    group: 'Showcase',
  },
  {
    path: 'fixtures/nav2/navigate_w_replanning_and_recovery.xml',
    label: 'Nav2 navigate with replanning & recovery — v3',
    group: 'Showcase',
  },
  {
    path: 'fixtures/showcase/needs_fixes.xml',
    label: 'Tree with validation issues',
    group: 'Showcase',
  },
  { path: 'fixtures/includes_relative.xml', label: 'Relative <include>', group: 'Showcase' },
];

export function fixtureEntries(): FixtureEntry[] {
  const curated = CURATED.filter((e) => e.path in initialFiles);
  const seen = new Set(curated.map((e) => e.path));
  const rest = Object.keys(initialFiles)
    .filter((p) => !seen.has(p))
    .sort()
    .map((p) => ({ path: p, label: p.replace(/^fixtures\//, ''), group: 'More fixtures' }));
  return [...curated, ...rest];
}

// --- Minimal POSIX path helpers (the browser has no `path` module). ---

export function dirname(p: string): string {
  const i = p.lastIndexOf('/');
  return i < 0 ? '' : p.slice(0, i);
}

export function basename(p: string): string {
  return p.slice(p.lastIndexOf('/') + 1);
}

export function joinPath(...parts: string[]): string {
  const segments: string[] = [];
  for (const seg of parts.join('/').split('/')) {
    if (!seg || seg === '.') {
      continue;
    }
    if (seg === '..') {
      segments.pop();
    } else {
      segments.push(seg);
    }
  }
  return segments.join('/');
}
