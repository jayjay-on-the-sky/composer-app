import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Settings, Globe, Monitor, LayoutDashboard, Sparkles } from 'lucide-react'
import { useComposer } from '../context/ComposerContext'
import { compose } from '../lib/composerAgent'
import SettingsDrawer from './SettingsDrawer'

const OUTPUT_TYPES = [
  { value: 'page',      label: 'Page',      icon: Globe },
  { value: 'slides',    label: 'Slides',    icon: Monitor },
  { value: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
]

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-3 py-2">
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-shell-text-muted"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </div>
  )
}

function PlanBlock({ plan }) {
  const [open, setOpen] = useState(false)
  if (!plan) return null
  return (
    <div className="mt-2 border border-shell-border rounded-lg overflow-hidden text-xs">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-1.5 bg-shell-surface text-shell-text-muted hover:text-shell-text transition-colors text-left"
      >
        <span>📋 {plan.sections?.length} sections · {plan.title}</span>
        <span>{open ? '▲' : '▼'}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3 space-y-1 bg-shell-bg font-mono text-shell-text-muted">
              {plan.sections?.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-shell-accent">{i + 1}.</span>
                  <span className="text-shell-text">{s.component}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Message({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}
    >
      {!isUser && (
        <div className="w-6 h-6 rounded-full bg-shell-accent/20 flex items-center justify-center shrink-0 mr-2 mt-0.5">
          <Sparkles size={12} className="text-shell-accent" />
        </div>
      )}
      <div className={`max-w-[85%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? 'bg-shell-accent/20 text-shell-text rounded-br-sm'
            : 'bg-shell-surface text-shell-text rounded-bl-sm'
        }`}>
          {msg.content}
        </div>
        {msg.plan && <PlanBlock plan={msg.plan} />}
        <span className="text-[10px] text-shell-text-muted mt-1 px-1">
          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </motion.div>
  )
}

export default function ChatPanel() {
  const { state, dispatch } = useComposer()
  const [input, setInput] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [state.messages, state.isComposing])

  const handleSend = async () => {
    const prompt = input.trim()
    if (!prompt || state.isComposing) return

    setInput('')
    dispatch({ type: 'ADD_MESSAGE', message: { id: Date.now(), role: 'user', content: prompt, timestamp: Date.now() } })
    dispatch({ type: 'SET_COMPOSING', value: true })
    dispatch({ type: 'CLEAR_ERROR' })

    try {
      const plan = await compose({ prompt, outputType: state.outputType, currentPlan: state.plan })
      dispatch({ type: 'SET_PLAN', plan })
      dispatch({
        type: 'ADD_MESSAGE',
        message: {
          id: Date.now() + 1,
          role: 'agent',
          content: `Here's your ${state.outputType} — "${plan.title}" with ${plan.sections.length} sections. You can ask me to refine it, change colors, add sections, or create a variant.`,
          plan,
          timestamp: Date.now(),
        }
      })
    } catch (err) {
      dispatch({
        type: 'ADD_MESSAGE',
        message: { id: Date.now() + 1, role: 'agent', content: `❌ ${err.message}`, timestamp: Date.now() }
      })
    } finally {
      dispatch({ type: 'SET_COMPOSING', value: false })
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <>
      <div className="flex flex-col h-full bg-shell-sidebar">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-shell-border shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-shell-accent" strokeWidth={1.7} />
            <span className="text-sm font-semibold text-shell-text">Composer</span>
          </div>
          <button
            onClick={() => setSettingsOpen(true)}
            className="text-shell-text-muted hover:text-shell-text transition-colors"
            aria-label="Settings"
          >
            <Settings size={15} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          {state.messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <Sparkles size={28} className="text-shell-accent/40 mb-3" />
              <p className="text-shell-text-muted text-sm leading-relaxed">
                Describe what you want to build. Try:
              </p>
              {['A SaaS landing page for a project tool', '5-slide pitch deck for investors', 'Analytics dashboard'].map(ex => (
                <button
                  key={ex}
                  onClick={() => setInput(ex)}
                  className="mt-2 text-xs text-shell-accent/70 hover:text-shell-accent transition-colors text-left"
                >
                  "{ex}"
                </button>
              ))}
            </div>
          )}
          {state.messages.map(msg => <Message key={msg.id} msg={msg} />)}
          {state.isComposing && (
            <div className="flex justify-start mb-3">
              <div className="w-6 h-6 rounded-full bg-shell-accent/20 flex items-center justify-center shrink-0 mr-2 mt-0.5">
                <Sparkles size={12} className="text-shell-accent" />
              </div>
              <div className="bg-shell-surface rounded-2xl rounded-bl-sm">
                <TypingDots />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Output type selector */}
        <div className="flex gap-1 px-3 pt-2 shrink-0">
          {OUTPUT_TYPES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => dispatch({ type: 'SET_OUTPUT_TYPE', outputType: value })}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-colors ${
                state.outputType === value
                  ? 'bg-shell-accent text-white'
                  : 'text-shell-text-muted hover:text-shell-text border border-shell-border'
              }`}
            >
              <Icon size={11} />
              {label}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="p-3 shrink-0">
          <div className="flex gap-2 bg-shell-bg border border-shell-border rounded-xl p-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe what to build…"
              rows={2}
              className="flex-1 bg-transparent text-shell-text text-sm placeholder-shell-text-muted outline-none resize-none leading-relaxed"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || state.isComposing}
              className="self-end p-1.5 rounded-lg bg-shell-accent hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity text-white"
              aria-label="Send"
            >
              <Send size={14} />
            </button>
          </div>
          <p className="text-[10px] text-shell-text-muted mt-1.5 text-center">Enter to send · Shift+Enter for new line</p>
        </div>
      </div>

      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  )
}
