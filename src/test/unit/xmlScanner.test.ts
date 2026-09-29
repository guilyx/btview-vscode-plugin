import { describe, expect, it } from 'vitest';
import {
  findContainerAt,
  getCursorContext,
  getTextContent,
  offsetToPosition,
  scanXml,
} from '../../language/xmlScanner';

/** Splits `text` at the `|` cursor marker. */
function at(textWithCursor: string): { text: string; offset: number } {
  const offset = textWithCursor.indexOf('|');
  return { text: textWithCursor.replace('|', ''), offset };
}

describe('xmlScanner', () => {
  it('builds a nested element tree with offsets', () => {
    const text = '<root a="1"><BehaviorTree ID="Main"><Sequence/></BehaviorTree></root>';
    const scan = scanXml(text);
    expect(scan.roots).toHaveLength(1);
    const root = scan.roots[0];
    expect(root.name).toBe('root');
    expect(root.end).toBe(text.length);
    const bt = root.children[0];
    expect(bt.name).toBe('BehaviorTree');
    const id = bt.attributes[0];
    expect(text.slice(id.valueStart, id.valueEnd)).toBe('Main');
    expect(id.valueClosed).toBe(true);
    const seq = bt.children[0];
    expect(seq.selfClosing).toBe(true);
    expect(text.slice(seq.start, seq.end)).toBe('<Sequence/>');
    expect(bt.closeNameStart).toBe(text.indexOf('BehaviorTree>'));
  });

  it('skips comments, CDATA, processing instructions and doctype', () => {
    const text =
      '<?xml version="1.0"?><!DOCTYPE x><root><!-- <Fake/> --><![CDATA[<Nope/>]]><Real/></root>';
    const scan = scanXml(text);
    expect(scan.elements.map((e) => e.name)).toEqual(['root', 'Real']);
    expect(scan.skipped).toHaveLength(4);
  });

  it('tolerates unclosed elements, cut-off tags and unclosed values', () => {
    const text = '<root><BehaviorTree ID="Ma\n<Sequence>\n<Act';
    const scan = scanXml(text);
    const names = scan.elements.map((e) => e.name);
    expect(names).toEqual(['root', 'BehaviorTree', 'Sequence', 'Act']);
    const bt = scan.elements[1];
    expect(bt.attributes[0].valueClosed).toBe(false);
    expect(bt.openClosed).toBe(false);
    // Sequence stays open to EOF; the cut-off tag is its child.
    expect(scan.elements[3].parent?.name).toBe('Sequence');
    expect(scan.elements[2].end).toBe(text.length);
  });

  it('recovers from mismatched end tags', () => {
    const text = '<root><A><B></A><C/></root>';
    const scan = scanXml(text);
    const [root, a, b, c] = scan.elements;
    expect(b.end).toBe(text.indexOf('</A>'));
    expect(a.children).toEqual([b]);
    expect(c.parent).toBe(root);
  });

  it('extracts text content', () => {
    const scan = scanXml('<p>Hello <!-- x --><b>big</b> world</p>');
    expect(getTextContent(scan, scan.elements[0])).toBe('Hello big world');
  });

  it('classifies element-name contexts', () => {
    const a = at('<root><BehaviorTree ID="M"><Seq|</BehaviorTree></root>');
    const ctx = getCursorContext(scanXml(a.text), a.offset);
    expect(ctx.kind).toBe('elementName');
    if (ctx.kind === 'elementName') {
      expect(ctx.prefix).toBe('Seq');
      expect(ctx.parent?.name).toBe('BehaviorTree');
    }

    const b = at('<root><BehaviorTree ID="M">\n  <|\n</BehaviorTree></root>');
    const ctxB = getCursorContext(scanXml(b.text), b.offset);
    expect(ctxB.kind).toBe('elementName');
    if (ctxB.kind === 'elementName') {
      expect(ctxB.prefix).toBe('');
      expect(ctxB.parent?.name).toBe('BehaviorTree');
    }
  });

  it('classifies attribute name and value contexts', () => {
    const a = at('<root><Retry num|/></root>');
    const ctx = getCursorContext(scanXml(a.text), a.offset);
    expect(ctx.kind).toBe('attributeName');
    if (ctx.kind === 'attributeName') {
      expect(ctx.prefix).toBe('num');
      expect(ctx.element.name).toBe('Retry');
    }

    const b = at('<root><Retry |/></root>');
    expect(getCursorContext(scanXml(b.text), b.offset).kind).toBe('attributeName');

    const c = at('<root><SubTree ID="Gr|asp"/></root>');
    const ctxC = getCursorContext(scanXml(c.text), c.offset);
    expect(ctxC.kind).toBe('attributeValue');
    if (ctxC.kind === 'attributeValue') {
      expect(ctxC.attribute.name).toBe('ID');
      expect(ctxC.prefix).toBe('Gr');
    }
  });

  it('classifies content, close tags and comments', () => {
    const a = at('<root><A>|</A></root>');
    const ctx = getCursorContext(scanXml(a.text), a.offset);
    expect(ctx.kind).toBe('content');
    if (ctx.kind === 'content') {
      expect(ctx.parent?.name).toBe('A');
    }
    const b = at('<root><A></A|></root>');
    expect(getCursorContext(scanXml(b.text), b.offset).kind).toBe('closeTagName');
    const c = at('<root><!-- <A | --></root>');
    expect(getCursorContext(scanXml(c.text), c.offset).kind).toBe('none');
  });

  it('finds the innermost container', () => {
    const text = '<root><A><B>x</B></A></root>';
    const scan = scanXml(text);
    expect(findContainerAt(scan, text.indexOf('x'))?.name).toBe('B');
  });

  it('converts offsets to positions', () => {
    expect(offsetToPosition('ab\ncd\nef', 7)).toEqual({ line: 2, character: 1 });
    expect(offsetToPosition('ab', 0)).toEqual({ line: 0, character: 0 });
  });
});
