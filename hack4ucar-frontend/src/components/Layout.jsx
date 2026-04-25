import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import AIChatDrawer from './AIChatDrawer'

export default function Layout() {
  const [chatOpen, setChatOpen] = useState(false)

  return (
    <div style={styles.shell}>
      <Sidebar />

      <div style={styles.main}>
        <TopBar onOpenChat={() => setChatOpen(true)} />

        <div style={styles.content}>
          <Outlet />
        </div>
      </div>

      <AIChatDrawer open={chatOpen} onClose={() => setChatOpen(false)} />

      {/* Overlay backdrop */}
      {chatOpen && (
        <div style={styles.backdrop} onClick={() => setChatOpen(false)} />
      )}
    </div>
  )
}

const styles = {
  shell: {
    display: 'flex',
    minHeight: '100vh',
    position: 'relative',
  },
  main: {
    flex: 1,
    marginLeft: '240px',
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    background: '#f0f4f8',
  },
  content: {
    flex: 1,
    padding: '28px 32px',
    maxWidth: '1400px',
    width: '100%',
  },
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.35)',
    backdropFilter: 'blur(2px)',
    zIndex: 99,
    animation: 'fadeIn 200ms ease',
  },
}
