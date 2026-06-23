import { ArrowRight, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

export function EmptyState({ icon: Icon, title, description, action, to }: { icon: LucideIcon; title: string; description: string; action: string; to: string }) {
  return <div className="empty-state"><div className="empty-orbit"><span /><div><Icon size={30} /></div><span /></div><h2>{title}</h2><p>{description}</p><Link className="button button-primary" to={to}>{action}<ArrowRight size={17} /></Link></div>
}
