#!/usr/bin/env node
const { execSync } = require('child_process')
const { unlinkSync, existsSync } = require('fs')
const { homedir } = require('os')
const { join, dirname } = require('path')

const APP_NAME = 'Soxial'

const DB_FILENAME = 'soxial.db'

function dbPath() {
  const platform = process.platform
  if (platform === 'win32') {
    return join(process.env.APPDATA || join(homedir(), 'AppData', 'Roaming'), APP_NAME, DB_FILENAME)
  }
  if (platform === 'darwin') {
    return join(homedir(), 'Library', 'Application Support', APP_NAME, DB_FILENAME)
  }
  return join(process.env.XDG_CONFIG_HOME || join(homedir(), '.config'), APP_NAME, DB_FILENAME)
}

function step(label, fn) {
  process.stdout.write(`  ${label} ... `)
  try {
    fn()
    console.log('✓')
  } catch (e) {
    console.log(`✗ ${e.message}`)
  }
}

console.log(`\nResetting ${APP_NAME} ...\n`)

step('Killing running app', () => {
  try {
    execSync("pkill -9 -f 'electron .'", { stdio: 'pipe' })
  } catch {}
})

const db = dbPath()
const dbDir = dirname(db)

// Clean up old db filename if it still exists
const oldDb = join(dbDir, 'social-agent.db')
if (existsSync(oldDb)) unlinkSync(oldDb)

step(`Deleting database (${dbDir})`, () => {
  // Delete the main DB plus its WAL/SHM sidecars so SQLite can't recover old data.
  for (const f of ['soxial.db', 'soxial.db-wal', 'soxial.db-shm']) {
    const p = join(dbDir, f)
    if (existsSync(p)) unlinkSync(p)
  }
})

step('Removing twitter-cli', () => {
  try {
    execSync('uv tool uninstall twitter-cli', { stdio: 'pipe' })
  } catch (e) {
    // Already uninstalled is the desired state — not a failure.
    const msg = (e.stderr?.toString() || e.message || '')
    if (!/is not installed/i.test(msg)) throw e
  }
})

step('Removing rdt-cli', () => {
  try {
    execSync('uv tool uninstall rdt-cli', { stdio: 'pipe' })
  } catch (e) {
    const msg = (e.stderr?.toString() || e.message || '')
    if (!/is not installed/i.test(msg)) throw e
  }
})

console.log('\n Done. Run `npm run dev` to start fresh. Onboarding will reinstall the CLIs.\n')
