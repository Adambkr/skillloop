import { ArrowLeft, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'

export function FeaturePage(props: { title: string; eyebrow: string; description: string; action: string; to: string; icon: LucideIcon }) {
  return <section className="feature-page"><div className="page-heading"><div className="eyebrow">{props.eyebrow}</div><h1>{props.title}</h1><p>A focused space for the next part of your learning loop.</p></div><EmptyState icon={props.icon} title="Nothing here yet, and that’s okay." description={props.description} action={props.action} to={props.to} /></section>
}

export function NotFoundPage() {
  return <main className="not-found"><div className="logo-mark"><i /><i /><i /></div><span>404</span><h1>This path left the loop.</h1><p>The page you were looking for does not exist or may have moved.</p><Link className="button button-primary" to="/"><ArrowLeft size={18} /> Back to SkillLoop</Link></main>
}
