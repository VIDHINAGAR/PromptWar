/**
 * App-wide constants and small pure helpers.
 */

/** localStorage key for persisting the user's logged entries. */
export const STORAGE_KEY = 'stressdna.entries.v1'

/** Builds a fresh blank form state (date defaults to today). */
export function makeDefaultForm() {
  return { date: todayISO(), journal: '', mood: 5, studyHours: 6, sleepHours: 7 }
}

/** Minimum entries required before a meaningful analysis can run. */
export const MIN_ENTRIES_FOR_ANALYSIS = 2

/** Quick-prompt suggestions shown above the chat input. */
export const CHAT_SUGGESTIONS = [
  'Why am I stressed?',
  "What should I do before tomorrow's mock test?",
  'How can I avoid burnout?',
]

/** Returns today's date as an ISO `YYYY-MM-DD` string. */
export function todayISO() {
  return new Date().toISOString().slice(0, 10)
}
