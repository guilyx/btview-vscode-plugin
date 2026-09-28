import * as vscode from 'vscode';
import type { ValidationError } from '../btcpp/validation';
import { locateIssue } from '../btcpp/quickFixes';
import type { XmlSyntaxIssue } from '../btcpp/xmlSyntax';

export const DIAGNOSTIC_SOURCE = 'btview';

/** Diagnostic code for XML that fails to load (not a `ValidationCode`; no quick fix). */
export const PARSE_ERROR_CODE = 'xml-syntax';

/** Problems-panel text for an issue; also used to match diagnostics back to issues. */
export function diagnosticMessage(e: ValidationError): string {
  if (e.treeId && e.path) {
    return `${e.message} (${e.treeId} › ${e.path})`;
  }
  return e.message;
}

export class DiagnosticsService {
  private readonly collection = vscode.languages.createDiagnosticCollection(DIAGNOSTIC_SOURCE);

  dispose(): void {
    this.collection.dispose();
  }

  /**
   * Publish validation issues. With the source text, each diagnostic is anchored on the
   * offending element; without it, issues fall back to the start of the file.
   */
  setValidationErrors(uri: vscode.Uri, errors: ValidationError[], xmlText?: string): void {
    const lineStarts = xmlText !== undefined ? computeLineStarts(xmlText) : undefined;
    const diagnostics = errors.map((e) => {
      const offsets = xmlText !== undefined ? locateIssue(xmlText, e) : null;
      const range =
        offsets && lineStarts
          ? new vscode.Range(
              toPosition(lineStarts, offsets.start),
              toPosition(lineStarts, offsets.end),
            )
          : new vscode.Range(0, 0, 0, 0);
      const diagnostic = new vscode.Diagnostic(
        range,
        diagnosticMessage(e),
        vscode.DiagnosticSeverity.Warning,
      );
      diagnostic.source = DIAGNOSTIC_SOURCE;
      if (e.code) {
        diagnostic.code = e.code;
      }
      return diagnostic;
    });
    this.collection.set(uri, diagnostics);
  }

  /** Replace diagnostics with a single XML syntax / load error. */
  setLoadError(uri: vscode.Uri, message: string, syntax?: XmlSyntaxIssue): void {
    const line = Math.max(0, (syntax?.line ?? 1) - 1);
    const column = Math.max(0, (syntax?.column ?? 1) - 1);
    const diagnostic = new vscode.Diagnostic(
      new vscode.Range(line, column, line, column + 1),
      syntax?.message ?? message,
      vscode.DiagnosticSeverity.Error,
    );
    diagnostic.source = DIAGNOSTIC_SOURCE;
    diagnostic.code = PARSE_ERROR_CODE;
    this.collection.set(uri, [diagnostic]);
  }

  clear(uri: vscode.Uri): void {
    this.collection.delete(uri);
  }
}

function computeLineStarts(text: string): number[] {
  const starts = [0];
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 10) {
      starts.push(i + 1);
    }
  }
  return starts;
}

function toPosition(lineStarts: number[], offset: number): vscode.Position {
  // Binary search for the last line start <= offset.
  let lo = 0;
  let hi = lineStarts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (lineStarts[mid]! <= offset) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  return new vscode.Position(lo, offset - lineStarts[lo]!);
}
