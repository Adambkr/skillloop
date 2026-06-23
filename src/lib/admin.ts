import { isSupabaseConfigured, supabase } from './supabase'

export type AdminStats={totalUsers:number;newUsers:number;activeSessions:number;completedSessions:number;openReports:number;disputes:number;creditTransactions:number;activeCircles:number}
export type AdminUser={id:string;name:string;email:string;role:'member'|'admin';status:'active'|'suspended';verified:boolean;warnings:number;rating:number;sessions:number;credits:number;reports:number;createdAt:string;lastActiveAt:string}
export type AdminReport={id:string;reason:string;details?:string;status:'open'|'reviewing'|'resolved'|'dismissed';createdAt:string;reporterId:string;reporterName:string;reportedUserId:string;reportedUserName:string;contentType:'profile'|'message'|'session'|'review'|'circle_post'|'circle_reply';targetId:string}
export type AdminDispute={id:string;skill:string;learnerId:string;learnerName:string;helperId:string;helperName:string;requestMessage:string;creditCost:number;creditStatus:string;startsAt:string;createdAt:string}
export type AdminTransaction={id:string;userId:string;userName:string;amount:number;type:string;reason:string;status:string;balanceAfter:number;sessionId?:string;suspicious:boolean;createdAt:string}
export type AdminCircle={id:string;name:string;ownerId:string;ownerName:string;members:number;posts:number;createdAt:string}
export type AdminReview={id:string;reviewerName:string;revieweeName:string;rating:number;comment?:string;public:boolean;createdAt:string}
export type AdminSkill={id:string;name:string;category:string;active:boolean;teachers:number;learners:number}
export type AuditEntry={id:string;adminName:string;action:string;targetType:string;targetId?:string;note?:string;createdAt:string}
export type AdminWorkspace={stats:AdminStats;users:AdminUser[];reports:AdminReport[];disputes:AdminDispute[];transactions:AdminTransaction[];circles:AdminCircle[];reviews:AdminReview[];skills:AdminSkill[];audit:AuditEntry[]}
export type AdminUserDetail={profile:{id:string;name:string;bio:string;status:string;verified:boolean;warnings:number;createdAt:string};sessions:{id:string;skill:string;status:string;role:string;partner:string;startsAt:string}[];transactions:{id:string;amount:number;type:string;reason:string;status:string;balanceAfter:number;createdAt:string}[];reports:{id:string;reason:string;details?:string;status:string;createdAt:string}[]}

const now=new Date().toISOString(),day=(count:number)=>new Date(Date.now()-count*86400000).toISOString()
const preview:AdminWorkspace={
  stats:{totalUsers:1248,newUsers:86,activeSessions:42,completedSessions:3921,openReports:7,disputes:3,creditTransactions:8654,activeCircles:38},
  users:[
    {id:'user-sara',name:'Sara Amrani',email:'sara@example.com',role:'member',status:'active',verified:true,warnings:0,rating:4.9,sessions:34,credits:12,reports:0,createdAt:day(180),lastActiveAt:now},
    {id:'user-yassine',name:'Yassine Karim',email:'yassine@example.com',role:'member',status:'active',verified:false,warnings:1,rating:4.7,sessions:19,credits:5,reports:2,createdAt:day(92),lastActiveAt:day(1)},
    {id:'user-nora',name:'Nora El Idrissi',email:'nora@example.com',role:'member',status:'active',verified:false,warnings:0,rating:3.8,sessions:7,credits:1,reports:3,createdAt:day(18),lastActiveAt:day(2)},
    {id:'user-suspended',name:'Kamal Test',email:'kamal@example.com',role:'member',status:'suspended',verified:false,warnings:2,rating:2.4,sessions:4,credits:0,reports:5,createdAt:day(30),lastActiveAt:day(8)},
  ],
  reports:[
    {id:'report-1',reason:'harassment',details:'Repeated hostile messages after I declined the request.',status:'open',createdAt:day(0),reporterId:'user-sara',reporterName:'Sara Amrani',reportedUserId:'user-suspended',reportedUserName:'Kamal Test',contentType:'message',targetId:'message-1'},
    {id:'report-2',reason:'no-show',details:'Did not attend and stopped responding.',status:'reviewing',createdAt:day(1),reporterId:'user-yassine',reporterName:'Yassine Karim',reportedUserId:'user-nora',reportedUserName:'Nora El Idrissi',contentType:'session',targetId:'dispute-1'},
    {id:'report-3',reason:'inappropriate content',details:'Promotional spam posted in the feedback circle.',status:'open',createdAt:day(2),reporterId:'user-nora',reporterName:'Nora El Idrissi',reportedUserId:'user-yassine',reportedUserName:'Yassine Karim',contentType:'circle_post',targetId:'post-unsafe'},
  ],
  disputes:[
    {id:'dispute-1',skill:'React Native',learnerId:'user-nora',learnerName:'Nora El Idrissi',helperId:'user-yassine',helperName:'Yassine Karim',requestMessage:'I need help debugging navigation and testing the final flow.',creditCost:1,creditStatus:'pending',startsAt:day(1),createdAt:day(1)},
    {id:'dispute-2',skill:'Logo Design',learnerId:'user-yassine',learnerName:'Yassine Karim',helperId:'user-sara',helperName:'Sara Amrani',requestMessage:'Please review two identity directions and explain what feels inconsistent.',creditCost:2,creditStatus:'pending',startsAt:day(3),createdAt:day(2)},
  ],
  transactions:[
    {id:'tx-1',userId:'user-nora',userName:'Nora El Idrissi',amount:-1,type:'spent',reason:'Credits reserved for disputed session',status:'pending',balanceAfter:1,sessionId:'dispute-1',suspicious:false,createdAt:day(1)},
    {id:'tx-2',userId:'user-suspended',userName:'Kamal Test',amount:6,type:'adjustment',reason:'Manual balance adjustment',status:'completed',balanceAfter:9,suspicious:true,createdAt:day(2)},
    {id:'tx-3',userId:'user-sara',userName:'Sara Amrani',amount:1,type:'earned',reason:'Completed English practice session',status:'completed',balanceAfter:12,suspicious:false,createdAt:day(3)},
  ],
  circles:[{id:'circle-1',name:'English Speaking Practice',ownerId:'user-sara',ownerName:'Sara Amrani',members:206,posts:184,createdAt:day(160)},{id:'circle-2',name:'React Native Beginners',ownerId:'user-yassine',ownerName:'Yassine Karim',members:84,posts:92,createdAt:day(78)}],
  reviews:[{id:'review-1',reviewerName:'Nora El Idrissi',revieweeName:'Yassine Karim',rating:2,comment:'The advice was unclear and the call ended early.',public:true,createdAt:day(2)},{id:'review-2',reviewerName:'Sara Amrani',revieweeName:'Nora El Idrissi',rating:5,comment:'Prepared, thoughtful, and easy to help.',public:true,createdAt:day(4)}],
  skills:[{id:'skill-1',name:'React Native',category:'Coding',active:true,teachers:47,learners:132},{id:'skill-2',name:'UI Design',category:'Design',active:true,teachers:62,learners:118},{id:'skill-3',name:'Crypto Signals',category:'Business',active:false,teachers:1,learners:0}],
  audit:[],
}
const key='skillloop_preview_admin_workspace'
function clone<T>(value:T):T{return JSON.parse(JSON.stringify(value))}
function readPreview():AdminWorkspace{try{return JSON.parse(localStorage.getItem(key)||'') as AdminWorkspace}catch{return clone(preview)}}
function savePreview(value:AdminWorkspace){localStorage.setItem(key,JSON.stringify(value))}

export async function loadAdminWorkspace():Promise<AdminWorkspace>{if(!isSupabaseConfigured)return readPreview();const{data,error}=await supabase.rpc('get_admin_workspace');if(error)throw error;return data as AdminWorkspace}
export async function loadAdminUserDetail(id:string):Promise<AdminUserDetail>{if(!isSupabaseConfigured){const data=readPreview(),user=data.users.find(item=>item.id===id);if(!user)throw new Error('User not found.');return{profile:{id:user.id,name:user.name,bio:'SkillLoop member profile.',status:user.status,verified:user.verified,warnings:user.warnings,createdAt:user.createdAt},sessions:data.disputes.filter(item=>item.learnerId===id||item.helperId===id).map(item=>({id:item.id,skill:item.skill,status:'disputed',role:item.learnerId===id?'learner':'helper',partner:item.learnerId===id?item.helperName:item.learnerName,startsAt:item.startsAt})),transactions:data.transactions.filter(item=>item.userId===id),reports:data.reports.filter(item=>item.reportedUserId===id)}}const{data,error}=await supabase.rpc('get_admin_user_detail',{target_user:id});if(error)throw error;return data as AdminUserDetail}
export async function moderate(action:string,targetType:string,targetId:string,note=''){if(isSupabaseConfigured){const{error}=await supabase.rpc('admin_moderate',{action_name:action,target_type:targetType,target_id:targetId,action_note:note});if(error)throw error;return}const data=readPreview(),user=data.users.find(item=>item.id===targetId),report=data.reports.find(item=>item.id===targetId);if(action==='verify_user'&&user)user.verified=true;if(action==='suspend_user'&&user)user.status='suspended';if(action==='unsuspend_user'&&user)user.status='active';if(action==='warn_user'&&user)user.warnings++;if(action==='resolve_report'&&report)report.status='resolved';if(action==='dismiss_report'&&report)report.status='dismissed';if(action==='remove_content'&&report)report.status='resolved';if(action==='remove_review'){const review=data.reviews.find(item=>item.id===targetId);if(review)review.public=false}if(action==='remove_circle')data.circles=data.circles.filter(item=>item.id!==targetId);if(action==='deactivate_skill'||action==='activate_skill'){const skill=data.skills.find(item=>item.id===targetId);if(skill)skill.active=action==='activate_skill'}if(action==='refund_credits'||action==='release_credits')data.disputes=data.disputes.filter(item=>item.id!==targetId);data.audit.unshift({id:crypto.randomUUID(),adminName:'Preview Admin',action,targetType,targetId,note,createdAt:new Date().toISOString()});data.stats.openReports=data.reports.filter(item=>['open','reviewing'].includes(item.status)).length;data.stats.disputes=data.disputes.length;savePreview(data)}
