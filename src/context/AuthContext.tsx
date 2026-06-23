import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

type AuthContextValue = { user: User | null; loading: boolean; isAuthenticated:boolean; onboardingComplete:boolean; isAdmin: boolean; accountStatus: 'active'|'suspended'; refreshAccess: () => Promise<void>; markPreviewAuthenticated:()=>void; markOnboardingComplete:()=>void; signOut: () => Promise<void> }
const AuthContext = createContext<AuthContextValue>({ user: null, loading: true, isAuthenticated:false, onboardingComplete:false, isAdmin: false, accountStatus: 'active', refreshAccess: async()=>undefined, markPreviewAuthenticated:()=>undefined, markOnboardingComplete:()=>undefined, signOut: async () => undefined })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [previewAuthenticated,setPreviewAuthenticated]=useState(!isSupabaseConfigured&&localStorage.getItem('skillloop_preview_authenticated')==='true')
  const [onboardingComplete,setOnboardingComplete]=useState(!isSupabaseConfigured&&Boolean(localStorage.getItem('skillloop_profile_preview')))
  const [isAdmin,setIsAdmin]=useState(!isSupabaseConfigured&&localStorage.getItem('skillloop_preview_admin')==='true')
  const [accountStatus,setAccountStatus]=useState<'active'|'suspended'>('active')
  async function loadAccess(userId?:string){if(!isSupabaseConfigured)return;if(!userId){setIsAdmin(false);setAccountStatus('active');setOnboardingComplete(false);return}const{data}=await supabase.rpc('get_my_access');const access=data as {isAdmin?:boolean;accountStatus?:string;onboardingComplete?:boolean}|null;setIsAdmin(Boolean(access?.isAdmin));setAccountStatus(access?.accountStatus==='suspended'?'suspended':'active');setOnboardingComplete(Boolean(access?.onboardingComplete))}
  useEffect(() => {
    if (!isSupabaseConfigured) return
    supabase.auth.getSession().then(async({ data }) => { setSession(data.session);await loadAccess(data.session?.user.id);setLoading(false) })
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {setSession(next);setIsAdmin(false);setAccountStatus('active');void loadAccess(next?.user.id)})
    return () => data.subscription.unsubscribe()
  }, [])
  const markPreviewAuthenticated=()=>{localStorage.setItem('skillloop_preview_authenticated','true');setPreviewAuthenticated(true)}
  const signOut=async()=>{if(isSupabaseConfigured)await supabase.auth.signOut();else{localStorage.removeItem('skillloop_preview_authenticated');setPreviewAuthenticated(false)}}
  return <AuthContext.Provider value={{ user: session?.user ?? null, loading, isAuthenticated:isSupabaseConfigured?Boolean(session?.user):previewAuthenticated, onboardingComplete, isAdmin, accountStatus, refreshAccess:()=>loadAccess(session?.user.id), markPreviewAuthenticated, markOnboardingComplete:()=>setOnboardingComplete(true), signOut }}>{children}</AuthContext.Provider>
}

// The hook intentionally shares this module with its provider so consumers use one context instance.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() { return useContext(AuthContext) }
