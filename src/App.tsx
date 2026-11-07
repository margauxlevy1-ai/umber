import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ToastProvider } from './components/ui'
import { StoreProvider, useStore } from './lib/store'
import { Access } from './pages/Access'
import { ClientPage } from './pages/ClientPage'
import { Home } from './pages/Home'
import { Inbox } from './pages/Inbox'
import { Login, NoAccess, SetPassword } from './pages/Login'
import { MyTasks } from './pages/MyTasks'
import { Profile } from './pages/Profile'
import { SpacePage } from './pages/SpacePage'

function Gate() {
  const { me, loading } = useStore()
  if (loading) return <div className="spin">Umber Studio…</div>
  if (!me) return <Login />
  if (me.role === 'none') return <NoAccess />
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="boite" element={<Inbox />} />
        <Route path="taches" element={<MyTasks />} />
        <Route path="clients/:clientId" element={<ClientPage />} />
        <Route path="projets/:projectId/espaces/:n" element={<SpacePage />} />
        <Route path="acces" element={<Access />} />
        <Route path="profil" element={<Profile />} />
        <Route path="mot-de-passe" element={<SetPassword />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <StoreProvider>
          <Gate />
        </StoreProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}
