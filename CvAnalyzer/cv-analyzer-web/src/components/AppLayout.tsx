import { Outlet } from 'react-router-dom'
import NavBar from './NavBar'

/** Shared chrome (nav bar) for every authenticated page. */
function AppLayout() {
  return (
    <>
      <NavBar />
      <Outlet />
    </>
  )
}

export default AppLayout
