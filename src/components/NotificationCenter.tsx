import { Bell, Check, Coins, HeartHandshake, LoaderCircle, MessageCircle, Sparkles, Star, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { loadNotifications, markNotification, subscribeToNotifications, type AppNotification } from '../lib/collaboration'

function icon(type:string){if(type.includes('message'))return <MessageCircle/>;if(type.includes('credit'))return <Coins/>;if(type.includes('review'))return <Star/>;if(type.includes('request')||type.includes('session'))return <HeartHandshake/>;return <Sparkles/>}
const displayDate=(value:string)=>new Intl.DateTimeFormat('en',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(value))
export function NotificationCenter(){
  const{user}=useAuth(),navigate=useNavigate()
  const[open,setOpen]=useState(false),[items,setItems]=useState<AppNotification[]>([]),[loading,setLoading]=useState(true)
  useEffect(()=>{let live=true;loadNotifications().then(rows=>{if(live){setItems(rows);setLoading(false)}});const stop=subscribeToNotifications(user?.id,item=>setItems(current=>[item,...current]));return()=>{live=false;stop()}},[user?.id])
  const unread=items.filter(item=>!item.readAt).length
  async function choose(item:AppNotification){if(!item.readAt){await markNotification(item.id);setItems(rows=>rows.map(row=>row.id===item.id?{...row,readAt:new Date().toISOString()}:row))}setOpen(false);if(item.actionUrl)navigate(item.actionUrl)}
  async function markAll(){await Promise.all(items.filter(item=>!item.readAt).map(item=>markNotification(item.id)));const readAt=new Date().toISOString();setItems(rows=>rows.map(row=>({...row,readAt:row.readAt||readAt})))}
  return <div className="notification-center"><button className="icon-button notification-trigger" onClick={()=>setOpen(!open)} aria-label={`Notifications${unread?`, ${unread} unread`:''}`}><Bell/>{unread>0&&<b>{unread>9?'9+':unread}</b>}</button>{open&&<section className="notification-popover"><header><div><h2>Notifications</h2><p>Small signals that keep your loop moving.</p></div><button onClick={()=>setOpen(false)} aria-label="Close notifications"><X/></button></header>{unread>0&&<button className="mark-all" onClick={markAll}><Check/> Mark all read</button>}<div className="notification-list">{loading?<div className="notification-loading"><LoaderCircle className="spin"/></div>:items.length?items.map(item=><button className={item.readAt?'':'unread'} key={item.id} onClick={()=>choose(item)}><span>{icon(item.type)}</span><div><strong>{item.title}</strong><p>{item.body}</p><small>{displayDate(item.createdAt)}</small></div>{!item.readAt&&<i/>}</button>):<div className="notification-empty"><Bell/><strong>All quiet for now.</strong><p>Messages, session updates, and credits will appear here.</p></div>}</div><button className="notification-view-all" onClick={()=>{setOpen(false);navigate('/notifications')}}>View all notifications</button></section>}</div>
}
