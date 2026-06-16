import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const stylesPath = join(__dirname, '../../../webview/src/styles.css');

/** Regression: .graph-pane wrapper must not collapse React Flow to zero height. */
describe('graph layout CSS', () => {
  const css = readFileSync(stylesPath, 'utf8');

  it('keeps flex height chain for graph pane and React Flow container', () => {
    expect(css).toMatch(/\.graph-pane\s*\{[^}]*min-height:\s*0/);
    expect(css).toMatch(/\.graph-pane\s*\{[^}]*display:\s*flex/);
    expect(css).toMatch(/\.graph-container\s*\{[^}]*height:\s*100%/);
    expect(css).toMatch(/\.graph-container \.react-flow\s*\{[^}]*height:\s*100%/);
  });
});
