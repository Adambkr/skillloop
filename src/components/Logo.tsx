import { Link } from 'react-router-dom'

export function Logo({ compact = false }: { compact?: boolean }) {
  return <Link className="logo" to="/" aria-label="SkillLoop home"><span className="logo-mark"><i /><i /><i /></span>{!compact && <span>SkillLoop</span>}</Link>
}
