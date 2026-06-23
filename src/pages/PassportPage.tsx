import {
  Award,
  BookOpen,
  CalendarCheck,
  Check,
  Coins,
  FileCheck2,
  HeartHandshake,
  Languages,
  Lightbulb,
  LockKeyhole,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { SafetyActions } from "../components/SafetyActions";
import {
  loadSkillPassport,
  type PassportBadge,
  type SkillPassport,
} from "../lib/passport";

const badgeIcon = (badge: PassportBadge) =>
  badge.icon === "heart-handshake" ? (
    <HeartHandshake />
  ) : badge.icon === "calendar-check" ? (
    <CalendarCheck />
  ) : badge.icon === "lightbulb" ? (
    <Lightbulb />
  ) : badge.icon === "shield-check" ? (
    <ShieldCheck />
  ) : badge.icon === "file-check" ? (
    <FileCheck2 />
  ) : badge.icon === "languages" ? (
    <Languages />
  ) : badge.icon === "users" ? (
    <UsersRound />
  ) : (
    <Sparkles />
  );
export function PassportPage() {
  const { id } = useParams(),
    { user } = useAuth(),
    [passport, setPassport] = useState<SkillPassport | null>(null),
    [error, setError] = useState("");
  const fallback =
    user?.user_metadata?.full_name ||
    localStorage.getItem("skillloop_preview_name") ||
    "SkillLoop learner";
  useEffect(() => {
    let live = true;
    loadSkillPassport(id || user?.id, fallback)
      .then((value) => {
        if (live) setPassport(value);
      })
      .catch((err) => {
        if (live)
          setError(
            err instanceof Error
              ? err.message
              : "Could not load Skill Passport.",
          );
      });
    return () => {
      live = false;
    };
  }, [id, user?.id, fallback]);
  const topTags = useMemo(() => {
    const counts = new Map<string, number>();
    passport?.reviews.forEach((review) =>
      review.tags.forEach((tag) => counts.set(tag, (counts.get(tag) || 0) + 1)),
    );
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [passport]);
  if (!passport)
    return (
      <section className="passport-loading">
        {error ? (
          <>
            <Award />
            <h2>Passport unavailable.</h2>
            <p>{error}</p>
          </>
        ) : (
          <>
            <span />
            <span />
            <span />
          </>
        )}
      </section>
    );
  const initials = passport.profile.name
      .split(" ")
      .map((v) => v[0])
      .join("")
      .slice(0, 2)
      .toUpperCase(),
    unlocked = passport.badges.filter((b) => b.unlocked);
  return (
    <section className="skill-passport-page">
      <div className="passport-cover">
        <div className="passport-orbit orbit-one" />
        <div className="passport-orbit orbit-two" />
        <span>
          <Award /> Skill Passport
        </span>
        <small>Verified learning identity · SkillLoop 2026</small>
      </div>
      <header className="passport-identity">
        <div className="passport-avatar">
          {passport.profile.avatarUrl ? (
            <img src={passport.profile.avatarUrl} alt="" />
          ) : (
            initials
          )}
          <i>
            <Check />
          </i>
        </div>
        <div>
          <div className="eyebrow">Public learning identity</div>
          <h1>{passport.profile.name}</h1>
          <p>
            {passport.profile.bio ||
              "Learning openly, sharing generously, and building useful skills through real people."}
          </p>
          <span>
            <Languages /> {passport.profile.languages.join(", ")} ·{" "}
            {passport.profile.timezone}
          </span>
        </div>
        <div className="passport-reputation">
          <strong>
            {passport.profile.rating
              ? passport.profile.rating.toFixed(1)
              : "New"}
          </strong>
          <div>
            {[1, 2, 3, 4, 5].map((value) => (
              <Star
                key={value}
                fill={
                  value <= Math.round(passport.profile.rating)
                    ? "currentColor"
                    : "none"
                }
              />
            ))}
          </div>
          <span>{passport.profile.reputationLabel}</span>
        </div>
      </header>
      <div className="passport-stat-strip">
        <article>
          <CalendarCheck />
          <div>
            <strong>{passport.profile.sessions}</strong>
            <span>Sessions completed</span>
          </div>
        </article>
        <article>
          <Coins />
          <div>
            <strong>{passport.creditsEarned}</strong>
            <span>Credits earned</span>
          </div>
        </article>
        <article>
          <MessageCircle />
          <div>
            <strong>{passport.reviews.length}</strong>
            <span>Helpful reviews</span>
          </div>
        </article>
        <article>
          <Award />
          <div>
            <strong>{unlocked.length}</strong>
            <span>Badges unlocked</span>
          </div>
        </article>
      </div>
      <div className="passport-layout">
        <main>
          <section className="passport-section">
            <header>
              <div>
                <Lightbulb />
                <span>
                  <h2>Knowledge I share</h2>
                  <p>Skills backed by real exchanges and reviews.</p>
                </span>
              </div>
            </header>
            {passport.teach.length ? (
              <div className="passport-teach-grid">
                {passport.teach.map((skill) => (
                  <article key={skill.id}>
                    <span>{skill.name.slice(0, 2).toUpperCase()}</span>
                    <div>
                      <small>{skill.level}</small>
                      <h3>{skill.name}</h3>
                      <p>{skill.formats.join(" · ")}</p>
                    </div>
                    <b className={skill.verifiedReviews ? "verified" : ""}>
                      {skill.verifiedReviews ? (
                        <>
                          <Check /> {skill.verifiedReviews} verified
                        </>
                      ) : (
                        <>
                          <Sparkles /> New skill
                        </>
                      )}
                    </b>
                  </article>
                ))}
              </div>
            ) : (
              <div className="passport-empty">
                <Lightbulb />
                <h3>Your teaching story is waiting.</h3>
                <p>Add a skill and complete an exchange to verify it.</p>
              </div>
            )}
          </section>
          <section className="passport-section">
            <header>
              <div>
                <BookOpen />
                <span>
                  <h2>Learning journey</h2>
                  <p>Goals in motion and skills improved.</p>
                </span>
              </div>
            </header>
            {passport.learn.length ? (
              <div className="passport-learning-list">
                {passport.learn.map((skill) => (
                  <article key={skill.id}>
                    <span className={skill.completed ? "complete" : ""}>
                      {skill.completed ? <Check /> : <TrendingUp />}
                    </span>
                    <div>
                      <small>
                        {skill.completed
                          ? "IMPROVED"
                          : skill.level.toUpperCase()}
                      </small>
                      <h3>{skill.name}</h3>
                      <p>
                        {skill.goal ||
                          "Building confidence one exchange at a time."}
                      </p>
                    </div>
                    {skill.completed && <b>Milestone reached</b>}
                  </article>
                ))}
              </div>
            ) : (
              <div className="passport-empty">
                <Target />
                <h3>No learning goals yet.</h3>
                <p>Add what you want to learn to begin your journey.</p>
              </div>
            )}
          </section>
          <section className="passport-section">
            <header>
              <div>
                <MessageCircle />
                <span>
                  <h2>Review highlights</h2>
                  <p>What learning partners say after real sessions.</p>
                </span>
              </div>
              <small>{passport.reviews.length} reviews</small>
            </header>
            {passport.reviews.length ? (
              <div className="passport-reviews">
                {passport.reviews.slice(0, 4).map((review) => (
                  <article key={review.id}>
                    <div>
                      <span>
                        {review.reviewer
                          .split(" ")
                          .map((v) => v[0])
                          .join("")
                          .slice(0, 2)}
                      </span>
                      <strong>{review.reviewer}</strong>
                      <i>
                        {Array.from({ length: review.rating }, (_, i) => (
                          <Star key={i} fill="currentColor" />
                        ))}
                      </i>
                    </div>
                    <p>
                      “
                      {review.comment ||
                        "A helpful, reliable learning exchange."}
                      ”
                    </p>
                    <footer>
                      {review.tags.map((tag) => (
                        <b key={tag}>{tag}</b>
                      ))}
                      <SafetyActions compact targetType="review" targetId={review.id} />
                    </footer>
                  </article>
                ))}
              </div>
            ) : (
              <div className="passport-empty">
                <MessageCircle />
                <h3>Complete your first exchange to start building trust.</h3>
                <p>Reviews become meaningful proof of how you help.</p>
              </div>
            )}
          </section>
          <section className="passport-section timeline-section">
            <header>
              <div>
                <TrendingUp />
                <span>
                  <h2>Progress timeline</h2>
                  <p>Moments that shaped this learning identity.</p>
                </span>
              </div>
            </header>
            {passport.timeline.length ? (
              <div className="passport-timeline">
                {[...passport.timeline]
                  .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
                  .map((item, index) => (
                    <article key={`${item.title}-${index}`}>
                      <i>
                        {item.type === "badge" ? <Award /> : <CalendarCheck />}
                      </i>
                      <div>
                        <small>
                          {new Intl.DateTimeFormat("en", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          }).format(new Date(item.date))}
                        </small>
                        <h3>{item.title}</h3>
                        <p>{item.meta}</p>
                      </div>
                    </article>
                  ))}
              </div>
            ) : (
              <div className="passport-empty compact">
                <TrendingUp />
                <div>
                  <h3>Your timeline begins with a completed session.</h3>
                  <p>Each exchange adds a real milestone here.</p>
                </div>
              </div>
            )}
          </section>
        </main>
        <aside>
          <section className="passport-goal-card">
            <Target />
            <small>CURRENT LEARNING GOAL</small>
            <h2>{passport.goal || "Choose the next skill worth pursuing."}</h2>
            <p>One clear goal helps the right people find you.</p>
          </section>
          <section className="passport-trust-card">
            <header>
              <ShieldCheck />
              <div>
                <small>REPUTATION</small>
                <strong>{passport.profile.reputationLabel}</strong>
              </div>
            </header>
            <div>
              <span>
                <b>{passport.profile.responseRate}%</b>Response rate
              </span>
              <span>
                <b>{passport.profile.noShowRate}%</b>No-show rate
              </span>
              <span>
                <b>{passport.profile.rating || "—"}</b>Average rating
              </span>
            </div>
            {topTags.length ? (
              <footer>
                {topTags.map(([tag, count]) => (
                  <span key={tag}>
                    {tag} · {count}
                  </span>
                ))}
              </footer>
            ) : (
              <p>Helpful review tags will appear here.</p>
            )}
          </section>
          <section className="passport-badges-card">
            <header>
              <div>
                <Award />
                <span>
                  <h2>Badges</h2>
                  <p>
                    {unlocked.length} of {passport.badges.length} unlocked
                  </p>
                </span>
              </div>
            </header>
            <div className="passport-badge-grid">
              {passport.badges.map((badge) => (
                <article
                  className={badge.unlocked ? "unlocked" : "locked"}
                  key={badge.id}
                >
                  <span>
                    {badge.unlocked ? badgeIcon(badge) : <LockKeyhole />}
                  </span>
                  <div>
                    <strong>{badge.name}</strong>
                    <p>{badge.description}</p>
                  </div>
                  {badge.unlocked && <Check />}
                </article>
              ))}
            </div>
            {!unlocked.length && (
              <div className="badge-empty">
                Your first badge unlocks after your first completed session.
              </div>
            )}
          </section>
        </aside>
      </div>
    </section>
  );
}
