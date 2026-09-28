import { describe, expect, it } from 'vitest';
import {
  findAttr,
  findNodeSpan,
  findRootSpan,
  findTreeSpan,
  scanXmlElements,
  tagNameRange,
} from '../../btcpp/xmlLocator';
import { checkXmlSyntax, XmlSyntaxError } from '../../btcpp/xmlSyntax';

const XML = `<?xml version="1.0"?>
<!-- <root>not this one</root> -->
<root BTCPP_format="4">
  <BehaviorTree ID="Main">
    <Sequence name='seq'>
      <!-- <Ignored/> -->
      <Say msg="a > b"/>
      <Fallback>
        <Check/>
        <Act/>
      </Fallback>
    </Sequence>
  </BehaviorTree>
  <BehaviorTree ID="Main"><AlwaysSuccess/></BehaviorTree>
</root>
`;

describe('scanXmlElements', () => {
  const root = findRootSpan(scanXmlElements(XML))!;

  it('finds <root> past the declaration and comments', () => {
    expect(root.tag).toBe('root');
    expect(findAttr(root, 'BTCPP_format')?.value).toBe('4');
    expect(root.closeStart).toBe(XML.lastIndexOf('</root>'));
  });

  it('records attribute value offsets (single and double quotes, `>` inside values)', () => {
    const seq = findNodeSpan(findTreeSpan(root, 'Main')!, '0')!;
    const name = findAttr(seq, 'name')!;
    expect(XML.slice(name.valueStart, name.valueEnd)).toBe('seq');
    const say = findNodeSpan(findTreeSpan(root, 'Main')!, '0-0')!;
    expect(say.selfClosing).toBe(true);
    expect(findAttr(say, 'msg')?.value).toBe('a > b');
  });

  it('resolves node paths like the parser (comments are not children)', () => {
    const tree = findTreeSpan(root, 'Main')!;
    expect(findNodeSpan(tree, '0-1')?.tag).toBe('Fallback');
    expect(findNodeSpan(tree, '0-1-1')?.tag).toBe('Act');
    expect(findNodeSpan(tree, '0-5')).toBeUndefined();
    expect(findNodeSpan(tree, '1')).toBeUndefined();
    expect(findNodeSpan(tree, 'x')).toBeUndefined();
  });

  it('selects duplicate trees by occurrence', () => {
    const second = findTreeSpan(root, 'Main', 1)!;
    expect(findNodeSpan(second, '0')?.tag).toBe('AlwaysSuccess');
    expect(findTreeSpan(root, 'Main', 2)).toBeUndefined();
  });

  it('tagNameRange covers only the tag name', () => {
    const fallback = findNodeSpan(findTreeSpan(root, 'Main')!, '0-1')!;
    const r = tagNameRange(fallback);
    expect(XML.slice(r.start, r.end)).toBe('Fallback');
  });

  it('tolerates unbalanced input', () => {
    const top = scanXmlElements('<root><BehaviorTree ID="A"><Sequence></BehaviorTree></root>');
    const r = findRootSpan(top)!;
    expect(findTreeSpan(r, 'A')?.children[0]?.tag).toBe('Sequence');
  });
});

describe('checkXmlSyntax', () => {
  it('accepts well-formed XML', () => {
    expect(checkXmlSyntax(XML)).toBeNull();
  });

  it('reports mismatched tags with a position', () => {
    const issue = checkXmlSyntax(
      '<root>\n  <BehaviorTree ID="A">\n    <Sequence>\n  </BehaviorTree>\n</root>',
    );
    expect(issue).not.toBeNull();
    expect(issue!.line).toBe(4);
    expect(issue!.message).toContain('Sequence');
    expect(new XmlSyntaxError(issue!).message).toContain('line 4');
  });
});
