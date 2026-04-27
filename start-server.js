#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Iniciando servidor Next.js...\n');

const proc = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  shell: true,
  cwd: __dirname
});

proc.on('error', (err) => {
  console.error('Error:', err);
  process.exit(1);
});

proc.on('exit', (code) => {
  process.exit(code);
});
