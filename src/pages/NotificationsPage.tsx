import { Bell, Check, Coins, HeartHandshake, LoaderCircle, MessageCircle, Sparkles, Star } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { loadNotifications, markNotification, subscribeToNotifications, type AppNotification } from '../lib/collaboration'

function notificationIcon(type:string){
  if(type.includes('message'))return <MessageCircle/>
  if(type.includes('credit'))return <Coins/>
  if(type.includes('review'))return <Star/>
  if(type.includes('request')||type.includes('session'))return <HeartHandshake/>
  return <Sparkles/>
}

const displayDate=(value:string)=>new Intl.DateTimeFormat('en',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(value))

export function NotificationsPage(){
  const{user}=useAuth(),navigate=useNavigate()
  const[items,setItems]=useState<AppNotification[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[filter,setFilter]=useState<'all'|'unread'>('all')
  useEffect(()=>{let live=true;loadNotifications().then(rows=>{if(live)setItems(rows)}).catch(err=>{if(live)setError(err instanceof Error?err.message:'Could not open notifications.')}).finally(()=>{if(live)setLoading(false)});const stop=subscribeToNotifications(user?.id,item=>setItems(current=>[item,...current]));return()=>{live=false;stop()}},[user?.id])
  const unread=items.filter(item=>!item.readAt).length,visible=useMemo(()=>filter==='unread'?items.filter(item=>!item.readAt):items,[filter,items])
  async function choose(item:AppNotification){if(!item.readAt){await markNotification(item.id);setItems(rows=>rows.map(row=>row.id===item.id?{...row,readAt:new Date().toISOString()}:row))}if(item.actionUrl)navigate(item.actionUrl)}
  async function markAll(){await Promise.all(items.filter(item=>!item.readAt).map(item=>markNotification(item.id)));const readAt=new Date().toISOString();setItems(rows=>rows.map(row=>({...row,readAt:row.readAt||readAt})))}
  return <section className="notifications-page">
    <header><div><div className="eyebrow"><Bell/> Your activity</div><h1>Notifications</h1><p>Requests, messages, sessions, and earned credits gathered in one calm place.</p></div>{unread>0&&<button className="button" onClick={markAll}><Check/> Mark all read</button>}</header>
    <nav aria-label="Notification filters"><button className={filter==='all'?'active':''} onClick={()=>setFilter('all')}>All <b>{items.length}</b></button><button className={filter==='unread'?'active':''} onClick={()=>setFilter('unread')}>Unread <b>{unread}</b></button></nav>
    {error&&<div className="notification-page-error">{error}</div>}
    {loading?<div className="notification-page-loading"><LoaderCircle className="spin"/> Opening your activity…</div>:visible.length?<div className="notification-page-list">{visible.map(item=><button className={item.readAt?'':'unread'} onClick={()=>choose(item)} key={item.id}><span>{notificationIcon(item.type)}</span><div><strong>{item.title}</strong><p>{item.body}</p><small>{displayDate(item.createdAt)}</small></div>{!item.readAt&&<i/>}</button>)}</div>:<div className="notification-page-empty"><Bell/><h2>{filter==='unread'?'You are all caught up.':'All quiet for now.'}</h2><p>{filter==='unread'?'New activity will stay highlighted until you open it.':'Your first request, message, or session update will appear here.'}</p><button className="button button-primary" onClick={()=>navigate('/discover')}>Find a learning match</button></div>}
  </section>
}
