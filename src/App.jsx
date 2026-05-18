import { useState, useEffect } from 'react'
import { ComposerProvider } from './context/ComposerContext'
import LoginPage from './LoginPage'
import ChatPanel from './shell/ChatPanel'
import CanvasPanel from './shell/CanvasPanel'

function ComposerApp() {
  return (
    <ComposerProvider>
      <div className="flex h-screen overflow-hidden bg-shell-bg">
        {/* Chat panel — 30% */}
        <div className="w-[320px] shrink-0 border-r border-shell-border overflow-hidden">
          <ChatPanel />
        </div>

        {/* Canvas panel — remaining */}
        <div className="flex-1 overflow-hidden">
          <CanvasPanel />
        </div>
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
