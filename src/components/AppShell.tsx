import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Bell, ChevronRight, Coins, Compass, FileBadge2, HeartHandshake, Home, LogOut, Menu, MessageCircle, Settings, ShieldCheck, Sparkles, UserRound, UsersRound, Video, X } from 'lucide-react'
import { Logo } from './Logo'
import { useAuth } from '../context/AuthContext'
import { NotificationCenter } from './NotificationCenter'

const nav = [
  ['Learning Hub', '/dashboard', Home], ['Discover', '/discover', Compass], ['Requests', '/requests', HeartHandshake],
  ['Messages', '/chat', MessageCircle], ['Sessions', '/sessions', Video], ['Circles', '/circles', UsersRound],
  ['My profile', '/profile', UserRound], ['Skill wallet', '/wallet', Coins], ['Skill passport', '/passport', FileBadge2], ['Notifications', '/notifications', Bell], ['Settings', '/settings', Settings],
] as const

export function AppShell() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, signOut, isAdmin, onboardingComplete } = useAuth()
  const previewName = localStorage.getItem('skillloop_preview_name') || 'SkillLoop Member'
  const fullName = user?.user_metadata?.full_name || previewName
  const initials = fullName.split(' ').map((part:string)=>part[0]).join('').slice(0,2).toUpperCase()
  async function logout() { await signOut(); navigate('/login') }
  return <div className="app-layout">
    <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
      <div className="sidebar-head"><Logo /><button className="icon-button mobile-only" onClick={() => setOpen(false)} aria-label="Close menu"><X /></button></div>
      <nav className="side-nav" aria-label="Main navigation">{nav.map(([label, to, Icon]) => <NavLink key={to} to={to} onClick={() => setOpen(false)}><Icon size={19} />{label}</NavLink>)}{isAdmin&&<NavLink className="admin-nav-link" to="/admin" onClick={()=>setOpen(false)}><ShieldCheck size={19}/>Admin safety</NavLink>}</nav>
      {!onboardingComplete && <NavLink to="/onboarding" className="profile-nudge"><span className="nudge-icon"><Sparkles size={18} /></span><span><strong>Build your profile</strong><small>Unlock better matches</small></span><ChevronRight size={17} /></NavLink>}
      <div className="sidebar-user"><span className="avatar">{initials}</span><span><strong>{fullName}</strong><small>{isAdmin?'SkillLoop administrator':'SkillLoop learner'}</small></span><button type="button" onClick={logout} aria-label="Log out"><LogOut /></button></div>
    </aside>
    {open && <button className="scrim" onClick={() => setOpen(false)} aria-label="Close menu" />}
    <main className="app-main">
      <header className="app-topbar"><button className="icon-button mobile-only" onClick={() => setOpen(true)} aria-label="Open menu"><Menu /></button><div className="topbar-path"><span>SkillLoop</span><ChevronRight size={14} /><strong>{nav.find(([, path]) => location.pathname === path)?.[0] || (location.pathname.startsWith('/sessions/')?'Session detail':location.pathname.startsWith('/circles/')?'Circle community':'Profile setup')}</strong></div><NotificationCenter/></header>
      <div className="page-wrap"><Outlet /></div>
    </main>
    <nav className="mobile-bottom-nav" aria-label="Mobile navigation"><NavLink to="/dashboard"><Home/>Hub</NavLink><NavLink to="/discover"><Compass/>Matches</NavLink><NavLink to="/requests"><HeartHandshake/>Requests</NavLink><NavLink to="/chat"><MessageCircle/>Chat</NavLink><NavLink to="/profile"><UserRound/>Me</NavLink></nav>
  </div>
}
