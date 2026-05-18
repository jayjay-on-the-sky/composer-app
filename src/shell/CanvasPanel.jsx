import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, Palette, Download, Maximize2, Minimize2, Copy, FileCode, Image, Sparkles, ChevronDown } from 'lucide-react'
import { useComposer } from '../context/ComposerContext'
import { compose } from '../lib/composerAgent'
import ComposedPagePreview from './ComposedPagePreview'
import { exportAsPng, exportAsHtml, copyHtml, exportAsJsx } from '../lib/composedExporter'

function SkeletonSection() {
  return (
    <div className="w-full animate-pulse space-y-3 p-6 bg-shell-surface rounded-xl">
      <div className="h-4 bg-shell-border rounded w-2/5" />
      <div className="h-3 bg-shell-border rounded w-4/5" />
      <div className="h-3 bg-shell-border rounded w-3/5" />
      <div className="h-20 bg-shell-border rounded w-full mt-2" />
    </div>
  )
}

function EmptyCanvas() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <div className="w-16 h-16 rounded-2xl bg-shell-surface border border-shell-border flex items-center justify-center mb-4">
        <Sparkles size={28} className="text-shell-accent/40" />
      </div>
      <h3 className="text-shell-text font-semibold mb-2">Canvas is empty</h3>
      <p className="text-shell-text-muted text-sm leading-relaxed max-w-xs">
        Type a prompt in the chat to generate a landing page, slide deck, or dashboard.
      </p>
    </div>
  )
}

export default function CanvasPanel() {
  const { state, dispatch } = useComposer()
  const [fullscreen, setFullscreen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const previewRef = useRef(null)

  const handleRegenerate = async () => {
    const lastUser = [...state.messages].reverse().find(m => m.role === 'user')
    if (!lastUser || state.isComposing) return
    dispatch({ type: 'SET_COMPOSING', value: true })
    dispatch({ type: 'CLEAR_ERROR' })
    try {
      const plan = await compose({ prompt: lastUser.content, outputType: state.outputType, currentPlan: state.plan })
      dispatch({ type: 'SET_PLAN', plan })
      dispatch({
        type: 'ADD_MESSAGE',
        message: {
          id: Date.now(),
          role: 'agent',
          content: `Re-generated "${plan.title}" — ${plan.sections.length} sections.`,
          plan,
          timestamp: Date.now(),
        }
      })
    } catch (err) {
      dispatch({ type: 'ADD_MESSAGE', message: { id: Date.now(), role: 'agent', content: `❌ ${err.message}`, timestamp: Date.now() } })
    } finally {
      dispatch({ type: 'SET_COMPOSING', value: false })
    }
  }

  const handleVariant = async () => {
    const lastUser = [...state.messages].reverse().find(m => m.role === 'user')
    if (!lastUser || state.isComposing) return
    dispatch({ type: 'SET_COMPOSING', value: true })
    try {
      const plan = await compose({
        prompt: `${lastUser.content} — create a different visual variant with different colors, layout, or style choices`,
        outputType: state.outputType,
        currentPlan: state.plan,
      })
      dispatch({ type: 'SET_PLAN', plan })
      dispatch({
        type: 'ADD_MESSAGE',
        message: {
          id: Date.now(),
          role: 'agent',
          content: `Created a variant: "${plan.title}"`,
          plan,
          timestamp: Date.now(),
        }
      })
    } catch (err) {
      dispatch({ type: 'ADD_MESSAGE', message: { id: Date.now(), role: 'agent', content: `❌ ${err.message}`, timestamp: Date.now() } })
    } finally {
      dispatch({ type: 'SET_COMPOSING', value: false })
    }
  }

  const handleExport = async (type) => {
    setExportOpen(false)
    const el = previewRef.current
    if (!el && type !== 'jsx') return
    if (type === 'png') await exportAsPng(el)
    else if (type === 'html') exportAsHtml(el, state.plan)
    else if (type === 'copy-html') { copyHtml(el, state.plan); setCopied(true); setTimeout(() => setCopied(false), 1500) }
    else if (type === 'jsx') {
      const jsx = exportAsJsx(state.plan)
      await navigator.clipboard.writeText(jsx)
      setCopied(true); setTimeout(() => setCopied(false), 1500)
    }
  }

  const hasPlan = !!state.plan?.sections?.length

  const toolbar = (
    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-shell-border bg-shell-sidebar shrink-0">
      <button
        onClick={handleRegenerate}
        disabled={!hasPlan || state.isComposing}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-shell-border text-shell-text-muted hover:text-shell-text hover:border-shell-accent/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <RefreshCw size={12} className={state.isComposing ? 'animate-spin' : ''} />
        Re-generate
      </button>

      <button
        onClick={handleVariant}
        disabled={!hasPlan || state.isComposing}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-shell-border text-shell-text-muted hover:text-shell-text hover:border-shell-accent/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <Palette size={12} />
        Variant
      </button>

      {/* Export dropdown */}
      <div className="relative">
        <button
          onClick={() => setExportOpen(v => !v)}
          disabled={!hasPlan}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-shell-border text-shell-text-muted hover:text-shell-text hover:border-shell-accent/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Download size={12} />
          Export
          <ChevronDown size={10} />
        </button>
        <AnimatePresence>
          {exportOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setExportOpen(false)} />
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                className="absolute left-0 top-full mt-1 z-20 bg-shell-sidebar border border-shell-border rounded-xl shadow-xl overflow-hidden w-44"
              >
                {[
                  { id: 'html', icon: Download, label: 'Download HTML' },
                  { id: 'copy-html', icon: Copy, label: copied ? '✓ Copied!' : 'Copy HTML' },
                  { id: 'png', icon: Image, label: 'Download PNG' },
                  { id: 'jsx', icon: FileCode, label: copied ? '✓ Copied!' : 'Copy JSX' },
                ].map(({ id, icon: Icon, label }) => (
                  <button
                    key={id}
                    onClick={() => handleExport(id)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-shell-text-muted hover:text-shell-text hover:bg-shell-surface transition-colors text-left"
                  >
                    <Icon size={12} />
                    {label}
                  </button>
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      <div className="flex-1" />

      <button
        onClick={() => setFullscreen(v => !v)}
        className="p-1.5 rounded-lg text-shell-text-muted hover:text-shell-text transition-colors"
        aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
      >
        {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
      </button>
    </div>
  )

  const canvas = (
    <div className="flex-1 overflow-y-auto bg-shell-bg">
      {/* Dot grid background */}
      <div
        className="min-h-full relative"
        style={{
          backgroundImage: 'radial-gradient(circle, color-mix(in srgb, var(--color-ink) 12%, transparent) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      >
        <div ref={previewRef} className="relative z-10">
          {state.isComposing ? (
            <div className="space-y-4 p-6">
              {[1, 2, 3].map(i => <SkeletonSection key={i} />)}
            </div>
          ) : hasPlan ? (
            <ComposedPagePreview plan={state.plan} outputType={state.outputType} />
          ) : (
            <div className="h-screen">
              <EmptyCanvas />
            </div>
          )}
        </div>
      </div>
    </div>
  )

  if (fullscreen) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 flex flex-col bg-shell-bg"
      >
        {toolbar}
        {canvas}
      </motion.div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {toolbar}
      {canvas}
    </div>
  )
}
