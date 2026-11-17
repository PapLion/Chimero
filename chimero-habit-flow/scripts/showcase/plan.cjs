/**
 * Synthetic history for the showcase profile.
 *
 * Everything here is invented: the person, the people they know, the numbers.
 * The generator is deterministic (seeded) and anchored to the day it runs, so
 * the profile always ends "today". A few cause-and-effect rules are built in on
 * purpose, so that the statistics the app computes from the records have
 * something real to find:
 *
 *   - late gaming shortens that night's sleep
 *   - short sleep lowers mood and raises the chance of a headache
 *   - training and good company lift mood
 *   - dairy raises the chance of bloating the next day
 */

function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const DAYS = 168

const PEOPLE = [
  { name: 'Noor Haddad', birthdayIn: 5, born: 1993, dateMetYearsAgo: 9, traits: ['Direct', 'Early riser'], likes: ['Climbing', 'Ramen', 'Board games'], dislikes: ['Being late'], notes: 'Climbing partner. Ask about the move to the new flat.', checkIn: 14, blocks: [['Gift ideas', 'Chalk bag\nThat ramen cookbook she mentioned']] },
  { name: 'Mateo Varga', birthdayIn: 73, born: 1990, dateMetYearsAgo: 4, traits: ['Funny', 'Night owl'], likes: ['Co-op games', 'Espresso'], dislikes: ['Phone calls'], notes: 'Plays most Friday nights.', blocks: [] },
  { name: 'Ines Okafor', birthdayIn: 160, born: 1988, dateMetYearsAgo: 12, traits: ['Thoughtful'], likes: ['Long walks', 'Poetry'], dislikes: [], notes: 'Lives abroad now. Calls work best on Sundays.', checkIn: 21, hasKids: true, kidsNotes: 'Two kids, Leo (6) and Maya (3)', blocks: [['Things to ask about', 'How the new job is going\nLeo starting school']] },
  { name: 'Tomas Lindqvist', birthdayIn: 221, born: 1995, dateMetYearsAgo: 2, traits: ['Competitive'], likes: ['Running', 'Sour beer'], dislikes: ['Mornings'], notes: 'From the running club.', blocks: [] },
  { name: 'Priya Raman', birthdayIn: 300, born: 1991, dateMetYearsAgo: 6, traits: ['Warm', 'Organised'], likes: ['Baking', 'True crime podcasts'], dislikes: ['Spicy food'], notes: 'Former colleague.', blocks: [] },
  { name: 'Dad', birthdayIn: 118, born: 1958, dateMetYearsAgo: null, traits: [], likes: ['Gardening', 'Crosswords'], dislikes: [], notes: 'Call on weekends.', checkIn: 10, blocks: [] },
]

const TAGS = [
  { name: 'dairy', color: '#facc15' },
  { name: 'cheese', color: '#ffb05c', parent: 'dairy' },
  { name: 'ice cream', color: '#ff82b8', parent: 'dairy' },
  { name: 'milk', color: '#5cc8ff', parent: 'dairy' },
  { name: 'gluten', color: '#ff8a5c' },
  { name: 'pasta', color: '#ff8a5c', parent: 'gluten' },
  { name: 'bread', color: '#ffb05c', parent: 'gluten' },
  { name: 'late meal', color: '#7c9cff' },
  { name: 'poor sleep', color: '#ff7086' },
  { name: 'work stress', color: '#e879f9' },
  { name: 'outdoors', color: '#5fd3a2' },
  { name: 'with friends', color: '#2dd4bf' },
  { name: 'travelling', color: '#a3e635' },
]

const MEALS = {
  breakfast: [
    { name: 'Oatmeal with berries', kcal: 380, tags: [] },
    { name: 'Eggs on toast', kcal: 420, tags: ['bread'] },
    { name: 'Greek yogurt and granola', kcal: 340, tags: ['dairy'] },
    { name: 'Banana and peanut butter', kcal: 290, tags: [] },
  ],
  lunch: [
    { name: 'Chicken rice bowl', kcal: 640, tags: [] },
    { name: 'Lentil soup', kcal: 410, tags: [] },
    { name: 'Tuna sandwich', kcal: 520, tags: ['bread'] },
    { name: 'Caprese salad', kcal: 450, tags: ['cheese'] },
  ],
  dinner: [
    { name: 'Salmon and vegetables', kcal: 610, tags: [] },
    { name: 'Margherita pizza', kcal: 880, tags: ['cheese', 'bread'] },
    { name: 'Pasta carbonara', kcal: 790, tags: ['pasta', 'cheese'] },
    { name: 'Vegetable stir-fry', kcal: 530, tags: [] },
    { name: 'Beef tacos', kcal: 700, tags: [] },
  ],
  snack: [
    { name: 'Apple', kcal: 95, tags: [] },
    { name: 'Ice cream', kcal: 270, tags: ['ice cream'] },
    { name: 'Mixed nuts', kcal: 180, tags: [] },
    { name: 'Latte', kcal: 190, tags: ['milk'] },
  ],
}
const DAIRY = new Set(['dairy', 'cheese', 'ice cream', 'milk'])

const GAMES = ['Lanternfall', 'Orbit Garden', 'Iron Harbor']
const SHOWS = [
  { title: 'The Long Tide', kind: 'Show', minutes: 52 },
  { title: 'Signal & Noise', kind: 'Show', minutes: 44 },
]
const BOOKS = ['The Salt Road', 'A Field Guide to Getting Lost in Thought', 'Quiet Machines', 'Northern Lights, Southern Rain']
const TASKS = ['Plan the week', 'Pay the electricity bill', 'Book dentist appointment', 'Clean the kitchen', 'Reply to Priya', 'Back up photos', 'Renew gym membership', 'Water the plants', 'Call Dad', 'Sort the bookshelf', 'Order new running shoes', 'Review budget']

const ROUTINES = [
  { name: 'Push', lifts: [['bench press', 135, 3, 8], ['dumbbell shoulder press', 40, 3, 10], ['triceps pushdown', 50, 3, 12]] },
  { name: 'Pull', lifts: [['barbell deadlift', 205, 3, 5], ['pullups', null, 3, 8], ['bent over barbell row', 115, 3, 8]] },
  { name: 'Legs', lifts: [['barbell squat', 165, 4, 6], ['leg press', 270, 3, 10], ['standing calf raises', 90, 3, 15]] },
]

function buildPlan(seed = 20240917) {
  const rnd = mulberry32(seed)
  const chance = (p) => rnd() < p
  const pick = (list) => list[Math.floor(rnd() * list.length)]
  const gauss = () => {
    let u = 0
    while (u === 0) u = rnd()
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd())
  }
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
  const round = (v, d = 1) => Math.round(v * 10 ** d) / 10 ** d

  /** One record: `daysAgo` and a clock time; the seeder turns that into a timestamp. */
  const ops = []
  const add = (daysAgo, time, kind, data) => ops.push({ daysAgo, time, kind, ...data })

  let prevGaming = 0
  let prevDairy = false
  let routineIndex = 0
  let episode = [1, 1]
  let bookIndex = 0
  let bookDays = 0
  let taskIndex = 0
  add(DAYS - 1, '21:10', 'book', { title: BOOKS[0], activity: 'started' })

  for (let daysAgo = DAYS - 1; daysAgo >= 0; daysAgo--) {
    const date = new Date()
    date.setDate(date.getDate() - daysAgo)
    const weekday = date.getDay()
    const weekend = weekday === 0 || weekday === 6
    const progress = 1 - daysAgo / (DAYS - 1)
    // A week away: only the bare minimum gets logged.
    const away = daysAgo <= 96 && daysAgo >= 91
    const today = daysAgo === 0

    const sleep = clamp(7.35 + gauss() * 0.62 - (prevGaming > 1.5 ? 0.42 * prevGaming : 0.08 * prevGaming), 3.8, 9.6)
    if (!away || chance(0.4)) {
      const quality = sleep < 5.8 ? 'Poor' : sleep < 6.8 ? 'Okay' : sleep < 8 ? 'Good' : 'Great'
      add(daysAgo, '07:20', 'sleep', { value: round(sleep), fields: { quality, woke_up: sleep < 6 ? 1 + Math.floor(rnd() * 3) : chance(0.3) ? 1 : 0 } })
    }

    if (!away && (chance(0.74) || today)) {
      const weight = 183.8 - 7.4 * Math.pow(progress, 0.85) + gauss() * 0.55 + (prevDairy ? 0.3 : 0)
      const waist = weekday === 1 ? round(35.6 - 1.5 * progress + gauss() * 0.12) : null
      add(daysAgo, '07:30', 'weight', { weight: round(weight), waist })
    }

    const trains = !away && ([1, 3, 5].includes(weekday) ? chance(0.86) : weekday === 6 ? chance(0.45) : chance(0.06))
    if (trains && !today) {
      const routine = ROUTINES[routineIndex % ROUTINES.length]
      routineIndex++
      const gain = 1 + 0.16 * progress
      add(daysAgo, '18:10', 'workout', {
        name: routine.name,
        minutes: 44 + Math.round(rnd() * 26),
        lifts: routine.lifts.map(([query, load, sets, reps]) => ({ query, sets: Array.from({ length: sets }, (_, i) => ({ reps: Math.max(3, reps - (i === sets - 1 && chance(0.5) ? 1 : 0)), load: load == null ? null : Math.round((load * gain) / 5) * 5 })) })),
      })
    }

    let lift = 0
    if (!away && chance(weekend ? 0.55 : 0.27)) {
      const group = chance(0.22)
      const names = group ? [PEOPLE[0].name, PEOPLE[1].name] : [pick(PEOPLE).name]
      const impact = chance(0.72) ? 'positive' : chance(0.65) ? 'neutral' : 'negative'
      lift = impact === 'positive' ? 0.75 : impact === 'negative' ? -1.1 : 0
      add(daysAgo, weekend ? '15:30' : '19:45', 'social', {
        people: names,
        method: names[0] === 'Ines Okafor' ? 'video' : names[0] === 'Dad' ? 'call' : chance(0.7) ? 'in-person' : 'text',
        impact,
        note: impact === 'negative' ? 'Tense conversation, left it unresolved.' : pick(['Coffee and a long catch-up.', 'Climbing session, then dinner.', 'Quick call to check in.', 'Walk around the lake.', 'Board games night.']),
        tags: group ? ['with friends'] : [],
      })
    }

    let dairy = false
    const meals = away ? [] : ['breakfast', 'lunch', 'dinner'].filter(() => chance(0.86))
    if (!away && chance(0.42)) meals.push('snack')
    for (const meal of meals) {
      const food = pick(MEALS[meal])
      if (food.tags.some((tag) => DAIRY.has(tag))) dairy = true
      const late = meal === 'dinner' && chance(0.18)
      add(daysAgo, { breakfast: '08:05', lunch: '13:10', dinner: late ? '22:15' : '19:40', snack: '16:20' }[meal], 'food', { name: food.name, kcal: food.kcal, meal, tags: late ? [...food.tags, 'late meal'] : food.tags })
    }

    const bloated = chance(prevDairy ? 0.64 : 0.1)
    if (bloated) add(daysAgo, '10:30', 'symptom', { name: 'Bloating', category: 'physical', severity: 3 + Math.floor(rnd() * 4), note: null })
    const headache = chance(sleep < 6 ? 0.48 : 0.045)
    if (headache) add(daysAgo, '15:00', 'symptom', { name: 'Headache', category: 'physical', severity: 3 + Math.floor(rnd() * 5), note: sleep < 6 ? 'Short night.' : null })

    if (chance(0.9)) add(daysAgo, '08:10', 'intake', { name: 'Vitamin D', type: 'vitamin', dosage: 2000, unit: 'IU' })
    if (chance(0.38)) add(daysAgo, '22:00', 'intake', { name: 'Magnesium', type: 'supplement', dosage: 300, unit: 'mg' })

    const stress = !weekend && chance(0.16)
    const base = 6.15 + 0.85 * (sleep - 7.2) + (trains ? 0.8 : 0) + lift - (bloated ? 0.55 : 0) - (headache ? 0.9 : 0) - (stress ? 0.9 : 0)
    if (chance(0.95) || today) {
      const morning = clamp(Math.round(base - 0.2 + gauss() * 0.7), 1, 10)
      add(daysAgo, '09:00', 'mood', { value: morning, note: morning <= 3 ? 'Dragging today.' : null, tags: [...(sleep < 6 ? ['poor sleep'] : []), ...(stress ? ['work stress'] : [])] })
      if (!today && chance(0.62)) {
        const evening = clamp(Math.round(base + 0.35 + gauss() * 0.75), 1, 10)
        add(daysAgo, '21:30', 'mood', { value: evening, note: evening >= 9 ? 'Really good day.' : null, tags: away ? ['travelling'] : [] })
      }
    }

    if (!away) {
      const glasses = clamp(Math.round(5.6 + (trains ? 1.8 : 0) + gauss() * 1.2), 2, 11)
      add(daysAgo, '20:00', 'water', { value: today ? 3 : glasses })
    }

    const gaming = away ? 0 : chance(weekend ? 0.62 : 0.26) ? round(weekend ? 1.5 + rnd() * 3.2 : 0.5 + rnd() * 1.8, 1) : 0
    if (gaming > 0 && !today) add(daysAgo, '21:00', 'gaming', { title: weekday === 5 || weekday === 6 ? GAMES[0] : pick(GAMES), hours: gaming, tags: chance(0.3) ? ['with friends'] : [] })

    if (!away && !today && chance(0.24) && gaming === 0) {
      const show = SHOWS[chance(0.7) ? 0 : 1]
      const index = show === SHOWS[0] ? 0 : 1
      add(daysAgo, '20:30', 'tv', { title: show.title, showKind: show.kind, season: 1 + Math.floor((episode[index] - 1) / 8), episode: ((episode[index] - 1) % 8) + 1, minutes: show.minutes, rating: 3 + Math.floor(rnd() * 3) })
      episode[index]++
    }
    if (!away && !today && chance(0.1)) add(daysAgo, '17:30', 'media', { title: pick(['Hidden Systems podcast', 'Sunday Jazz mix', 'The Slow Build podcast']), showKind: 'Podcast', minutes: 30 + Math.round(rnd() * 40) })

    if (!today && chance(away ? 0.8 : 0.5) && bookIndex < BOOKS.length) {
      add(daysAgo, '22:20', 'book', { title: BOOKS[bookIndex], activity: 'read' })
      bookDays++
      if (bookDays >= 26 + bookIndex * 7 && bookIndex < BOOKS.length - 2) {
        add(daysAgo, '22:40', 'book', { title: BOOKS[bookIndex], activity: 'finished', rating: bookIndex === 0 ? 45 : 35 })
        bookIndex++
        bookDays = 0
        add(Math.max(0, daysAgo - 1), '21:15', 'book', { title: BOOKS[bookIndex], activity: 'started' })
      }
    }

    if (!away) {
      const count = today ? 3 : weekend ? (chance(0.5) ? 1 : 0) : 1 + Math.floor(rnd() * 2)
      for (let i = 0; i < count; i++) {
        add(daysAgo, '08:30', 'task', { text: TASKS[taskIndex % TASKS.length], done: today ? i === 0 : chance(0.78) })
        taskIndex++
      }
    }

    prevGaming = gaming
    prevDairy = dairy
  }

  return { days: DAYS, ops, people: PEOPLE, tags: TAGS, books: BOOKS, routines: ROUTINES.map((routine) => routine.name) }
}

module.exports = { buildPlan, DAYS }
