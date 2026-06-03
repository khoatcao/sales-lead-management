import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import LeadsListPage from './pages/LeadsListPage'
import LeadDetailPage from './pages/LeadDetailPage'
import CreateLeadPage from './pages/CreateLeadPage'
import AnalyticsPage from './pages/AnalyticsPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token)
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/leads"
          element={<ProtectedRoute><LeadsListPage /></ProtectedRoute>}
        />
        <Route
          path="/leads/new"
          element={<ProtectedRoute><CreateLeadPage /></ProtectedRoute>}
        />
        <Route
          path="/leads/:id"
          element={<ProtectedRoute><LeadDetailPage /></ProtectedRoute>}
        />
        <Route
          path="/analytics"
          element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>}
        />
        <Route path="*" element={<Navigate to="/leads" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
