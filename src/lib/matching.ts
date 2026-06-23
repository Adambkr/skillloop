import type { SkillProfile } from './skillProfile'
import { isSupabaseConfigured, supabase } from './supabase'
import { DEFAULT_FORMAT, normalizeFormat } from './formats'

export type MatchType='Perfect Swap'|'Credit Match'|'Learning Partner'|'Project Helper'
export type CandidateSkill={id:string;name:string;category:string;level:string;formats:string[];description?:string;goal?:string}
export type MatchCandidate={id:string;name:string;avatarUrl:string;bio:string;languages:string[];availability:string[];styles:string[];preferredDuration:number;teach:CandidateSkill[];learn:CandidateSkill[];rating:number;reviewCount:number;responseRate:number;completedSessions:number;createdAt:string}
export type MatchResult=MatchCandidate&{score:number;type:MatchType;canHelpWith:CandidateSkill;wantsHelpWith?:CandidateSkill;sharedLearning?:CandidateSkill;format:string;reasons:string[];scoreParts:{label:string;points:number;max:number}[];message:string;creditCost:number;offeredSkillId?:string}

const clean=(value:string)=>value.toLowerCase().trim().replace(/[^a-z0-9+#]+/g,' ')
const same=(a:string,b:string)=>clean(a)===clean(b)||clean(a).includes(clean(b))||clean(b).includes(clean(a))
const overlap=(left:string[],right:string[])=>left.find(value=>right.some(other=>same(value,other)))
const levelDistance=(a:string,b:string)=>Math.abs(['curious','beginner','intermediate','advanced','expert'].indexOf(a)-['curious','beginner','intermediate','advanced','expert'].indexOf(b))

export function scoreCandidate(current:SkillProfile,candidate:MatchCandidate):MatchResult|null{
  const desired=current.learn.find(learn=>candidate.teach.some(teach=>same(learn.name,teach.name)))
  const canHelpWith=desired?candidate.teach.find(skill=>same(skill.name,desired.name)):undefined
  const reciprocal=candidate.learn.find(learn=>current.teach.some(teach=>same(teach.name,learn.name)))
  const offered=reciprocal?current.teach.find(skill=>same(skill.name,reciprocal.name)):undefined
  const sharedCurrent=current.learn.find(learn=>candidate.learn.some(other=>same(learn.name,other.name)))
  const shared=sharedCurrent?candidate.learn.find(other=>same(sharedCurrent.name,other.name)):undefined
  if(!canHelpWith&&!shared)return null
  const sharedLanguage=overlap(current.languages,candidate.languages),sharedAvailability=overlap(current.availability,candidate.availability)
  const currentFormat=desired?.format||DEFAULT_FORMAT,format=normalizeFormat(canHelpWith?.formats.find(item=>same(item,currentFormat))||canHelpWith?.formats[0]||currentFormat)
  const formatCompatible=Boolean(canHelpWith?.formats.some(item=>same(item,currentFormat)))
  const levelCompatible=desired&&canHelpWith?levelDistance(desired.level,canHelpWith.level)<=2:Boolean(shared)
  const project=Boolean(canHelpWith&&(format==='Project Review'||desired?.goal?.toLowerCase().includes('project')))
  const type:MatchType=canHelpWith&&reciprocal?'Perfect Swap':project?'Project Helper':canHelpWith?'Credit Match':'Learning Partner'
  const parts=[
    {label:'Skill fit',points:canHelpWith?35:shared?18:0,max:35},
    {label:'Mutual value',points:reciprocal?20:shared?12:0,max:20},
    {label:'Shared language',points:sharedLanguage?7:0,max:7},
    {label:'Availability',points:sharedAvailability?7:0,max:7},
    {label:'Format fit',points:formatCompatible?7:canHelpWith?3:0,max:7},
    {label:'Reputation',points:Math.round((candidate.rating/5)*7),max:7},
    {label:'Response rate',points:Math.round((candidate.responseRate/100)*6),max:6},
    {label:'Experience',points:Math.min(5,Math.round(candidate.completedSessions/3)),max:5},
    {label:'Level fit',points:levelCompatible?6:2,max:6},
  ]
  const score=Math.min(100,parts.reduce((sum,part)=>sum+part.points,0))
  const reasons=[canHelpWith?`${candidate.name.split(' ')[0]} teaches ${canHelpWith.name}`:`You both want to learn ${shared?.name}`,reciprocal?`They want to learn ${reciprocal.name} from you`:type==='Credit Match'?'A focused credit exchange fits':'You can practice together',sharedLanguage?`You both speak ${sharedLanguage}`:'',sharedAvailability?`${sharedAvailability} availability overlaps`:'',formatCompatible?`${format} works for both of you`:''].filter(Boolean)
  const target=canHelpWith?.name||shared?.name||'this skill',offer=offered?.name
  const message=type==='Perfect Swap'?`Hey ${candidate.name.split(' ')[0]}, I saw you can help with ${target}. I can help you with ${offer}. Want to do a ${current.duration}-minute skill swap this week?`:type==='Learning Partner'?`Hey ${candidate.name.split(' ')[0]}, it looks like we’re both learning ${target}. Want to practice together for ${current.duration} minutes this week?`:`Hey ${candidate.name.split(' ')[0]}, I saw you can help with ${target}. Would you be open to a ${current.duration}-minute ${format.toLowerCase()} session this week?`
  return {...candidate,score,type,canHelpWith:canHelpWith||shared!,wantsHelpWith:reciprocal,sharedLearning:shared,format,reasons,scoreParts:parts,message,creditCost:type==='Perfect Swap'||type==='Learning Partner'?0:1,offeredSkillId:offered?.id}
}

export function buildMatches(current:SkillProfile,candidates:MatchCandidate[]){return candidates.map(candidate=>scoreCandidate(current,candidate)).filter((match):match is MatchResult=>Boolean(match)).sort((a,b)=>b.score-a.score)}

function previewCandidates(current:SkillProfile):MatchCandidate[]{
  const learn=current.learn[0]||{name:'React Native',level:'beginner',format:'Video'},teach=current.teach[0]||{name:'UI Design',level:'intermediate',format:'Project Review'}
  const make=(id:string,name:string,type:number,rating:number):MatchCandidate=>({id,name,avatarUrl:'',bio:'A generous learner who enjoys practical, focused exchanges.',languages:type%2?['English','French']:['English','Arabic'],availability:type%3?['Evening','Weekend']:['Morning','Flexible'],styles:['Step-by-step guidance','Feedback on my work'],preferredDuration:type%2?30:60,teach:[{id:`${id}-teach`,name:type===2?'English':learn.name,category:type===2?'Languages':'Coding',level:'advanced',formats:type===1?['Video','Project Review']:['Chat','Video']}],learn:[{id:`${id}-learn`,name:type===3?learn.name:teach.name,category:'Design',level:'beginner',formats:['Video']}],rating,reviewCount:8+type,responseRate:88+type*2,completedSessions:9+type*3,createdAt:new Date(Date.now()-type*86400000).toISOString()})
  return [make('preview-sara','Sara Amrani',1,4.9),make('preview-yassine','Yassine Karim',2,4.8),make('preview-lina','Lina Haddad',3,4.7),make('preview-omar','Omar Benali',4,4.6)]
}

export async function loadMatchCandidates(current:SkillProfile):Promise<MatchCandidate[]>{
  if(!isSupabaseConfigured)return previewCandidates(current)
  const{data,error}=await supabase.rpc('get_match_candidates');if(error)throw error
  return (data||[]) as MatchCandidate[]
}
