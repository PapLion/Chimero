import { registerTrackingHandlers } from './tracking/handler'
import { registerEntryHandlers } from './entry/handler'
import { registerReminderHandlers } from './reminders/handler'
import { registerAssetHandlers } from './assets/handler'
import { registerContactHandlers } from './contacts/handler'
import { registerCalendarHandlers } from './calendar/handler'
import { registerExerciseHandlers } from './exercises/handler'
import { registerTagHandlers } from './tags/handler'
import { registerWeightHandlers } from './weight/handler'
import { registerGamingHandlers } from './gaming/handler'
import { registerBooksHandlers } from './books/handler'

export { registerTrackingHandlers, registerEntryHandlers, registerReminderHandlers, registerAssetHandlers, registerContactHandlers, registerCalendarHandlers, registerExerciseHandlers, registerTagHandlers, registerWeightHandlers, registerGamingHandlers, registerBooksHandlers }

export function registerIpcHandlers(): void {
  registerTrackingHandlers()
  registerEntryHandlers()
  registerReminderHandlers()
  registerAssetHandlers()
  registerContactHandlers()
  registerCalendarHandlers()
  registerExerciseHandlers()
  registerTagHandlers()
  registerWeightHandlers()
  registerGamingHandlers()
  registerBooksHandlers()
}
