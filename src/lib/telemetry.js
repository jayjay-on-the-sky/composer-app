/**
 * Telemetry — logs all agent calls, token usage, and user events to localStorage.
 * Max 500 entries kept (FIFO). Accessible via AdminPanel.
 */

const KEY = 'composer_telemetry'
const MAX_ENTRIES = 500

// ─── Model pricing (USD per 1k tokens) ─────────────────────────────────────
const PRICING = {
  'claude-haiku-4-5':   { input: 0.00025,  output: 0.00125  },
  'claude-haiku-3-5':   { input: 0.00025,  output: 0.00125  },
  'claude-sonnet-4-5':  { input: 0.003,    output: 0.015    },
  'claude-sonnet-3-5':  { input: 0.003,    output: 0.015    },
  'ollama':             { input: 0,         output: 0        },
}

function getPrice(model, inputTokens, outputTokens) {
  const p = PRICING[model] || { input: 0.003, output: 0.015 }
  return ((inputTokens / 1000) * p.input) + ((outputTokens / 1000) * p.output)
}

// ─── Storage helpers ────────────────────────────────────────────────────────
function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
}

function save(entries) {
  const trimmed = entries.slice(-MAX_ENTRIES)
  localStorage.setItem(KEY, JSON.stringify(trimmed))
}

// ─── Public API ──────────────────────────────────────────────────────────────

/** Log an agent compose call */
export function logCall({ prompt, outputType, model, inputTokens, outputTokens, durationMs, success, error, planTitle, sectionCount }) {
  const entries = load()
  entries.push({
    type: 'compose',
    ts: Date.now(),
    prompt: prompt?.slice(0, 200),
    outputType,
    model,
    inputTokens: inputTokens ?? 0,
    outputTokens: outputTokens ?? 0,
    costUsd: getPrice(model, inputTokens ?? 0, outputTokens ?? 0),
    durationMs,
    success,
    error: error ?? null,
    planTitle: planTitle ?? null,
    sectionCount: sectionCount ?? 0,
  })
  save(entries)
}

/** Log a generic user event (button clicks, exports, etc.) */
export function logEvent(name, meta = {}) {
  const entries = load()
  entries.push({ type: 'event', ts: Date.now(), name, ...meta })
  save(entries)
}

/** Get all log entries */
export function getEntries() { return load() }

/** Get aggregate stats */
export function getStats() {
  const entries = load()
  const calls = entries.filter(e => e.type === 'compose')
  const totalInput  = calls.reduce((s, e) => s + (e.inputTokens  || 0), 0)
  const totalOutput = calls.reduce((s, e) => s + (e.outputTokens || 0), 0)
  const totalCost   = calls.reduce((s, e) => s + (e.costUsd      || 0), 0)
  const successRate = calls.length ? calls.filter(e => e.success).length / calls.length : 0
  const avgDuration = calls.length ? calls.reduce((s, e) => s + (e.durationMs || 0), 0) / calls.length : 0

  // Per-model breakdown
  const byModel = {}
  for (const call of calls) {
    if (!byModel[call.model]) byModel[call.model] = { calls: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 }
    byModel[call.model].calls++
    byModel[call.model].inputTokens  += call.inputTokens  || 0
    byModel[call.model].outputTokens += call.outputTokens || 0
    byModel[call.model].costUsd      += call.costUsd      || 0
  }

  return { totalCalls: calls.length, totalInput, totalOutput, totalCost, successRate, avgDuration, byModel }
}

/** Clear all telemetry */
export function clearTelemetry() { localStorage.removeItem(KEY) }
