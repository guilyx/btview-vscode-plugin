/**
 * Offset-preserving XML scanner. `fast-xml-parser` discards source positions, so this
 * lightweight pass maps BehaviorTree node paths back to character ranges for
 * diagnostics and minimal text edits (quick fixes keep comments and formatting intact).
 * ponytail: not a validating parser — malformed input yields a best-effort element tree.
 */

export interface XmlAttrSpan {
  name: string;
  value: string;
  /** Offset of the attribute name. */
  start: number;
  /** Offset just past the closing quote. */
  end: number;
  /** Offset of the first character inside the quotes. */
  valueStart: number;
  valueEnd: number;
}

export interface XmlElementSpan {
  tag: string;
  /** Offset of `<`. */
  start: number;
  /** Offset just past the tag name. */
  nameEnd: number;
  /** Offset just past the `>` of the start tag. */
  openEnd: number;
  selfClosing: boolean;
  attrs: XmlAttrSpan[];
  children: XmlElementSpan[];
  /** Offset of `</tag>` (undefined when self-closing or never closed). */
  closeStart?: number;
  /** Offset just past the element (end of the close tag, or of the start tag). */
  end: number;
}

export interface OffsetRange {
  start: number;
  end: number;
}

const ATTR_RE = /([^\s=/>]+)\s*=\s*("([^"]*)"|'([^']*)')/g;

function parseAttrs(xml: string, from: number, to: number): XmlAttrSpan[] {
  const attrs: XmlAttrSpan[] = [];
  const body = xml.slice(from, to);
  ATTR_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ATTR_RE.exec(body)) !== null) {
    const start = from + m.index;
    const end = start + m[0].length;
    const value = m[3] ?? m[4] ?? '';
    attrs.push({
      name: m[1]!,
      value,
      start,
      end,
      valueStart: end - 1 - value.length,
      valueEnd: end - 1,
    });
  }
  return attrs;
}

/** Index of the `>` that ends a start tag, skipping quoted attribute values. */
function findTagEnd(xml: string, from: number): number {
  let quote: string | null = null;
  for (let i = from; i < xml.length; i++) {
    const ch = xml[i];
    if (quote) {
      if (ch === quote) {
        quote = null;
      }
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === '>') {
      return i;
    }
  }
  return -1;
}

/** Scan `xml` into a tree of element spans; returns the top-level elements. */
export function scanXmlElements(xml: string): XmlElementSpan[] {
  const top: XmlElementSpan[] = [];
  const stack: XmlElementSpan[] = [];
  let i = 0;

  const skipTo = (marker: string, from: number): number => {
    const idx = xml.indexOf(marker, from);
    return idx < 0 ? xml.length : idx + marker.length;
  };

  while (i < xml.length) {
    const lt = xml.indexOf('<', i);
    if (lt < 0) {
      break;
    }
    if (xml.startsWith('<!--', lt)) {
      i = skipTo('-->', lt + 4);
      continue;
    }
    if (xml.startsWith('<![CDATA[', lt)) {
      i = skipTo(']]>', lt + 9);
      continue;
    }
    if (xml.startsWith('<?', lt)) {
      i = skipTo('?>', lt + 2);
      continue;
    }
    if (xml.startsWith('<!', lt)) {
      i = skipTo('>', lt + 2);
      continue;
    }

    const gt = findTagEnd(xml, lt + 1);
    if (gt < 0) {
      break;
    }

    if (xml[lt + 1] === '/') {
      const tag = xml.slice(lt + 2, gt).trim();
      // Pop to the matching open element; tolerates unbalanced input.
      for (let s = stack.length - 1; s >= 0; s--) {
        if (stack[s]!.tag === tag) {
          const el = stack[s]!;
          el.closeStart = lt;
          el.end = gt + 1;
          stack.length = s;
          break;
        }
      }
      i = gt + 1;
      continue;
    }

    const nameMatch = /^[^\s/>]+/.exec(xml.slice(lt + 1, gt));
    const tag = nameMatch?.[0] ?? '';
    const nameEnd = lt + 1 + tag.length;
    const selfClosing = xml[gt - 1] === '/';
    const el: XmlElementSpan = {
      tag,
      start: lt,
      nameEnd,
      openEnd: gt + 1,
      selfClosing,
      attrs: parseAttrs(xml, nameEnd, selfClosing ? gt - 1 : gt),
      children: [],
      end: gt + 1,
    };
    const parent = stack[stack.length - 1];
    (parent ? parent.children : top).push(el);
    if (!selfClosing) {
      stack.push(el);
    }
    i = gt + 1;
  }

  return top;
}

export function findAttr(el: XmlElementSpan, name: string): XmlAttrSpan | undefined {
  return el.attrs.find((a) => a.name === name);
}

export function findRootSpan(elements: XmlElementSpan[]): XmlElementSpan | undefined {
  return elements.find((e) => e.tag === 'root');
}

/** The `occurrence`-th (0-based) `<BehaviorTree ID="treeId">` under `<root>`. */
export function findTreeSpan(
  root: XmlElementSpan,
  treeId: string,
  occurrence = 0,
): XmlElementSpan | undefined {
  const matches = root.children.filter(
    (c) => c.tag === 'BehaviorTree' && findAttr(c, 'ID')?.value === treeId,
  );
  return matches[occurrence];
}

/**
 * Resolve a node path (`0`, `0-2-1`, …) inside a `<BehaviorTree>` span. Mirrors the parser:
 * the tree's first child element is `0`, and each segment indexes child elements.
 */
export function findNodeSpan(tree: XmlElementSpan, path: string): XmlElementSpan | undefined {
  const segments = path.split('-').map((s) => Number.parseInt(s, 10));
  if (segments.length === 0 || segments.some((n) => Number.isNaN(n)) || segments[0] !== 0) {
    return undefined;
  }
  let current = tree.children[0];
  for (const index of segments.slice(1)) {
    current = current?.children[index];
  }
  return current;
}

/** Range of an element's tag name — a compact anchor for diagnostics. */
export function tagNameRange(el: XmlElementSpan): OffsetRange {
  return { start: el.start + 1, end: el.nameEnd };
}
