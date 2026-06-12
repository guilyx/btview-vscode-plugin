import * as vscode from 'vscode';
import type { ValidationError } from '../btcpp/validation';

const SOURCE = 'btview';

export class DiagnosticsService {
  private readonly collection = vscode.languages.createDiagnosticCollection(SOURCE);

  dispose(): void {
    this.collection.dispose();
  }

  setValidationErrors(uri: vscode.Uri, errors: ValidationError[]): void {
    const diagnostics = errors.map(
      (e) =>
        new vscode.Diagnostic(
          new vscode.Range(0, 0, 0, 0),
          `${e.path}: ${e.message}`,
          vscode.DiagnosticSeverity.Warning,
        ),
    );
    this.collection.set(uri, diagnostics);
  }

  clear(uri: vscode.Uri): void {
    this.collection.delete(uri);
  }
}
