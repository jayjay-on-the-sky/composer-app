import { useState, useEffect, useCallback } from 'react'
import { ComposerProvider } from './context/ComposerContext'
import LoginPage from './LoginPage'
import ChatPanel from './shell/ChatPanel'
import CanvasPanel from './shell/CanvasPanel'
import AdminPanel from './shell/AdminPanel'
import { BarChart2 } from 'lucide-react'

function ComposerApp() {
  const [adminOpen, setAdminOpen] = useState(false)

  // Ctrl+Shift+A or ?admin=1 in URL opens admin panel
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('admin') === '1') setAdminOpen(true)
    const handler = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') { e.preventDefault(); setAdminOpen(v => !v) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <ComposerProvider>
      <div className="flex h-screen overflow-hidden bg-shell-bg">
        {/* Chat panel — 320px */}
        <div className="w-[320px] shrink-0 border-r border-shell-border overflow-hidden">
          <ChatPanel />
        </div>

        {/* Canvas panel — remaining */}
        <div className="flex-1 overflow-hidden">
          <CanvasPanel />
        </div>

        {/* Admin button — bottom-right corner */}
        <button
          onClick={() => setAdminOpen(true)}
          className="fixed bottom-4 right-4 z-30 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-shell-surface border border-shell-border text-shell-text-muted hover:text-shell-text text-xs transition-colors shadow-lg"
          title="Admin Monitor (Ctrl+Shift+A)"
        >
          <BarChart2 size={12} />
          Monitor
        </button>

        <AdminPanel open={adminOpen} onClose={() => setAdminOpen(false)} />
      </div>
    </ComposerProvider>
  )
}

export default function App() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('composer_authed') === 'true')

  const handleSuccess = () => {
    sessionStorage.setItem('composer_authed', 'true')
    setAuthed(true)
  }

  if (!authed) return <LoginPage onSuccess={handleSuccess} />
  return <ComposerApp />
}
