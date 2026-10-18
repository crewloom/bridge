#!/usr/bin/env node
/**
 * Rumuze Edit CLI
 * Zero-dependency Node.js CLI runner for Rumuze Edit.
 * Provides interactive setup (init), daemon lifecycle management, and background service configuration.
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const https = require('node:https');
const readline = require('node:readline');
const { spawn, spawnSync } = require('node:child_process');

const VERSION = '1.0.4';
const ROOT_DIR = path.resolve(__dirname, '..');
const CORE_DIR = path.join(ROOT_DIR, 'core');
const CONTROL_ROOM_SCRIPT = path.join(CORE_DIR, 'control_room.py');
const SERVICE_MANAGER_SCRIPT = path.join(CORE_DIR, 'service_manager.py');

const CONFIG_DIR = path.join(os.homedir(), '.config', 'rumuze-edit');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const PID_FILE = path.join(CONFIG_DIR, 'daemon.pid');

// ANSI Colors
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
};

function log(msg) {
  console.log(msg);
}

function success(msg) {
  console.log(`${C.green}✔${C.reset} ${msg}`);
}

function info(msg) {
  console.log(`${C.cyan}ℹ${C.reset} ${msg}`);
}

function warn(msg) {
  console.log(`${C.yellow}⚠${C.reset} ${msg}`);
}

function error(msg) {
  console.error(`${C.red}✖${C.reset} ${msg}`);
}

function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
}

function loadConfig() {
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    } catch (e) {
      return {};
    }
  }
  return {};
}

function saveConfig(cfg) {
  ensureConfigDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), { encoding: 'utf8', mode: 0o600 });
}

function findPython() {
  const candidates = ['python3', 'python'];
  for (const cmd of candidates) {
    try {
      const res = spawnSync(cmd, ['--version'], { encoding: 'utf8' });
      if (res.status === 0) {
        return cmd;
      }
    } catch (e) {}
  }
  return null;
}

function checkOpenCode() {
  try {
    const res = spawnSync('which', ['opencode'], { encoding: 'utf8' });
    return res.status === 0 && res.stdout.trim().length > 0;
  } catch (e) {
    return false;
  }
}

function telegramRequest(token, method, payload = null) {
  return new Promise((resolve, reject) => {
    const data = payload ? JSON.stringify(payload) : null;
    const options = {
      hostname: 'api.telegram.org',
      port: 443,
      path: `/bot${token}/${method}`,
      method: payload ? 'POST' : 'GET',
      headers: payload
        ? {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data),
          }
        : {},
      timeout: 10000,
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (parsed.ok) {
            resolve(parsed.result);
          } else {
            reject(new Error(parsed.description || 'Telegram API error'));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });

    if (data) req.write(data);
    req.end();
  });
}

// -----------------------------------------------------------------------------
// Command: init (Interactive setup wizard & auto-pairing)
// -----------------------------------------------------------------------------
async function cmdInit() {
  log(`\n${C.bold}${C.cyan}╔═══════════════════════════════════════════════════╗${C.reset}`);
  log(`${C.bold}${C.cyan}║             ⚡ Rumuze Edit Setup Wizard            ║${C.reset}`);
  log(`${C.bold}${C.cyan}╚═══════════════════════════════════════════════════╝${C.reset}\n`);

  const py = findPython();
  if (!py) {
    error('Python 3.9+ was not found on your system. Please install Python 3 first.');
    process.exit(1);
  }
  success(`Found Python runtime: ${py}`);

  if (checkOpenCode()) {
    success('Found OpenCode AI Agent CLI.');
  } else {
    warn('OpenCode CLI was not detected in PATH. (Make sure opencode is installed or install via: npm i -g opencode-ai)');
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (q) => new Promise((res) => rl.question(q, res));

  const existing = loadConfig();

  // 1. Bot Token
  log(`\n${C.bold}1. Telegram Bot Token:${C.reset}`);
  info('Create a new bot via @BotFather on Telegram and copy the API token.');
  let tokenPrompt = 'Enter your Bot Token: ';
  if (existing.bot_token) {
    tokenPrompt = `Enter your Bot Token [${existing.bot_token.slice(0, 10)}...]: `;
  }

  let token = (await question(tokenPrompt)).trim();
  if (!token && existing.bot_token) {
    token = existing.bot_token;
  }

  if (!token) {
    error('Bot Token is required.');
    rl.close();
    process.exit(1);
  }

  info('Verifying bot token with Telegram...');
  let botInfo;
  try {
    botInfo = await telegramRequest(token, 'getMe');
    success(`Connected to bot: ${C.bold}@${botInfo.username}${C.reset} (${botInfo.first_name})`);
  } catch (e) {
    error(`Failed to connect to Telegram bot: ${e.message}`);
    rl.close();
    process.exit(1);
  }

  // 2. Chat ID Auto-Pairing
  log(`\n${C.bold}2. Automatic Telegram Chat Pairing:${C.reset}`);
  info(`Open Telegram, search for ${C.bold}@${botInfo.username}${C.reset}, and click ${C.bold}START${C.reset} (or send /start).`);
  log(`${C.dim}Waiting for your message (listening for updates)...${C.reset}`);

  let pairedChatId = null;
  let pairedUser = null;
  const startTime = Date.now();
  let offset = 0;

  // Flush stale updates first
  try {
    const stale = await telegramRequest(token, 'getUpdates', { offset: -1 });
    if (stale.length > 0) {
      offset = stale[stale.length - 1].update_id + 1;
    }
  } catch (e) {}

  while (!pairedChatId && Date.now() - startTime < 90000) {
    try {
      const updates = await telegramRequest(token, 'getUpdates', { offset, timeout: 2 });
      for (const u of updates) {
        offset = u.update_id + 1;
        const msg = u.message;
        if (msg && msg.chat && msg.from) {
          pairedChatId = String(msg.chat.id);
          pairedUser = msg.from.first_name || msg.from.username || 'Owner';
          break;
        }
      }
    } catch (e) {
      await new Promise((r) => setTimeout(r, 1000));
    }
    if (!pairedChatId) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  if (!pairedChatId) {
    warn('Auto-pairing timed out.');
    const manual = (await question('Enter your Telegram Chat ID manually (or leave blank to retry later): ')).trim();
    if (manual) {
      pairedChatId = manual;
    } else {
      error('Chat ID is required for security.');
      rl.close();
      process.exit(1);
    }
  } else {
    success(`Paired successfully with ${C.bold}${pairedUser}${C.reset} (Chat ID: ${pairedChatId})!`);
    // Send pairing celebration message on Telegram
    try {
      await telegramRequest(token, 'sendMessage', {
        chat_id: pairedChatId,
        text: '🎉 <b>Rumuze Edit Paired Successfully!</b>\nYour machine is now securely linked to this Telegram chat.',
        parse_mode: 'HTML',
      });
    } catch (e) {}
  }

  // 3. Project Directory
  const defaultDir = process.cwd();
  log(`\n${C.bold}3. Default Project Directory:${C.reset}`);
  const dirInput = (await question(`Target Directory [${defaultDir}]: `)).trim();
  const targetDir = path.resolve(dirInput || defaultDir);

  rl.close();

  // Save config
  const newConfig = {
    ...existing,
    bot_token: token,
    allowed_chat_id: pairedChatId,
    default_dir: targetDir,
    default_agent: existing.default_agent || 'build',
    daily_limit: existing.daily_limit || 200,
    run_timeout: existing.run_timeout || 1800,
  };

  saveConfig(newConfig);

  log(`\n${C.bold}${C.green}═══════════════════════════════════════════════════${C.reset}`);
  success(`Configuration securely saved to: ${CONFIG_FILE}`);
  log(`${C.bold}Next Steps:${C.reset}`);
  log(`  • To start the control room now:`);
  log(`    ${C.cyan}npx rumuze-edit start${C.reset}`);
  log(`  • To install as a persistent background service (survives reboots):`);
  log(`    ${C.cyan}npx rumuze-edit service install${C.reset}`);
  log(`\n`);
}

// -----------------------------------------------------------------------------
// Command: start
// -----------------------------------------------------------------------------
function cmdStart(args) {
  const cfg = loadConfig();
  const py = findPython();
  if (!py) {
    error('Python 3 is required.');
    process.exit(1);
  }

  const isDaemon = args.includes('--daemon') || args.includes('-d');
  const dirIdx = args.indexOf('--dir');
  const targetDir = dirIdx !== -1 && args[dirIdx + 1] ? path.resolve(args[dirIdx + 1]) : process.cwd();

  const pyArgs = [CONTROL_ROOM_SCRIPT, '--dir', targetDir];

  if (isDaemon) {
    ensureConfigDir();
    info(`Starting Rumuze Edit in background for workspace: ${C.bold}${targetDir}${C.reset}`);

    const logPath = path.join(CONFIG_DIR, 'daemon.log');
    const out = fs.openSync(logPath, 'a');
    const err = fs.openSync(logPath, 'a');

    const child = spawn(py, pyArgs, {
      cwd: targetDir,
      detached: true,
      stdio: ['ignore', out, err],
      env: process.env,
    });

    child.unref();
    fs.writeFileSync(PID_FILE, String(child.pid), 'utf8');
    success(`Rumuze Edit is running in background (PID: ${child.pid}).`);
    info(`Logs: ${logPath}`);
  } else {
    log(`${C.cyan}⚡ Launching Rumuze Edit Control Room on: ${C.bold}${targetDir}${C.reset}\n`);
    const child = spawn(py, pyArgs, {
      cwd: targetDir,
      stdio: 'inherit',
      env: process.env,
    });

    child.on('exit', (code) => {
      process.exit(code || 0);
    });
  }
}

// -----------------------------------------------------------------------------
// Command: stop
// -----------------------------------------------------------------------------
function cmdStop() {
  if (!fs.existsSync(PID_FILE)) {
    info('No background daemon PID file found.');
    return;
  }
  const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8').trim(), 10);
  if (!pid) {
    error('Corrupted PID file.');
    return;
  }

  try {
    process.kill(pid, 'SIGTERM');
    success(`Stopped Rumuze Edit daemon (PID: ${pid}).`);
    fs.unlinkSync(PID_FILE);
  } catch (e) {
    if (e.code === 'ESRCH') {
      warn(`Process ${pid} is not running.`);
      fs.unlinkSync(PID_FILE);
    } else {
      error(`Failed to stop process ${pid}: ${e.message}`);
    }
  }
}

// -----------------------------------------------------------------------------
// Command: status
// -----------------------------------------------------------------------------
function cmdStatus() {
  log(`\n${C.bold}Rumuze Edit Status:${C.reset}`);
  const cfg = loadConfig();
  if (cfg.allowed_chat_id) {
    success(`Paired Chat ID: ${cfg.allowed_chat_id}`);
  } else {
    warn('No Telegram pairing configured. Run `rumuze-edit init`.');
  }

  let daemonRunning = false;
  if (fs.existsSync(PID_FILE)) {
    const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8').trim(), 10);
    try {
      process.kill(pid, 0);
      success(`Background Daemon: Running (PID: ${pid})`);
      daemonRunning = true;
    } catch (e) {
      warn(`Background Daemon: Stale PID file (${pid} not running)`);
    }
  } else {
    info('Background Daemon: Not running');
  }

  // Check OpenCode process
  try {
    const ps = spawnSync('pgrep', ['-fl', 'opencode serve'], { encoding: 'utf8' });
    if (ps.status === 0 && ps.stdout.trim()) {
      success(`OpenCode Server: Active (${ps.stdout.trim().split('\n')[0]})`);
    } else {
      info('OpenCode Server: Idle');
    }
  } catch (e) {}
  log('');
}

// -----------------------------------------------------------------------------
// Command: service
// -----------------------------------------------------------------------------
function cmdService(subcmd, args) {
  const py = findPython();
  const dirIdx = args.indexOf('--dir');
  const targetDir = dirIdx !== -1 && args[dirIdx + 1] ? path.resolve(args[dirIdx + 1]) : process.cwd();

  const code = `
import sys
import core.service_manager as sm
action = sys.argv[1]
target = sys.argv[2]
if action == "install":
    ok, msg = sm.install_service(target)
    print(msg)
elif action == "uninstall":
    ok, msg = sm.uninstall_service()
    print(msg)
elif action == "status":
    st = sm.service_status()
    print("Service installed:", st["installed"])
    print("Service running:", st["running"])
    print("System:", st["system"])
`;

  const child = spawnSync(py, ['-c', code, subcmd || 'status', targetDir], {
    cwd: ROOT_DIR,
    stdio: 'inherit',
    env: process.env,
  });
}

// -----------------------------------------------------------------------------
// CLI Help
// -----------------------------------------------------------------------------
function cmdHelp() {
  log(`
${C.bold}${C.cyan}rumuze-edit${C.reset} v${VERSION}
Control OpenCode and AI coding agents on your machine directly from Telegram.

${C.bold}USAGE:${C.reset}
  $ ${C.cyan}rumuze-edit${C.reset} <command> [options]
  $ ${C.cyan}npx rumuze-edit${C.reset} <command> [options]

${C.bold}COMMANDS:${C.reset}
  ${C.green}init${C.reset}               Interactive setup wizard (pairs with your Telegram bot)
  ${C.green}start${C.reset}              Start the live control room for the current project
  ${C.green}stop${C.reset}               Stop the background daemon
  ${C.green}status${C.reset}             Show active status and processes
  ${C.green}service install${C.reset}    Install as persistent background service (launchd / systemd)
  ${C.green}service uninstall${C.reset}  Uninstall persistent background service
  ${C.green}service status${C.reset}     Check background service status
  ${C.green}help${C.reset}               Show this help message

${C.bold}OPTIONS:${C.reset}
  ${C.yellow}--dir <path>${C.reset}       Set project directory (defaults to current directory)
  ${C.yellow}--daemon, -d${C.reset}       Run in the background as a detached process
  ${C.yellow}--version, -v${C.reset}      Display version number
  ${C.yellow}--help, -h${C.reset}         Display help message

${C.bold}EXAMPLES:${C.reset}
  $ ${C.cyan}npx rumuze-edit init${C.reset}
  $ ${C.cyan}npx rumuze-edit start${C.reset}
  $ ${C.cyan}npx rumuze-edit start --dir /var/www/my-app --daemon${C.reset}
`);
}

// -----------------------------------------------------------------------------
// Main Dispatcher
// -----------------------------------------------------------------------------
async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0] || 'help';

  switch (cmd) {
    case 'init':
      await cmdInit();
      break;
    case 'start':
      cmdStart(args.slice(1));
      break;
    case 'stop':
      cmdStop();
      break;
    case 'status':
      cmdStatus();
      break;
    case 'service':
      cmdService(args[1] || 'status', args.slice(2));
      break;
    case '-v':
    case '--version':
    case 'version':
      log(`rumuze-edit v${VERSION}`);
      break;
    case '-h':
    case '--help':
    case 'help':
    default:
      cmdHelp();
      break;
  }
}

main().catch((err) => {
  error(err.message || String(err));
  process.exit(1);
});
