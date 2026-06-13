/**
 * gemini.js — thin client for Google's Gemini API (no SDK, just fetch).
 *
 * We keep this stateless and framework-free so App.jsx stays clean.
 * If the key is missing or a call fails, callers fall back to the
 * offline engine in localAnalysis.js — the demo never breaks.
 */

import { computeMetrics, localAnalysis, localChatReply } from './localAnalysis.js'

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const MODEL = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.0-flash'
const ENDPOINT = (model) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`

export const hasApiKey = () => Boolean(API_KEY && API_KEY.trim())

/** Low-level call. Returns the model's raw text. Throws on failure. */
async function callGemini(prompt, { json = false } = {}) {
  if (!hasApiKey()) throw new Error('NO_API_KEY')

  const res = await fetch(`${ENDPOINT(MODEL)}?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: json ? 0.4 : 0.85,
        topP: 0.95,
        maxOutputTokens: 2048,
        ...(json ? { responseMimeType: 'application/json' } : {}),
      },
      safetySettings: [
        'HARM_CATEGORY_HARASSMENT',
        'HARM_CATEGORY_HATE_SPEECH',
        'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        'HARM_CATEGORY_DANGEROUS_CONTENT',
      ].map((category) => ({ category, threshold: 'BLOCK_ONLY_HIGH' })),
    }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Gemini ${res.status}: ${detail.slice(0, 200)}`)
  }

  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? ''
  if (!text) throw new Error('Empty response from Gemini')
  return text
}

function safeParseJson(text) {
  try {
    return JSON.parse(text)
  } catch {
    // models sometimes wrap JSON in ```json fences
    const match = text.match(/\{[\s\S]*\}/)
    if (match) return JSON.parse(match[0])
    throw new Error('Could not parse JSON from model')
  }
}

const ANALYSIS_SHAPE = `{
  "stressDnaProfile": { "summary": string, "traits": [{ "label": string, "value": string }] },
  "discoveries": [string],            // 4-6 punchy, data-grounded one-liners for "What AI Discovered About You"
  "hiddenTriggers": [{ "title": string, "description": string, "frequency": number, "severity": "Low"|"Medium"|"High" }],
  "emotionalPatterns": [{ "title": string, "description": string }],
  "recoveryPatterns": [{ "title": string, "description": string, "impact": "Low"|"Medium"|"High" }],
  "burnoutRisk": { "level": "Low"|"Medium"|"High", "score": number, "explanation": string },
  "actionPlan": [string],             // 4-6 concrete, personalised steps
  "motivation": { "message": string }
}`

/**
 * Analyze all journal entries → structured Stress DNA profile.
 * Falls back to the offline engine on any failure.
 */
export async function analyzeEntries(entries) {
  const metrics = computeMetrics(entries)

  if (!hasApiKey()) return localAnalysis(entries)

  const prompt = `You are StressDNA, a clinical-grade but warm AI that discovers WHY students preparing for competitive exams (JEE, NEET, UPSC, CAT, GATE, CUET) feel stressed and WHAT actually helps them recover. You go far beyond mood tracking: you find hidden triggers, emotional patterns, and recovery levers from real journal data.

Here are the student's logged entries (most recent last):
${JSON.stringify(
  entries.map((e) => ({
    date: e.date,
    mood: e.mood,
    studyHours: e.studyHours,
    sleepHours: e.sleepHours,
    journal: e.journal,
  })),
  null,
  2,
)}

Pre-computed grounded metrics (USE THESE — do not invent numbers):
${JSON.stringify(metrics, null, 2)}

Produce a deep, personalised analysis. Rules:
- Ground every claim in the entries/metrics above. Quote real counts (e.g. "you mentioned mock tests 4 times").
- "discoveries" must be specific, surprising, and feel like the AI truly read their soul.
- Be encouraging, never clinical-cold or alarmist.
- Return ONLY valid JSON, exactly this shape, no markdown:
${ANALYSIS_SHAPE}`

  try {
    const text = await callGemini(prompt, { json: true })
    const parsed = safeParseJson(text)
    return { ...parsed, metrics, source: 'gemini' }
  } catch (err) {
    console.warn('Gemini analysis failed, using local engine:', err.message)
    const local = localAnalysis(entries)
    return { ...local, source: 'local', warning: err.message }
  }
}

/**
 * Conversational assistant. Answers using the already-generated
 * analysis as grounding context.
 */
export async function chatWithAssistant(question, analysis, history = []) {
  if (!hasApiKey()) return localChatReply(question, analysis)

  const prompt = `You are StressDNA's conversational wellness coach for a competitive-exam aspirant. Answer their question using ONLY the insights already discovered about them below. Be warm, specific, practical, and concise (2-5 sentences). Reference their real patterns. Never give medical diagnoses; if they mention self-harm, gently urge them to talk to a trusted person or a helpline.

DISCOVERED INSIGHTS ABOUT THIS STUDENT:
${JSON.stringify(analysis, null, 2)}

RECENT CONVERSATION:
${history.slice(-6).map((m) => `${m.role === 'user' ? 'Student' : 'Coach'}: ${m.text}`).join('\n') || '(none)'}

Student: ${question}
Coach:`

  try {
    return (await callGemini(prompt)).trim()
  } catch (err) {
    console.warn('Gemini chat failed, using local reply:', err.message)
    return localChatReply(question, analysis)
  }
}
