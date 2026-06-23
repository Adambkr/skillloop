import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowRight,
  Award,
  BookOpen,
  Check,
  Coins,
  HeartHandshake,
  Languages,
  Lightbulb,
  LoaderCircle,
  MessageCircle,
  Share2,
  Sparkles,
  Star,
  Target,
  UsersRound,
} from "lucide-react";
import { Logo } from "../components/Logo";
import { useAuth } from "../context/AuthContext";
import {
  loadPublicHelpRequest,
  loadPublicPassport,
  type PublicHelpRequest,
} from "../lib/growth";
import type { SkillPassport } from "../lib/passport";

async function shareCurrentPage(title:string){if(navigator.share){await navigator.share({title,url:window.location.href});return}try{await navigator.clipboard.writeText(window.location.href)}catch{window.prompt("Copy this link:",window.location.href)}}

export function PublicPassportPage() {
  const { username = "" } = useParams(),
    [passport, setPassport] = useState<SkillPassport | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    loadPublicPassport(username)
      .then(setPassport)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Passport unavailable."),
      );
  }, [username]);
  if (!passport) return <PublicLoading error={error} />;
  const p = passport.profile,
    initials = p.name
      .split(" ")
      .map((v) => v[0])
      .join("")
      .slice(0, 2),
    topTags = [
      ...new Set(passport.reviews.flatMap((review) => review.tags)),
    ].slice(0, 4);
  return (
    <main className="public-share-page">
      <PublicNav />
      <section className="public-passport-hero">
        <div className="public-passport-orbit" />
        <div className="public-avatar">
          {p.avatarUrl ? <img src={p.avatarUrl} alt="" /> : initials}
          <i>
            <Check />
          </i>
        </div>
        <div>
          <span className="public-kicker">
            <Award /> SkillLoop Skill Passport
          </span>
          <h1>{p.name}</h1>
          <p>
            {p.bio ||
              "Sharing useful knowledge and learning in public with real people."}
          </p>
          <div className="public-profile-meta">
            <span>
              <Languages /> {p.languages.join(", ")}
            </span>
            <span>
              <Star /> {p.rating ? p.rating.toFixed(1) : "New"} reputation
            </span>
            <span>
              <HeartHandshake /> {p.sessions} exchanges
            </span>
          </div>
        </div>
        <aside>
          <strong>{p.reputationLabel}</strong>
          <p>A learning identity built from helpfulness, not followers.</p>
          <button onClick={() => shareCurrentPage(`${p.name}'s Skill Passport`)}>
            <Share2 /> Share Passport
          </button>
        </aside>
      </section>
      <section className="public-passport-grid">
        <main>
          <section>
            <header>
              <Lightbulb />
              <div>
                <h2>Knowledge I can share</h2>
                <p>Practical help offered to the SkillLoop community.</p>
              </div>
            </header>
            <div className="public-skill-grid">
              {passport.teach.map((skill) => (
                <article key={skill.id}>
                  <span>{skill.name.slice(0, 2).toUpperCase()}</span>
                  <div>
                    <small>{skill.level}</small>
                    <h3>{skill.name}</h3>
                    <p>{skill.formats.join(" · ")}</p>
                  </div>
                  {skill.verifiedReviews > 0 && (
                    <b>
                      <Check /> Verified by reviews
                    </b>
                  )}
                </article>
              ))}
            </div>
          </section>
          <section>
            <header>
              <BookOpen />
              <div>
                <h2>What I am learning</h2>
                <p>Goals that make the next useful connection clear.</p>
              </div>
            </header>
            <div className="public-learning-list">
              {passport.learn.map((skill) => (
                <article key={skill.id}>
                  <Target />
                  <div>
                    <h3>{skill.name}</h3>
                    <p>
                      {skill.goal ||
                        "Building real confidence through practice."}
                    </p>
                  </div>
                  {skill.completed && <b>Improved</b>}
                </article>
              ))}
            </div>
          </section>
          <section>
            <header>
              <MessageCircle />
              <div>
                <h2>What partners say</h2>
                <p>Reviews from completed learning exchanges.</p>
              </div>
            </header>
            {passport.reviews.length ? (
              <div className="public-review-grid">
                {passport.reviews.slice(0, 4).map((review) => (
                  <article key={review.id}>
                    <div>
                      <strong>{review.reviewer}</strong>
                      <span>
                        {Array.from({ length: review.rating }, (_, i) => (
                          <Star key={i} fill="currentColor" />
                        ))}
                      </span>
                    </div>
                    <p>
                      “{review.comment || "A thoughtful and helpful exchange."}”
                    </p>
                    <footer>
                      {review.tags.map((tag) => (
                        <b key={tag}>{tag}</b>
                      ))}
                    </footer>
                  </article>
                ))}
              </div>
            ) : (
              <div className="public-empty">
                Their first public review will appear after a completed
                exchange.
              </div>
            )}
          </section>
        </main>
        <aside>
          <section className="public-passport-stats">
            <span>
              <strong>{p.sessions}</strong>
              <small>Sessions</small>
            </span>
            <span>
              <strong>{passport.creditsEarned}</strong>
              <small>Credits earned</small>
            </span>
            <span>
              <strong>
                {passport.badges.filter((b) => b.unlocked).length}
              </strong>
              <small>Badges</small>
            </span>
          </section>
          <section className="public-trust-card">
            <Sparkles />
            <small>LEARNING GOAL</small>
            <h2>
              {passport.goal || "Keep learning through useful exchanges."}
            </h2>
            <div>
              {topTags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          </section>
        </aside>
      </section>
      <PublicCTA name={p.name} />
    </main>
  );
}

export function PublicHelpPage() {
  const { slug = "" } = useParams(),
    {user}=useAuth(),
    [request, setRequest] = useState<PublicHelpRequest | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    loadPublicHelpRequest(slug)
      .then(setRequest)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Request unavailable."),
      );
  }, [slug]);
  if (!request) return <PublicLoading error={error} />;
  const member=Boolean(user||localStorage.getItem('skillloop_preview_name'))
  return (
    <main className="public-share-page public-help-page">
      <PublicNav />
      <section className="public-help-card">
        <span className="public-kicker">
          <Sparkles /> A SkillLoop help request
        </span>
        <div className="public-help-person">
          <span>
            {request.owner.name
              .split(" ")
              .map((v) => v[0])
              .join("")
              .slice(0, 2)}
          </span>
          <div>
            <strong>{request.owner.name}</strong>
            <small>
              {request.owner.reputationLabel} · {request.owner.sessions}{" "}
              exchanges
            </small>
          </div>
        </div>
        <h1>
          I need help with <em>{request.neededSkill}.</em>
        </h1>
        {request.offeredSkill && (
          <div className="public-help-exchange">
            <span>
              <small>I WANT TO LEARN</small>
              <strong>{request.neededSkill}</strong>
            </span>
            <HeartHandshake />
            <span>
              <small>I CAN HELP WITH</small>
              <strong>{request.offeredSkill}</strong>
            </span>
          </div>
        )}
        <blockquote>{request.message}</blockquote>
        <div className="public-help-actions">
          <Link className="button button-primary" to={member?`/profile/${request.owner.id}`:`/signup?request=${request.slug}`}>
            {member?'View profile & offer help':'Join to offer help'} <ArrowRight />
          </Link>
          <Link to={`/u/${request.owner.username}`}>
            View {request.owner.name.split(" ")[0]}'s Skill Passport
          </Link>
        </div>
        <p className="public-help-safety">
          <Check /> SkillLoop keeps messages, sessions, and credits protected
          inside the platform.
        </p>
      </section>
      <section className="public-help-story">
        <div>
          <UsersRound />
          <h2>Real people. Useful knowledge.</h2>
          <p>
            Teach what you know, earn credits, and use them to learn from
            someone else.
          </p>
        </div>
        <div>
          <Coins />
          <h2>Money is not the barrier.</h2>
          <p>
            Your time and helpfulness become the currency that keeps learning
            moving.
          </p>
        </div>
        <div>
          <Award />
          <h2>Trust grows through action.</h2>
          <p>
            Completed exchanges build a Skill Passport based on reliability and
            clarity.
          </p>
        </div>
      </section>
    </main>
  );
}

function PublicNav() {
  return (
    <header className="public-share-nav">
      <Logo />
      <nav>
        <Link to="/">How it works</Link>
        <Link to="/login">Log in</Link>
        <Link className="button button-primary" to="/signup">
          Start free
        </Link>
      </nav>
    </header>
  );
}
function PublicCTA({ name }: { name: string }) {
  return (
    <section className="public-join-cta">
      <span>
        <Coins />
      </span>
      <div>
        <small>KNOWLEDGE IS YOUR CURRENCY</small>
        <h2>Join SkillLoop and exchange skills with {name.split(" ")[0]}.</h2>
        <p>Bring one thing you know. Leave with something new.</p>
      </div>
      <Link className="button button-primary" to="/signup">
        Create my learning identity <ArrowRight />
      </Link>
    </section>
  );
}
function PublicLoading({ error }: { error: string }) {
  return (
    <main className="public-loading">
      <Logo />
      {error ? (
        <>
          <Award />
          <h1>{error}</h1>
          <Link to="/">Return to SkillLoop</Link>
        </>
      ) : (
        <>
          <LoaderCircle className="spin" />
          <p>Opening this learning identity…</p>
        </>
      )}
    </main>
  );
}
