import { XMLValidator } from 'fast-xml-parser';

/** Well-formedness problem with a 1-based source position (as reported by the validator). */
export interface XmlSyntaxIssue {
  message: string;
  line: number;
  column: number;
}

/**
 * The tree parser is lenient (unclosed tags are silently re-nested), so the host checks
 * well-formedness first and shows the error instead of a misleading graph.
 */
export function checkXmlSyntax(xml: string): XmlSyntaxIssue | null {
  const result = XMLValidator.validate(xml);
  if (result === true) {
    return null;
  }
  return { message: result.err.msg, line: result.err.line, column: result.err.col };
}

export class XmlSyntaxError extends Error {
  constructor(readonly issue: XmlSyntaxIssue) {
    super(`XML syntax error at line ${issue.line}, column ${issue.column}: ${issue.message}`);
    this.name = 'XmlSyntaxError';
  }
}
