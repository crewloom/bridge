/**
 * AgentGram CLI Dispatcher & Interactive Setup Wizard
 * Pure Node.js with TypeScript clean architecture and zero external dependencies.
 */
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as readline from 'node:readline';
import * as child_process from 'node:child_process';
import { ConfigManager, AGENTGRAM_CONFIG_DIR, LEGACY_CONFIG_DIR } from '../config/config-manager.js';
import { TelegramClient, escapeHtml } from '../telegram/telegram-client.js';
import { OpenCodeClient } from '../opencode/opencode-client.js';
import { ControlRoom } from '../control-room/control-room.js';
import { TelegramChannelAdapter } from '../channels/telegram.adapter.js';
import { ConsoleChannelAdapter } from '../channels/console.adapter.js';
import { ChannelRegistry } from '../channels/registry.js';
import type { IChannelAdapter } from '../channels/channel.interface.js';
import { OpenCodeAdapter } from '../engines/opencode.adapter.js';
import { ShellEngineAdapter } from '../engines/shell.adapter.js';
import { EngineRegistry } from '../engines/registry.js';
import type { IAgentEngine } from '../engines/engine.interface.js';
import { ServiceManager, getEntryPoint } from '../service/service-manager.js';

export const VERSION = '2.0.11';

// ANSI Styling Tokens
export const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
};

export function log(msg: string): void {
  console.log(msg);
}

export function success(msg: string): void {
  console.log(`${C.green}✔${C.reset} ${msg}`);
}

export function info(msg: string): void {
  console.log(`${C.cyan}ℹ${C.reset} ${msg}`);
}

export function warn(msg: string): void {
  console.log(`${C.yellow}⚠${C.reset} ${msg}`);
}

export function error(msg: string): void {
  console.error(`${C.red}✖${C.reset} ${msg}`);
}

export function printBanner(): void {
  log(`\n${C.bold}${C.cyan}╔═══════════════════════════════════════════════════════╗${C.reset}`);
  log(`${C.bold}${C.cyan}║   ⚡ AgentGram v${VERSION} — AI Agent Control Room         ║${C.reset}`);
  log(`${C.bold}${C.cyan}║   Turn your Telegram into a Remote Ops Command Center ║${C.reset}`);
  log(`${C.bold}${C.cyan}╚═══════════════════════════════════════════════════════╝${C.reset}\n`);
}

export function getPidFilePath(): string {
  const dir = fs.existsSync(AGENTGRAM_CONFIG_DIR) ? AGENTGRAM_CONFIG_DIR : LEGACY_CONFIG_DIR;
  return path.join(dir, 'daemon.pid');
}

export function checkOpenCodeCli(): boolean {
  try {
    const isWin = os.platform() === 'win32';
    const cmd = isWin ? 'where' : 'which';
    const res = child_process.spawnSync(cmd, ['opencode'], { encoding: 'utf-8' });
    return res.status === 0 && res.stdout.trim().length > 0;
  } catch {
    return false;
  }
}

/**
 * Interactive pairing wizard with automatic Telegram chat discovery and bot creation guide.
 */
export async function cmdInit(): Promise<void> {
  printBanner();

  if (checkOpenCodeCli()) {
    success('OpenCode AI Agent CLI detected.');
  } else {
    warn('OpenCode CLI was not detected in PATH. (Install via: npm i -g opencode-ai)');
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const question = (q: string): Promise<string> => new Promise((res) => rl.question(q, res));

  // 1. Workspace Directory
  const defaultDir = process.cwd();
  log(`\n${C.bold}1. Project Workspace Directory:${C.reset}`);
  const dirInput = (await question(`Target Directory [${defaultDir}]: `)).trim();
  const targetDir = path.resolve(dirInput || defaultDir);
  success(`Target workspace: ${C.bold}${targetDir}${C.reset}`);

  const cfgManager = new ConfigManager(targetDir);
  const existing = cfgManager.config;

  // 2. Telegram Bot Configuration
  log(`\n${C.bold}2. Telegram Bot Setup:${C.reset}`);
  log(`Do you already have a Telegram Bot token for this project?`);
  log(`  ${C.cyan}[1]${C.reset} Yes, I have an existing Bot Token`);
  log(`  ${C.cyan}[2]${C.reset} No, guide me to create a new Bot with @BotFather in 30 seconds`);
  
  const botChoice = (await question(`Select [1/2] (default: 1): `)).trim();

  if (botChoice === '2' || botChoice.toLowerCase() === 'no' || botChoice.toLowerCase() === 'new') {
    log(`\n${C.cyan}╔═════════════════════════════════════════════════════════════╗${C.reset}`);
    log(`${C.cyan}║   🤖 How to create a new Telegram Bot via @BotFather:       ║${C.reset}`);
    log(`${C.cyan}╠═════════════════════════════════════════════════════════════╣${C.reset}`);
    log(`${C.cyan}║${C.reset} 1. Open Telegram and search for ${C.bold}@BotFather${C.reset} (https://t.me/BotFather)`);
    log(`${C.cyan}║${C.reset} 2. Send: ${C.bold}/newbot${C.reset}`);
    log(`${C.cyan}║${C.reset} 3. Enter a friendly display name (e.g. "${path.basename(targetDir)} Control")`);
    log(`${C.cyan}║${C.reset} 4. Enter a username ending in 'bot' (e.g. "${path.basename(targetDir).toLowerCase().replace(/[^a-z0-9]/g, '_')}_agent_bot")`);
    log(`${C.cyan}║${C.reset} 5. Copy the HTTP API token provided by BotFather.`);
    log(`${C.cyan}╚═════════════════════════════════════════════════════════════╝${C.reset}\n`);
  }

  let tokenPrompt = 'Enter your Telegram Bot Token: ';
  if (existing.botToken) {
    tokenPrompt = `Enter your Telegram Bot Token [${existing.botToken.slice(0, 10)}...]: `;
  }

  let token = (await question(tokenPrompt)).trim();
  if (!token && existing.botToken) {
    token = existing.botToken;
  }

  if (!token) {
    error('Bot Token is required.');
    rl.close();
    process.exit(1);
  }

  info('Verifying bot token with Telegram Bot API...');
  const tempTg = new TelegramClient(token);
  let botInfo: { id: number; username?: string; first_name?: string };
  try {
    botInfo = await tempTg.getMe();
    success(`Connected to bot: ${C.bold}@${botInfo.username || 'unknown'}${C.reset} (${botInfo.first_name || 'Bot'})`);
  } catch (err) {
    error(`Failed to connect to Telegram bot: ${(err as Error).message}`);
    rl.close();
    process.exit(1);
  }

  // 3. Developer Authentication & Linking
  log(`\n${C.bold}3. Developer Identification & Pairing:${C.reset}`);
  info('AgentGram only accepts instructions from authorized developer accounts.');
  log(`How would you like to link your Developer Telegram account?`);
  log(`  ${C.cyan}[1]${C.reset} Auto-Pair (Recommended): Send /start to @${botInfo.username} on Telegram`);
  log(`  ${C.cyan}[2]${C.reset} Direct Entry: Enter your Telegram Developer ID manually (obtainable from @userinfobot)`);

  const pairChoice = (await question(`Select [1/2] (default: 1): `)).trim();
  let pairedChatId: string | null = null;
  let pairedUser: string | null = null;

  if (pairChoice === '2' || pairChoice.toLowerCase() === 'direct') {
    let idPrompt = 'Enter Developer Telegram ID (or Chat ID): ';
    if (existing.allowedChatId) {
      idPrompt = `Enter Developer Telegram ID [${existing.allowedChatId}]: `;
    }
    const manualInput = (await question(idPrompt)).trim();
    pairedChatId = manualInput || existing.allowedChatId || null;

    if (!pairedChatId) {
      error('Developer ID is required.');
      rl.close();
      process.exit(1);
    }

    info(`Sending verification ping to Developer ID: ${pairedChatId}...`);
    try {
      await tempTg.sendMessage(
        pairedChatId,
        `⚡ <b>AgentGram Developer Authentication</b>\nSuccessfully linked to workspace: <code>${escapeHtml(targetDir)}</code>`
      );
      success(`Verification ping sent successfully to Telegram ID: ${pairedChatId}`);
    } catch (e) {
      warn(`Could not ping chat ID ${pairedChatId}: ${(e as Error).message}`);
      warn(`Make sure you have started a chat with @${botInfo.username} on Telegram first!`);
    }
  } else {
    info(`Open Telegram, search for ${C.bold}@${botInfo.username}${C.reset}, and click ${C.bold}START${C.reset} (or send /start).`);
    log(`${C.dim}Listening for updates (up to 90 seconds)...${C.reset}`);

    const startTime = Date.now();
    let offset = 0;

    // Flush stale updates first
    try {
      const stale = await tempTg.getUpdates(-1, 1);
      if (stale.length > 0) {
        offset = stale[stale.length - 1]!.update_id + 1;
      }
    } catch {}

    while (!pairedChatId && Date.now() - startTime < 90000) {
      try {
        const updates = await tempTg.getUpdates(offset, 2);
        for (const u of updates) {
          offset = u.update_id + 1;
          const msg = u.message;
          if (msg && msg.chat && msg.from) {
            pairedChatId = String(msg.chat.id);
            pairedUser = msg.from.username ? `@${msg.from.username}` : msg.from.first_name || 'Developer';
            break;
          }
        }
      } catch {
        await new Promise((r) => setTimeout(r, 1000));
      }
      if (!pairedChatId) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    if (!pairedChatId) {
      warn('Auto-pairing timed out.');
      const manual = (await question('Enter Developer Telegram ID manually (from @userinfobot): ')).trim();
      if (manual) {
        pairedChatId = manual;
      } else {
        error('Developer ID is required for security.');
        rl.close();
        process.exit(1);
      }
    } else {
      success(`Authenticated Developer: ${C.bold}${pairedUser}${C.reset} (ID: ${pairedChatId})!`);
      try {
        await tempTg.sendMessage(
          pairedChatId,
          `🎉 <b>AgentGram Mission Control Linked!</b>\nDeveloper: <b>${escapeHtml(pairedUser || 'Authorized')}</b> (ID: <code>${pairedChatId}</code>)\nWorkspace: <code>${escapeHtml(targetDir)}</code>\n\nYour project is now securely controlled from this chat.`
        );
      } catch {}
    }
  }

  // 4. Configuration Scope (Project-level vs Global)
  log(`\n${C.bold}4. Configuration Storage Scope:${C.reset}`);
  log(`Where would you like to save this configuration?`);
  log(`  ${C.cyan}[1]${C.reset} Project-Level (.agentgram.json in project root) [Recommended: completely isolated]`);
  log(`  ${C.cyan}[2]${C.reset} Global (~/.config/agentgram/config.json) [Machine-wide default]`);

  const scopeChoice = (await question(`Select [1/2] (default: 1): `)).trim();
  const isProjectLevel = scopeChoice !== '2';

  rl.close();

  cfgManager.config.botToken = token;
  cfgManager.config.allowedChatId = pairedChatId;
  cfgManager.config.targetDir = targetDir;

  if (isProjectLevel) {
    cfgManager.saveProject();
    log(`\n${C.bold}${C.green}═════════════════════════════════════════════════════════════${C.reset}`);
    success(`Configuration saved locally to: ${C.bold}${cfgManager.projectConfigPath}${C.reset}`);
    info('This project is completely isolated with its own dedicated bot and settings.');
  } else {
    cfgManager.saveGlobal();
    log(`\n${C.bold}${C.green}═════════════════════════════════════════════════════════════${C.reset}`);
    success(`Configuration saved globally to: ${C.bold}${cfgManager.globalConfigPath}${C.reset}`);
  }

  log(`\n${C.bold}Next Steps:${C.reset}`);
  log(`  • Start control room in foreground:`);
  log(`    ${C.cyan}npx agentgram start${C.reset}`);
  log(`  • Start in background daemon mode:`);
  log(`    ${C.cyan}npx agentgram start --daemon${C.reset}`);
  log(`  • Install as persistent OS service:`);
  log(`    ${C.cyan}npx agentgram service install${C.reset}\n`);
}

/**
 * Start the AgentGram Control Room.
 */
export async function cmdStart(args: string[]): Promise<void> {
  const isDaemon = args.includes('--daemon') || args.includes('-d');
  const dirIdx = args.indexOf('--dir') !== -1 ? args.indexOf('--dir') : args.indexOf('-C');
  const targetDir = dirIdx !== -1 && args[dirIdx + 1] ? path.resolve(args[dirIdx + 1]!) : process.cwd();

  const cfgManager = new ConfigManager(targetDir);

  // Pluggable Channel Resolution
  const chanIdx = args.indexOf('--channel');
  const selectedChannel = (chanIdx !== -1 && args[chanIdx + 1]
    ? args[chanIdx + 1]!
    : cfgManager.config.channel || 'telegram').toLowerCase();

  // Pluggable Agent Engine Resolution
  const engIdx = args.indexOf('--engine');
  const selectedEngine = (engIdx !== -1 && args[engIdx + 1]
    ? args[engIdx + 1]!
    : cfgManager.config.engine || 'opencode').toLowerCase();

  cfgManager.config.channel = selectedChannel;
  cfgManager.config.engine = selectedEngine;

  const errors = cfgManager.validate();
  if (errors.length > 0) {
    for (const err of errors) error(err);
    if (selectedChannel === 'telegram') {
      log(`\nPlease run ${C.bold}${C.cyan}agentgram init${C.reset} to set up your Telegram credentials.`);
    }
    process.exit(1);
  }

  if (isDaemon) {
    info(`Starting AgentGram in background for workspace: ${C.bold}${targetDir}${C.reset}`);
    const globalDir = path.dirname(cfgManager.globalConfigPath);
    if (!fs.existsSync(globalDir)) fs.mkdirSync(globalDir, { recursive: true, mode: 0o700 });

    const logPath = path.join(globalDir, 'daemon.log');
    const out = fs.openSync(logPath, 'a');
    const err = fs.openSync(logPath, 'a');

    const entryPoint = getEntryPoint();
    const spawnArgs = [
      entryPoint,
      'start',
      '--dir',
      targetDir,
      '--channel',
      selectedChannel,
      '--engine',
      selectedEngine,
    ];

    const child = child_process.spawn(process.execPath, spawnArgs, {
      cwd: targetDir,
      detached: true,
      stdio: ['ignore', out, err],
      env: process.env,
    });

    child.unref();
    const pidFile = getPidFilePath();
    fs.writeFileSync(pidFile, String(child.pid), 'utf-8');
    success(`AgentGram is running in background (PID: ${child.pid}).`);
    info(`Channel: ${selectedChannel} | Engine: ${selectedEngine}`);
    info(`Logs: ${logPath}`);
    return;
  }

  printBanner();
  info(`Connecting Control Room to workspace: ${C.bold}${targetDir}${C.reset}`);
  info(`Active Channel: ${C.cyan}${selectedChannel}${C.reset} | AI Engine: ${C.cyan}${selectedEngine}${C.reset}`);

  // Resolve Channel Adapter
  let channelAdapter: IChannelAdapter;
  if (selectedChannel === 'telegram') {
    channelAdapter = new TelegramChannelAdapter(cfgManager.config.botToken);
  } else if (selectedChannel === 'console') {
    channelAdapter = new ConsoleChannelAdapter();
  } else {
    try {
      channelAdapter = ChannelRegistry.get(selectedChannel, cfgManager.config);
    } catch (err) {
      error((err as Error).message);
      process.exit(1);
    }
  }

  // Resolve Engine Adapter
  let engineAdapter: IAgentEngine;
  let spawnedOc: { client: OpenCodeClient; port: number } | undefined;

  if (selectedEngine === 'opencode') {
    const envUrl = process.env.OPENCODE_URL;
    if (envUrl) {
      info(`Connecting to configured OpenCode server at: ${C.cyan}${envUrl}${C.reset}`);
      const ocClient = new OpenCodeClient(envUrl, process.env.OPENCODE_SERVER_PASSWORD, targetDir);
      engineAdapter = new OpenCodeAdapter(ocClient, targetDir);
    } else {
      try {
        info('Spawning private OpenCode server on loopback...');
        spawnedOc = await OpenCodeClient.spawnServer(targetDir);
        engineAdapter = new OpenCodeAdapter(spawnedOc.client, targetDir);
        success(`OpenCode server online (port: ${spawnedOc.port}).`);
      } catch (err) {
        warn(`Could not spawn OpenCode server: ${(err as Error).message}`);
        warn('Resilience mode active: Falling back to Shell CLI Engine so Telegram bot connects immediately.');
        engineAdapter = new ShellEngineAdapter({ workspaceDir: targetDir, cliCommand: 'sh' });
      }
    }
  } else if (selectedEngine === 'shell' || selectedEngine === 'sh' || selectedEngine === 'bash') {
    engineAdapter = new ShellEngineAdapter({ workspaceDir: targetDir, cliCommand: 'sh' });
    success('Shell CLI Engine initialized.');
  } else if (selectedEngine === 'claude') {
    engineAdapter = new ShellEngineAdapter({ workspaceDir: targetDir, cliCommand: 'claude' });
    success('Claude Code Engine initialized.');
  } else if (selectedEngine === 'aider') {
    engineAdapter = new ShellEngineAdapter({ workspaceDir: targetDir, cliCommand: 'aider' });
    success('Aider Engine initialized.');
  } else {
    try {
      engineAdapter = EngineRegistry.get(selectedEngine, cfgManager.config);
    } catch (err) {
      error((err as Error).message);
      process.exit(1);
    }
  }

  const room = new ControlRoom({
    channel: channelAdapter,
    engine: engineAdapter,
    configManager: cfgManager,
  });

  // Graceful shutdown handling
  const cleanup = () => {
    log(`\n${C.yellow}Shutting down AgentGram Control Room...${C.reset}`);
    room.stop();
    if (spawnedOc) {
      spawnedOc.client.killServer();
    }
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  await room.start();
}

/**
 * Stop running background daemon.
 */
export function cmdStop(): void {
  const pidFile = getPidFilePath();
  if (!fs.existsSync(pidFile)) {
    info('No background daemon PID file found.');
    return;
  }

  const pid = parseInt(fs.readFileSync(pidFile, 'utf-8').trim(), 10);
  if (!pid) {
    error('Corrupted PID file.');
    return;
  }

  try {
    process.kill(pid, 'SIGTERM');
    success(`Stopped AgentGram daemon (PID: ${pid}).`);
    fs.unlinkSync(pidFile);
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    if (err.code === 'ESRCH') {
      warn(`Process ${pid} is not running.`);
      fs.unlinkSync(pidFile);
    } else {
      error(`Failed to stop process ${pid}: ${err.message}`);
    }
  }
}

/**
 * Display full status report.
 */
export function cmdStatus(): void {
  printBanner();
  const cfgManager = new ConfigManager();
  const cfg = cfgManager.config;

  log(`${C.bold}Status Overview:${C.reset}`);
  if (cfg.allowedChatId) {
    success(`Paired Chat ID: ${cfg.allowedChatId}`);
  } else {
    warn('No Telegram chat paired yet. Run `agentgram init`.');
  }

  const pidFile = getPidFilePath();
  if (fs.existsSync(pidFile)) {
    const pid = parseInt(fs.readFileSync(pidFile, 'utf-8').trim(), 10);
    try {
      process.kill(pid, 0);
      success(`Background Daemon: Running (PID: ${pid})`);
    } catch {
      warn(`Background Daemon: Stale PID file (${pid} not running)`);
    }
  } else {
    info('Background Daemon: Not running');
  }

  // OS Service status
  const svc = ServiceManager.status();
  if (svc.installed) {
    const stateStr = svc.running ? `${C.green}Running${C.reset}` : `${C.yellow}Stopped${C.reset}`;
    success(`System Service (${svc.system}): Installed (${stateStr})`);
  } else {
    info(`System Service (${svc.system}): Not installed`);
  }

  // OpenCode Process
  try {
    const ps = child_process.spawnSync('pgrep', ['-fl', 'opencode serve'], { encoding: 'utf-8' });
    if (ps.status === 0 && ps.stdout.trim()) {
      success(`OpenCode Server: Active (${ps.stdout.trim().split('\n')[0]})`);
    } else {
      info('OpenCode Server: Idle');
    }
  } catch {
    info('OpenCode Server: Unknown');
  }

  log(`\nWorkspace: ${C.bold}${cfg.targetDir}${C.reset}`);
  log(`Default Agent: ${C.cyan}${cfg.defaultAgent}${C.reset}`);
  log(`Language: ${C.cyan}${cfg.language}${C.reset}\n`);
}

/**
 * Service management wrapper.
 */
export function cmdService(subcmd?: string, args: string[] = []): void {
  const dirIdx = args.indexOf('--dir') !== -1 ? args.indexOf('--dir') : args.indexOf('-C');
  const targetDir = dirIdx !== -1 && args[dirIdx + 1] ? path.resolve(args[dirIdx + 1]!) : process.cwd();

  if (subcmd === 'install') {
    info(`Installing persistent service for: ${targetDir}`);
    const res = ServiceManager.install(targetDir);
    if (res.success) {
      success(res.message);
    } else {
      error(res.message);
    }
  } else if (subcmd === 'uninstall') {
    info('Uninstalling persistent service...');
    const res = ServiceManager.uninstall();
    if (res.success) {
      success(res.message);
    } else {
      error(res.message);
    }
  } else {
    const st = ServiceManager.status();
    log(`Service installed: ${st.installed ? C.green + 'yes' + C.reset : C.yellow + 'no' + C.reset}`);
    log(`Service running:   ${st.running ? C.green + 'yes' + C.reset : C.yellow + 'no' + C.reset}`);
    log(`Platform:          ${st.system}`);
  }
}

/**
 * Print help menu.
 */
export function cmdHelp(): void {
  printBanner();
  log(`Usage: agentgram <command> [options]\n`);
  log(`Commands:`);
  log(`  init                  Interactive setup wizard & automatic Telegram pairing`);
  log(`  start [options]       Launch AgentGram Control Room (foreground or background)`);
  log(`  stop                  Stop running background daemon`);
  log(`  status                Display daemon, pairing, and service health overview`);
  log(`  service <subcmd>      Manage OS service (install, uninstall, status)`);
  log(`  help                  Display this help message\n`);
  log(`Options:`);
  log(`  -d, --daemon          Run in background as detached daemon`);
  log(`  -C, --dir <path>      Specify workspace directory (defaults to current dir)`);
  log(`  --channel <name>      Communication channel: telegram (default), console`);
  log(`  --engine <name>       AI coding engine: opencode (default), shell, claude, aider`);
  log(`  -v, --version         Display AgentGram version\n`);
  log(`Examples:`);
  log(`  agentgram init`);
  log(`  agentgram start`);
  log(`  agentgram start --channel console --engine shell`);
  log(`  agentgram start --daemon --dir /path/to/project`);
  log(`  agentgram service install\n`);
}

/**
 * Main entry point for CLI execution.
 */
export async function runCli(argv: string[] = process.argv.slice(2)): Promise<void> {
  const cmd = argv[0]?.toLowerCase();
  const rest = argv.slice(1);

  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') {
    cmdHelp();
    return;
  }

  if (cmd === 'version' || cmd === '--version' || cmd === '-v') {
    log(`AgentGram v${VERSION}`);
    return;
  }

  switch (cmd) {
    case 'init':
      await cmdInit();
      break;
    case 'start':
      await cmdStart(rest);
      break;
    case 'stop':
      cmdStop();
      break;
    case 'status':
      cmdStatus();
      break;
    case 'service':
      cmdService(rest[0], rest.slice(1));
      break;
    default:
      error(`Unknown command: ${cmd}`);
      cmdHelp();
      process.exit(1);
  }
}
