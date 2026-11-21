const { spawn } = require('node:child_process');
const path = require('node:path');

const api = spawn(process.execPath, [path.join(__dirname, 'dev-api.cjs')], {
  stdio: 'inherit',
});
const ng = spawn(
  process.execPath,
  [path.join(process.cwd(), 'node_modules/@angular/cli/bin/ng.js'), 'serve', '--host', '127.0.0.1'],
  { stdio: 'inherit' },
);

function shutdown(code) {
  api.kill();
  ng.kill();
  process.exit(code ?? 0);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
ng.on('exit', (code) => shutdown(code ?? 0));
api.on('exit', (code) => {
  if (code) {
    ng.kill();
    process.exit(code);
  }
});
