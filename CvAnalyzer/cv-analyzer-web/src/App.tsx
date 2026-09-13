import { Navigate, Route, Routes } from 'react-router-dom'
import { useCanonicalUrl } from './hooks/useCanonicalUrl'
import { ThemeProvider } from './context/ThemeContext'
import { I18nProvider } from './context/I18nContext'
import { AuthProvider } from './context/AuthContext'
import { BillingProvider } from './context/BillingContext'
import AppLayout from './components/AppLayout'
import AdminLayout from './components/AdminLayout'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import HomePage from './pages/HomePage'
import HistoryPage from './pages/HistoryPage'
import HistoryDetailPage from './pages/HistoryDetailPage'
import CareerAssistantPage from './pages/CareerAssistantPage'
import CareerAssistantHistoryDetailPage from './pages/CareerAssistantHistoryDetailPage'
import ComparePage from './pages/ComparePage'
import PremiumCheckoutPage from './pages/PremiumCheckoutPage'
import PremiumResultPage from './pages/PremiumResultPage'
import AccountPage from './pages/AccountPage'
import PrivacyPage from './pages/PrivacyPage'
import TermsPage from './pages/TermsPage'
import CookiesPage from './pages/CookiesPage'
import ContactPage from './pages/ContactPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import AdminUsersPage from './pages/AdminUsersPage'
import AdminUserDetailPage from './pages/AdminUserDetailPage'
import AdminPaymentsPage from './pages/AdminPaymentsPage'
import AdminAuditLogsPage from './pages/AdminAuditLogsPage'

function App() {
  useCanonicalUrl()

  return (
    <ThemeProvider>
      <I18nProvider>
        <AuthProvider>
          <BillingProvider>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/cookies" element={<CookiesPage />} />
              <Route path="/contact" element={<ContactPage />} />

              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/app" element={<HomePage />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/history/:id" element={<HistoryDetailPage />} />
                <Route path="/assistant/:cvId" element={<CareerAssistantPage />} />
                <Route path="/assistant/history/:id" element={<CareerAssistantHistoryDetailPage />} />
                <Route path="/compare" element={<ComparePage />} />
                <Route path="/premium/checkout" element={<PremiumCheckoutPage />} />
                <Route path="/premium/result" element={<PremiumResultPage />} />
                <Route path="/account" element={<AccountPage />} />
              </Route>

              <Route
                element={
                  <AdminRoute>
                    <AdminLayout />
                  </AdminRoute>
                }
              >
                <Route path="/admin" element={<AdminDashboardPage />} />
                <Route path="/admin/users" element={<AdminUsersPage />} />
                <Route path="/admin/users/:id" element={<AdminUserDetailPage />} />
                <Route path="/admin/payments" element={<AdminPaymentsPage />} />
                <Route path="/admin/audit-logs" element={<AdminAuditLogsPage />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BillingProvider>
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  )
}

export default App
