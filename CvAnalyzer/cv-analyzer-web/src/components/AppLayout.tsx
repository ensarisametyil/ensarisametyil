import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import styles from './AppLayout.module.css'

/** Authenticated app shell: fixed sidebar navigation + top bar wrapping every /app, /history,
 * /compare and /account route. The mobile sidebar's open state is owned here since both Topbar
 * (menu button) and Sidebar (scrim/close button/link clicks) need to read and change it. */
function AppLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <div className={styles.shell}>
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className={styles.main}>
        <Topbar onMenuClick={() => setIsSidebarOpen((open) => !open)} />
        <div className={styles.content}>
          <Outlet />
        </div>
      </div>
    </div>
  )
}

export default AppLayout
