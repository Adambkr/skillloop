import { BookOpen, Check, Lightbulb, Trash2, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import type { SkillItem } from '../lib/skillProfile'
import { DEFAULT_FORMAT, EXCHANGE_FORMATS } from '../lib/formats'
import { FilterSelect } from './FilterSelect'

const teachLevels=[{value:'beginner',label:'Beginner friendly'},{value:'intermediate',label:'Intermediate'},{value:'advanced',label:'Advanced'}]
const learnLevels=[{value:'curious',label:'Just starting'},{value:'beginner',label:'Beginner'},{value:'intermediate',label:'Intermediate'},{value:'advanced',label:'Advanced'}]
const urgencyOptions=[{value:'Today',label:'Today'},{value:'This week',label:'This week'},{value:'Long-term',label:'Long-term'}]
const formatOptions=EXCHANGE_FORMATS.map(f=>({value:f,label:f}))

type Props = {
  kind:'teach'|'learn'
  initial?:SkillItem
  onClose:()=>void
  onSave:(skill:SkillItem)=>void
  onDelete?:()=>void
}

export function SkillModal({ kind, initial, onClose, onSave, onDelete }:Props) {
  const isTeach=kind==='teach'
  const [skill,setSkill]=useState<SkillItem>(initial||{name:'',level:isTeach?'beginner':'curious',format:DEFAULT_FORMAT,description:'',goal:'',urgency:'This week'})
  function submit(e:FormEvent){e.preventDefault();if(!skill.name.trim()||(!isTeach&&!skill.goal?.trim()))return;onSave({...skill,name:skill.name.trim()})}
  return <div className="skill-modal-backdrop" role="presentation" onMouseDown={e=>e.target===e.currentTarget&&onClose()}>
    <section className="skill-modal" role="dialog" aria-modal="true" aria-label={`${initial?'Edit':'Add'} skill`}>
      <header><span>{isTeach?<Lightbulb/>:<BookOpen/>}</span><div><div className="eyebrow">{isTeach?'Share your knowledge':'Follow your curiosity'}</div><h2>{initial?'Edit':'Add'} {isTeach?'a teach skill':'a learning skill'}</h2></div><button type="button" onClick={onClose} aria-label="Close skill editor"><X/></button></header>
      <form onSubmit={submit}>
        <label>Skill name<input value={skill.name} onChange={e=>setSkill({...skill,name:e.target.value})} placeholder={isTeach?'e.g. UI Design':'e.g. React Native'} autoFocus required /></label>
        <div className="skill-modal-grid"><FilterSelect label={isTeach?'Your level':'Current level'} value={skill.level} options={isTeach?teachLevels:learnLevels} onChange={level=>setSkill({...skill,level})}/><FilterSelect label="Best format" value={skill.format} options={formatOptions} onChange={format=>setSkill({...skill,format})}/></div>
        {isTeach?<label>What can you help with?<textarea value={skill.description} onChange={e=>setSkill({...skill,description:e.target.value})} placeholder="What should someone ask you about?" /></label>:<><label>What is your goal?<textarea value={skill.goal} onChange={e=>setSkill({...skill,goal:e.target.value})} placeholder="What would progress look like?" required /></label><FilterSelect label="Urgency" value={skill.urgency||'This week'} options={urgencyOptions} onChange={urgency=>setSkill({...skill,urgency})}/>{initial&&<label className="skill-complete-toggle"><input type="checkbox" checked={Boolean(skill.completed)} onChange={e=>setSkill({...skill,completed:e.target.checked})}/><span><Check/></span>Mark this learning skill as improved</label>}</>}
<div className="skill-modal-actions">{initial&&onDelete&&<button className="skill-delete" type="button" onClick={onDelete}><Trash2/> Delete skill</button>}<button type="button" onClick={onClose}>Cancel</button><button className="button button-primary"><Check/> {initial?'Save changes':isTeach?'Add teach skill':'Add learning skill'}</button></div>
      </form>
    </section>
  </div>
}
