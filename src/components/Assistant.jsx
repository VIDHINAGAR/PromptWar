/**
 * Conversational wellness assistant. Answers the user's questions
 * using the already-generated analysis as grounding context, with
 * quick-prompt suggestions and an auto-scrolling message list.
 */
import { useEffect, useRef, useState } from 'react'
import { Icon, ICONS } from './Icon.jsx'
import { chatWithAssistant } from '../lib/gemini.js'
import { CHAT_SUGGESTIONS } from '../constants.js'

const GREETING = {
  role: 'assistant',
  text: "I've decoded your StressDNA. Ask me anything — I'll answer using your real patterns.",
}

export function Assistant({ analysis }) {
  const [messages, setMessages] = useState([GREETING])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const scrollRef = useRef(null)

  // Keep the latest message in view as the conversation grows.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, thinking])

  async function ask(question) {
    const text = (question ?? input).trim()
    if (!text || thinking) return

    setInput('')
    setMessages((prev) => [...prev, { role: 'user', text }])
    setThinking(true)
    try {
      const reply = await chatWithAssistant(text, analysis, messages)
      setMessages((prev) => [...prev, { role: 'assistant', text: reply }])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: `Sorry — I hit an error answering that (${err.message}). Try rephrasing?` },
      ])
    } finally {
      setThinking(false)
    }
  }

  function handleSubmit(event) {
    event.preventDefault()
    ask()
  }

  return (
    <section className="glass mt-6 overflow-hidden animate-fade-up" aria-labelledby="assistant-h">
      <div className="flex items-center gap-3 border-b border-white/10 p-5">
        <span className="relative grid h-10 w-10 place-items-center rounded-xl bg-neon-cyan/15 text-neon-cyan">
          <Icon path={ICONS.chat} />
          <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-neon-emerald ring-2 ring-ink" />
        </span>
        <div>
          <h2 id="assistant-h" className="font-bold text-white">Conversational Wellness Assistant</h2>
          <p className="text-xs text-slate-400">Grounded in your discovered insights</p>
        </div>
      </div>

      <div ref={scrollRef} className="max-h-80 space-y-4 overflow-y-auto p-5" aria-live="polite">
        {messages.map((message, i) => (
          <div key={i} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                message.role === 'user'
                  ? 'bg-gradient-to-br from-neon-indigo to-neon-violet text-white'
                  : 'border border-white/10 bg-white/5 text-slate-100'
              }`}
            >
              {message.text}
            </div>
          </div>
        ))}
        {thinking && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1.5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-2 w-2 animate-bounce rounded-full bg-neon-cyan"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-white/10 p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          {CHAT_SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => ask(suggestion)}
              disabled={thinking}
              className="chip glass-hover hover:text-white disabled:opacity-50"
            >
              {suggestion}
            </button>
          ))}
        </div>
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <label htmlFor="chat-input" className="sr-only">Ask the wellness assistant</label>
          <input
            id="chat-input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask anything about your stress, study or recovery…"
            className="field flex-1"
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={thinking || !input.trim()}
            className="btn btn-primary px-4"
            aria-label="Send message"
          >
            <Icon path={ICONS.send} className="h-5 w-5" />
          </button>
        </form>
      </div>
    </section>
  )
}
