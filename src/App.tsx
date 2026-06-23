import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { LockKeyhole } from 'lucide-react'
import { AuthProvider } from './context/AuthContext'
import { AppShell } from './components/AppShell'
import { ErrorBoundary } from './components/ErrorBoundary'
import './App.css'
import './admin.css'
import './growth.css'
import './premium.css'
import { useAuth } from './context/AuthContext'

const LandingPage=lazy(()=>import('./pages/LandingPage').then(m=>({default:m.LandingPage}))),AuthPage=lazy(()=>import('./pages/AuthPage').then(m=>({default:m.AuthPage}))),OnboardingPage=lazy(()=>import('./pages/OnboardingPage').then(m=>({default:m.OnboardingPage}))),DashboardPage=lazy(()=>import('./pages/DashboardPage').then(m=>({default:m.DashboardPage}))),ProfilePage=lazy(()=>import('./pages/ProfilePage').then(m=>({default:m.ProfilePage}))),DiscoverPage=lazy(()=>import('./pages/DiscoverPage').then(m=>({default:m.DiscoverPage}))),RequestsPage=lazy(()=>import('./pages/RequestsPage').then(m=>({default:m.RequestsPage}))),WalletPage=lazy(()=>import('./pages/WalletPage').then(m=>({default:m.WalletPage}))),ChatPage=lazy(()=>import('./pages/ChatPage').then(m=>({default:m.ChatPage}))),SessionsPage=lazy(()=>import('./pages/SessionsPage').then(m=>({default:m.SessionsPage}))),PassportPage=lazy(()=>import('./pages/PassportPage').then(m=>({default:m.PassportPage}))),CirclesPage=lazy(()=>import('./pages/CirclesPage').then(m=>({default:m.CirclesPage}))),AdminPage=lazy(()=>import('./pages/AdminPage').then(m=>({default:m.AdminPage}))),SettingsPage=lazy(()=>import('./pages/SettingsPage').then(m=>({default:m.SettingsPage}))),NotificationsPage=lazy(()=>import('./pages/NotificationsPage').then(m=>({default:m.NotificationsPage})))
const AuthCallbackPage=lazy(()=>import('./pages/AuthSupportPages').then(m=>({default:m.AuthCallbackPage}))),ForgotPasswordPage=lazy(()=>import('./pages/AuthSupportPages').then(m=>({default:m.ForgotPasswordPage}))),ResetPasswordPage=lazy(()=>import('./pages/AuthSupportPages').then(m=>({default:m.ResetPasswordPage}))),PublicHelpPage=lazy(()=>import('./pages/PublicSharePages').then(m=>({default:m.PublicHelpPage}))),PublicPassportPage=lazy(()=>import('./pages/PublicSharePages').then(m=>({default:m.PublicPassportPage}))),NotFoundPage=lazy(()=>import('./pages/FeaturePage').then(m=>({default:m.NotFoundPage}))),TermsPage=lazy(()=>import('./pages/LegalPages').then(m=>({default:m.TermsPage}))),PrivacyPage=lazy(()=>import('./pages/LegalPages').then(m=>({default:m.PrivacyPage})))

function RequireAuth({ children }: { children: React.ReactNode }) {
  const location=useLocation()
  const { loading, accountStatus, isAuthenticated } = useAuth()
  if (loading) return <main className="route-loading"><span /><p>Opening your SkillLoop…</p></main>
  if (!isAuthenticated) return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname+location.search)}`} replace />
  if(accountStatus==='suspended')return <main className="account-suspended"><span><LockKeyhole/></span><h1>This account is suspended.</h1><p>SkillLoop activity is restricted while the safety team reviews the account. Contact support if you believe this is a mistake.</p></main>
  return children
}

function RequireAdmin({children}:{children:React.ReactNode}){const{loading,isAdmin}=useAuth();if(loading)return <main className="route-loading"><span/><p>Checking administrator access...</p></main>;return isAdmin?children:<Navigate to="/dashboard" replace/>}

function PublicOnly({children}:{children:React.ReactNode}){const{loading,isAuthenticated,onboardingComplete}=useAuth();if(loading)return <main className="route-loading"><span/><p>Checking your session...</p></main>;return isAuthenticated?<Navigate to={onboardingComplete?'/dashboard':'/onboarding'} replace/>:children}

export default function App() {
  return <BrowserRouter><AuthProvider><ErrorBoundary><Suspense fallback={<main className="route-loading"><span/><p>Opening the next part of your loop...</p></main>}><Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/signup" element={<PublicOnly><AuthPage mode="signup" /></PublicOnly>} />
    <Route path="/login" element={<PublicOnly><AuthPage mode="login" /></PublicOnly>} />
    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
    <Route path="/reset-password" element={<ResetPasswordPage />} />
    <Route path="/auth/callback" element={<AuthCallbackPage />} />
    <Route path="/u/:username" element={<PublicPassportPage />} />
    <Route path="/help/:slug" element={<PublicHelpPage />} />
    <Route path="/onboarding" element={<RequireAuth><OnboardingPage /></RequireAuth>} />
    <Route element={<RequireAuth><AppShell /></RequireAuth>}>
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/profile/:id" element={<ProfilePage />} />
      <Route path="/discover" element={<DiscoverPage />} />
      <Route path="/requests" element={<RequestsPage />} />
      <Route path="/wallet" element={<WalletPage />} />
      <Route path="/chat" element={<ChatPage />} />
      <Route path="/sessions" element={<SessionsPage />} />
      <Route path="/sessions/:id" element={<SessionsPage />} />
      <Route path="/passport" element={<PassportPage />} />
      <Route path="/passport/:id" element={<PassportPage />} />
      <Route path="/circles" element={<CirclesPage />} />
      <Route path="/circles/:id" element={<CirclesPage />} />
      <Route path="/admin/*" element={<RequireAdmin><AdminPage/></RequireAdmin>} />
      <Route path="/settings" element={<SettingsPage/>} />
      <Route path="/notifications" element={<NotificationsPage/>} />
    </Route>
    <Route path="/terms" element={<TermsPage />} />
    <Route path="/privacy" element={<PrivacyPage />} />
    <Route path="/404" element={<NotFoundPage />} />
    <Route path="*" element={<Navigate to="/404" replace />} />
  </Routes></Suspense></ErrorBoundary></AuthProvider></BrowserRouter>
}
