import * as vscode from 'vscode';
import { validateDocument, type ValidationError } from '../btcpp/validation';
import { convertToV4Fix, quickFixesForIssue, type QuickFix } from '../btcpp/quickFixes';
import { parseWithWorkspaceSettings } from '../sync/DocumentSyncService';
import { looksLikeBtCpp } from '../preview/BtGraphController';
import { DIAGNOSTIC_SOURCE, PARSE_ERROR_CODE, diagnosticMessage } from './DiagnosticsService';

/** Source action that migrates a v3 file in place (the command variant previews a diff). */
export const CONVERT_TO_V4_KIND = vscode.CodeActionKind.Source.append('btview.convertToV4');

/**
 * Quick fixes for BTView diagnostics in XML files. Fixes are computed by the pure
 * `quickFixesForIssue` (same edits as the graph Issues panel), so this stays glue only.
 */
export class BtCodeActionProvider implements vscode.CodeActionProvider {
  static readonly metadata: vscode.CodeActionProviderMetadata = {
    providedCodeActionKinds: [vscode.CodeActionKind.QuickFix, CONVERT_TO_V4_KIND],
  };

  static register(): vscode.Disposable {
    return vscode.languages.registerCodeActionsProvider(
      { language: 'xml' },
      new BtCodeActionProvider(),
      BtCodeActionProvider.metadata,
    );
  }

  async provideCodeActions(
    document: vscode.TextDocument,
    _range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
    token: vscode.CancellationToken,
  ): Promise<vscode.CodeAction[]> {
    const diagnostics = context.diagnostics.filter(
      (d) =>
        d.source === DIAGNOSTIC_SOURCE && typeof d.code === 'string' && d.code !== PARSE_ERROR_CODE,
    );
    const wantsConvert = context.only?.intersects(CONVERT_TO_V4_KIND) ?? false;
    if (diagnostics.length === 0 && !wantsConvert) {
      return [];
    }

    const text = document.getText();
    if (!looksLikeBtCpp(text)) {
      return [];
    }
    let doc;
    try {
      doc = await parseWithWorkspaceSettings(text, document.uri);
    } catch {
      return [];
    }
    if (token.isCancellationRequested) {
      return [];
    }

    const actions: vscode.CodeAction[] = [];
    const issues = validateDocument(doc);
    for (const diagnostic of diagnostics) {
      const issue = matchIssue(issues, diagnostic);
      if (!issue) {
        continue;
      }
      for (const fix of quickFixesForIssue(text, doc, issue)) {
        const action = toCodeAction(document, fix, vscode.CodeActionKind.QuickFix);
        action.diagnostics = [diagnostic];
        actions.push(action);
      }
    }

    if (wantsConvert && doc.declaredFormat === '') {
      const convert = convertToV4Fix(text, doc);
      if (convert) {
        actions.push(toCodeAction(document, convert, CONVERT_TO_V4_KIND));
      }
    }
    return actions;
  }
}

function matchIssue(
  issues: ValidationError[],
  diagnostic: vscode.Diagnostic,
): ValidationError | undefined {
  return issues.find(
    (e) => e.code === diagnostic.code && diagnosticMessage(e) === diagnostic.message,
  );
}

function toCodeAction(
  document: vscode.TextDocument,
  fix: QuickFix,
  kind: vscode.CodeActionKind,
): vscode.CodeAction {
  const action = new vscode.CodeAction(fix.title, kind);
  const edit = new vscode.WorkspaceEdit();
  for (const e of fix.edits) {
    edit.replace(
      document.uri,
      new vscode.Range(document.positionAt(e.start), document.positionAt(e.end)),
      e.newText,
    );
  }
  action.edit = edit;
  action.isPreferred = fix.isPreferred;
  return action;
}
