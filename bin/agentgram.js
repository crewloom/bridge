#!/usr/bin/env node
/**
 * AgentGram CLI forwarder with automatic build on first run
 */
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist', 'index.js');

if (!fs.existsSync(dist)) {
  console.log('⚡ AgentGram build artifact not found. Building bundle...');
  const res = spawnSync('npm', ['run', 'build'], { cwd: root, stdio: 'inherit' });
  if (res.status !== 0 || !fs.existsSync(dist)) {
    console.error('Failed to build AgentGram. Please run: npm install && npm run build');
    process.exit(1);
  }
}

require(dist);
