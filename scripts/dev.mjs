import { spawn } from 'node:child_process';
import os from 'node:os';

const isTermux = os.platform() === 'android';

const args = ['dev'];
if (!isTermux) {
  args.push('--turbo');
}

console.log(`🚀 Starting Next.js in ${isTermux ? 'Webpack (Termux/No Cache)' : 'Turbopack (PC)'} mode...`);

// 修正点: 'npx' ではなく 'pnpm exec' を使うことで npm の警告を回避します
const command = os.platform() === 'win32' ? 'pnpm.cmd' : 'pnpm';

const child = spawn(command, ['exec', 'next', ...args], {
  stdio: 'inherit',
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
