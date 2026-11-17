/**
 * electron-builder afterPack hook.
 *
 * electron-builder cannot compile native modules for another operating system,
 * so a Windows build made on Linux would ship Linux's better-sqlite3 binary and
 * fail the moment it opens the database. For cross-platform builds this swaps in
 * the official prebuilt binary for the target platform, architecture and
 * Electron ABI, and refuses to continue unless the file really is a binary for
 * that platform. Builds for the host platform are left alone.
 */
const { execFileSync } = require('node:child_process')
const { closeSync, copyFileSync, existsSync, mkdtempSync, openSync, readSync, rmSync } = require('node:fs')
const { tmpdir } = require('node:os')
const { dirname, join, resolve } = require('node:path')

const ARCH = { 0: 'ia32', 1: 'x64', 2: 'armv7l', 3: 'arm64' }

function header(file) {
  const fd = openSync(file, 'r')
  const bytes = Buffer.alloc(4)
  readSync(fd, bytes, 0, 4, 0)
  closeSync(fd)
  return bytes
}

const FORMAT = {
  win32: { name: 'Windows PE', test: (b) => b[0] === 0x4d && b[1] === 0x5a },
  linux: { name: 'Linux ELF', test: (b) => b[0] === 0x7f && b[1] === 0x45 && b[2] === 0x4c && b[3] === 0x46 },
}

exports.default = async function afterPack(context) {
  const platform = context.electronPlatformName
  if (platform === process.platform) return
  const format = FORMAT[platform]
  if (!format) throw new Error(`Cross-building native modules for ${platform} is not set up; build on ${platform} instead.`)

  const arch = ARCH[context.arch]
  const appDir = resolve(__dirname, '..', 'apps', 'electron')
  const pkg = require.resolve('better-sqlite3/package.json', { paths: [appDir] })
  const electronVersion = require(require.resolve('electron/package.json', { paths: [resolve(__dirname, '..')] })).version
  const target = join(context.appOutDir, 'resources', 'app.asar.unpacked', 'node_modules', 'better-sqlite3', 'build', 'Release', 'better_sqlite3.node')
  if (!existsSync(target)) throw new Error(`better-sqlite3 binary not found in the package: ${target}`)

  const work = mkdtempSync(join(tmpdir(), 'chimero-prebuild-'))
  try {
    copyFileSync(pkg, join(work, 'package.json'))
    const bin = require.resolve('prebuild-install/bin.js', { paths: [dirname(pkg)] })
    execFileSync(process.execPath, [bin, '--runtime', 'electron', '--target', electronVersion, '--arch', arch, '--platform', platform], { cwd: work, stdio: 'inherit' })
    const built = join(work, 'build', 'Release', 'better_sqlite3.node')
    if (!format.test(header(built))) throw new Error(`Downloaded better-sqlite3 is not a ${format.name} binary`)
    copyFileSync(built, target)
    if (!format.test(header(target))) throw new Error('better-sqlite3 was not replaced in the package')
    console.log(`  • better-sqlite3: using the ${platform}-${arch} prebuilt binary for Electron ${electronVersion}`)
  } finally {
    rmSync(work, { recursive: true, force: true })
  }
}
