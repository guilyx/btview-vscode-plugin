// Build-time data loader: commands, keybindings and settings straight from package.json,
// so the reference pages never drift from what the extension contributes.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

interface Command {
  command: string;
  title: string;
  category?: string;
}

interface Keybinding {
  command: string;
  key: string;
  mac?: string;
  when?: string;
}

interface Setting {
  key: string;
  type: string;
  default: string;
  description: string;
  enum?: string[];
}

export interface PackageData {
  version: string;
  commands: (Command & { keys?: string; mac?: string; when?: string })[];
  settings: Setting[];
}

const pkgPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../package.json');

export default {
  watch: [pkgPath],
  load(): PackageData {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    const contributes = pkg.contributes ?? {};
    const keybindings: Keybinding[] = contributes.keybindings ?? [];
    const commands = (contributes.commands ?? []).map((c: Command) => {
      const kb = keybindings.find((k) => k.command === c.command);
      return { ...c, keys: kb?.key, mac: kb?.mac, when: kb?.when };
    });
    const props = contributes.configuration?.properties ?? {};
    const settings: Setting[] = Object.entries(props).map(([key, raw]) => {
      const p = raw as Record<string, unknown>;
      return {
        key,
        type: String(p.type ?? ''),
        default: JSON.stringify(p.default),
        description: String(p.markdownDescription ?? p.description ?? ''),
        enum: p.enum as string[] | undefined,
      };
    });
    return { version: pkg.version, commands, settings };
  },
};
