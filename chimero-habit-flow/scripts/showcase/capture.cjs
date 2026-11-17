/** Screenshots of the running app, taken from the real window. Nothing is drawn or composited afterwards. */
const { mkdirSync } = require('node:fs')
const { resolve } = require('node:path')

async function capture({ page, dir }) {
  mkdirSync(dir, { recursive: true })
  const files = []
  const shot = async (name) => {
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.waitForTimeout(900)
    const file = resolve(dir, `${name}.png`)
    await page.screenshot({ path: file, animations: 'disabled' })
    files.push(file)
  }
  const nav = (label) => page.getByRole('button', { name: label, exact: true }).first().click()
  const compare = async (a, b, lag) => {
    await nav('Insights')
    await page.getByLabel('When this happens or goes up…').selectOption({ label: a })
    await page.getByLabel('…what happens to this?').selectOption({ label: b })
    await page.getByRole('radio', { name: lag, exact: true }).click()
  }

  await nav('Today')
  await shot('01-today-dashboard')

  await page.getByRole('button', { name: 'Edit layout', exact: true }).click()
  await shot('02-dashboard-edit-mode')
  await page.getByRole('button', { name: 'Done', exact: true }).click()

  await page.keyboard.press('Alt+q')
  await page.getByRole('dialog').getByRole('option', { name: 'Mood' }).click()
  await page.getByRole('radio', { name: /^8,/ }).click()
  await shot('03-quick-entry-mood')
  await page.keyboard.press('Escape')

  await nav('Weight')
  await shot('04-tracker-weight')

  await nav('Exercise')
  await page.getByTestId('tracker-log').click()
  await page.getByRole('dialog').getByText('Push', { exact: true }).click()
  await shot('05-workout-entry')
  await page.keyboard.press('Escape')

  await compare('Sleep (h)', 'Average mood', 'Same day')
  await shot('06-insights-sleep-mood')

  await compare('Tagged dairy', 'Bloating', 'Next day')
  await shot('07-insights-dairy-bloating')

  await nav('Journal')
  await shot('08-journal')

  await nav('People')
  await shot('09-people')

  await nav('Sleep')
  await shot('10-custom-tracker-sleep')

  await nav('Manage trackers')
  await page.getByTestId('new-tracker').click()
  await page.getByRole('dialog').getByRole('button', { name: 'Meditation' }).click()
  await shot('11-tracker-builder')
  await page.keyboard.press('Escape')

  await nav('Settings')
  await page.getByRole('radio', { name: 'Light', exact: true }).click()
  await nav('Today')
  await shot('12-today-light-theme')
  await nav('Settings')
  await page.getByRole('radio', { name: 'Dark', exact: true }).click()
  await nav('Today')
  return files
}

module.exports = { capture }
