import { isSupabaseConfigured, supabase } from './supabase'

export type SkillItem = { id?: string; name: string; level: string; format: string; description?: string; goal?: string; urgency?: string; peopleHelped?: number; rating?: number; matches?: number; completed?: boolean }
export type ProfileReview = { id:string; reviewer:string; initials:string; rating:number; comment:string }
export type SkillProfile = {
  id?: string; full_name: string; bio: string; avatar_url: string; timezone: string; languages: string[];
  roles: string[]; goal: string; availability: string[]; duration: string; styles: string[];
  teach: SkillItem[]; learn: SkillItem[]; credits: { available:number; earned:number; spent:number; pending:number };
  progress: { sessions:number; reviews:number; badges:number; improved:number }; profileCompletion: number;
  requests: { incoming:number; outgoing:number; confirmations:number };
  reviews: ProfileReview[];
  bestMatch?: { id:string; name:string; initials:string; score:number; helpsWith:string; wantsHelpWith:string; availability:string; format:string };
}

const emptyProfile: SkillProfile = { full_name:'SkillLoop learner',bio:'',avatar_url:'',timezone:Intl.DateTimeFormat().resolvedOptions().timeZone,languages:['English'],roles:[],goal:'',availability:[],duration:'30',styles:[],teach:[],learn:[],credits:{available:0,earned:0,spent:0,pending:0},progress:{sessions:0,reviews:0,badges:0,improved:0},requests:{incoming:0,outgoing:0,confirmations:0},reviews:[],profileCompletion:20 }
export const profileKey = (userId?:string) => `skillloop_profile_${userId || 'preview'}`

export function loadLocalProfile(userId?: string, fallbackName?: string): SkillProfile {
  try {
    const raw = JSON.parse(localStorage.getItem(profileKey(userId)) || 'null')
    if (!raw) return { ...emptyProfile, full_name:fallbackName || emptyProfile.full_name }
    const profile = { ...emptyProfile, ...raw, full_name:raw.full_name || fallbackName || emptyProfile.full_name, languages:raw.languages || [raw.language || 'English'], credits:{...emptyProfile.credits,...raw.credits}, progress:{...emptyProfile.progress,...raw.progress},requests:{...emptyProfile.requests,...raw.requests} }
    profile.profileCompletion = Math.min(100, 35 + (profile.bio ? 10:0) + Math.min(profile.teach.length*10,20) + Math.min(profile.learn.length*10,20) + (profile.goal?10:0) + (profile.availability.length?5:0))
    if (profile.teach.length || profile.learn.length) profile.credits.available ||= 2
    return profile
  } catch { return { ...emptyProfile, full_name:fallbackName || emptyProfile.full_name } }
}

export async function loadRemoteProfile(userId: string, fallbackName?: string): Promise<SkillProfile> {
  const local = loadLocalProfile(userId,fallbackName)
  if (!isSupabaseConfigured) return local
  const [profileResult,prefsResult,teachResult,learnResult,creditsResult,transactionsResult,reviewsResult,badgesResult,matchResult,requestsResult] = await Promise.all([
    supabase.from('profiles').select('id,full_name,bio,avatar_url,timezone,languages,completed_sessions,onboarding_complete').eq('id',userId).maybeSingle(),
    supabase.from('user_preferences').select('roles,main_goal,availability,preferred_duration_minutes,preferred_language,learning_styles').eq('user_id',userId).maybeSingle(),
    supabase.from('user_teach_skills').select('id,level,description,help_formats,skills(id,name)').eq('user_id',userId),
    supabase.from('user_learn_skills').select('id,current_level,goal,preferred_format,urgency,completed_at,skills(id,name)').eq('user_id',userId),
    supabase.from('credits').select('balance,lifetime_earned,lifetime_spent').eq('user_id',userId).maybeSingle(),
    supabase.from('credit_transactions').select('amount,type,status').eq('user_id',userId),
    supabase.from('reviews').select('id,rating,comment,reviewer:profiles!reviews_reviewer_id_fkey(full_name)').eq('reviewee_id',userId).eq('is_public',true).order('created_at',{ascending:false}),
    supabase.from('user_badges').select('badge_id').eq('user_id',userId),
    supabase.from('matches').select('id,compatibility_score,helper:profiles!matches_helper_id_fkey(full_name),learn_skill:skills!matches_learn_skill_id_fkey(name),teach_skill:skills!matches_teach_skill_id_fkey(name)').eq('learner_id',userId).order('compatibility_score',{ascending:false}).limit(1).maybeSingle(),
    supabase.from('swap_requests').select('requester_id,recipient_id,status').or(`requester_id.eq.${userId},recipient_id.eq.${userId}`),
  ])
  if (profileResult.error) return local
  const p = profileResult.data as Record<string,unknown> | null, pref = prefsResult.data as Record<string,unknown> | null
  const teach = (teachResult.data || []).map((row:Record<string,unknown>)=>({id:String((row.skills as {id?:string})?.id||row.id),name:String((row.skills as {name?:string})?.name||'Skill'),level:String(row.level),format:String((row.help_formats as string[])?.[0]||'Video'),description:String(row.description||''),peopleHelped:0,rating:0}))
  const learn = (learnResult.data || []).map((row:Record<string,unknown>)=>({id:String((row.skills as {id?:string})?.id||row.id),name:String((row.skills as {name?:string})?.name||'Skill'),level:String(row.current_level),format:String(row.preferred_format||'Video'),goal:String(row.goal||''),urgency:String(row.urgency||'Long-term'),matches:0,completed:Boolean(row.completed_at)}))
  const transactions = transactionsResult.data || [], pending = transactions.filter((t:{status:string;type:string})=>t.status==='pending'&&t.type==='earned').reduce((sum:number,t:{amount:number})=>sum+t.amount,0)
  const reviews = reviewsResult.data || [], average = reviews.length ? reviews.reduce((sum:number,r:{rating:number})=>sum+r.rating,0)/reviews.length : 0
  const reviewList=reviews.map((r:Record<string,unknown>)=>{const name=String((r.reviewer as {full_name?:string})?.full_name||'SkillLoop member');return{id:String(r.id),reviewer:name,initials:name.split(' ').map(v=>v[0]).join('').slice(0,2).toUpperCase(),rating:Number(r.rating),comment:String(r.comment||'A helpful exchange.')}})
  teach.forEach(item=>{item.rating=average})
  const matchRow=matchResult.data as Record<string,unknown>|null, helper=matchRow?.helper as {full_name?:string}|null, helperName=helper?.full_name||''
  const bestMatch=matchRow?{id:String(matchRow.id),name:helperName||'SkillLoop member',initials:helperName.split(' ').map(v=>v[0]).join('').slice(0,2).toUpperCase()||'SL',score:Number(matchRow.compatibility_score||0),helpsWith:String((matchRow.learn_skill as {name?:string})?.name||'your learning goal'),wantsHelpWith:String((matchRow.teach_skill as {name?:string})?.name||'a skill you teach'),availability:'Check availability',format:'Skill Swap'}:undefined
  const requests=requestsResult.data||[], requestCounts={incoming:requests.filter((r:{recipient_id:string;status:string})=>r.recipient_id===userId&&r.status==='pending').length,outgoing:requests.filter((r:{requester_id:string;status:string})=>r.requester_id===userId&&r.status==='pending').length,confirmations:requests.filter((r:{status:string})=>r.status==='accepted').length}
  const result: SkillProfile = { ...local,id:userId,full_name:String(p?.full_name||fallbackName||local.full_name),bio:String(p?.bio||''),avatar_url:String(p?.avatar_url||''),timezone:String(p?.timezone||local.timezone),languages:(p?.languages as string[])||[String(pref?.preferred_language||'English')],roles:(pref?.roles as string[])||[],goal:String(pref?.main_goal||''),availability:(pref?.availability as string[])||[],duration:String(pref?.preferred_duration_minutes||30),styles:(pref?.learning_styles as string[])||[],teach,learn,credits:{available:Number((creditsResult.data as {balance?:number})?.balance||0),earned:Number((creditsResult.data as {lifetime_earned?:number})?.lifetime_earned||0),spent:Number((creditsResult.data as {lifetime_spent?:number})?.lifetime_spent||0),pending},progress:{sessions:Number(p?.completed_sessions||0),reviews:reviews.length,badges:(badgesResult.data||[]).length,improved:learn.filter(s=>s.completed).length},requests:requestCounts,reviews:reviewList,profileCompletion:p?.onboarding_complete?Math.min(100,75+(p?.bio?10:0)+(p?.avatar_url?10:0)+(p?.languages?5:0)):30,bestMatch }
  localStorage.setItem(profileKey(userId),JSON.stringify(result)); return result
}

export async function saveSkillProfile(profile: SkillProfile, userId?: string) {
  localStorage.setItem(profileKey(userId),JSON.stringify(profile))
  if (!isSupabaseConfigured || !userId) return
  const payload = { ...profile, language:profile.languages[0] || 'English' }
  const { error } = await supabase.rpc('complete_onboarding',{onboarding_payload:payload})
  if (error) throw error
}
