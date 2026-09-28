/** Read-only XML pane: syntax highlighting, changed-line flashes and node → line lookup. */

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Highlight one line of XML. Comments spanning lines are tracked via `inComment`. */
function highlightLine(line: string, state: { inComment: boolean }): string {
  let out = '';
  let rest = line;
  while (rest.length > 0) {
    if (state.inComment) {
      const end = rest.indexOf('-->');
      if (end < 0) {
        out += `<span class="x-comment">${escapeHtml(rest)}</span>`;
        return out;
      }
      out += `<span class="x-comment">${escapeHtml(rest.slice(0, end + 3))}</span>`;
      rest = rest.slice(end + 3);
      state.inComment = false;
      continue;
    }
    const lt = rest.indexOf('<');
    if (lt < 0) {
      out += escapeHtml(rest);
      break;
    }
    out += escapeHtml(rest.slice(0, lt));
    rest = rest.slice(lt);
    if (rest.startsWith('<!--')) {
      state.inComment = true;
      continue;
    }
    const gt = rest.indexOf('>');
    const tag = gt < 0 ? rest : rest.slice(0, gt + 1);
    rest = gt < 0 ? '' : rest.slice(gt + 1);
    out += highlightTag(tag);
  }
  return out;
}

function highlightTag(tag: string): string {
  const m = /^(<\/?|<\?)([\w:.-]*)([\s\S]*?)(\/?>|\?>)?$/.exec(tag);
  if (!m) {
    return escapeHtml(tag);
  }
  const [, open, name, attrs, close] = m;
  const attrHtml = attrs.replace(
    /([\w:.-]+)(\s*=\s*)("[^"]*"|'[^']*')|([^\w]+)/g,
    (_all, an: string, eq: string, av: string, other: string) =>
      an
        ? `<span class="x-attr">${escapeHtml(an)}</span><span class="x-punct">${escapeHtml(eq)}</span><span class="x-value">${escapeHtml(av)}</span>`
        : escapeHtml(other),
  );
  return (
    `<span class="x-punct">${escapeHtml(open)}</span><span class="x-tag">${escapeHtml(name)}</span>` +
    attrHtml +
    (close ? `<span class="x-punct">${escapeHtml(close)}</span>` : '')
  );
}

/** Lines of `next` that are new or modified relative to `previous` (LCS on lines). */
export function changedLines(previous: string | undefined, next: string): Set<number> {
  const changed = new Set<number>();
  if (previous === undefined) {
    return changed;
  }
  const a = previous.split('\n');
  const b = next.split('\n');
  const n = a.length;
  const m = b.length;
  if (n * m > 4_000_000) {
    return changed;
  }
  const dp: Uint16Array[] = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      i++;
    } else {
      changed.add(j);
      j++;
    }
  }
  while (j < m) {
    changed.add(j++);
  }
  return changed;
}

/**
 * Map `treeId` + node path (e.g. "0-2-1") to a 0-based line index by scanning element
 * tags the same way the parser assigns paths: the first element inside
 * `<BehaviorTree ID>` is "0", its children "0-0", "0-1", …
 */
export function lineOfNode(text: string, treeId: string, nodePath?: string): number | null {
  const tagRe = /<!--[\s\S]*?-->|<(\/?)([\w:.-]+)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/g;
  const lineStarts = [0];
  for (let k = 0; k < text.length; k++) {
    if (text[k] === '\n') {
      lineStarts.push(k + 1);
    }
  }
  const lineAt = (offset: number) => {
    let lo = 0;
    let hi = lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (lineStarts[mid] <= offset) {
        lo = mid;
      } else {
        hi = mid - 1;
      }
    }
    return lo;
  };

  let inTree = false;
  let treeLine: number | null = null;
  // Stack of [path, nextChildIndex] for open elements inside the tree.
  const stack: { path: string; next: number }[] = [];
  let rootSeen = false;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(text))) {
    if (m[0].startsWith('<!--')) {
      continue;
    }
    const [, closing, name, attrs, selfClosing] = m;
    if (name === 'BehaviorTree') {
      if (closing) {
        if (inTree) {
          break;
        }
        continue;
      }
      const id = /\bID\s*=\s*["']([^"']*)["']/.exec(attrs)?.[1];
      if (id === treeId) {
        inTree = true;
        treeLine = lineAt(m.index);
        if (!nodePath) {
          return treeLine;
        }
      }
      continue;
    }
    if (!inTree) {
      continue;
    }
    if (closing) {
      stack.pop();
      continue;
    }
    let path: string;
    if (stack.length === 0) {
      if (rootSeen) {
        continue;
      }
      rootSeen = true;
      path = '0';
    } else {
      const parent = stack[stack.length - 1];
      path = `${parent.path}-${parent.next++}`;
    }
    if (path === nodePath) {
      return lineAt(m.index);
    }
    if (!selfClosing) {
      stack.push({ path, next: 0 });
    }
  }
  return treeLine;
}

export class XmlView {
  private flashTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly el: HTMLElement) {}

  render(text: string, changed: Set<number> = new Set(), focusLine: number | null = null): void {
    const state = { inComment: false };
    const lines = text.replace(/\n$/, '').split('\n');
    const html = lines
      .map((line, i) => {
        const cls = ['x-line'];
        if (changed.has(i)) {
          cls.push('changed');
        }
        if (focusLine === i) {
          cls.push('focus');
        }
        return `<div class="${cls.join(' ')}" data-line="${i}"><span class="x-ln">${i + 1}</span><span class="x-code">${highlightLine(line, state) || ' '}</span></div>`;
      })
      .join('');
    this.el.innerHTML = html;
    const first = focusLine ?? (changed.size > 0 ? Math.min(...changed) : null);
    if (first !== null) {
      this.scrollToLine(first);
    }
    if (this.flashTimer) {
      clearTimeout(this.flashTimer);
    }
    if (changed.size > 0) {
      this.flashTimer = setTimeout(() => {
        this.el.querySelectorAll('.x-line.changed').forEach((l) => l.classList.add('settled'));
      }, 2200);
    }
  }

  focus(line: number): void {
    this.el.querySelectorAll('.x-line.focus').forEach((l) => l.classList.remove('focus'));
    const target = this.el.querySelector(`.x-line[data-line="${line}"]`);
    target?.classList.add('focus');
    this.scrollToLine(line);
  }

  private scrollToLine(line: number): void {
    const target = this.el.querySelector<HTMLElement>(`.x-line[data-line="${line}"]`);
    if (!target) {
      return;
    }
    const top = target.offsetTop - this.el.clientHeight / 3;
    this.el.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }
}
