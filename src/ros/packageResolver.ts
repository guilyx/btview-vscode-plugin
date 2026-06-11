import * as cp from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface RosResolverConfig {
  rosDistro?: string;
  rosWorkspaceSetup?: string;
  packageShareOverrides?: Record<string, string>;
  workspaceFolders?: string[];
}

const shareCache = new Map<string, string | null>();

export async function resolveRosPackageShare(
  packageName: string,
  config: RosResolverConfig = {},
): Promise<string | null> {
  if (shareCache.has(packageName)) {
    return shareCache.get(packageName) ?? null;
  }

  const override = config.packageShareOverrides?.[packageName];
  if (override && fs.existsSync(override)) {
    shareCache.set(packageName, override);
    return override;
  }

  const fromRos2 = await tryRos2PkgPrefix(packageName, config);
  if (fromRos2) {
    shareCache.set(packageName, fromRos2);
    return fromRos2;
  }

  const fromWorkspace = findInWorkspaceInstall(packageName, config.workspaceFolders ?? []);
  if (fromWorkspace) {
    shareCache.set(packageName, fromWorkspace);
    return fromWorkspace;
  }

  const fromAment = findInAmentIndex(packageName);
  shareCache.set(packageName, fromAment);
  return fromAment;
}

function execCommand(cmd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    cp.exec(cmd, { timeout: 10000 }, (err, stdout) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(stdout.trim());
    });
  });
}

async function tryRos2PkgPrefix(
  packageName: string,
  config: RosResolverConfig,
): Promise<string | null> {
  const setup = config.rosWorkspaceSetup;
  const distro = config.rosDistro;
  const setupScript = setup ?? (distro ? `/opt/ros/${distro}/setup.bash` : undefined);

  const cmd = setupScript
    ? `bash -lc 'source "${setupScript}" 2>/dev/null && ros2 pkg prefix --share ${packageName}'`
    : `ros2 pkg prefix --share ${packageName}`;

  try {
    const result = await execCommand(cmd);
    if (result && fs.existsSync(result)) {
      return result;
    }
  } catch {
    // fall through
  }
  return null;
}

function findInWorkspaceInstall(packageName: string, workspaceFolders: string[]): string | null {
  for (const folder of workspaceFolders) {
    const installShare = path.join(folder, 'install', packageName, 'share', packageName);
    if (fs.existsSync(installShare)) {
      return installShare;
    }
  }
  return null;
}

function findInAmentIndex(packageName: string): string | null {
  const amentPrefix = process.env.AMENT_PREFIX_PATH;
  if (!amentPrefix) {
    return null;
  }

  for (const prefix of amentPrefix.split(path.delimiter)) {
    const marker = path.join(
      prefix,
      'share',
      'ament_index',
      'resource_index',
      'packages',
      packageName,
    );
    if (fs.existsSync(marker)) {
      const share = path.join(prefix, 'share', packageName);
      if (fs.existsSync(share)) {
        return share;
      }
    }
  }
  return null;
}

export function clearRosCache(): void {
  shareCache.clear();
}
