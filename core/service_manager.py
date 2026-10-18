#!/usr/bin/env python3
"""Rumuze Edit Service Manager.

Installs, removes, and manages rumuze-edit as a persistent background daemon:
  * macOS: launchd user agent (~/Library/LaunchAgents/com.rumuze.edit.plist)
  * Linux: systemd user service (~/.config/systemd/user/rumuze-edit.service)
"""
import os
import platform
import subprocess
import sys

MACOS_PLIST_NAME = "com.agentgram.plist"
LEGACY_MACOS_PLIST_NAME = "com.rumuze.edit.plist"
MACOS_PLIST_DIR = os.path.expanduser("~/Library/LaunchAgents")
MACOS_PLIST_PATH = os.path.join(MACOS_PLIST_DIR, MACOS_PLIST_NAME)
LEGACY_MACOS_PLIST_PATH = os.path.join(MACOS_PLIST_DIR, LEGACY_MACOS_PLIST_NAME)

LINUX_SERVICE_NAME = "agentgram.service"
LEGACY_LINUX_SERVICE_NAME = "rumuze-edit.service"
LINUX_SERVICE_DIR = os.path.expanduser("~/.config/systemd/user")
LINUX_SERVICE_PATH = os.path.join(LINUX_SERVICE_DIR, LINUX_SERVICE_NAME)
LEGACY_LINUX_SERVICE_PATH = os.path.join(LINUX_SERVICE_DIR, LEGACY_LINUX_SERVICE_NAME)


def get_entry_point():
    """Locate the executable path for control_room.py."""
    here = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(here, "control_room.py")


def install_service(target_dir=None):
    system = platform.system()
    py_exec = sys.executable
    script = get_entry_point()
    target_dir = target_dir or os.getcwd()

    if system == "Darwin":
        os.makedirs(MACOS_PLIST_DIR, exist_ok=True)
        # Unload existing / legacy if loaded
        subprocess.run(["launchctl", "unload", MACOS_PLIST_PATH], capture_output=True)
        subprocess.run(["launchctl", "unload", LEGACY_MACOS_PLIST_PATH], capture_output=True)

        path_env = os.environ.get("PATH", "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin")
        opencode_bin = os.path.expanduser("~/.opencode/bin")
        if opencode_bin not in path_env:
            path_env = f"{opencode_bin}:{path_env}"

        log_dir = os.path.expanduser("~/.config/agentgram")
        os.makedirs(log_dir, exist_ok=True)

        plist_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.agentgram</string>
    <key>ProgramArguments</key>
    <array>
        <string>{py_exec}</string>
        <string>{script}</string>
        <string>--dir</string>
        <string>{target_dir}</string>
    </array>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>{path_env}</string>
    </dict>
    <key>WorkingDirectory</key>
    <string>{target_dir}</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>{os.path.join(log_dir, "daemon.log")}</string>
    <key>StandardErrorPath</key>
    <string>{os.path.join(log_dir, "daemon.err")}</string>
</dict>
</plist>
"""
        with open(MACOS_PLIST_PATH, "w", encoding="utf-8") as f:
            f.write(plist_content)

        subprocess.run(["launchctl", "load", MACOS_PLIST_PATH], check=True)
        return True, f"Installed & started macOS launchd service at {MACOS_PLIST_PATH}"

    elif system == "Linux":
        os.makedirs(LINUX_SERVICE_DIR, exist_ok=True)
        log_dir = os.path.expanduser("~/.config/agentgram")
        os.makedirs(log_dir, exist_ok=True)

        unit_content = f"""[Unit]
Description=AgentGram AI Telegram Mission Control
After=network.target

[Service]
Type=simple
WorkingDirectory={target_dir}
ExecStart={py_exec} {script} --dir {target_dir}
Restart=always
RestartSec=5
StandardOutput=append:{os.path.join(log_dir, "daemon.log")}
StandardError=append:{os.path.join(log_dir, "daemon.err")}

[Install]
WantedBy=default.target
"""
        with open(LINUX_SERVICE_PATH, "w", encoding="utf-8") as f:
            f.write(unit_content)

        subprocess.run(["systemctl", "--user", "daemon-reload"], check=True)
        subprocess.run(["systemctl", "--user", "enable", "--now", LINUX_SERVICE_NAME], check=True)
        return True, f"Installed & started Linux systemd service at {LINUX_SERVICE_PATH}"

    else:
        return False, f"Background services are not currently automated for OS: {system}"


def uninstall_service():
    system = platform.system()
    if system == "Darwin":
        for path in (MACOS_PLIST_PATH, LEGACY_MACOS_PLIST_PATH):
            if os.path.exists(path):
                subprocess.run(["launchctl", "unload", path], capture_output=True)
                try:
                    os.remove(path)
                except OSError:
                    pass
        return True, "Uninstalled macOS launchd service."
    elif system == "Linux":
        for name, path in ((LINUX_SERVICE_NAME, LINUX_SERVICE_PATH), (LEGACY_LINUX_SERVICE_NAME, LEGACY_LINUX_SERVICE_PATH)):
            if os.path.exists(path):
                subprocess.run(["systemctl", "--user", "stop", name], capture_output=True)
                subprocess.run(["systemctl", "--user", "disable", name], capture_output=True)
                try:
                    os.remove(path)
                except OSError:
                    pass
        subprocess.run(["systemctl", "--user", "daemon-reload"], capture_output=True)
        return True, "Uninstalled Linux systemd service."
    return False, f"Unsupported OS: {system}"


def service_status():
    system = platform.system()
    if system == "Darwin":
        res = subprocess.run(["launchctl", "list"], capture_output=True, text=True)
        running = "com.agentgram" in res.stdout or "com.rumuze.edit" in res.stdout
        installed = os.path.exists(MACOS_PLIST_PATH) or os.path.exists(LEGACY_MACOS_PLIST_PATH)
        active_path = MACOS_PLIST_PATH if os.path.exists(MACOS_PLIST_PATH) else LEGACY_MACOS_PLIST_PATH
        return {"installed": installed, "running": running, "system": system, "path": active_path}
    elif system == "Linux":
        res = subprocess.run(["systemctl", "--user", "is-active", LINUX_SERVICE_NAME], capture_output=True, text=True)
        running = res.stdout.strip() == "active"
        if not running:
            res_leg = subprocess.run(["systemctl", "--user", "is-active", LEGACY_LINUX_SERVICE_NAME], capture_output=True, text=True)
            running = res_leg.stdout.strip() == "active"
        installed = os.path.exists(LINUX_SERVICE_PATH) or os.path.exists(LEGACY_LINUX_SERVICE_PATH)
        active_path = LINUX_SERVICE_PATH if os.path.exists(LINUX_SERVICE_PATH) else LEGACY_LINUX_SERVICE_PATH
        return {"installed": installed, "running": running, "system": system, "path": active_path}
        installed = os.path.exists(LINUX_SERVICE_PATH)
        return {"installed": installed, "running": running, "system": system, "path": LINUX_SERVICE_PATH}
    return {"installed": False, "running": False, "system": system}
