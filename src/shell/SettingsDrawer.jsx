import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Key, Globe, Cpu } from 'lucide-react'

export default function SettingsDrawer({ open, onClose }) {
  const [claudeKey, setClaudeKey] = useState(() => localStorage.getItem('composer_claude_key') || '')
  const [ollamaUrl, setOllamaUrl] = useState(() => localStorage.getItem('composer_ollama_url') || 'http://localhost:11434')
  const [model, setModel] = useState(() => localStorage.getItem('composer_model') || 'haiku')
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    localStorage.setItem('composer_claude_key', claudeKey)
    localStorage.setItem('composer_ollama_url', ollamaUrl)
    localStorage.setItem('composer_model', model)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-80 bg-shell-sidebar border-l border-shell-border flex flex-col"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-shell-border">
              <h2 className="text-sm font-semibold text-shell-text">Settings</h2>
              <button onClick={onClose} className="text-shell-text-muted hover:text-shell-text transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {/* Model selector */}
              <div>
                <label className="text-xs font-semibold text-shell-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Cpu size={12} /> Model
                </label>
                <div className="flex gap-2">
                  {[['haiku', 'Claude Haiku'], ['sonnet', 'Claude Sonnet'], ['ollama', 'Ollama (local)']].map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => setModel(val)}
                      className={`flex-1 text-xs py-1.5 rounded-lg border transition-colors ${
                        model === val
                          ? 'bg-shell-accent border-shell-accent text-white'
                          : 'border-shell-border text-shell-text-muted hover:text-shell-text'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Claude API Key */}
              {model !== 'ollama' && (
                <div>
                  <label className="text-xs font-semibold text-shell-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Key size={12} /> Claude API Key
                  </label>
                  <input
                    type="password"
                    value={claudeKey}
                    onChange={e => setClaudeKey(e.target.value)}
                    placeholder="sk-ant-..."
                    className="w-full bg-shell-bg border border-shell-border rounded-lg px-3 py-2 text-shell-text text-xs placeholder-shell-text-muted outline-none focus:border-shell-accent transition-colors"
                  />
                  <p className="text-xs text-shell-text-muted mt-1">Stored in localStorage only.</p>
                </div>
              )}

              {/* Ollama URL */}
              {model === 'ollama' && (
                <div>
                  <label className="text-xs font-semibold text-shell-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Globe size={12} /> Ollama URL
                  </label>
                  <input
                    type="text"
                    value={ollamaUrl}
                    onChange={e => setOllamaUrl(e.target.value)}
                    placeholder="http://localhost:11434"
                    className="w-full bg-shell-bg border border-shell-border rounded-lg px-3 py-2 text-shell-text text-xs placeholder-shell-text-muted outline-none focus:border-shell-accent transition-colors"
                  />
                  <p className="text-xs text-shell-text-muted mt-1">Requires Ollama running with llama3.3.</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-shell-border">
              <button
                onClick={handleSave}
                className="w-full bg-shell-accent hover:opacity-90 text-white text-sm font-medium rounded-lg py-2 transition-opacity"
              >
                {saved ? '✓ Saved' : 'Save settings'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
