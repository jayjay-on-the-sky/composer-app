import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Trash2, RefreshCw, TrendingUp, Zap, Clock, CheckCircle, AlertCircle, Download, ShieldCheck, Eye, EyeOff } from 'lucide-react'
import { getEntries, getStats, clearTelemetry } from '../lib/telemetry'

// ─── Constants ──────────────────────────────────────────────────────────────
const SESSION_KEY  = 'composer_admin_authed'
const LOCKOUT_KEY  = 'composer_admin_lockout'
const MAX_ATTEMPTS = 5
const LOCKOUT_MS   = 5 * 60 * 1000   // 5 minutes

// ─── Admin auth helpers ──────────────────────────────────────────────────────
function isAdminAuthed() {
  return sessionStorage.getItem(SESSION_KEY) === 'true'
}
function setAdminAuthed() {
  sessionStorage.setItem(SESSION_KEY, 'true')
}
function clearAdminAuthed() {
  sessionStorage.removeItem(SESSION_KEY)
}

function getLockout() {
  try { return JSON.parse(localStorage.getItem(LOCKOUT_KEY) || 'null') } catch { return null }
}
function setLockout(attempts) {
  localStorage.setItem(LOCKOUT_KEY, JSON.stringify({ attempts, until: Date.now() + LOCKOUT_MS }))
}
function clearLockout() {
  localStorage.removeItem(LOCKOUT_KEY)
}
function incrementAttempts() {
  const current = getLockout()
  const attempts = (current?.attempts ?? 0) + 1
  if (attempts >= MAX_ATTEMPTS) {
    setLockout(attempts)
  } else {
    localStorage.setItem(LOCKOUT_KEY, JSON.stringify({ attempts, until: null }))
  }
  return attempts
}

// ─── PIN Gate component ──────────────────────────────────────────────────────
function AdminGate({ onSuccess, onClose }) {
  const [pin, setPin]         = useState('')
  const [showPin, setShowPin] = useState(false)
  const [error, setError]     = useState('')
  const [shake, setShake]     = useState(false)
  const [loading, setLoading] = useState(false)
  const [lockedUntil, setLockedUntil] = useState(null)
  const inputRef = useRef(null)

  // Check lockout on mount + every second
  useEffect(() => {
    const check = () => {
      const l = getLockout()
      if (l?.until && Date.now() < l.until) {
        setLockedUntil(l.until)
      } else {
        if (l?.until) clearLockout()  // lockout expired
        setLockedUntil(null)
      }
    }
    check()
    const t = setInterval(check, 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => { inputRef.current?.focus() }, [])

  const secondsLeft = lockedUntil ? Math.ceil((lockedUntil - Date.now()) / 1000) : 0

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (lockedUntil) return
    setLoading(true)
    await new Promise(r => setTimeout(r, 300))  // brief delay, makes brute-force slower

    const expected = import.meta.env.VITE_ADMIN_CODE || 'admin2024'
    if (pin === expected) {
      clearLockout()
      setAdminAuthed()
      onSuccess()
    } else {
      const attempts = incrementAttempts()
      const remaining = MAX_ATTEMPTS - attempts
      if (attempts >= MAX_ATTEMPTS) {
        setError(`Too many attempts. Locked for 5 minutes.`)
        setLockedUntil(Date.now() + LOCKOUT_MS)
      } else {
        setError(`Incorrect PIN. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`)
      }
      setPin('')
      setShake(true)
      setTimeout(() => setShake(false), 600)
    }
    setLoading(false)
  }

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <motion.div className="w-full max-w-xs">
        <div className="flex flex-col items-center mb-6 gap-2">
          <div className="w-12 h-12 rounded-2xl bg-shell-accent/10 border border-shell-accent/20 flex items-center justify-center">
            <ShieldCheck size={22} className="text-shell-accent" />
          </div>
          <h3 className="text-shell-text font-semibold text-base">Admin access</h3>
          <p className="text-shell-text-muted text-xs text-center">Enter the admin PIN to view monitor data.</p>
        </div>

        {lockedUntil ? (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-center space-y-1">
            <p className="text-red-400 text-sm font-medium">Account locked</p>
            <p className="text-red-400/70 text-xs">Try again in {secondsLeft}s</p>
          </div>
        ) : (
          <motion.form
            onSubmit={handleSubmit}
            animate={shake ? { x: [-8, 8, -6, 6, -4, 4, 0] } : { x: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-3"
          >
            <div className="relative">
              <input
                ref={inputRef}
                type={showPin ? 'text' : 'password'}
                value={pin}
                onChange={e => { setPin(e.target.value); setError('') }}
                placeholder="Enter admin PIN"
                autoComplete="off"
                className="w-full bg-shell-bg border border-shell-border rounded-xl px-4 py-2.5 pr-10 text-shell-text text-sm placeholder-shell-text-muted outline-none focus:border-shell-accent transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPin(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-shell-text-muted hover:text-shell-text transition-colors"
              >
                {showPin ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="text-red-400 text-xs px-1"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading || !pin}
              className="w-full bg-shell-accent hover:opacity-90 disabled:opacity-50 text-white font-medium text-sm rounded-xl py-2.5 transition-opacity disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying…' : 'Enter'}
            </button>
          </motion.form>
        )}

        <button onClick={onClose} className="mt-4 w-full text-xs text-shell-text-muted hover:text-shell-text transition-colors text-center">
          Cancel
        </button>
      </motion.div>
    </div>
  )
}

function fmt(n, decimals = 0) {
  return Number(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: decimals })
}
function fmtMs(ms) {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`
}
function fmtCost(usd) {
  if (usd < 0.001) return `$${(usd * 1000).toFixed(3)}m`
  return `$${usd.toFixed(4)}`
}
function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function StatCard({ icon: Icon, label, value, sub, color = 'text-shell-accent' }) {
  return (
    <div className="bg-shell-bg border border-shell-border rounded-xl p-3 flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-shell-text-muted text-xs">
        <Icon size={11} className={color} />
        {label}
      </div>
      <div className="text-shell-text font-semibold text-lg leading-none">{value}</div>
      {sub && <div className="text-shell-text-muted text-[10px]">{sub}</div>}
    </div>
  )
}

function CallRow({ entry }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-shell-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-shell-surface transition-colors"
      >
        <span className={`shrink-0 ${entry.success ? 'text-green-400' : 'text-red-400'}`}>
          {entry.success ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
        </span>
        <span className="text-shell-text-muted text-[10px] shrink-0 w-16">{fmtTime(entry.ts)}</span>
        <span className="text-shell-text text-xs flex-1 truncate">{entry.prompt}</span>
        <span className="text-shell-text-muted text-[10px] shrink-0 bg-shell-bg px-1.5 py-0.5 rounded">{entry.outputType}</span>
        <span className="text-shell-text-muted text-[10px] shrink-0">{fmt(entry.inputTokens + entry.outputTokens)} tok</span>
        <span className="text-shell-accent text-[10px] shrink-0">{fmtCost(entry.costUsd)}</span>
        <span className="text-shell-text-muted text-[10px] shrink-0">{fmtMs(entry.durationMs)}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            className="overflow-hidden border-t border-shell-border"
          >
            <div className="px-3 py-2 bg-shell-bg font-mono text-[10px] space-y-1 text-shell-text-muted">
              <div><span className="text-shell-text">Model:</span> {entry.model}</div>
              <div><span className="text-shell-text">Prompt:</span> {entry.prompt}</div>
              <div><span className="text-shell-text">Input tokens:</span> {fmt(entry.inputTokens)}</div>
              <div><span className="text-shell-text">Output tokens:</span> {fmt(entry.outputTokens)}</div>
              <div><span className="text-shell-text">Cost:</span> {fmtCost(entry.costUsd)}</div>
              <div><span className="text-shell-text">Duration:</span> {fmtMs(entry.durationMs)}</div>
              {entry.planTitle && <div><span className="text-shell-text">Plan:</span> {entry.planTitle} ({entry.sectionCount} sections)</div>}
              {entry.error && <div className="text-red-400"><span className="text-shell-text">Error:</span> {entry.error}</div>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function EventRow({ entry }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 text-xs border-b border-shell-border/50">
      <span className="text-shell-text-muted text-[10px] shrink-0 w-16">{fmtTime(entry.ts)}</span>
      <span className="text-shell-accent text-[10px] shrink-0 px-1.5 py-0.5 bg-shell-accent/10 rounded">{entry.name}</span>
      <span className="text-shell-text-muted text-[10px] truncate">
        {Object.entries(entry)
          .filter(([k]) => !['type','ts','name'].includes(k))
          .map(([k,v]) => `${k}=${JSON.stringify(v)}`)
          .join(' · ')}
      </span>
    </div>
  )
}

export default function AdminPanel({ open, onClose }) {
  const [authed, setAuthed] = useState(isAdminAuthed)
  const [tab, setTab]       = useState('overview')
  const [entries, setEntries] = useState([])
  const [stats, setStats]     = useState(null)

  // Re-check auth whenever panel opens
  useEffect(() => { if (open) setAuthed(isAdminAuthed()) }, [open])

  const handleLogout = () => { clearAdminAuthed(); setAuthed(false) }

  const refresh = useCallback(() => {
    setEntries(getEntries())
    setStats(getStats())
  }, [])

  useEffect(() => { if (open && authed) refresh() }, [open, authed, refresh])

  const handleClear = () => {
    if (confirm('Clear all telemetry data? This cannot be undone.')) { clearTelemetry(); refresh() }
  }

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `composer-telemetry-${Date.now()}.json`; a.click()
    URL.revokeObjectURL(url)
  }

  const calls  = entries.filter(e => e.type === 'compose')
  const events = entries.filter(e => e.type === 'event')

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-[640px] bg-shell-sidebar border-l border-shell-border flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-shell-border shrink-0">
              <div className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-shell-accent" />
                <h2 className="text-sm font-semibold text-shell-text">Admin Monitor</h2>
                {authed && (
                  <span className="text-[10px] bg-shell-accent/15 text-shell-accent px-1.5 py-0.5 rounded-full">
                    {entries.length} events
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {authed && (
                  <>
                    <button onClick={handleExport} className="p-1.5 rounded-lg text-shell-text-muted hover:text-shell-text transition-colors" title="Export JSON">
                      <Download size={13} />
                    </button>
                    <button onClick={refresh} className="p-1.5 rounded-lg text-shell-text-muted hover:text-shell-text transition-colors" title="Refresh">
                      <RefreshCw size={13} />
                    </button>
                    <button onClick={handleClear} className="p-1.5 rounded-lg text-shell-text-muted hover:text-red-400 transition-colors" title="Clear all">
                      <Trash2 size={13} />
                    </button>
                    <button onClick={handleLogout} className="text-[10px] text-shell-text-muted hover:text-red-400 transition-colors px-2 py-1 rounded-lg border border-shell-border" title="Lock">
                      Lock
                    </button>
                  </>
                )}
                <button onClick={onClose} className="p-1.5 rounded-lg text-shell-text-muted hover:text-shell-text transition-colors">
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Gate — shown when not authenticated */}
            {!authed && <AdminGate onSuccess={() => setAuthed(true)} onClose={onClose} />}

            {/* Tabs + Body — shown only when authenticated */}
            {authed && <div className="flex gap-1 px-4 pt-2 shrink-0">
              {[['overview','Overview'], ['calls','API Calls'], ['events','Events']].map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    tab === id ? 'bg-shell-accent text-white' : 'text-shell-text-muted hover:text-shell-text'
                  }`}
                >
                  {label}
                  {id === 'calls' && calls.length > 0 && (
                    <span className="ml-1.5 text-[10px] opacity-70">{calls.length}</span>
                  )}
                  {id === 'events' && events.length > 0 && (
                    <span className="ml-1.5 text-[10px] opacity-70">{events.length}</span>
                  )}
                </button>
              ))}
            </div>}

            {/* Body */}
            {authed && <div className="flex-1 overflow-y-auto p-4 space-y-4">

              {/* ── OVERVIEW ── */}
              {tab === 'overview' && stats && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <StatCard icon={Zap} label="Total API Calls" value={fmt(stats.totalCalls)} sub={`${fmt(stats.totalInput + stats.totalOutput)} total tokens`} />
                    <StatCard icon={TrendingUp} label="Total Cost" value={fmtCost(stats.totalCost)} sub={`avg ${fmtCost(stats.totalCost / Math.max(stats.totalCalls, 1))} / call`} color="text-green-400" />
                    <StatCard icon={CheckCircle} label="Success Rate" value={`${Math.round(stats.successRate * 100)}%`} sub={`${fmt(stats.totalCalls - Math.round(stats.successRate * stats.totalCalls))} errors`} color="text-green-400" />
                    <StatCard icon={Clock} label="Avg Duration" value={fmtMs(stats.avgDuration)} sub="per compose call" color="text-yellow-400" />
                  </div>

                  {/* Token breakdown */}
                  <div className="bg-shell-bg border border-shell-border rounded-xl p-3 space-y-2">
                    <div className="text-xs font-semibold text-shell-text-muted uppercase tracking-wider mb-2">Token Breakdown</div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-shell-text-muted w-20">Input</span>
                      <div className="flex-1 bg-shell-border rounded-full h-1.5 overflow-hidden">
                        <div className="h-full bg-shell-accent rounded-full" style={{ width: `${(stats.totalInput / Math.max(stats.totalInput + stats.totalOutput, 1)) * 100}%` }} />
                      </div>
                      <span className="text-shell-text w-16 text-right">{fmt(stats.totalInput)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-shell-text-muted w-20">Output</span>
                      <div className="flex-1 bg-shell-border rounded-full h-1.5 overflow-hidden">
                        <div className="h-full bg-green-400 rounded-full" style={{ width: `${(stats.totalOutput / Math.max(stats.totalInput + stats.totalOutput, 1)) * 100}%` }} />
                      </div>
                      <span className="text-shell-text w-16 text-right">{fmt(stats.totalOutput)}</span>
                    </div>
                  </div>

                  {/* Per-model breakdown */}
                  {Object.keys(stats.byModel).length > 0 && (
                    <div className="bg-shell-bg border border-shell-border rounded-xl overflow-hidden">
                      <div className="px-3 py-2 text-xs font-semibold text-shell-text-muted uppercase tracking-wider border-b border-shell-border">
                        By Model
                      </div>
                      {Object.entries(stats.byModel).map(([model, data]) => (
                        <div key={model} className="flex items-center gap-3 px-3 py-2 border-b border-shell-border/50 last:border-0 text-xs">
                          <span className="text-shell-text font-mono flex-1">{model}</span>
                          <span className="text-shell-text-muted">{fmt(data.calls)} calls</span>
                          <span className="text-shell-text-muted">{fmt(data.inputTokens + data.outputTokens)} tok</span>
                          <span className="text-shell-accent font-medium">{fmtCost(data.costUsd)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Recent activity */}
                  {calls.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-shell-text-muted uppercase tracking-wider mb-2">Recent Activity</div>
                      {[...calls].reverse().slice(0, 5).map((e, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg hover:bg-shell-surface transition-colors">
                          <span className={e.success ? 'text-green-400' : 'text-red-400'}>
                            {e.success ? <CheckCircle size={10} /> : <AlertCircle size={10} />}
                          </span>
                          <span className="text-shell-text-muted text-[10px] w-14">{fmtTime(e.ts)}</span>
                          <span className="text-shell-text flex-1 truncate">{e.planTitle || e.prompt}</span>
                          <span className="text-shell-accent text-[10px]">{fmtCost(e.costUsd)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {calls.length === 0 && (
                    <div className="text-center py-12 text-shell-text-muted text-sm">
                      No data yet. Start composing to see telemetry.
                    </div>
                  )}
                </>
              )}

              {/* ── API CALLS ── */}
              {tab === 'calls' && (
                <div className="space-y-1.5">
                  {calls.length === 0 && (
                    <div className="text-center py-12 text-shell-text-muted text-sm">No API calls logged yet.</div>
                  )}
                  {[...calls].reverse().map((e, i) => (
                    <CallRow key={i} entry={e} />
                  ))}
                </div>
              )}

              {/* ── EVENTS ── */}
              {tab === 'events' && (
                <div className="bg-shell-bg border border-shell-border rounded-xl overflow-hidden">
                  {events.length === 0 && (
                    <div className="text-center py-12 text-shell-text-muted text-sm">No events logged yet.</div>
                  )}
                  {[...events].reverse().map((e, i) => (
                    <EventRow key={i} entry={e} />
                  ))}
                </div>
              )}
            </div>}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
