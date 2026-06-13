/**
 * ai.js (exported as gemini.js for import compatibility)
 * ─────────────────────────────────────────────────────
 * Silent 4-layer AI fallback chain:
 *   1. Google Gemini  (VITE_GEMINI_API_KEY)
 *   2. Groq           (VITE_GROQ_API_KEY)
 *   3. OpenRouter     (VITE_OPENROUTER_API_KEY)
 *   4. On-device engine (always works, no key needed)
 *
 * The user never sees a failure — the app just silently
 * tries the next provider.
 */

import { computeMetrics, localAnalysis, localChatReply } from './localAnalysis.js'

// ─── provider config ───────────────────────────────────────────────────────

const PROVIDERS = [
  {
    name: 'gemini',
    key: import.meta.env.VITE_GEMINI_API_KEY,
    model: import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.0-flash',
    available() { return Boolean(this.key?.trim()) },
    async call(prompt, json) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.key}`
      const res = await fetch(url, {
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
      if (!res.ok) throw new Error(`Gemini ${res.status}`)
      const data = await res.json()
      const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? ''
      if (!text) throw new Error('Gemini: empty response')
      return text
    },
  },
  {
    name: 'groq',
    key: import.meta.env.VITE_GROQ_API_KEY,
    model: import.meta.env.VITE_GROQ_MODEL || 'llama-3.3-70b-versatile',
    available() { return Boolean(this.key?.trim()) },
    async call(prompt, json) {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.key}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          temperature: json ? 0.4 : 0.85,
          max_tokens: 2048,
          ...(json ? { response_format: { type: 'json_object' } } : {}),
        }),
      })
      if (!res.ok) throw new Error(`Groq ${res.status}`)
      const data = await res.json()
      const text = data?.choices?.[0]?.message?.content ?? ''
      if (!text) throw new Error('Groq: empty response')
      return text
    },
  },
  {
    name: 'openrouter',
    key: import.meta.env.VITE_OPENROUTER_API_KEY,
    model: import.meta.env.VITE_OPENROUTER_MODEL || 'meta-llama/llama-3.1-8b-instruct:free',
    available() { return Boolean(this.key?.trim()) },
    async call(prompt, json) {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.key}`,
          'HTTP-Referer': 'https://stressdna.ai',
          'X-Title': 'StressDNA AI',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          temperature: json ? 0.4 : 0.85,
          max_tokens: 2048,
        }),
      })
      if (!res.ok) throw new Error(`OpenRouter ${res.status}`)
      const data = await res.json()
      const text = data?.choices?.[0]?.message?.content ?? ''
      if (!text) throw new Error('OpenRouter: empty response')
      return text
    },
  },
]

// ─── helpers ───────────────────────────────────────────────────────────────

export const hasApiKey = () => PROVIDERS.some((p) => p.available())

function safeParseJson(text) {
  try { return JSON.parse(text) } catch { /* fall through */ }
  const match = text.match(/\{[\s\S]*\}/)
  if (match) return JSON.parse(match[0])
  throw new Error('Could not parse JSON from model response')
}

/**
 * Try each available provider in order, silently moving to the next on failure.
 * Returns { text, provider } or throws if all fail.
 */
async function callWithFallback(prompt, { json = false } = {}) {
  const available = PROVIDERS.filter((p) => p.available())
  if (available.length === 0) throw new Error('NO_API_KEY')

  const errors = []
  for (const provider of available) {
    try {
      const text = await provider.call(prompt, json)
      return { text, provider: provider.name }
    } catch (err) {
      console.warn(`[StressDNA] ${provider.name} failed: ${err.message} — trying next provider`)
      errors.push(`${provider.name}: ${err.message}`)
    }
  }
  throw new Error(`All providers failed: ${errors.join(' | ')}`)
}

// ─── analysis ──────────────────────────────────────────────────────────────

const ANALYSIS_SHAPE = `{
  "stressDnaProfile": { "summary": string, "traits": [{ "label": string, "value": string }] },
  "discoveries": [string],
  "hiddenTriggers": [{ "title": string, "description": string, "frequency": number, "severity": "Low"|"Medium"|"High" }],
  "emotionalPatterns": [{ "title": string, "description": string }],
  "recoveryPatterns": [{ "title": string, "description": string, "impact": "Low"|"Medium"|"High" }],
  "burnoutRisk": { "level": "Low"|"Medium"|"High", "score": number, "explanation": string },
  "actionPlan": [string],
  "motivation": { "message": string }
}`

export async function analyzeEntries(entries) {
  const metrics = computeMetrics(entries)
  if (!hasApiKey()) return localAnalysis(entries)

  const prompt = `You are StressDNA, a clinical-grade but warm AI that discovers WHY students preparing for competitive exams (JEE, NEET, UPSC, CAT, GATE, CUET) feel stressed and WHAT actually helps them recover. You go far beyond mood tracking.

Student entries (most recent last):
${JSON.stringify(entries.map((e) => ({ date: e.date, mood: e.mood, studyHours: e.studyHours, sleepHours: e.sleepHours, journal: e.journal })), null, 2)}

Pre-computed grounded metrics (USE THESE — do not invent numbers):
${JSON.stringify(metrics, null, 2)}

Produce a deep, personalised analysis. Rules:
- Ground every claim in the real entries/metrics above. Quote actual counts.
- "discoveries" must be 4-6 specific, surprising, data-grounded one-liners.
- Be warm, never clinical-cold or alarmist.
- Return ONLY valid JSON, exactly this shape, no markdown fences:
${ANALYSIS_SHAPE}`

  try {
    const { text, provider } = await callWithFallback(prompt, { json: true })
    const parsed = safeParseJson(text)
    return { ...parsed, metrics, source: provider }
  } catch (err) {
    console.warn('[StressDNA] All AI providers failed, using local engine:', err.message)
    return { ...localAnalysis(entries), warning: err.message }
  }
}

// ─── chat ──────────────────────────────────────────────────────────────────

export async function chatWithAssistant(question, analysis, history = []) {
  if (!hasApiKey()) return localChatReply(question, analysis)

  const prompt = `You are StressDNA's conversational wellness coach for a competitive-exam aspirant. Answer using ONLY the insights discovered about them below. Be warm, specific, practical, and concise (2-5 sentences). Reference their real patterns. Never give medical diagnoses; if they mention self-harm, gently urge them to talk to someone trusted or a helpline.

DISCOVERED INSIGHTS:
${JSON.stringify(analysis, null, 2)}

RECENT CONVERSATION:
${history.slice(-6).map((m) => `${m.role === 'user' ? 'Student' : 'Coach'}: ${m.text}`).join('\n') || '(none)'}

Student: ${question}
Coach:`

  try {
    const { text } = await callWithFallback(prompt, { json: false })
    return text.trim()
  } catch (err) {
    console.warn('[StressDNA] Chat fallback to local:', err.message)
    return localChatReply(question, analysis)
  }
}
