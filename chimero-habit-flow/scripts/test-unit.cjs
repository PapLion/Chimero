// Use the same native-module ABI as the desktop app after electron-rebuild.
const { spawnSync } = require('node:child_process')
const electron = require('electron')
const args = process.argv.slice(2)
const result = spawnSync(electron, [require.resolve('vitest/vitest.mjs'), ...(args.includes('--watch') ? args : ['run', ...args])], {
  stdio: 'inherit',
  env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
})
if (result.error) console.error(result.error)
process.exit(result.status ?? 1)
