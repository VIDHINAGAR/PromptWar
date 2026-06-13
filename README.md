# 🧬 StressDNA AI — AI Stress Pattern Discovery System

> Most wellness apps tell students **how** they feel.
> **StressDNA discovers _why_ they feel that way — and _what actually helps them recover_.**

Built for competitive-exam aspirants (JEE, NEET, UPSC, CAT, GATE, CUET) who face stress, burnout, anxiety, and self-doubt. This is **not** a mood tracker, **not** a journaling app, and **not** a generic chatbot — it's a **stress-pattern discovery engine** that decodes the hidden triggers and emotional patterns buried in a student's study journals.

---

## ✨ What makes it different

From just **4 simple daily inputs** — *journal entry, mood (1–10), study hours, sleep hours* — the AI reconstructs a student's **"Stress DNA"**:

| # | Capability | What it does |
|---|------------|--------------|
| 1 | **Hidden Stress Trigger Detection** | Finds real triggers (Mock Tests, Parental Expectations, Time Pressure, Comparison, Fear of Underperforming) with frequency + severity |
| 2 | **Emotional Pattern Discovery** | e.g. *"Confidence drops after mock tests"*, *"Anxiety spikes before deadlines"* |
| 3 | **Recovery Pattern Detection** | Identifies what consistently lifts mood (7+ hrs sleep, revision over new topics, walks, breaks) |
| 4 | **Burnout Risk Assessment** | Low / Medium / High with an animated meter + grounded explanation |
| 5 | **Personalized Action Plan** | Concrete, contextual next steps |
| 6 | **Motivation Coach** | Contextual encouragement tuned to the student's state |
| 7 | **Conversational Wellness Assistant** | Answers *"Why am I stressed?"*, *"What should I do before tomorrow's mock?"* using the **already-discovered insights** |

### 🏆 Judge-Wow feature — *"What AI Discovered About You"*
Punchy, data-grounded revelations such as:
- *"You mentioned mock tests 12 times."*
- *"Negative emotions appear after score comparisons."*
- *"Your confidence improves whenever sleep exceeds 7 hours."*
- *"Your strongest hidden trigger is fear of underperforming."*

---

## 🖥️ Output Dashboard
1. Stress DNA Profile
2. What AI Discovered About You *(wow section)*
3. Hidden Trigger Cards
4. Emotional Pattern Cards
5. Recovery Pattern Cards
6. Animated Burnout Risk Meter
7. Personalized Action Plan
8. Motivation Card
9. Conversational AI Assistant

---

## 🧠 How the AI works (grounded, not hallucinated)

A two-layer design keeps insights **honest and demo-proof**:

- **`src/lib/localAnalysis.js`** — a deterministic on-device engine computes *hard numbers* from the journals: keyword/trigger counts, sentiment, and **sleep↔mood / study↔mood correlations**.
- **`src/lib/gemini.js`** — those metrics are injected into the Gemini prompt so the model **narrates real data** instead of inventing it. Structured JSON output → clean dashboard.

> 🔒 **Demo never breaks:** if the Gemini key is missing or a call fails, the app transparently falls back to the on-device engine — so judges always see a full, populated dashboard.

---

## 📁 Folder Structure
```
stressdna-ai/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── .env.example
├── README.md
├── public/
│   └── dna.svg
└── src/
    ├── main.jsx
    ├── index.css            # Tailwind + glassmorphism design system
    ├── App.jsx              # entire UI + dashboard + assistant
    └── lib/
        ├── gemini.js        # Gemini API integration (fetch, no SDK)
        ├── localAnalysis.js # offline pattern engine + fallback
        └── sampleData.js    # realistic demo week (one click to load)
```

---

## 🚀 Setup Instructions

**Prerequisites:** Node.js 18+

```bash
# 1. Install dependencies
npm install

# 2. Add your Gemini API key (free)
cp .env.example .env
#   then open .env and paste your key into VITE_GEMINI_API_KEY
#   Get one at: https://aistudio.google.com/app/apikey

# 3. Run it
npm run dev
```

Open the URL Vite prints (default <http://localhost:5173>).

> 💡 **No key handy for the demo?** Just run it anyway — click **"Load sample week"**, then **"Analyze My StressDNA"**. The on-device engine produces a full dashboard with no key required.

### Build for production
```bash
npm run build
npm run preview
```

### Run the test suite
```bash
npm test
```
22 unit tests (Vitest) cover the core stress-pattern engine — trigger detection, sleep↔mood correlation, burnout scoring, and the conversational fallback logic.

---

## 🎨 Tech & Design
- **React 18 + Vite** — instant HMR, fast cold start
- **Tailwind CSS** — custom dark theme, glassmorphism design system, animated gradients & progress rings
- **Gemini API** (`gemini-2.0-flash`) — structured JSON analysis + grounded conversation
- **Responsive** down to mobile · **Accessible** (labels, `aria-*`, live regions, reduced-motion support) · **Loading skeletons** & **graceful error handling** throughout
- **localStorage** persistence — your log survives refreshes

---

## ⚠️ Disclaimer
StressDNA AI is a supportive wellness tool, **not** a substitute for professional mental-health care. If you're in crisis, please reach out to someone you trust or a local helpline.
