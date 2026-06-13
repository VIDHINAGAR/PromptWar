/**
 * localAnalysis.js
 * -------------------------------------------------------------
 * A deterministic, offline stress-pattern engine.
 *
 * It does two jobs:
 *   1. Acts as a graceful fallback when the Gemini API key is
 *      missing or a request fails — so the demo NEVER shows a
 *      blank dashboard.
 *   2. Computes hard numbers (keyword counts, sleep↔mood
 *      correlations) that we feed INTO the Gemini prompt so the
 *      AI grounds its narrative in real data instead of
 *      hallucinating.
 *
 * Everything here is pure functions over the entries array.
 * -------------------------------------------------------------
 */

// Trigger lexicon: phrase -> canonical trigger label
const TRIGGER_LEXICON = {
  'Mock Tests': ['mock', 'mock test', 'mocks', 'test series', 'practice test'],
  'Parental Expectations': ['parent', 'parents', 'family', 'father', 'mother', 'dad', 'mom', 'expectation'],
  'Time Pressure': ['time', 'deadline', 'syllabus', 'backlog', 'late', 'running out', 'not enough time'],
  'Comparison With Others': ['compare', 'comparison', 'rank', 'topper', 'others', 'friend scored', 'everyone'],
  'Fear of Underperforming': ['fail', 'failure', 'underperform', 'not good enough', 'doubt', 'scared', 'afraid'],
  'Sleep Deprivation': ['no sleep', "didn't sleep", 'tired', 'exhausted', 'insomnia', 'awake'],
  'Self-Doubt': ['doubt', 'can i', 'cannot', "can't do", 'useless', 'stupid', 'give up'],
  'Result Anxiety': ['result', 'score', 'marks', 'cutoff', 'percentile', 'admit card'],
}

const NEGATIVE_WORDS = [
  'stress', 'stressed', 'anxious', 'anxiety', 'sad', 'cry', 'cried', 'depress',
  'tired', 'exhausted', 'fail', 'fear', 'scared', 'afraid', 'doubt', 'panic',
  'overwhelm', 'worried', 'worry', 'hopeless', 'lonely', 'angry', 'frustrat',
  'burnout', 'burnt out', 'give up', 'demotivat',
]
const POSITIVE_WORDS = [
  'happy', 'calm', 'confident', 'motivat', 'good', 'great', 'better', 'relax',
  'proud', 'hopeful', 'focused', 'energetic', 'productive', 'improv', 'rested',
  'peaceful', 'win', 'progress', 'excited', 'grateful',
]

const lc = (s) => (s || '').toLowerCase()
const round = (n, d = 1) => Number(n.toFixed(d))

function countOccurrences(text, phrases) {
  let n = 0
  for (const p of phrases) {
    const re = new RegExp(`\\b${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g')
    n += (text.match(re) || []).length
  }
  return n
}

/** Pearson correlation between two numeric arrays. */
function correlation(xs, ys) {
  const n = xs.length
  if (n < 2) return 0
  const mx = xs.reduce((a, b) => a + b, 0) / n
  const my = ys.reduce((a, b) => a + b, 0) / n
  let num = 0, dx = 0, dy = 0
  for (let i = 0; i < n; i++) {
    const a = xs[i] - mx, b = ys[i] - my
    num += a * b
    dx += a * a
    dy += b * b
  }
  if (dx === 0 || dy === 0) return 0
  return num / Math.sqrt(dx * dy)
}

const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0)

/**
 * Compute grounded metrics from entries.
 * Returned object is also serialized into the Gemini prompt.
 */
export function computeMetrics(entries) {
  const corpus = lc(entries.map((e) => e.journal).join('  '))

  // Trigger frequency
  const triggerCounts = {}
  for (const [label, phrases] of Object.entries(TRIGGER_LEXICON)) {
    const c = countOccurrences(corpus, phrases)
    if (c > 0) triggerCounts[label] = c
  }

  const moods = entries.map((e) => Number(e.mood) || 0)
  const sleep = entries.map((e) => Number(e.sleepHours) || 0)
  const study = entries.map((e) => Number(e.studyHours) || 0)

  // Sentiment per entry
  const sentiments = entries.map((e) => {
    const t = lc(e.journal)
    const neg = countOccurrences(t, NEGATIVE_WORDS)
    const pos = countOccurrences(t, POSITIVE_WORDS)
    return pos - neg
  })

  // Mood split by sleep threshold (7h)
  const moodGoodSleep = avg(entries.filter((e) => e.sleepHours >= 7).map((e) => e.mood))
  const moodPoorSleep = avg(entries.filter((e) => e.sleepHours < 7).map((e) => e.mood))

  // Mood split by heavy study (>= 8h)
  const moodHeavyStudy = avg(entries.filter((e) => e.studyHours >= 8).map((e) => e.mood))
  const moodModerateStudy = avg(entries.filter((e) => e.studyHours < 8).map((e) => e.mood))

  const topTrigger =
    Object.entries(triggerCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null

  return {
    entryCount: entries.length,
    triggerCounts,
    topTrigger,
    avgMood: round(avg(moods)),
    avgSleep: round(avg(sleep)),
    avgStudy: round(avg(study)),
    moodTrend: round((moods.at(-1) || 0) - (moods[0] || 0)),
    sleepMoodCorr: round(correlation(sleep, moods), 2),
    studyMoodCorr: round(correlation(study, moods), 2),
    moodGoodSleep: round(moodGoodSleep),
    moodPoorSleep: round(moodPoorSleep),
    moodHeavyStudy: round(moodHeavyStudy),
    moodModerateStudy: round(moodModerateStudy),
    negativeMentions: countOccurrences(corpus, NEGATIVE_WORDS),
    positiveMentions: countOccurrences(corpus, POSITIVE_WORDS),
    sentiments,
  }
}

/**
 * Build a full analysis object (same shape Gemini returns) purely
 * from metrics — used when the API is unavailable.
 */
export function localAnalysis(entries) {
  const m = computeMetrics(entries)

  const discoveries = []
  const sortedTriggers = Object.entries(m.triggerCounts).sort((a, b) => b[1] - a[1])
  if (sortedTriggers[0]) {
    const [label, n] = sortedTriggers[0]
    discoveries.push(`You mentioned ${label.toLowerCase()} ${n} time${n > 1 ? 's' : ''}.`)
  }
  if (m.moodGoodSleep && m.moodPoorSleep && m.moodGoodSleep > m.moodPoorSleep) {
    discoveries.push(
      `Your mood averages ${m.moodGoodSleep}/10 when you sleep 7+ hours, vs ${m.moodPoorSleep}/10 when you don't.`,
    )
  }
  if (m.sleepMoodCorr >= 0.4)
    discoveries.push('Your confidence consistently improves whenever sleep exceeds 7 hours.')
  if (m.studyMoodCorr <= -0.3)
    discoveries.push('Longer study days correlate with a noticeable drop in your mood.')
  if (m.negativeMentions > m.positiveMentions)
    discoveries.push(
      `Negative emotions outweigh positive ones in your journals (${m.negativeMentions} vs ${m.positiveMentions} mentions).`,
    )
  if (m.topTrigger)
    discoveries.push(`Your strongest hidden trigger appears to be ${m.topTrigger.toLowerCase()}.`)
  if (discoveries.length === 0)
    discoveries.push('Keep logging — a few more entries will reveal your hidden patterns.')

  const hiddenTriggers = sortedTriggers.slice(0, 4).map(([title, count]) => ({
    title,
    description: `Detected ${count} reference${count > 1 ? 's' : ''} across your journals. This theme recurs around your low-mood days.`,
    frequency: count,
    severity: count >= 4 ? 'High' : count >= 2 ? 'Medium' : 'Low',
  }))

  const emotionalPatterns = []
  if (m.moodTrend < 0)
    emotionalPatterns.push({
      title: 'Confidence is trending downward',
      description: `Your mood moved ${m.moodTrend} points from your first to latest entry — watch for cumulative fatigue.`,
    })
  if (m.moodHeavyStudy && m.moodModerateStudy && m.moodHeavyStudy < m.moodModerateStudy)
    emotionalPatterns.push({
      title: 'Heavy study days lower your mood',
      description: `On 8h+ study days your mood averages ${m.moodHeavyStudy}/10 vs ${m.moodModerateStudy}/10 otherwise. Diminishing returns are setting in.`,
    })
  if (m.topTrigger)
    emotionalPatterns.push({
      title: `Anxiety spikes around ${m.topTrigger.toLowerCase()}`,
      description: 'Negative language clusters in entries that mention this trigger.',
    })
  if (emotionalPatterns.length === 0)
    emotionalPatterns.push({
      title: 'Emotionally stable baseline',
      description: 'No strong negative swings detected yet — a healthy sign.',
    })

  const recoveryPatterns = []
  if (m.moodGoodSleep > m.moodPoorSleep)
    recoveryPatterns.push({
      title: 'Sleeping 7+ hours',
      description: `Your single most reliable mood booster (+${round(m.moodGoodSleep - m.moodPoorSleep)} points on average).`,
      impact: 'High',
    })
  if (m.moodModerateStudy > m.moodHeavyStudy)
    recoveryPatterns.push({
      title: 'Balanced study blocks',
      description: 'Moderate sessions protect your mood better than marathon days. Favour revision over cramming.',
      impact: 'Medium',
    })
  recoveryPatterns.push({
    title: 'Short breaks & walks',
    description: 'Micro-recovery between sessions keeps cortisol in check and sustains focus.',
    impact: 'Medium',
  })

  // Burnout scoring 0-100
  let risk = 0
  if (m.avgSleep < 6) risk += 30
  else if (m.avgSleep < 7) risk += 15
  if (m.avgStudy > 9) risk += 25
  else if (m.avgStudy > 7) risk += 12
  if (m.avgMood < 4) risk += 30
  else if (m.avgMood < 6) risk += 15
  if (m.negativeMentions > m.positiveMentions) risk += 15
  if (m.moodTrend < -1) risk += 10
  risk = Math.min(100, risk)
  const level = risk >= 66 ? 'High' : risk >= 33 ? 'Medium' : 'Low'

  const burnoutRisk = {
    level,
    score: risk,
    explanation:
      `Based on avg sleep ${m.avgSleep}h, avg study ${m.avgStudy}h, avg mood ${m.avgMood}/10 and your emotional language, ` +
      (level === 'High'
        ? 'you are in a high-risk zone — recovery needs to be prioritised over output immediately.'
        : level === 'Medium'
          ? 'you are managing but carrying strain. Small adjustments now prevent a crash later.'
          : 'you are in a sustainable zone. Keep protecting your sleep and breaks.'),
  }

  const actionPlan = [
    m.avgSleep < 7
      ? 'Lock a fixed 7.5-hour sleep window tonight — treat it as non-negotiable study infrastructure.'
      : 'Protect your current 7+ hour sleep streak; it is your biggest performance lever.',
    m.topTrigger === 'Mock Tests'
      ? 'Reframe mock tests as diagnostics, not verdicts. Review 3 mistakes, ignore the rank.'
      : 'Before your next high-pressure event, do a 10-minute calm-down routine (box breathing).',
    m.avgStudy > 8
      ? 'Cap deep study at 6–7 focused hours; replace the rest with active revision.'
      : 'Add one revision-only block daily — it reinforces confidence more than new topics.',
    'Take a 10-minute walk after every 90 minutes of study to reset attention.',
  ]

  const motivation = {
    message:
      level === 'High'
        ? "You're not behind — you're overloaded, and that's fixable. Rest is part of the syllabus. Recover hard today, and tomorrow's effort will actually count."
        : level === 'Medium'
          ? "You're doing the hard thing, consistently. Steady beats frantic. Trust your process — the work is compounding even when it doesn't feel like it."
          : "You've built a sustainable rhythm — that's the rarest skill among aspirants. Keep showing up like this and the results will follow.",
  }

  const stressDnaProfile = {
    summary:
      `Your StressDNA is shaped primarily by ${m.topTrigger ? m.topTrigger.toLowerCase() : 'exam pressure'}, ` +
      `with sleep acting as your strongest recovery gene. Over ${m.entryCount} entries your average mood is ${m.avgMood}/10.`,
    traits: [
      { label: 'Dominant Trigger', value: m.topTrigger || 'Exam pressure' },
      { label: 'Recovery Gene', value: m.avgSleep >= 7 ? 'Sleep (active)' : 'Sleep (under-used)' },
      { label: 'Emotional Tone', value: m.negativeMentions > m.positiveMentions ? 'Strained' : 'Balanced' },
      { label: 'Mood Trend', value: m.moodTrend >= 0 ? 'Stable / rising' : 'Declining' },
    ],
  }

  return {
    stressDnaProfile,
    discoveries,
    hiddenTriggers,
    emotionalPatterns,
    recoveryPatterns,
    burnoutRisk,
    actionPlan,
    motivation,
    metrics: m,
    source: 'local',
  }
}

/** Lightweight offline reply for the chat assistant. */
export function localChatReply(question, analysis) {
  if (!analysis) return "Add a few journal entries and run an analysis first — then I can answer using your real patterns."
  const q = lc(question)
  const a = analysis
  if (q.includes('why') && q.includes('stress'))
    return `Your data points to ${a.stressDnaProfile?.traits?.[0]?.value || 'exam pressure'} as your dominant trigger. ${a.emotionalPatterns?.[0]?.description || ''}`
  if (q.includes('mock') || q.includes('tomorrow') || q.includes('before'))
    return `Before a high-pressure event: ${a.actionPlan?.[1] || 'do a short breathing routine and review only your past mistakes, not the rank.'} And protect your sleep tonight — it's your biggest lever.`
  if (q.includes('burnout'))
    return `Your current burnout risk is ${a.burnoutRisk?.level} (${a.burnoutRisk?.score}/100). ${a.burnoutRisk?.explanation}`
  if (q.includes('sleep'))
    return `Sleep is your strongest recovery gene. ${a.recoveryPatterns?.[0]?.description || 'Aim for 7+ hours consistently.'}`
  return `${a.motivation?.message || ''} Based on your patterns, focus on: ${a.actionPlan?.[0] || 'protecting your sleep and taking regular breaks.'}`
}
