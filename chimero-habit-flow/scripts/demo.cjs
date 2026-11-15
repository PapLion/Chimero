/** Real Electron demo: all records go through the application's preload IPC API. */
const { _electron: electron } = require('playwright')
const { resolve } = require('node:path')
const { mkdirSync, existsSync } = require('node:fs')
const profile = resolve(process.env.CHIMERO_USER_DATA_DIR || '.demo-profile')
const screenshots = resolve(__dirname, '../../portfolio/screenshots')
async function launch() {
  const app = await electron.launch({ args: [resolve(__dirname, '../apps/electron'), '--disable-gpu'], env: { ...process.env, CHIMERO_USER_DATA_DIR: profile } })
  let page
  for (let n = 0; n < 100; n++) {
    page = app.windows().find(w => /renderer\/index.html/.test(w.url()))
    if (page) break
    await new Promise(r => setTimeout(r, 100))
  }
  if (!page) throw new Error('Main renderer did not open')
  await page.waitForFunction(() => Boolean(window.api))
  await app.evaluate(({ BrowserWindow }) => { for (const w of BrowserWindow.getAllWindows()) if (w.webContents.getURL().includes('renderer/index.html')) w.setSize(1440, 1000) })
  await page.setViewportSize({width:1440,height:1000})
  return { app, page }
}
async function seed(page) {
  return page.evaluate(async () => {
    const api = window.api
    if ((await api.getEntries({limit:1})).length) return 'Existing demo profile retained'
    const trackers = await api.getTrackers()
    const weight = trackers.find(t => t.name.toLowerCase() === 'weight')
    const mood = trackers.find(t => t.name.toLowerCase() === 'mood')
    const walk = await api.createTracker({ name:'Outdoor time', type:'number', icon:'sun', color:'#34d399', config:{unit:'min', goal:30} })
    if (!weight || !mood || !walk) throw new Error('Required demo trackers missing')
    for (let day=41; day>=0; day--) {
      const d = new Date(); d.setDate(d.getDate()-day); d.setHours(12,0,0,0)
      const timestamp=d.getTime()
      await api.addWeightEntry({trackerId:weight.id, weight:Math.round((74.5 + day*0.035 + Math.sin(day)*0.25)*10)/10, weightUnit:'kg',timestamp,note:'Synthetic demo weigh-in'})
      await api.addEntry({trackerId:mood.id,value:day%3===1?6:8,timestamp,note:'Synthetic demo check-in'})
      if(day%3!==1) await api.addEntry({trackerId:walk.id,value:25+(day%4)*10,timestamp,note:'Riverside walk · synthetic demo'})
    }
    for(const [name,notes] of [['Alex Rivera','Weekend hiking friend'],['Jamie Chen','Book club and coffee'],['Morgan Ellis','Creative projects']]) await api.createContact({name,notes:`${notes}. Fictional demo contact.`,likes:['Walking','Books']})
    const social=trackers.find(t=>t.name==='Social')
    const contacts=await api.getContacts()
    if(social && contacts.length) await api.addEntry({trackerId:social.id,timestamp:Date.now(),socialInteractions:[{contactId:contacts[0].id,method:'in-person',moodImpact:'positive',notes:'Fictional weekend catch-up'}]})
    const exercise=trackers.find(t=>t.name==='Exercise')
    if(exercise) await api.createWorkoutSession({trackerId:exercise.id,timestamp:Date.now(),sessionName:'Morning strength',durationMinutes:35,loadUnit:'kg',exercises:[{exerciseId:'demo-squat',name:'Squat',sets:[{setIndex:0,reps:10,load:30},{setIndex:1,reps:10,load:30},{setIndex:2,reps:8,load:35}]}]})
    return 'Seeded 42 days of synthetic records through IPC'
  })
}
async function capture(page) {
  mkdirSync(screenshots,{recursive:true})
  const shot=async name=>{await page.waitForTimeout(1800);await page.screenshot({path:resolve(screenshots,name+'.png'),animations:'disabled'})}
  await page.reload(); await page.getByRole('button',{name:'Home',exact:true}).waitFor()
  await shot('01-dashboard')
  await page.keyboard.press('Alt+q'); await shot('02-quick-entry'); await page.keyboard.press('Escape')
  await page.getByRole('button',{name:'Weight',exact:true}).first().click(); await shot('03-weight-history')
  await page.getByRole('button',{name:'Calendar',exact:true}).click(); await shot('04-calendar')
  await page.getByRole('button',{name:'Insight Lab',exact:true}).click()
  await page.getByText('Select source',{exact:true}).click(); await page.getByRole('option',{name:'Outdoor time',exact:true}).click()
  await page.getByText('Select target',{exact:true}).click(); await page.getByRole('option',{name:'Mood',exact:true}).click()
  await page.getByRole('button',{name:'Run analysis'}).click(); await page.waitForTimeout(1200); await shot('05-insight-lab')
  await page.getByRole('button',{name:'Custom Trackers',exact:true}).click(); await shot('06-custom-trackers')
  await page.getByRole('button',{name:'Contacts',exact:true}).click(); await shot('07-contacts')
  await page.getByRole('button',{name:'Home',exact:true}).click(); await shot('08-desktop-hero')
}
async function main() {
  mkdirSync(profile,{recursive:true})
  const {app,page}=await launch()
  try { console.log(await seed(page)); if(process.argv.includes('--capture')) await capture(page)
    console.log('Demo profile:',profile)
    if(process.argv.includes('--open')) { await new Promise(resolve=>app.on('close',resolve)); return }
  } finally { await app.close() }
}
module.exports={launch,seed,capture,profile}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1})
