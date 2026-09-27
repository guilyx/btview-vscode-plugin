/**
 * Demo shell: VS Code–like chrome around the real webview (iframe), a fixture picker,
 * a read-only XML pane that shows graph → XML sync, and verify / trace-test actions.
 *
 * URL parameters (handy for screenshots and embedding):
 *   file=<repo path>   e.g. fixtures/nav2/navigate_w_replanning_and_recovery.xml
 *   theme=light|dark
 *   xml=0              hide the XML pane
 *   scenario=<n>       preselect simulation scenario n (1-based; 0 = extension default)
 */
import './theme.css';
import './shell.css';
import { DemoHost } from './host';
import { basename, fixtureEntries, initialFiles, scenariosFor } from './fixtures';
import { XmlView, changedLines, lineOfNode } from './xmlView';
import { DEMO_WEBVIEW_SOURCE, type DemoWebviewEnvelope } from './bridge-types';
import type { HostToWebviewMessage, SerializedDocument } from '../../src/shared/protocol';
import type { TraceScenario } from '../../src/btcpp/exec/trace';

type Theme = 'dark' | 'light';

const params = new URLSearchParams(window.location.search);
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const iframe = $<HTMLIFrameElement>('webview');
const fileSelect = $<HTMLSelectElement>('file-select');
const scenarioSelect = $<HTMLSelectElement>('scenario-select');
const xmlGroup = $('xml-group');
const xmlButton = $<HTMLButtonElement>('btn-xml');
const output = $('output');
const outputBody = $('output-body');
const toast = $('toast');
const xmlView = new XmlView($('xml'));

let theme: Theme = params.get('theme') === 'light' ? 'light' : 'dark';
let scenarios: TraceScenario[] = [];
let lastDoc: SerializedDocument | null = null;
let readyResolve: (() => void) | null = null;
let ready = new Promise<void>((resolve) => (readyResolve = resolve));

const host = new DemoHost(initialFiles, {
  post(message: HostToWebviewMessage) {
    iframe.contentWindow?.postMessage(message, '*');
  },
  onText(path, text, previous) {
    xmlView.render(text, changedLines(previous, text));
    $('xml-tab-name').textContent = basename(path);
    $('graph-tab-name').textContent = basename(path);
  },
  onRevealSource(treeId, path) {
    setXmlVisible(true);
    const line = lineOfNode(host.text, treeId, path);
    if (line !== null) {
      xmlView.focus(line);
    }
  },
  onOpenFile(path) {
    void openFile(path);
  },
  onNotice(message, kind) {
    showToast(message, kind);
  },
  onTick(update) {
    $('status-sim').textContent =
      update.tick > 0 ? `Sim: tick ${update.tick} · ${update.rootStatus}` : '';
  },
  onDocument(doc) {
    lastDoc = doc;
    const issues = (doc.validationErrors?.length ?? 0) + doc.warnings.length;
    $('status-format').textContent = `BTCpp v${doc.formatVersion}`;
    $('status-issues').textContent =
      issues === 0 ? 'No issues' : `${issues} issue${issues === 1 ? '' : 's'}`;
    $('status-issues').classList.toggle('warn', issues > 0);
    readyResolve?.();
    readyResolve = null;
  },
});

window.addEventListener('message', (event: MessageEvent) => {
  if (event.source !== iframe.contentWindow) {
    return;
  }
  const data = event.data as DemoWebviewEnvelope | undefined;
  if (data && data.source === DEMO_WEBVIEW_SOURCE) {
    host.handle(data.message);
  }
});

function webviewUrl(): string {
  return `webview.html?theme=${theme}`;
}

async function openFile(path: string): Promise<void> {
  ready = new Promise<void>((resolve) => (readyResolve = resolve));
  host.open(path);
  fileSelect.value = path;
  scenarios = scenariosFor(path);
  populateScenarios();
  iframe.src = webviewUrl();
  output.hidden = true;
  const url = new URL(window.location.href);
  url.searchParams.set('file', path);
  window.history.replaceState(null, '', url);
  await ready;
}

function populateFiles(): void {
  const groups = new Map<string, HTMLOptGroupElement>();
  for (const entry of fixtureEntries()) {
    let group = groups.get(entry.group);
    if (!group) {
      group = document.createElement('optgroup');
      group.label = entry.group;
      groups.set(entry.group, group);
      fileSelect.appendChild(group);
    }
    const option = document.createElement('option');
    option.value = entry.path;
    option.textContent = entry.label;
    group.appendChild(option);
  }
}

function populateScenarios(): void {
  scenarioSelect.innerHTML = '';
  const def = document.createElement('option');
  def.value = '0';
  def.textContent = 'Default — each leaf RUNNING 1 tick, then SUCCESS';
  scenarioSelect.appendChild(def);
  scenarios.forEach((s, i) => {
    const option = document.createElement('option');
    option.value = String(i + 1);
    option.textContent = `Scenario: ${s.name ?? `#${i + 1}`}`;
    scenarioSelect.appendChild(option);
  });
  scenarioSelect.disabled = scenarios.length === 0;
  scenarioSelect.value = '0';
  host.setScenario(null);
}

function setScenario(index: number): void {
  scenarioSelect.value = String(index);
  host.setScenario(index > 0 ? (scenarios[index - 1] ?? null) : null);
}

function setTheme(next: Theme): void {
  theme = next;
  document.documentElement.dataset.theme = theme;
  const doc = iframe.contentDocument;
  if (doc) {
    doc.documentElement.dataset.theme = theme;
    doc.body.classList.toggle('vscode-light', theme === 'light');
    doc.body.classList.toggle('vscode-dark', theme === 'dark');
  }
}

function setXmlVisible(visible: boolean): void {
  xmlGroup.hidden = !visible;
  xmlButton.setAttribute('aria-pressed', String(visible));
}

let toastTimer: ReturnType<typeof setTimeout> | null = null;
function showToast(message: string, kind: 'info' | 'error' = 'info'): void {
  toast.textContent = message;
  toast.className = `toast ${kind}`;
  toast.hidden = false;
  if (toastTimer) {
    clearTimeout(toastTimer);
  }
  toastTimer = setTimeout(() => (toast.hidden = true), 4500);
}

function showOutput(text: string): void {
  setXmlVisible(true);
  outputBody.textContent = text;
  output.hidden = false;
}

function verify(): string {
  const results = host.verify();
  const lines = [`Verify tree "${host.treeId}" (bounded exhaustive check)`, ''];
  for (const r of results) {
    lines.push(`${r.holds ? '✓' : '✗'} ${r.property}  (${r.checked} runs)`);
    if (r.note) {
      lines.push(`    ${r.note}`);
    }
    if (r.counterexample) {
      const label = r.holds ? 'witness' : 'counterexample';
      const leaves = Object.entries(r.counterexample)
        .map(([p, s]) => `${p}=${s}`)
        .join(', ');
      lines.push(`    ${label}: ${leaves}`);
    }
  }
  const text = lines.join('\n');
  showOutput(text);
  return text;
}

function runTraces(): string {
  if (scenarios.length === 0) {
    const text = `No *.trace.json next to ${basename(host.path)}.`;
    showOutput(text);
    return text;
  }
  const results = host.runTraces(scenarios);
  const lines = [`Trace tests — ${basename(host.path).replace(/\.xml$/, '.trace.json')}`, ''];
  for (const r of results) {
    lines.push(`${r.passed ? 'PASS' : 'FAIL'}  ${r.name}  (${r.ticks.length} tick(s))`);
    for (const a of r.results) {
      lines.push(`      ${a.ok ? '✓' : '✗'} ${a.message}`);
    }
  }
  const passed = results.filter((r) => r.passed).length;
  lines.push('', `${passed}/${results.length} scenario(s) passed`);
  const text = lines.join('\n');
  showOutput(text);
  return text;
}

fileSelect.addEventListener('change', () => void openFile(fileSelect.value));
scenarioSelect.addEventListener('change', () => setScenario(Number(scenarioSelect.value)));
$('btn-theme').addEventListener('click', () => setTheme(theme === 'dark' ? 'light' : 'dark'));
xmlButton.addEventListener('click', () => setXmlVisible(Boolean(xmlGroup.hidden)));
$('btn-verify').addEventListener('click', () => verify());
$('btn-traces').addEventListener('click', () => runTraces());
$('output-close').addEventListener('click', () => (output.hidden = true));

/** Automation hooks used by scripts/media (screenshots and the promo video). */
const api = {
  host,
  openFile,
  setTheme,
  setXmlVisible,
  setScenario,
  verify,
  runTraces,
  get ready() {
    return ready;
  },
  get document() {
    return lastDoc;
  },
};
(window as unknown as { btviewDemo: typeof api }).btviewDemo = api;

populateFiles();
setTheme(theme);
setXmlVisible(params.get('xml') !== '0');
const requested = params.get('file');
const initial =
  requested && host.hasFile(requested) ? requested : (fixtureEntries()[0]?.path ?? '');
void openFile(initial).then(() => {
  const n = Number(params.get('scenario') ?? '0');
  if (n > 0) {
    setScenario(n);
  }
});
