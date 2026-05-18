import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Eye, EyeOff } from 'lucide-react'

export default function LoginPage({ onSuccess }) {
  const [code, setCode] = useState('')
  const [showCode, setShowCode] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    await new Promise(r => setTimeout(r, 400)) // brief loading feel

    const expected = import.meta.env.VITE_ACCESS_CODE || 'composer2024'
    if (code === expected) {
      onSuccess()
    } else {
      setError('Invalid access code')
      setShake(true)
      setTimeout(() => setShake(false), 600)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-shell-bg flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <Sparkles size={24} className="text-shell-accent" strokeWidth={1.7} />
          <span className="text-xl font-semibold text-shell-text tracking-tight">Composer</span>
        </div>

        {/* Card */}
        <motion.form
          onSubmit={handleSubmit}
          animate={shake ? { x: [-8, 8, -6, 6, -4, 4, 0] } : { x: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-shell-sidebar border border-shell-border rounded-2xl p-6 shadow-2xl"
        >
          <h1 className="text-shell-text font-semibold text-lg mb-1">Enter access code</h1>
          <p className="text-shell-text-muted text-sm mb-6">
            Contact your admin to get access.
          </p>

          <div className="relative mb-4">
            <input
              type={showCode ? 'text' : 'password'}
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="••••••••••"
              autoFocus
              className="w-full bg-shell-bg border border-shell-border rounded-lg px-3 py-2.5 pr-10
                text-shell-text text-sm placeholder-shell-text-muted
                outline-none focus:border-shell-accent transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowCode(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-shell-text-muted hover:text-shell-text transition-colors"
            >
              {showCode ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>

          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-error text-xs mb-3"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <motion.button
            type="submit"
            disabled={loading || !code}
            whileTap={{ scale: 0.97 }}
            className="w-full bg-shell-accent hover:opacity-90 disabled:opacity-50
              text-white font-medium text-sm rounded-lg py-2.5 transition-opacity
              disabled:cursor-not-allowed"
          >
            {loading ? 'Verifying…' : 'Enter'}
          </motion.button>
        </motion.form>
      </motion.div>
    </div>
  )
}
