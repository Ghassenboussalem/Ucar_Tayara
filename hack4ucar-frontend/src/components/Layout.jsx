import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import AIChatDrawer from './AIChatDrawer'
import AlertToastLayer from './AlertToastLayer'
import { useLang } from '../contexts/LangContext'

export default function Layout() {
  const [chatOpen, setChatOpen] = useState(false)
  const { isRTL } = useLang()

  const mainStyle = {
    ...styles.main,
    marginLeft: isRTL ? 0 : '240px',
    marginRight: isRTL ? '240px' : 0,
  }

  return (
    <div style={styles.shell}>
      <Sidebar />

      <div style={mainStyle}>
        <TopBar onOpenChat={() => setChatOpen(true)} />

        <div style={styles.content}>
          <Outlet />
        </div>
      </div>

      <AIChatDrawer open={chatOpen} onClose={() => setChatOpen(false)} />
      <AlertToastLayer />

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
