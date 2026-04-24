#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs')
const path = require('path')
const { DatabaseSync } = require('node:sqlite')

const DEMO_TAG = 'chimero-demo-v1'
const DEMO_MARKER = `[DEMO:${DEMO_TAG}]`

const ROOT_DIR = path.resolve(__dirname, '..', '..', '..')
const MIGRATIONS_DIR = path.resolve(ROOT_DIR, 'packages', 'db', 'drizzle')
const DEFAULT_TRACKERS_PATH = path.resolve(
  ROOT_DIR,
  'packages',
  'shared',
  'src',
  'contracts',
  'default-trackers.json'
)

function dateToDateStrLocal(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function resolveDbPath() {
  const explicit = process.env.CHIMERO_DB_PATH?.trim()
  if (explicit) return path.resolve(explicit)

  const platformUserBase = process.env.LOCALAPPDATA || process.env.APPDATA || process.env.USERPROFILE
  if (platformUserBase) {
    return path.resolve(platformUserBase, 'Chimero', 'chimero.db')
  }

  // Match Electron dev runtime behavior when no OS-specific user dir env is present:
  // app.setPath('userData', resolve('.', 'Chimero')) with cwd at apps/electron.
  const electronDevDbPath = path.resolve(ROOT_DIR, 'apps', 'electron', 'Chimero', 'chimero.db')

  const home = process.env.HOME
  const candidates = [
    electronDevDbPath,
    home ? path.resolve(home, 'Chimero', 'chimero.db') : null,
    home ? path.resolve(home, '.config', 'Chimero', 'chimero.db') : null,
    path.resolve(ROOT_DIR, 'Chimero', 'chimero.db'), // legacy location from previous script versions
  ].filter(Boolean)

  const existing = candidates.find((p) => fs.existsSync(p))
  return existing || electronDevDbPath
}

function tableExists(db, tableName) {
  const row = db
    .prepare("SELECT 1 AS ok FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(tableName)
  return !!row
}

function ensureSchema(db) {
  if (tableExists(db, 'trackers')) return

  const migrationFiles = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()

  for (const fileName of migrationFiles) {
    const sqlContent = fs.readFileSync(path.join(MIGRATIONS_DIR, fileName), 'utf8')
    const statements = sqlContent
      .split('--> statement-breakpoint')
      .map((s) => s.trim())
      .filter(Boolean)

    for (const statement of statements) {
      db.exec(statement)
    }
  }

  console.log(`[demo-data] Schema initialized from ${migrationFiles.length} migration file(s).`)
}

function loadDefaultTrackers() {
  return JSON.parse(fs.readFileSync(DEFAULT_TRACKERS_PATH, 'utf8'))
}

function ensureDefaultTrackers(db) {
  const defaults = loadDefaultTrackers()
  const existingNames = new Set(
    db
      .prepare('SELECT name FROM trackers')
      .all()
      .map((row) => row.name)
  )

  const insertTracker = db.prepare(`
    INSERT INTO trackers (name, type, icon, color, "order", config, is_custom, is_favorite, archived)
    VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0)
  `)

  for (const tracker of defaults) {
    if (existingNames.has(tracker.name)) continue
    insertTracker.run(
      tracker.name,
      tracker.type,
      tracker.icon ?? null,
      tracker.color ?? null,
      tracker.order ?? 0,
      JSON.stringify(tracker.config ?? {})
    )
  }
}

function buildInClause(ids) {
  return ids.map(() => '?').join(',')
}

function clearDemoData(db) {
  const entryPattern = `%"__demoTag":"${DEMO_TAG}"%`
  const markerPattern = `%${DEMO_MARKER}%`

  const demoEntryIds = db
    .prepare('SELECT id FROM entries WHERE metadata LIKE ?')
    .all(entryPattern)
    .map((row) => row.id)
  const demoContactIds = db
    .prepare('SELECT id FROM contacts WHERE notes LIKE ?')
    .all(markerPattern)
    .map((row) => row.id)

  let deletedInteractions = 0
  if (demoEntryIds.length > 0 || demoContactIds.length > 0) {
    const clauses = ['notes LIKE ?']
    const params = [markerPattern]

    if (demoEntryIds.length > 0) {
      clauses.push(`entry_id IN (${buildInClause(demoEntryIds)})`)
      params.push(...demoEntryIds)
    }
    if (demoContactIds.length > 0) {
      clauses.push(`contact_id IN (${buildInClause(demoContactIds)})`)
      params.push(...demoContactIds)
    }

    const result = db
      .prepare(`DELETE FROM contact_interactions WHERE ${clauses.join(' OR ')}`)
      .run(...params)
    deletedInteractions = result.changes
  } else {
    deletedInteractions = db
      .prepare('DELETE FROM contact_interactions WHERE notes LIKE ?')
      .run(markerPattern).changes
  }

  const deletedReminders = db
    .prepare('DELETE FROM reminders WHERE description LIKE ?')
    .run(markerPattern).changes
  const deletedEntries = db
    .prepare('DELETE FROM entries WHERE metadata LIKE ?')
    .run(entryPattern).changes
  const deletedContacts = db
    .prepare('DELETE FROM contacts WHERE notes LIKE ?')
    .run(markerPattern).changes

  return {
    deletedEntries,
    deletedReminders,
    deletedContacts,
    deletedInteractions,
  }
}

function seedDemoData(db) {
  ensureDefaultTrackers(db)
  const cleared = clearDemoData(db)

  const trackerRows = db
    .prepare('SELECT id, name FROM trackers WHERE archived = 0')
    .all()

  const trackersByName = new Map(trackerRows.map((row) => [row.name, row.id]))
  const requiredNames = [
    'Weight',
    'Mood',
    'Exercise',
    'Social',
    'Tasks',
    'Savings',
    'Books',
    'Gaming',
    'Media/TV',
    'Diet / Calories',
  ]
  const missingTrackers = requiredNames.filter((name) => !trackersByName.has(name))
  if (missingTrackers.length > 0) {
    throw new Error(`Missing required trackers after seeding defaults: ${missingTrackers.join(', ')}`)
  }

  const insertContact = db.prepare(`
    INSERT INTO contacts (name, birthday, date_met, date_last_talked, traits, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
  const contactSeeds = [
    {
      name: 'Alex Rivera',
      birthday: '1995-03-18',
      dateMet: '2021-06-10',
      dateLastTalked: null,
      traits: ['optimistic', 'gym-buddy'],
      notes: 'Friend from crossfit group.',
    },
    {
      name: 'Mia Chen',
      birthday: '1993-11-02',
      dateMet: '2020-04-22',
      dateLastTalked: null,
      traits: ['creative', 'bookworm'],
      notes: 'Usually discuss books and series.',
    },
    {
      name: 'Leo Santos',
      birthday: '1998-07-09',
      dateMet: '2022-01-14',
      dateLastTalked: null,
      traits: ['strategic', 'gamer'],
      notes: 'Co-op gaming partner.',
    },
    {
      name: 'Sofia Duarte',
      birthday: '1996-12-30',
      dateMet: '2019-09-03',
      dateLastTalked: null,
      traits: ['supportive', 'planner'],
      notes: 'Accountability check-ins every week.',
    },
  ]

  const contacts = contactSeeds.map((contact) => {
    const insertResult = insertContact.run(
      contact.name,
      contact.birthday,
      contact.dateMet,
      contact.dateLastTalked,
      JSON.stringify(contact.traits),
      `${contact.notes} ${DEMO_MARKER}`
    )
    return {
      id: Number(insertResult.lastInsertRowid),
      name: contact.name,
    }
  })

  const insertEntry = db.prepare(`
    INSERT INTO entries (tracker_id, value, note, metadata, timestamp, date_str, asset_id)
    VALUES (?, ?, ?, ?, ?, ?, NULL)
  `)
  const insertInteraction = db.prepare(`
    INSERT INTO contact_interactions (contact_id, entry_id, mood, timestamp, notes)
    VALUES (?, ?, ?, ?, ?)
  `)
  const insertReminder = db.prepare(`
    INSERT INTO reminders (tracker_id, title, description, time, date, days, enabled, last_triggered, completed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const entriesByTracker = new Map(requiredNames.map((name) => [name, 0]))
  let totalInteractions = 0

  const now = new Date()
  const totalDays = 56
  const moodCycle = [5, 6, 7, 8, 6, 7, 9]

  function addEntry(trackerName, timestamp, value, note, metadata) {
    const trackerId = trackersByName.get(trackerName)
    if (!trackerId) {
      throw new Error(`Tracker not found: ${trackerName}`)
    }
    const date = new Date(timestamp)
    const result = insertEntry.run(
      trackerId,
      value,
      note,
      JSON.stringify({ ...metadata, __demoTag: DEMO_TAG }),
      timestamp,
      dateToDateStrLocal(date)
    )
    entriesByTracker.set(trackerName, (entriesByTracker.get(trackerName) ?? 0) + 1)
    return Number(result.lastInsertRowid)
  }

  for (let daysAgo = totalDays - 1; daysAgo >= 0; daysAgo -= 1) {
    const dayDate = new Date(now)
    dayDate.setHours(0, 0, 0, 0)
    dayDate.setDate(dayDate.getDate() - daysAgo)

    const dayIndex = totalDays - 1 - daysAgo
    const weekday = dayDate.getDay()
    const isWeekend = weekday === 0 || weekday === 6

    const moodValue = moodCycle[dayIndex % moodCycle.length]
    const moodTimestamp = new Date(dayDate).setHours(8, 30, 0, 0)
    addEntry('Mood', moodTimestamp, moodValue, `Mood check-in ${DEMO_MARKER}`, {
      value: moodValue,
      note: `Mood check-in ${DEMO_MARKER}`,
    })

    const calories = 1850 + (dayIndex % 5) * 120 + (isWeekend ? 220 : 0)
    const dietTimestamp = new Date(dayDate).setHours(13, 15, 0, 0)
    addEntry('Diet / Calories', dietTimestamp, calories, isWeekend ? 'Lunch + dinner out' : 'Regular meals', {
      value: calories,
      note: isWeekend ? 'Lunch + dinner out' : 'Regular meals',
    })

    if (daysAgo % 2 === 0) {
      const weightValue = Number((76.4 - dayIndex * 0.035 + ((dayIndex % 3) - 1) * 0.08).toFixed(1))
      const weightTimestamp = new Date(dayDate).setHours(7, 10, 0, 0)
      addEntry('Weight', weightTimestamp, weightValue, isWeekend ? 'After weekend meal' : 'Morning weigh-in', {
        value: weightValue,
        context: isWeekend ? 'After weekend meal' : 'Morning weigh-in',
        storedUnit: 'kg',
      })
    }

    if (daysAgo % 3 !== 0) {
      const minutes = 25 + (dayIndex % 4) * 10
      const exerciseTimestamp = new Date(dayDate).setHours(19, 0, 0, 0)
      const exerciseNotes = isWeekend ? 'Long workout session' : 'Gym routine'
      addEntry('Exercise', exerciseTimestamp, minutes, exerciseNotes, {
        value: minutes,
        note: exerciseNotes,
        exercises: [
          { name: 'Bench Press', sets: 4, reps: 8 },
          { name: 'Squat', sets: 4, reps: 6 },
        ],
      })
    }

    if (daysAgo % 4 === 0) {
      const contact = contacts[dayIndex % contacts.length]
      const secondContact = contacts[(dayIndex + 1) % contacts.length]
      const quality = 6 + (dayIndex % 4)
      const socialTimestamp = new Date(dayDate).setHours(20, 40, 0, 0)
      const socialNote = `Coffee with @${contact.name.split(' ')[0]} and @${secondContact.name.split(' ')[0]}`
      const socialEntryId = addEntry('Social', socialTimestamp, quality, socialNote, {
        value: quality,
        note: socialNote,
        contacts: [
          { contactId: contact.id, mood: 'positive' },
          { contactId: secondContact.id, mood: dayIndex % 8 === 0 ? 'neutral' : 'positive' },
        ],
      })

      const interactionA = insertInteraction.run(
        contact.id,
        socialEntryId,
        'positive',
        socialTimestamp,
        `Catch-up conversation ${DEMO_MARKER}`
      )
      const interactionB = insertInteraction.run(
        secondContact.id,
        socialEntryId,
        dayIndex % 8 === 0 ? 'neutral' : 'positive',
        socialTimestamp,
        `Shared plans and feedback ${DEMO_MARKER}`
      )
      totalInteractions += interactionA.changes + interactionB.changes
    }

    const tasksTimestamp = new Date(dayDate).setHours(9, 30, 0, 0)
    const tasksForDay = [
      { note: 'Deep work block (90m)', done: dayIndex % 3 !== 1 },
      { note: 'Review daily goals', done: true },
    ]
    for (const task of tasksForDay) {
      addEntry('Tasks', tasksTimestamp, task.done ? 1 : 0, task.note, {
        note: task.note,
      })
    }

    if (daysAgo % 6 === 2) {
      const amount = 25 + (dayIndex % 5) * 15
      const savingsTimestamp = new Date(dayDate).setHours(18, 20, 0, 0)
      addEntry('Savings', savingsTimestamp, amount, 'Automatic transfer', {
        value: amount,
        note: 'Automatic transfer',
      })
    }

    if (daysAgo % 6 === 0) {
      const pages = 18 + (dayIndex % 4) * 6
      const booksTimestamp = new Date(dayDate).setHours(22, 0, 0, 0)
      addEntry('Books', booksTimestamp, pages, `Book chapter ${Math.floor(dayIndex / 6) + 1}`, {
        note: `Book chapter ${Math.floor(dayIndex / 6) + 1}`,
        value: pages,
      })
    }

    if (daysAgo % 7 === 1) {
      const hours = Number((1 + (dayIndex % 3) * 0.8).toFixed(1))
      const gamingTimestamp = new Date(dayDate).setHours(23, 0, 0, 0)
      addEntry('Gaming', gamingTimestamp, hours, `Co-op session ${Math.floor(dayIndex / 7) + 1}`, {
        note: `Co-op session ${Math.floor(dayIndex / 7) + 1}`,
        value: hours,
      })
    }

    if (daysAgo % 5 === 0) {
      const rating = 6 + (dayIndex % 5)
      const mediaTimestamp = new Date(dayDate).setHours(21, 30, 0, 0)
      addEntry('Media/TV', mediaTimestamp, rating, `Episode ${Math.floor(dayIndex / 5) + 1}`, {
        note: `Episode ${Math.floor(dayIndex / 5) + 1}`,
        value: rating,
      })
    }
  }

  const today = new Date()
  const oneTimeDate = dateToDateStrLocal(new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000))
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)

  const remindersInserted = [
    insertReminder.run(
      trackersByName.get('Weight'),
      'Morning weigh-in',
      `Track your weight before breakfast ${DEMO_MARKER}`,
      '07:30',
      null,
      JSON.stringify([1, 2, 3, 4, 5]),
      1,
      null,
      null
    ).changes,
    insertReminder.run(
      trackersByName.get('Exercise'),
      'Workout slot',
      `Evening workout reminder ${DEMO_MARKER}`,
      '19:00',
      null,
      JSON.stringify([1, 3, 5]),
      1,
      null,
      null
    ).changes,
    insertReminder.run(
      trackersByName.get('Diet / Calories'),
      'Log dinner',
      `Remember to log dinner calories ${DEMO_MARKER}`,
      '21:15',
      null,
      JSON.stringify([0, 1, 2, 3, 4, 5, 6]),
      1,
      null,
      null
    ).changes,
    insertReminder.run(
      trackersByName.get('Tasks'),
      'Project deadline',
      `One-off task deadline check ${DEMO_MARKER}`,
      '10:00',
      oneTimeDate,
      null,
      1,
      null,
      null
    ).changes,
    insertReminder.run(
      trackersByName.get('Social'),
      'Reach out to friends',
      `Weekly social check-in ${DEMO_MARKER}`,
      '18:30',
      null,
      JSON.stringify([6]),
      1,
      null,
      yesterday.getTime()
    ).changes,
  ].reduce((acc, current) => acc + current, 0)

  return {
    cleared,
    totalEntries: Array.from(entriesByTracker.values()).reduce((acc, n) => acc + n, 0),
    entriesByTracker,
    contacts: contacts.length,
    reminders: remindersInserted,
    interactions: totalInteractions,
  }
}

function runInTransaction(db, work) {
  db.exec('BEGIN IMMEDIATE')
  try {
    const result = work()
    db.exec('COMMIT')
    return result
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

function main() {
  const command = process.argv[2]
  if (!command || (command !== 'seed' && command !== 'clear')) {
    console.error('Usage: node packages/db/scripts/demo-data.cjs <seed|clear>')
    process.exit(1)
  }

  const dbPath = resolveDbPath()
  fs.mkdirSync(path.dirname(dbPath), { recursive: true })
  const db = new DatabaseSync(dbPath)

  try {
    db.exec('PRAGMA foreign_keys = ON')
    ensureSchema(db)
    ensureDefaultTrackers(db)

    if (command === 'clear') {
      const result = runInTransaction(db, () => clearDemoData(db))
      console.log(`[demo-data] Cleared demo data in ${dbPath}`)
      console.log(`[demo-data] entries=${result.deletedEntries}, reminders=${result.deletedReminders}, contacts=${result.deletedContacts}, interactions=${result.deletedInteractions}`)
      return
    }

    const result = runInTransaction(db, () => seedDemoData(db))
    console.log(`[demo-data] Seeded demo data in ${dbPath}`)
    console.log(`[demo-data] cleared-before-seed: entries=${result.cleared.deletedEntries}, reminders=${result.cleared.deletedReminders}, contacts=${result.cleared.deletedContacts}, interactions=${result.cleared.deletedInteractions}`)
    console.log(`[demo-data] inserted: entries=${result.totalEntries}, contacts=${result.contacts}, reminders=${result.reminders}, interactions=${result.interactions}`)
    console.log(
      '[demo-data] entries by tracker:',
      JSON.stringify(Object.fromEntries(result.entriesByTracker), null, 2)
    )
  } finally {
    db.close()
  }
}

main()
