/**
 * Small, tolerant, offset-aware XML scanner used by the text-editor language features.
 *
 * Unlike the fast-xml-parser model used for the graph, this keeps source offsets for
 * every element and attribute and never throws: half-typed tags (`<Seq`, `ID="Ma`)
 * produce partial elements so completion/hover can reason about the cursor position.
 * It is intentionally not a validating parser.
 */

export interface XmlAttribute {
  name: string;
  nameStart: number;
  nameEnd: number;
  /** Unquoted value (undefined when no `=` / value was written yet). */
  value?: string;
  /** Offset of the first character inside the quotes. */
  valueStart?: number;
  /** Offset of the closing quote (exclusive end of the value text). */
  valueEnd?: number;
  /** True when the value has a closing quote. */
  valueClosed?: boolean;
}

export interface XmlNode {
  name: string;
  /** Offset of `<`. */
  start: number;
  nameStart: number;
  nameEnd: number;
  /** Offset just after the start tag (after `>` / `/>`, or where the tag was cut off). */
  openEnd: number;
  /** True when the start tag was terminated by `>` or `/>`. */
  openClosed: boolean;
  selfClosing: boolean;
  /** Offset where child content ends (start of `</name>`, or end of an unclosed element). */
  contentEnd: number;
  /** Offset just after the end tag (or the self-closing start tag). */
  end: number;
  /** Name range of the matching end tag, when present. */
  closeNameStart?: number;
  attributes: XmlAttribute[];
  parent?: XmlNode;
  children: XmlNode[];
}

export interface XmlRange {
  start: number;
  end: number;
}

export interface XmlScanResult {
  text: string;
  /** Top-level elements (normally a single `<root>`). */
  roots: XmlNode[];
  /** Every element in document order. */
  elements: XmlNode[];
  /** Comment, CDATA, processing-instruction and doctype ranges. */
  skipped: XmlRange[];
}

const NAME_START = /[A-Za-z_:]/;
const NAME_CHAR = /[A-Za-z0-9_:.-]/;
const WS = /\s/;

export function isNameChar(ch: string | undefined): boolean {
  return ch !== undefined && NAME_CHAR.test(ch);
}

function skipTo(text: string, from: number, terminator: string): number {
  const idx = text.indexOf(terminator, from);
  return idx === -1 ? text.length : idx + terminator.length;
}

export function scanXml(text: string): XmlScanResult {
  const roots: XmlNode[] = [];
  const elements: XmlNode[] = [];
  const skipped: XmlRange[] = [];
  const stack: XmlNode[] = [];
  const len = text.length;
  let i = 0;

  const closeElement = (el: XmlNode, contentEnd: number, end: number): void => {
    el.contentEnd = contentEnd;
    el.end = end;
  };

  while (i < len) {
    const lt = text.indexOf('<', i);
    if (lt === -1) {
      break;
    }
    i = lt;

    if (text.startsWith('<!--', i)) {
      const end = skipTo(text, i + 4, '-->');
      skipped.push({ start: i, end });
      i = end;
      continue;
    }
    if (text.startsWith('<![CDATA[', i)) {
      const end = skipTo(text, i + 9, ']]>');
      skipped.push({ start: i, end });
      i = end;
      continue;
    }
    if (text.startsWith('<?', i) || text.startsWith('<!', i)) {
      const end = skipTo(text, i + 2, text[i + 1] === '?' ? '?>' : '>');
      skipped.push({ start: i, end });
      i = end;
      continue;
    }

    if (text[i + 1] === '/') {
      // End tag.
      let j = i + 2;
      const nameStart = j;
      while (j < len && isNameChar(text[j])) {
        j++;
      }
      const name = text.slice(nameStart, j);
      const gt = text.indexOf('>', j);
      const nextLt = text.indexOf('<', j);
      const tagEnd = gt !== -1 && (nextLt === -1 || gt < nextLt) ? gt + 1 : j;
      const matchIdx = findLastIndex(stack, (el) => el.name === name);
      if (matchIdx !== -1) {
        while (stack.length > matchIdx + 1) {
          const unclosed = stack.pop()!;
          closeElement(unclosed, i, i);
        }
        const el = stack.pop()!;
        el.closeNameStart = nameStart;
        closeElement(el, i, tagEnd);
      }
      i = Math.max(tagEnd, i + 2);
      continue;
    }

    if (!NAME_START.test(text[i + 1] ?? '')) {
      // Stray `<` (e.g. the user just typed it) — treat as text.
      i++;
      continue;
    }

    // Start tag.
    let j = i + 1;
    const nameStart = j;
    while (j < len && isNameChar(text[j])) {
      j++;
    }
    const el: XmlNode = {
      name: text.slice(nameStart, j),
      start: i,
      nameStart,
      nameEnd: j,
      openEnd: j,
      openClosed: false,
      selfClosing: false,
      contentEnd: len,
      end: len,
      attributes: [],
      parent: stack[stack.length - 1],
      children: [],
    };

    // Attributes.
    while (j < len) {
      const ch = text[j];
      if (WS.test(ch)) {
        j++;
        continue;
      }
      if (ch === '>') {
        j++;
        el.openClosed = true;
        break;
      }
      if (ch === '/' && text[j + 1] === '>') {
        j += 2;
        el.openClosed = true;
        el.selfClosing = true;
        break;
      }
      if (ch === '<') {
        break; // cut-off tag
      }
      if (!isNameChar(ch)) {
        j++;
        continue;
      }
      const attrNameStart = j;
      while (j < len && isNameChar(text[j])) {
        j++;
      }
      const attr: XmlAttribute = {
        name: text.slice(attrNameStart, j),
        nameStart: attrNameStart,
        nameEnd: j,
      };
      el.attributes.push(attr);
      let k = j;
      while (k < len && WS.test(text[k])) {
        k++;
      }
      if (text[k] !== '=') {
        continue;
      }
      k++;
      while (k < len && WS.test(text[k])) {
        k++;
      }
      const quote = text[k];
      if (quote === '"' || quote === "'") {
        const valueStart = k + 1;
        let m = valueStart;
        while (m < len && text[m] !== quote && text[m] !== '<') {
          m++;
        }
        attr.valueStart = valueStart;
        attr.valueEnd = m;
        attr.value = text.slice(valueStart, m);
        attr.valueClosed = text[m] === quote;
        j = attr.valueClosed ? m + 1 : m;
      } else {
        // Unquoted value (invalid XML, but be tolerant) or nothing yet.
        const valueStart = k;
        let m = k;
        while (m < len && !WS.test(text[m]) && text[m] !== '>' && text[m] !== '<') {
          if (text[m] === '/' && text[m + 1] === '>') {
            break;
          }
          m++;
        }
        attr.valueStart = valueStart;
        attr.valueEnd = m;
        attr.value = text.slice(valueStart, m);
        attr.valueClosed = false;
        j = m;
      }
    }
    el.openEnd = j;

    elements.push(el);
    if (el.parent) {
      el.parent.children.push(el);
    } else {
      roots.push(el);
    }

    if (el.selfClosing) {
      closeElement(el, j, j);
    } else if (!el.openClosed) {
      closeElement(el, j, j);
    } else {
      stack.push(el);
    }
    i = Math.max(j, i + 1);
  }

  while (stack.length > 0) {
    const el = stack.pop()!;
    closeElement(el, len, len);
  }

  return { text, roots, elements, skipped };
}

function findLastIndex<T>(arr: T[], pred: (v: T) => boolean): number {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (pred(arr[i])) {
      return i;
    }
  }
  return -1;
}

export function getAttribute(el: XmlNode, name: string): XmlAttribute | undefined {
  return el.attributes.find((a) => a.name === name);
}

export function getAttributeValue(el: XmlNode, name: string): string | undefined {
  return getAttribute(el, name)?.value;
}

/** Plain text content of an element with nested tags and comments removed. */
export function getTextContent(scan: XmlScanResult, el: XmlNode): string {
  if (el.selfClosing || !el.openClosed) {
    return '';
  }
  return scan.text
    .slice(el.openEnd, el.contentEnd)
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]*>/g, '')
    .trim();
}

export function isInSkippedRange(scan: XmlScanResult, offset: number): boolean {
  return scan.skipped.some((r) => offset > r.start && offset < r.end);
}

/** Innermost element whose start tag contains the offset (between `<` and `>`). */
export function findTagAt(scan: XmlScanResult, offset: number): XmlNode | undefined {
  let found: XmlNode | undefined;
  for (const el of scan.elements) {
    if (el.start >= offset) {
      break;
    }
    const interiorEnd = el.openClosed ? el.openEnd - (el.selfClosing ? 2 : 1) : el.openEnd;
    if (offset > el.start && offset <= interiorEnd) {
      found = el;
    }
  }
  return found;
}

/** Innermost element whose content (between start and end tag) contains the offset. */
export function findContainerAt(scan: XmlScanResult, offset: number): XmlNode | undefined {
  let found: XmlNode | undefined;
  for (const el of scan.elements) {
    if (el.start >= offset) {
      break;
    }
    if (el.openClosed && !el.selfClosing && el.openEnd <= offset && offset <= el.contentEnd) {
      found = el;
    }
  }
  return found;
}

/** Element whose end-tag name contains the offset. */
export function findCloseTagAt(scan: XmlScanResult, offset: number): XmlNode | undefined {
  return scan.elements.find(
    (el) =>
      el.closeNameStart !== undefined &&
      offset >= el.closeNameStart &&
      offset <= el.closeNameStart + el.name.length,
  );
}

export type CursorContext =
  | { kind: 'none' }
  | {
      kind: 'elementName';
      /** Element being named, when the scanner recognised one. */
      element?: XmlNode;
      parent?: XmlNode;
      prefix: string;
      replaceStart: number;
      replaceEnd: number;
    }
  | { kind: 'closeTagName'; element: XmlNode }
  | {
      kind: 'attributeName';
      element: XmlNode;
      attribute?: XmlAttribute;
      prefix: string;
      replaceStart: number;
      replaceEnd: number;
    }
  | {
      kind: 'attributeValue';
      element: XmlNode;
      attribute: XmlAttribute;
      /** Value text between the opening quote and the cursor. */
      prefix: string;
    }
  | { kind: 'content'; parent?: XmlNode };

/** Classify what the cursor at `offset` is pointing at. */
export function getCursorContext(scan: XmlScanResult, offset: number): CursorContext {
  const { text } = scan;
  if (isInSkippedRange(scan, offset)) {
    return { kind: 'none' };
  }

  const tag = findTagAt(scan, offset);
  if (tag) {
    for (const attr of tag.attributes) {
      if (
        attr.valueStart !== undefined &&
        attr.valueEnd !== undefined &&
        offset >= attr.valueStart &&
        offset <= attr.valueEnd
      ) {
        return {
          kind: 'attributeValue',
          element: tag,
          attribute: attr,
          prefix: text.slice(attr.valueStart, offset),
        };
      }
    }
    if (offset <= tag.nameEnd) {
      return {
        kind: 'elementName',
        element: tag,
        parent: tag.parent,
        prefix: text.slice(tag.nameStart, offset),
        replaceStart: tag.nameStart,
        replaceEnd: tag.nameEnd,
      };
    }
    for (const attr of tag.attributes) {
      if (offset >= attr.nameStart && offset <= attr.nameEnd) {
        return {
          kind: 'attributeName',
          element: tag,
          attribute: attr,
          prefix: text.slice(attr.nameStart, offset),
          replaceStart: attr.nameStart,
          replaceEnd: attr.nameEnd,
        };
      }
    }
    if (WS.test(text[offset - 1] ?? '')) {
      return {
        kind: 'attributeName',
        element: tag,
        prefix: '',
        replaceStart: offset,
        replaceEnd: offset,
      };
    }
    return { kind: 'none' };
  }

  const closing = findCloseTagAt(scan, offset);
  if (closing) {
    return { kind: 'closeTagName', element: closing };
  }

  // `<` or `<Partial` that the scanner did not turn into an element (e.g. `<` + newline).
  let s = offset;
  while (s > 0 && isNameChar(text[s - 1])) {
    s--;
  }
  if (text[s - 1] === '<') {
    let e = offset;
    while (e < text.length && isNameChar(text[e])) {
      e++;
    }
    return {
      kind: 'elementName',
      parent: findContainerAt(scan, s - 1),
      prefix: text.slice(s, offset),
      replaceStart: s,
      replaceEnd: e,
    };
  }

  return { kind: 'content', parent: findContainerAt(scan, offset) };
}

/** Converts an offset to a zero-based line / character pair. */
export function offsetToPosition(
  text: string,
  offset: number,
): { line: number; character: number } {
  let line = 0;
  let lineStart = 0;
  const end = Math.min(offset, text.length);
  for (let i = 0; i < end; i++) {
    if (text.charCodeAt(i) === 10) {
      line++;
      lineStart = i + 1;
    }
  }
  return { line, character: end - lineStart };
}
