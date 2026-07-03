#!/usr/bin/env node
const { execSync } = require('child_process')
const { unlinkSync, existsSync } = require('fs')
const { homedir } = require('os')
const { join, dirname } = require('path')

const APP_NAME = 'soxial'

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
    execSync('pkill -9 -f "electron .*soxial"', { stdio: 'pipe' })
  } catch {}
})

const db = dbPath()

// Clean up old db filename if it still exists
const oldDb = join(dirname(db), 'social-agent.db')
if (existsSync(oldDb)) unlinkSync(oldDb)

step(`Deleting database (${db})`, () => {
  if (existsSync(db)) {
    unlinkSync(db)
  }
})

step('Removing twitter-cli', () => {
  execSync('uv tool uninstall twitter-cli', { stdio: 'pipe' })
})

step('Removing rdt-cli', () => {
  execSync('uv tool uninstall rdt-cli', { stdio: 'pipe' })
})

console.log('\n Done. Run `npm run dev` to start fresh. Onboarding will reinstall the CLIs.\n')
