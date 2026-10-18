/**
 * AgentGram Persistent Service Manager
 * Installs, removes, and monitors background services for macOS launchd and Linux systemd.
 * Pure Node.js implementation with zero external dependencies.
 */
import * as os from 'node:os';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import type { ServiceStatus } from '../domain/types.js';

export const MACOS_PLIST_NAME = 'com.agentgram.plist';
export const LEGACY_MACOS_PLIST_NAME = 'com.rumuze.edit.plist';
export const MACOS_PLIST_DIR = path.join(os.homedir(), 'Library', 'LaunchAgents');
export const MACOS_PLIST_PATH = path.join(MACOS_PLIST_DIR, MACOS_PLIST_NAME);
export const LEGACY_MACOS_PLIST_PATH = path.join(MACOS_PLIST_DIR, LEGACY_MACOS_PLIST_NAME);

export const LINUX_SERVICE_NAME = 'agentgram.service';
export const LEGACY_LINUX_SERVICE_NAME = 'rumuze-edit.service';
export const LINUX_SERVICE_DIR = path.join(os.homedir(), '.config', 'systemd', 'user');
export const LINUX_SERVICE_PATH = path.join(LINUX_SERVICE_DIR, LINUX_SERVICE_NAME);
export const LEGACY_LINUX_SERVICE_PATH = path.join(LINUX_SERVICE_DIR, LEGACY_LINUX_SERVICE_NAME);

export function getEntryPoint(): string {
  // Locate dist/index.js or bin/agentgram.js
  const root = path.resolve(__dirname, '..');
  const distEntry = path.join(root, 'dist', 'index.js');
  if (fs.existsSync(distEntry)) return distEntry;
  return path.join(root, 'bin', 'agentgram.js');
}

export class ServiceManager {
  public static install(targetDir?: string): { success: boolean; message: string } {
    const platform = os.platform();
    const nodeExec = process.execPath;
    const script = getEntryPoint();
    const resolvedTarget = path.resolve(targetDir || process.cwd());
    const logDir = path.join(os.homedir(), '.config', 'agentgram');

    try {
      if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true, mode: 0o700 });
    } catch {}

    if (platform === 'darwin') {
      try {
        if (!fs.existsSync(MACOS_PLIST_DIR)) {
          fs.mkdirSync(MACOS_PLIST_DIR, { recursive: true });
        }

        // Unload existing or legacy plist
        spawnSync('launchctl', ['unload', MACOS_PLIST_PATH]);
        spawnSync('launchctl', ['unload', LEGACY_MACOS_PLIST_PATH]);

        let pathEnv = process.env.PATH || '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin';
        const opencodeBin = path.join(os.homedir(), '.opencode', 'bin');
        if (!pathEnv.includes(opencodeBin)) {
          pathEnv = `${opencodeBin}:${pathEnv}`;
        }

        const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.agentgram</string>
    <key>ProgramArguments</key>
    <array>
        <string>${nodeExec}</string>
        <string>${script}</string>
        <string>start</string>
        <string>--dir</string>
        <string>${resolvedTarget}</string>
    </array>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>${pathEnv}</string>
    </dict>
    <key>WorkingDirectory</key>
    <string>${resolvedTarget}</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>${path.join(logDir, 'daemon.log')}</string>
    <key>StandardErrorPath</key>
    <string>${path.join(logDir, 'daemon.err')}</string>
</dict>
</plist>
`;

        fs.writeFileSync(MACOS_PLIST_PATH, plistContent, 'utf-8');
        const loadRes = spawnSync('launchctl', ['load', MACOS_PLIST_PATH]);
        if (loadRes.status !== 0) {
          return {
            success: false,
            message: `Failed to load launchd service: ${loadRes.stderr?.toString()}`,
          };
        }

        return {
          success: true,
          message: `Installed & started macOS launchd service at ${MACOS_PLIST_PATH}`,
        };
      } catch (err) {
        return { success: false, message: (err as Error).message };
      }
    } else if (platform === 'linux') {
      try {
        if (!fs.existsSync(LINUX_SERVICE_DIR)) {
          fs.mkdirSync(LINUX_SERVICE_DIR, { recursive: true });
        }

        const unitContent = `[Unit]
Description=AgentGram AI Telegram Mission Control
After=network.target

[Service]
Type=simple
WorkingDirectory=${resolvedTarget}
ExecStart=${nodeExec} ${script} start --dir ${resolvedTarget}
Restart=always
RestartSec=5
StandardOutput=append:${path.join(logDir, 'daemon.log')}
StandardError=append:${path.join(logDir, 'daemon.err')}

[Install]
WantedBy=default.target
`;

        fs.writeFileSync(LINUX_SERVICE_PATH, unitContent, 'utf-8');
        spawnSync('systemctl', ['--user', 'daemon-reload']);
        spawnSync('systemctl', ['--user', 'enable', '--now', LINUX_SERVICE_NAME]);

        return {
          success: true,
          message: `Installed & started Linux systemd service at ${LINUX_SERVICE_PATH}`,
        };
      } catch (err) {
        return { success: false, message: (err as Error).message };
      }
    }

    return {
      success: false,
      message: `Background service automation is not currently supported on OS: ${platform}`,
    };
  }

  public static uninstall(): { success: boolean; message: string } {
    const platform = os.platform();

    if (platform === 'darwin') {
      for (const p of [MACOS_PLIST_PATH, LEGACY_MACOS_PLIST_PATH]) {
        if (fs.existsSync(p)) {
          spawnSync('launchctl', ['unload', p]);
          try {
            fs.unlinkSync(p);
          } catch {}
        }
      }
      return { success: true, message: 'Uninstalled macOS launchd service.' };
    } else if (platform === 'linux') {
      for (const [name, p] of [
        [LINUX_SERVICE_NAME, LINUX_SERVICE_PATH],
        [LEGACY_LINUX_SERVICE_NAME, LEGACY_LINUX_SERVICE_PATH],
      ]) {
        if (fs.existsSync(p)) {
          spawnSync('systemctl', ['--user', 'stop', name]);
          spawnSync('systemctl', ['--user', 'disable', name]);
          try {
            fs.unlinkSync(p);
          } catch {}
        }
      }
      spawnSync('systemctl', ['--user', 'daemon-reload']);
      return { success: true, message: 'Uninstalled Linux systemd service.' };
    }

    return { success: false, message: `Unsupported OS: ${platform}` };
  }

  public static status(): ServiceStatus {
    const platform = os.platform();

    if (platform === 'darwin') {
      const res = spawnSync('launchctl', ['list'], { encoding: 'utf-8' });
      const running =
        (res.stdout && (res.stdout.includes('com.agentgram') || res.stdout.includes('com.rumuze.edit'))) ||
        false;
      const installed =
        fs.existsSync(MACOS_PLIST_PATH) || fs.existsSync(LEGACY_MACOS_PLIST_PATH);
      const activePath = fs.existsSync(MACOS_PLIST_PATH)
        ? MACOS_PLIST_PATH
        : LEGACY_MACOS_PLIST_PATH;

      return {
        installed,
        running,
        system: platform,
        path: installed ? activePath : undefined,
      };
    } else if (platform === 'linux') {
      const res = spawnSync('systemctl', ['--user', 'is-active', LINUX_SERVICE_NAME], {
        encoding: 'utf-8',
      });
      let running = (res.stdout || '').trim() === 'active';
      if (!running) {
        const resLeg = spawnSync(
          'systemctl',
          ['--user', 'is-active', LEGACY_LINUX_SERVICE_NAME],
          { encoding: 'utf-8' }
        );
        running = (resLeg.stdout || '').trim() === 'active';
      }
      const installed =
        fs.existsSync(LINUX_SERVICE_PATH) || fs.existsSync(LEGACY_LINUX_SERVICE_PATH);
      const activePath = fs.existsSync(LINUX_SERVICE_PATH)
        ? LINUX_SERVICE_PATH
        : LEGACY_LINUX_SERVICE_PATH;

      return {
        installed,
        running,
        system: platform,
        path: installed ? activePath : undefined,
      };
    }

    return { installed: false, running: false, system: platform };
  }
}
