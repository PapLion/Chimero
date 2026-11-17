#!/usr/bin/env node
/**
 * Showcase profile: a separate, clearly synthetic Chimero profile for demos and
 * screenshots. Your own data is never touched — the app is started with
 * CHIMERO_USER_DATA_DIR pointing at `.showcase-profile/` inside the repository.
 *
 *   node scripts/showcase.cjs --open      seed if needed, then leave the app open
 *   node scripts/showcase.cjs --capture   seed if needed, then write screenshots
 *   node scripts/showcase.cjs --reset     delete the showcase profile
 *
 * Records are written through the app's own preload API, one call per record,
 * so everything on screen went through the same code as real use.
 * Requires a production build (`pnpm build`).
 */
const { _electron: electron } = require('playwright')
const { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } = require('node:fs')
const { resolve } = require('node:path')
const { buildPlan } = require('./showcase/plan.cjs')
const { capture } = require('./showcase/capture.cjs')

const root = resolve(__dirname, '..')
const profile = resolve(process.env.CHIMERO_SHOWCASE_DIR || resolve(root, '.showcase-profile'))
const marker = resolve(profile, 'showcase.json')
const args = new Set(process.argv.slice(2))
const WIDTH = 1440
const HEIGHT = 900

async function launch() {
  if (!existsSync(resolve(root, 'apps/electron/out/main/index.js'))) throw new Error('No build found. Run `pnpm build` first.')
  mkdirSync(profile, { recursive: true })
  const app = await electron.launch({ args: [resolve(root, 'apps/electron'), '--disable-gpu', '--force-device-scale-factor=1'], env: { ...process.env, CHIMERO_USER_DATA_DIR: profile } })
  const page = await app.firstWindow()
  await page.waitForFunction(() => Boolean(window.api))
  await app.evaluate(({ BrowserWindow }, size) => {
    const win = BrowserWindow.getAllWindows()[0]
    win.unmaximize()
    win.setContentSize(size.width, size.height)
    win.center()
  }, { width: WIDTH, height: HEIGHT })
  await page.waitForFunction((size) => window.innerWidth === size.width && window.innerHeight === size.height, { width: WIDTH, height: HEIGHT }, { timeout: 5000 }).catch(() => {})
  return { app, page }
}

/** Runs inside the renderer: turns the plan into real records through window.api. */
async function seedInPage(plan) {
  const raw = window.api
  const must = async (label, promise) => {
    const result = await promise
    if (result === null || result === undefined || result === false) throw new Error(`Showcase seed failed at: ${label}`)
    return result
  }
  if ((await raw.getEntries({ limit: 1 })).length > 0) throw new Error('This profile already has records but no showcase marker. Refusing to write into it.')

  await raw.updatePreferences({ weightUnit: 'lb', measureUnit: 'in', weekStartsOn: 1, timeFormat: '24h', theme: 'dark', accent: 'iris' })

  const trackers = await raw.getTrackers()
  const byIdentity = (identity) => trackers.find((t) => t.config.identity === identity)
  const T = {
    weight: byIdentity('weight'), mood: byIdentity('mood'), exercise: byIdentity('exercise'), social: byIdentity('social'), tasks: byIdentity('tasks'), books: byIdentity('books'),
    gaming: byIdentity('gaming'), tv: byIdentity('tv'), media: byIdentity('media'), health: byIdentity('health'), intake: byIdentity('intake'), diet: byIdentity('diet'),
  }
  for (const [key, tracker] of Object.entries(T)) if (!tracker) throw new Error(`Built-in tracker missing: ${key}`)
  T.sleep = await must('create Sleep', raw.createTracker({ name: 'Sleep', type: 'numeric', icon: 'moon', color: '#7c9cff', config: { isCustom: true, unit: 'h', valueKind: 'measure', aggregate: 'sum', goal: 8, goalDirection: 'atLeast', quickValues: [6, 7, 8, 9], description: 'Hours slept, logged the morning after.', fields: [{ key: 'quality', label: 'Quality', type: 'select', options: ['Poor', 'Okay', 'Good', 'Great'] }, { key: 'woke_up', label: 'Times woken', type: 'number' }] } }))
  T.water = await must('create Water', raw.createTracker({ name: 'Water', type: 'numeric', icon: 'droplet', color: '#5cc8ff', config: { isCustom: true, unit: 'glasses', valueKind: 'activity', aggregate: 'sum', goal: 8, goalDirection: 'atLeast', quickValues: [1, 2, 3], description: 'Glasses of water through the day.' } }))
  // Sidebar order: the daily ones first.
  const order = [T.mood, T.sleep, T.weight, T.exercise, T.diet, T.water, T.social, T.tasks, T.health, T.intake, T.books, T.gaming, T.tv, T.media]
  await must('reorder', raw.reorderTrackers(order.map((t) => t.id)))
  await raw.toggleTrackerFavorite(T.mood.id)
  await raw.toggleTrackerFavorite(T.sleep.id)

  const tagId = new Map()
  for (const tag of plan.tags) tagId.set(tag.name, (await must(`tag ${tag.name}`, raw.createTag({ name: tag.name, color: tag.color }))).id)
  await raw.updateTagRelationships(plan.tags.filter((tag) => tag.parent).map((tag) => ({ parentTagId: tagId.get(tag.parent), childTagId: tagId.get(tag.name) })))
  const tags = (names) => (names || []).map((name) => tagId.get(name)).filter(Boolean)

  const iso = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  const contactId = new Map()
  for (const person of plan.people) {
    const birthday = new Date()
    birthday.setDate(birthday.getDate() + person.birthdayIn)
    birthday.setFullYear(person.born)
    const met = person.dateMetYearsAgo ? new Date(new Date().getFullYear() - person.dateMetYearsAgo, 4, 12) : null
    const contact = await must(`contact ${person.name}`, raw.createContact({ name: person.name, birthday: iso(birthday), dateMet: met ? iso(met) : null, traits: person.traits, likes: person.likes, dislikes: person.dislikes, notes: person.notes, hasKids: person.hasKids ?? null, kidsNotes: person.kidsNotes ?? null }))
    contactId.set(person.name, contact.id)
    if (person.checkIn) await raw.upsertContactReminderSettings({ contactId: contact.id, checkInReminderEnabled: true, checkInAfterDays: person.checkIn, birthdayReminderEnabled: true, birthdayReminderDaysBefore: 14 })
    for (const [title, body] of person.blocks) await raw.createContactProfileBlock({ contactId: contact.id, title, body, blockType: 'note' })
  }

  const bookId = new Map()
  for (const title of plan.books) bookId.set(title, (await must(`book ${title}`, raw.createBook({ title, shelf: 'tbr', status: 'planned' }))).book.id)

  const exercises = new Map()
  const exercise = async (query) => {
    if (!exercises.has(query)) {
      const [found] = await raw.searchExercises(query, 1)
      exercises.set(query, found ? { exerciseId: found.id, sourceExerciseId: found.id, name: found.name, category: found.category, level: found.level, equipment: found.equipment, bodyPartSnapshot: found.primaryMuscles, secondaryBodyPartSnapshot: found.secondaryMuscles, force: found.force, mechanic: found.mechanic } : { exerciseId: `custom:${query.replace(/\s+/g, '-')}`, name: query })
    }
    return exercises.get(query)
  }

  const at = (daysAgo, time) => {
    const date = new Date()
    date.setDate(date.getDate() - daysAgo)
    const [h, m] = time.split(':').map(Number)
    date.setHours(h, m, 0, 0)
    // Never write into the future on the day the script runs.
    return Math.min(date.getTime(), Date.now() - 60_000)
  }

  let written = 0
  const firstOfRoutine = new Map()
  for (const op of plan.ops) {
    const timestamp = at(op.daysAgo, op.time)
    const label = `${op.kind} ${op.daysAgo}d ago`
    switch (op.kind) {
      case 'sleep':
        await must(label, raw.addEntry({ trackerId: T.sleep.id, value: op.value, metadata: { fields: op.fields }, timestamp }))
        break
      case 'water':
        await must(label, raw.addEntry({ trackerId: T.water.id, value: op.value, timestamp }))
        break
      case 'weight':
        await must(label, raw.addWeightEntry({ trackerId: T.weight.id, weight: op.weight, weightUnit: 'lb', waist: op.waist, waistUnit: op.waist != null ? 'in' : null, timestamp }))
        break
      case 'mood':
        await must(label, raw.addEntry({ trackerId: T.mood.id, value: op.value, note: op.note, timestamp, tagIds: tags(op.tags) }))
        break
      case 'workout': {
        const session = await must(label, raw.createWorkoutSession({ trackerId: T.exercise.id, timestamp, sessionName: op.name, durationMinutes: op.minutes, loadUnit: 'lb', exercises: await Promise.all(op.lifts.map(async (lift, orderIndex) => ({ ...(await exercise(lift.query)), orderIndex, sets: lift.sets.map((set, i) => ({ setIndex: i + 1, reps: set.reps, load: set.load })) }))) }))
        if (!firstOfRoutine.has(op.name)) firstOfRoutine.set(op.name, session.session.entryId)
        break
      }
      case 'social':
        await must(label, raw.addEntry({ trackerId: T.social.id, value: op.people.length, note: op.note, timestamp, tagIds: tags(op.tags), socialInteractions: op.people.map((name) => ({ contactId: contactId.get(name), method: op.method, moodImpact: op.impact, notes: op.note })) }))
        break
      case 'food':
        await must(label, raw.addFoodEntry({ trackerId: T.diet.id, foodName: op.name, calories: op.kcal, mealType: op.meal, timestamp, tagIds: tags(op.tags) }))
        break
      case 'symptom':
        await must(label, raw.addHealthSymptomEntry({ trackerId: T.health.id, symptomName: op.name, category: op.category, severity: op.severity, note: op.note, timestamp }))
        break
      case 'intake':
        await must(label, raw.addIntakeEntry({ trackerId: T.intake.id, itemName: op.name, itemType: op.type, dosage: op.dosage, unit: op.unit, timestamp }))
        break
      case 'gaming':
        await must(label, raw.addGamingEntry({ trackerId: T.gaming.id, gameTitle: op.title, estimatedHours: op.hours, timestamp, tagIds: tags(op.tags) }))
        break
      case 'tv':
      case 'media':
        await must(label, raw.addEntry({ trackerId: T[op.kind].id, value: 1, note: null, timestamp, metadata: { title: op.title, kind: op.showKind, minutes: op.minutes, ...(op.season ? { season: op.season, episode: op.episode } : {}), ...(op.rating ? { rating: op.rating } : {}) } }))
        break
      case 'book': {
        const request = { trackerId: T.books.id, bookId: bookId.get(op.title), timestamp }
        await must(label, op.activity === 'started' ? raw.startBook(request) : op.activity === 'finished' ? raw.finishBook(request) : raw.readBook(request))
        if (op.rating) await raw.updateBook(request.bookId, { ratingTenths: op.rating })
        break
      }
      case 'task':
        await must(label, raw.addEntry({ trackerId: T.tasks.id, value: op.done ? 1 : 0, note: op.text, timestamp }))
        break
      default:
        throw new Error(`Unknown showcase record kind: ${op.kind}`)
    }
    written++
  }

  for (const [name, entryId] of firstOfRoutine) await must(`routine ${name}`, raw.saveWorkoutAsRoutine({ sessionEntryId: entryId, name }))
  await raw.setWeightGoal({ trackerId: T.weight.id, goalType: 'target', targetValue: 172, unit: 'lb', direction: 'decrease' })

  const inDays = (n) => {
    const date = new Date()
    date.setDate(date.getDate() + n)
    return iso(date)
  }
  await must('reminder', raw.upsertReminder({ title: 'Weigh in', time: '07:30', trackerId: T.weight.id, days: null }))
  await must('reminder', raw.upsertReminder({ title: 'Vitamin D', time: '08:00', trackerId: T.intake.id, days: null }))
  await must('reminder', raw.upsertReminder({ title: 'Leg day', time: '18:00', trackerId: T.exercise.id, days: [1, 3, 5] }))
  await must('reminder', raw.upsertReminder({ title: 'Book a table for Noor’s birthday', time: '12:00', date: inDays(3), description: 'She likes the ramen place by the station.' }))

  const m = (tracker, key) => `t:${tracker.id}:${key}`
  await must('layout', raw.saveDashboardLayout({
    version: 2,
    widgets: [
      { id: 'w-mood', type: 'tracker', trackerId: T.mood.id, x: 0, y: 0, w: 4, h: 4 },
      { id: 'w-sleep-trend', type: 'trend', metricId: m(T.sleep, 'value'), days: 30, x: 4, y: 0, w: 5, h: 4 },
      { id: 'w-tasks', type: 'tracker', trackerId: T.tasks.id, x: 9, y: 0, w: 3, h: 4 },
      { id: 'w-weight', type: 'tracker', trackerId: T.weight.id, x: 0, y: 4, w: 4, h: 4 },
      { id: 'w-insight', type: 'insight', pair: { a: m(T.sleep, 'value'), b: m(T.mood, 'avg'), lagDays: 0 }, days: 90, x: 4, y: 4, w: 4, h: 3 },
      { id: 'w-water', type: 'tracker', trackerId: T.water.id, x: 8, y: 4, w: 2, h: 3 },
      { id: 'w-streak', type: 'streak', x: 10, y: 4, w: 2, h: 3 },
      { id: 'w-heatmap', type: 'heatmap', x: 4, y: 7, w: 8, h: 3 },
      { id: 'w-exercise', type: 'tracker', trackerId: T.exercise.id, x: 0, y: 8, w: 4, h: 3 },
      { id: 'w-people', type: 'people', x: 4, y: 10, w: 4, h: 3 },
      { id: 'w-reminders', type: 'reminders', x: 8, y: 10, w: 4, h: 3 },
      { id: 'w-food', type: 'tracker', trackerId: T.diet.id, x: 0, y: 11, w: 4, h: 3 },
    ],
  }))
  return { written, trackerIds: Object.fromEntries(Object.entries(T).map(([key, tracker]) => [key, tracker.id])) }
}

async function ensureSeeded(page) {
  if (existsSync(marker)) {
    const existing = JSON.parse(readFileSync(marker, 'utf8'))
    if (existing.complete) return existing
    throw new Error('A previous showcase seed did not finish. Run again with --reset.')
  }
  // The marker goes down first, so an interrupted seed can still be reset safely.
  writeFileSync(marker, JSON.stringify({ synthetic: true, complete: false }, null, 2))
  process.stdout.write('Seeding the showcase profile through the app API… ')
  const plan = buildPlan()
  const result = await page.evaluate(seedInPage, plan)
  const info = { synthetic: true, complete: true, seededAt: new Date().toISOString(), days: plan.days, records: result.written, trackerIds: result.trackerIds }
  writeFileSync(marker, JSON.stringify(info, null, 2))
  console.log(`${result.written} records over ${plan.days} days.`)
  await page.reload()
  await page.waitForFunction(() => Boolean(window.api))
  return info
}

async function main() {
  if (args.has('--reset')) {
    // Only ever removes a directory this script created.
    if (existsSync(profile) && !existsSync(marker) && existsSync(resolve(profile, 'chimero.db'))) throw new Error(`${profile} has a database but no showcase marker; not deleting it.`)
    rmSync(profile, { recursive: true, force: true })
    console.log(`Removed ${profile}`)
    if (!args.has('--open') && !args.has('--capture')) return
  }
  const { app, page } = await launch()
  try {
    const info = await ensureSeeded(page)
    if (args.has('--capture')) {
      const dir = resolve(root, '..', 'portfolio', 'screenshots')
      const files = await capture({ app, page, info, dir })
      console.log(`Wrote ${files.length} screenshots to ${dir}`)
    }
    if (args.has('--open')) {
      console.log(`Showcase profile open (${info.records} synthetic records). Close the window to exit.`)
      await new Promise((done) => app.on('close', done))
      return
    }
  } finally {
    if (!args.has('--open')) await app.close()
  }
}

main().catch((error) => {
  console.error(error.message || error)
  process.exit(1)
})
