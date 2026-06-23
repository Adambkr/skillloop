import {
  ArrowDown, ArrowRight, BadgeCheck, BookOpen, CalendarDays, Check, ChevronRight,
  CircleCheck, Clock3, Coins, FileCheck2, Flag, HeartHandshake, Languages, Lightbulb,
  LockKeyhole, Menu, MessageCircleMore, Palette, Route, ShieldCheck, Sparkles, Star,
  Target, UserCheck, UsersRound, Video, WandSparkles, X, Zap,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { useAuth } from '../context/AuthContext'

const people = [
  { name: 'Adam', initials: 'AD', teach: 'UI Design', learn: 'React Native', tone: 'blue' },
  { name: 'Sara', initials: 'SA', teach: 'React Native', learn: 'English', tone: 'mint' },
  { name: 'Yassine', initials: 'YA', teach: 'English', learn: 'Branding', tone: 'yellow' },
]

const problems = [
  ['Courses feel lonely', 'You watch, take notes, and still have nobody to ask.'],
  ['Tutors can be expensive', 'Curiosity should not have to wait for payday.'],
  ['Communities get messy', 'The right answer disappears inside endless noise.'],
  ['The right person is hard to find', 'Talent is everywhere, but discovery is broken.'],
]

const solutions = [
  { n: '01', title: 'Add what you can teach', text: 'Your everyday knowledge is valuable to someone. Make it visible.', icon: Lightbulb },
  { n: '02', title: 'Add what you want to learn', text: 'Set a clear goal, from a quick question to a new craft.', icon: Target },
  { n: '03', title: 'Match, exchange, and grow', text: 'Meet the right person, share time, and keep the loop moving.', icon: HeartHandshake },
]

const modes: { title: string; text: string; example: string; icon: LucideIcon; tone: string }[] = [
  { title: 'Quick Help', text: 'A focused answer when you are stuck.', example: 'Fix a Figma auto-layout issue', icon: Zap, tone: 'yellow' },
  { title: 'Skill Swap', text: 'Trade complementary skills one-to-one.', example: 'English practice for logo feedback', icon: HeartHandshake, tone: 'mint' },
  { title: 'Learning Partner', text: 'Build consistency with a shared goal.', example: 'Weekly React Native practice', icon: UsersRound, tone: 'blue' },
  { title: 'Project Review', text: 'Get experienced eyes on real work.', example: 'Review a first mobile app prototype', icon: FileCheck2, tone: 'lilac' },
]

const circles = [
  { name: 'English speaking circle', meta: '18 active learners', icon: Languages, tone: 'yellow' },
  { name: 'UI/UX feedback club', meta: '12 projects this week', icon: Palette, tone: 'blue' },
  { name: 'React Native beginners', meta: '24 people learning', icon: BookOpen, tone: 'mint' },
  { name: 'Startup builders circle', meta: '8 sessions planned', icon: WandSparkles, tone: 'lilac' },
  { name: 'Design critique circle', meta: '16 thoughtful voices', icon: MessageCircleMore, tone: 'coral' },
]

const trust = [
  { title: 'Verified profiles', icon: UserCheck }, { title: 'Session confirmation', icon: CalendarDays },
  { title: 'Helpful reviews', icon: Star }, { title: 'No-show protection', icon: Clock3 },
  { title: 'Simple reporting', icon: Flag }, { title: 'Credit protection', icon: LockKeyhole },
]

function PersonCard({ person, className }: { person: typeof people[number]; className: string }) {
  return <article className={`lp-person ${className}`}>
    <div className={`lp-avatar tone-${person.tone}`}>{person.initials}<span><CircleCheck /></span></div>
    <div className="lp-person-name"><strong>{person.name}</strong><small>SkillLoop member</small></div>
    <div className="lp-skill-row"><span>Can teach</span><b>{person.teach}</b></div>
    <div className="lp-skill-row"><span>Wants to learn</span><b>{person.learn}</b></div>
  </article>
}

export function LandingPage() {
  const [menu, setMenu] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const {isAuthenticated,onboardingComplete}=useAuth()
  const memberPath=onboardingComplete?'/dashboard':'/onboarding'
  const startPath=isAuthenticated?memberPath:'/signup'

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const elements = document.querySelectorAll<HTMLElement>('.lp-reveal')
    if (!('IntersectionObserver' in window)) { elements.forEach((el) => el.classList.add('is-visible')); return }
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target) }
    }), { threshold: 0.12 })
    elements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  const closeMenu = () => setMenu(false)

  return <div className="lp-page">
    <header className={`lp-header${scrolled ? ' lp-scrolled' : ''}`}>
      <div className="container lp-nav">
        <Logo />
        <nav id="landing-navigation" className={menu ? 'is-open' : ''} aria-label="Main navigation">
          <a href="#how" onClick={closeMenu}>How it works</a>
          <a href="#credits" onClick={closeMenu}>Skill Credits</a>
          <a href="#circles" onClick={closeMenu}>Circles</a>
          <Link to="/discover" onClick={closeMenu}>Explore</Link>
          <span className="lp-nav-divider" />
          {isAuthenticated?<Link to={memberPath} onClick={closeMenu}>Learning Hub</Link>:<Link to="/login" onClick={closeMenu}>Login</Link>}
          <Link className="button button-primary button-small" to={startPath} onClick={closeMenu}>{isAuthenticated?'Open SkillLoop':'Start Free'} <ArrowRight /></Link>
        </nav>
        <button className="lp-menu-button" onClick={() => setMenu(!menu)} aria-expanded={menu} aria-controls="landing-navigation" aria-label="Toggle navigation">{menu ? <X /> : <Menu />}</button>
      </div>
    </header>

    <main>
      <section className="lp-hero container">
        <div className="lp-hero-copy">
          <div className="lp-kicker"><span><Sparkles /></span> Learn through people, not playlists</div>
          <h1>Your knowledge is <em>your currency.</em></h1>
          <p>SkillLoop helps you exchange skills with real people. Teach what you know, earn credits, and use them to learn anything from others.</p>
          <div className="lp-hero-actions">
            <Link className="button button-primary lp-big-button" to={startPath}>Start Your SkillLoop <ArrowRight /></Link>
            <a className="button lp-outline-button lp-big-button" href="#how">See How It Works <ArrowDown /></a>
          </div>
          <div className="lp-proof"><span className="lp-mini-avatars"><i>MK</i><i>JL</i><i>NS</i><i>+2k</i></span><p><strong>Real people. Useful skills.</strong><span><Star fill="currentColor" /> Built for generous learners</span></p></div>
        </div>
        <div className="lp-exchange-visual" aria-label="Adam, Sara, and Yassine exchanging skills">
          <div className="lp-path lp-path-one" /><div className="lp-path lp-path-two" /><div className="lp-path lp-path-three" />
          <PersonCard person={people[0]} className="person-adam" />
          <PersonCard person={people[1]} className="person-sara" />
          <PersonCard person={people[2]} className="person-yassine" />
          <div className="lp-floating-credit credit-one"><Coins /><strong>+1</strong><span>Skill Credit</span></div>
          <div className="lp-floating-credit credit-two"><Coins /><strong>Use 1</strong><span>to learn</span></div>
          <div className="lp-loop-caption"><span><Check /></span> Help someone <ChevronRight /> earn credits <ChevronRight /> learn from anyone</div>
        </div>
      </section>

      <section className="lp-problem lp-section" id="problem">
        <div className="container lp-reveal">
          <div className="lp-section-intro lp-intro-left"><div className="lp-eyebrow">The old way</div><h2>Learning alone is hard.</h2><p>We have never had more information, yet finding the right human help still feels harder than it should.</p></div>
          <div className="lp-problem-layout">
            <div className="lp-problem-quote"><span>“</span><p>Somewhere, someone knows exactly what you need. And you know something they need too.</p><div><i /><strong>SkillLoop starts there.</strong></div></div>
            <div className="lp-problem-list">{problems.map(([title, text], i) => <article key={title}><span>0{i + 1}</span><div><h3>{title}</h3><p>{text}</p></div></article>)}</div>
          </div>
        </div>
      </section>

      <section className="lp-section container lp-reveal" id="how">
        <div className="lp-section-intro"><div className="lp-eyebrow">A fairer way forward</div><h2>SkillLoop turns knowledge into a fair exchange.</h2><p>No follower counts. No awkward pricing. Just useful people helping each other move forward.</p></div>
        <div className="lp-solution-grid">{solutions.map(({ n, title, text, icon: Icon }) => <article key={n}><div className="lp-solution-top"><span>{n}</span><i><Icon /></i></div><h3>{title}</h3><p>{text}</p><div className="lp-card-line" /></article>)}</div>
      </section>

      <section className="lp-credit-section lp-section" id="credits">
        <div className="container lp-reveal">
          <div className="lp-credit-heading"><div><div className="lp-eyebrow">One simple currency</div><h2>Time given becomes opportunity earned.</h2></div><p>Skill Credits keep every exchange flexible. Help one person today, learn from someone completely different tomorrow.</p></div>
          <div className="lp-credit-flow">
            <article><span className="lp-flow-icon"><Clock3 /></span><small>STEP 1</small><h3>Help for 30 minutes</h3><p>Share focused, useful time with another member.</p></article>
            <div className="lp-flow-arrow"><ArrowRight /><span>confirm session</span></div>
            <article className="lp-flow-featured"><span className="lp-flow-icon"><Coins /></span><small>STEP 2</small><h3>Earn 1 Skill Credit</h3><p>Your balance updates when both people confirm.</p></article>
            <div className="lp-flow-arrow"><ArrowRight /><span>choose a skill</span></div>
            <article><span className="lp-flow-icon"><BookOpen /></span><small>STEP 3</small><h3>Learn from anyone</h3><p>Spend your credit wherever curiosity takes you.</p></article>
          </div>
          <div className="lp-credit-note"><ShieldCheck /><span><strong>Your credits stay protected.</strong> They move only after a confirmed exchange.</span></div>
        </div>
      </section>

      <section className="lp-match-section lp-section container lp-reveal">
        <div className="lp-match-copy"><div className="lp-eyebrow">Smart matching, human choice</div><h2>Meet the person who fits your next step.</h2><p>SkillLoop looks beyond skill names. Goals, format, availability, experience, and learning style all shape a more useful match.</p><ul><li><Check /> Complementary skills</li><li><Check /> Shared availability</li><li><Check /> A format that fits the goal</li></ul><Link to="/discover">Explore possible matches <ArrowRight /></Link></div>
        <div className="lp-match-stage">
          <div className="lp-match-card">
            <div className="lp-match-card-head"><div><span>SA</span><p><strong>Sara A.</strong><small>Verified member · Rabat</small></p></div><b>94% <small>Match</small></b></div>
            <div className="lp-match-skills"><div><small>You teach</small><strong>Logo Design</strong></div><i><HeartHandshake /></i><div><small>They teach</small><strong>React Native</strong></div></div>
            <div className="lp-match-details"><span><Video /><small>Best format</small><strong>Project Review</strong></span><span><CalendarDays /><small>Available</small><strong>Today, 6:30 PM</strong></span></div>
            <Link className="lp-match-action" to="/discover">View match <ArrowRight /></Link>
          </div>
          <span className="lp-match-chip chip-one"><Sparkles /> Goals align</span><span className="lp-match-chip chip-two"><Clock3 /> 30 min</span>
        </div>
      </section>

      <section className="lp-modes lp-section">
        <div className="container lp-reveal"><div className="lp-section-intro lp-intro-left"><div className="lp-eyebrow">Learn your way</div><h2>One loop. Four ways to exchange.</h2><p>Choose the kind of help that makes sense right now.</p></div>
          <div className="lp-mode-grid">{modes.map(({ title, text, example, icon: Icon, tone }) => <article key={title}><i className={`tone-${tone}`}><Icon /></i><h3>{title}</h3><p>{text}</p><div><span>For example</span><strong>{example}</strong></div></article>)}</div>
        </div>
      </section>

      <section className="lp-passport lp-section container lp-reveal">
        <div className="lp-passport-card">
          <div className="lp-passport-copy"><div className="lp-eyebrow">Your Skill Passport</div><h2>Let every exchange become proof of growth.</h2><p>Your public learning identity grows with you. It shows not just what you claim to know, but how you have helped, learned, and improved real work.</p><div className="lp-passport-points"><span><Check /> Skills taught</span><span><Check /> Skills learned</span><span><Check /> Credits earned</span><span><Check /> Trusted reviews</span><span><Check /> Badges unlocked</span><span><Check /> Projects improved</span></div><Link className="button lp-outline-button" to="/passport">See the Skill Passport <ArrowRight /></Link></div>
          <div className="lp-passport-preview"><div className="lp-passport-head"><div className="lp-avatar tone-mint">MA<span><BadgeCheck /></span></div><div><h3>Maya Amrani</h3><p>Designer, curious builder</p><span>Casablanca · Joined 2026</span></div></div><div className="lp-passport-stats"><span><strong>12</strong><small>taught</small></span><span><strong>8</strong><small>learned</small></span><span><strong>4.9</strong><small>rating</small></span></div><div className="lp-passport-skill"><span><Palette /> UI Design</span><b>Top teacher</b></div><div className="lp-passport-skill"><span><BookOpen /> React Native</span><b className="learning">Learning</b></div><div className="lp-badges"><i><HeartHandshake /></i><i><Star /></i><i><Route /></i><p><strong>3 badges earned</strong><span>Generous guide · Great reviewer · 10 sessions</span></p></div></div>
        </div>
      </section>

      <section className="lp-circles lp-section" id="circles">
        <div className="container lp-reveal"><div className="lp-circles-heading"><div><div className="lp-eyebrow">Learning Circles</div><h2>Small groups. Shared momentum.</h2></div><p>Join focused communities where people show up for the same goal, know each other by name, and learn by doing.</p></div>
          <div className="lp-circle-list">{circles.map(({ name, meta, icon: Icon, tone }, i) => <article key={name}><i className={`tone-${tone}`}><Icon /></i><div><h3>{name}</h3><p>{meta}</p></div><span className="lp-circle-faces"><b>{i + 2}A</b><b>{i + 3}M</b><b>+{i + 6}</b></span><ChevronRight /></article>)}</div><Link className="lp-text-link" to="/circles">Explore all learning circles <ArrowRight /></Link>
        </div>
      </section>

      <section className="lp-trust lp-section container lp-reveal">
        <div className="lp-trust-panel"><div className="lp-trust-copy"><span><ShieldCheck /></span><div className="lp-eyebrow">Trust is part of the product</div><h2>Exchange with confidence.</h2><p>Clear safeguards keep your time, credits, and community experience protected from the first request to the final review.</p></div><div className="lp-trust-grid">{trust.map(({ title, icon: Icon }) => <article key={title}><i><Icon /></i><span>{title}</span><Check /></article>)}</div></div>
      </section>

      <section className="lp-final container lp-reveal"><div className="lp-final-card"><div className="lp-final-orbit orbit-a" /><div className="lp-final-orbit orbit-b" /><span className="lp-final-icon icon-a"><Palette /></span><span className="lp-final-icon icon-b"><Languages /></span><span className="lp-final-icon icon-c"><BookOpen /></span><div><div className="lp-eyebrow">Your next skill is closer than you think</div><h2>Ready to learn without money?</h2><p>Bring what you know. Leave with what you need.</p><Link className="button lp-final-button" to={startPath}>{isAuthenticated?'Continue your SkillLoop':'Create your SkillLoop profile'} <ArrowRight /></Link><small>Free to join · Start with 2 welcome credits</small></div></div></section>
    </main>

    <footer className="lp-footer"><div className="container"><div><Logo /><p>Teach what you know. Learn what you need.</p></div><nav><a href="#how">How it works</a><a href="#credits">Skill Credits</a><a href="#circles">Circles</a><Link to="/discover">Explore</Link><Link to="/terms">Terms</Link><Link to="/privacy">Privacy</Link></nav><span>© 2026 SkillLoop</span></div></footer>
  </div>
}
