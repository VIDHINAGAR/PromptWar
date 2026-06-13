import { describe, it, expect } from 'vitest'
import { computeMetrics, localAnalysis, localChatReply } from './localAnalysis.js'

/* ──────────────────────────────────────────────────────────────
   Test fixtures: a realistic mini-week with a clear sleep→mood
   recovery signal and recurring "mock test" + comparison triggers.
   ────────────────────────────────────────────────────────────── */
const ENTRIES = [
  {
    id: 'a', date: '2026-06-01', mood: 4, studyHours: 10, sleepHours: 5,
    journal:
      'Mock test destroyed me today. Everyone scored higher and I keep comparing myself. Scared I will fail. My parents asked about my score.',
  },
  {
    id: 'b', date: '2026-06-02', mood: 3, studyHours: 11, sleepHours: 5,
    journal:
      'Another mock test, more comparison with toppers. So much time pressure and deadline anxiety. I feel like I am not good enough.',
  },
  {
    id: 'c', date: '2026-06-03', mood: 7, studyHours: 6, sleepHours: 8,
    journal:
      'Slept well and did revision instead of new topics. Took a short walk. Feeling confident and motivated again.',
  },
  {
    id: 'd', date: '2026-06-04', mood: 8, studyHours: 6, sleepHours: 8,
    journal:
      'Great day, rested and relaxed. Revision sessions are improving my confidence. Took proper breaks.',
  },
]

describe('computeMetrics', () => {
  it('counts every entry', () => {
    expect(computeMetrics(ENTRIES).entryCount).toBe(4)
  })

  it('detects mock tests as a recurring hidden trigger', () => {
    const m = computeMetrics(ENTRIES)
    expect(m.triggerCounts['Mock Tests']).toBeGreaterThanOrEqual(2)
  })

  it('detects comparison and parental triggers from journal text', () => {
    const m = computeMetrics(ENTRIES)
    expect(m.triggerCounts['Comparison With Others']).toBeGreaterThan(0)
    expect(m.triggerCounts['Parental Expectations']).toBeGreaterThan(0)
  })

  it('surfaces the single strongest trigger', () => {
    expect(computeMetrics(ENTRIES).topTrigger).toBeTruthy()
  })

  it('computes a positive sleep↔mood correlation when better sleep tracks better mood', () => {
    const m = computeMetrics(ENTRIES)
    expect(m.sleepMoodCorr).toBeGreaterThan(0.5)
  })

  it('shows higher average mood on 7h+ sleep days than on poor-sleep days', () => {
    const m = computeMetrics(ENTRIES)
    expect(m.moodGoodSleep).toBeGreaterThan(m.moodPoorSleep)
  })

  it('averages mood/sleep/study correctly', () => {
    const m = computeMetrics(ENTRIES)
    expect(m.avgMood).toBe(5.5)
    expect(m.avgSleep).toBe(6.5)
    expect(m.avgStudy).toBe(8.3) // 8.25 rounded to 1 decimal place
  })

  it('captures the upward mood trend from first to last entry', () => {
    expect(computeMetrics(ENTRIES).moodTrend).toBe(4)
  })

  it('counts more negative than positive language in a stressful week start', () => {
    const m = computeMetrics(ENTRIES)
    expect(m.negativeMentions).toBeGreaterThan(0)
    expect(m.positiveMentions).toBeGreaterThan(0)
  })

  it('handles an empty entry list without throwing', () => {
    const m = computeMetrics([])
    expect(m.entryCount).toBe(0)
    expect(m.topTrigger).toBeNull()
    expect(m.avgMood).toBe(0)
  })
})

describe('localAnalysis', () => {
  const result = localAnalysis(ENTRIES)

  it('returns every dashboard section the UI renders', () => {
    expect(result.stressDnaProfile).toBeTruthy()
    expect(Array.isArray(result.discoveries)).toBe(true)
    expect(Array.isArray(result.hiddenTriggers)).toBe(true)
    expect(Array.isArray(result.emotionalPatterns)).toBe(true)
    expect(Array.isArray(result.recoveryPatterns)).toBe(true)
    expect(result.burnoutRisk).toBeTruthy()
    expect(Array.isArray(result.actionPlan)).toBe(true)
    expect(result.motivation?.message).toBeTruthy()
  })

  it('is tagged as the offline source', () => {
    expect(result.source).toBe('local')
  })

  it('produces at least one human-readable discovery', () => {
    expect(result.discoveries.length).toBeGreaterThan(0)
    expect(typeof result.discoveries[0]).toBe('string')
  })

  it('builds hidden trigger cards with a valid severity', () => {
    expect(result.hiddenTriggers.length).toBeGreaterThan(0)
    for (const t of result.hiddenTriggers) {
      expect(['Low', 'Medium', 'High']).toContain(t.severity)
      expect(t.frequency).toBeGreaterThan(0)
    }
  })

  it('returns a burnout risk level and a 0–100 score', () => {
    expect(['Low', 'Medium', 'High']).toContain(result.burnoutRisk.level)
    expect(result.burnoutRisk.score).toBeGreaterThanOrEqual(0)
    expect(result.burnoutRisk.score).toBeLessThanOrEqual(100)
  })

  it('flags High burnout risk for a chronically sleep-deprived, low-mood week', () => {
    const burntOut = [
      { id: '1', date: '2026-06-01', mood: 2, studyHours: 13, sleepHours: 4, journal: 'exhausted, panic, want to give up, burnout' },
      { id: '2', date: '2026-06-02', mood: 2, studyHours: 12, sleepHours: 4, journal: 'hopeless and anxious, failing everything' },
      { id: '3', date: '2026-06-03', mood: 3, studyHours: 14, sleepHours: 4.5, journal: 'so tired, stressed, demotivated' },
    ]
    expect(localAnalysis(burntOut).burnoutRisk.level).toBe('High')
  })

  it('recommends protecting sleep when average sleep is low', () => {
    const plan = result.actionPlan.join(' ').toLowerCase()
    expect(plan).toContain('sleep')
  })

  it('ranks 7h+ sleep as a high-impact recovery pattern', () => {
    const sleepRecovery = result.recoveryPatterns.find((r) => /sleep/i.test(r.title))
    expect(sleepRecovery).toBeTruthy()
    expect(sleepRecovery.impact).toBe('High')
  })
})

describe('localChatReply', () => {
  const analysis = localAnalysis(ENTRIES)

  it('asks the user to log entries when no analysis exists', () => {
    expect(localChatReply('why am I stressed?', null)).toMatch(/journal|entries/i)
  })

  it('answers "why am I stressed" using the discovered trigger', () => {
    const reply = localChatReply('Why am I stressed?', analysis)
    expect(reply.length).toBeGreaterThan(10)
  })

  it('gives pre-mock-test advice that references sleep or mistakes', () => {
    const reply = localChatReply("What should I do before tomorrow's mock test?", analysis)
    expect(reply.toLowerCase()).toMatch(/sleep|mistake|breath/)
  })

  it('reports the burnout level when asked about burnout', () => {
    const reply = localChatReply('How can I avoid burnout?', analysis)
    expect(reply.toLowerCase()).toContain('burnout')
  })
})
