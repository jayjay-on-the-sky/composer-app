import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Trash2, RefreshCw, TrendingUp, Zap, Clock, CheckCircle, AlertCircle, Download } from 'lucide-react'
import { getEntries, getStats, clearTelemetry } from '../lib/telemetry'

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
  const [tab, setTab] = useState('overview')
  const [entries, setEntries] = useState([])
  const [stats, setStats] = useState(null)

  const refresh = useCallback(() => {
    setEntries(getEntries())
    setStats(getStats())
  }, [])

  useEffect(() => { if (open) refresh() }, [open, refresh])

  const handleClear = () => {
    if (confirm('Clear all telemetry data?')) { clearTelemetry(); refresh() }
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
                <TrendingUp size={14} className="text-shell-accent" />
                <h2 className="text-sm font-semibold text-shell-text">Admin Monitor</h2>
                <span className="text-[10px] bg-shell-accent/15 text-shell-accent px-1.5 py-0.5 rounded-full">
                  {entries.length} events
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handleExport} className="p-1.5 rounded-lg text-shell-text-muted hover:text-shell-text transition-colors" title="Export JSON">
                  <Download size={13} />
                </button>
                <button onClick={refresh} className="p-1.5 rounded-lg text-shell-text-muted hover:text-shell-text transition-colors" title="Refresh">
                  <RefreshCw size={13} />
                </button>
                <button onClick={handleClear} className="p-1.5 rounded-lg text-shell-text-muted hover:text-red-400 transition-colors" title="Clear all">
                  <Trash2 size={13} />
                </button>
                <button onClick={onClose} className="p-1.5 rounded-lg text-shell-text-muted hover:text-shell-text transition-colors">
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-4 pt-2 shrink-0">
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
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">

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
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
