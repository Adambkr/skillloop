import {
  ArrowRight,
  Award,
  BookOpen,
  Check,
  ChevronRight,
  CircleDot,
  Clock3,
  Coins,
  Compass,
  Edit3,
  HeartHandshake,
  Lightbulb,
  LoaderCircle,
  MessageCircle,
  Plus,
  Sparkles,
  Star,
  Target,
  Trash2,
  TrendingUp,
  UserRound,
  UsersRound,
  Video,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SkillModal } from "../components/SkillModal";
import { ActivationPanel } from "../components/ActivationPanel";
import { useAuth } from "../context/AuthContext";
import {
  loadLocalProfile,
  loadRemoteProfile,
  saveSkillProfile,
  type SkillItem,
  type SkillProfile,
} from "../lib/skillProfile";
import { isSupabaseConfigured } from "../lib/supabase";
import { loadCirclesWorkspace, type CircleSummary } from "../lib/circles";
export function DashboardPage() {
  const { user } = useAuth(),
    fallback =
      user?.user_metadata?.full_name ||
      localStorage.getItem("skillloop_preview_name") ||
      "SkillLoop learner";
  const [profile, setProfile] = useState<SkillProfile>(() =>
      loadLocalProfile(user?.id, fallback),
    ),
    [modal, setModal] = useState<{
      kind: "teach" | "learn";
      index?: number;
    } | null>(null),
    [notice, setNotice] = useState(""),
    [circles, setCircles] = useState<CircleSummary[]>([]),
    [circlesLoading, setCirclesLoading] = useState(true);
  useEffect(() => {
    if (user?.id) loadRemoteProfile(user.id, fallback).then(setProfile);
  }, [user?.id, fallback]);
  useEffect(() => {
    let live = true;
    loadCirclesWorkspace()
      .then((data) => { if (live) { setCircles(data.circles.slice(0, 3)); setCirclesLoading(false); } })
      .catch(() => { if (live) setCirclesLoading(false); });
    return () => { live = false };
  }, []);
  const firstName = profile.full_name.split(" ")[0],
    hasProfile = profile.teach.length > 0 || profile.learn.length > 0;
  async function commit(next: SkillProfile, message: string) {
    setProfile(next);
    setNotice("Saving…");
    try {
      await saveSkillProfile(next, user?.id);
      setNotice(message);
      window.setTimeout(() => setNotice(""), 2200);
    } catch {
      setNotice("Could not save that change. Try again.");
    }
  }
  function saveSkill(skill: SkillItem) {
    if (!modal) return;
    const list = [...profile[modal.kind]];
    if (modal.index === undefined)
      list.push({ ...skill, id: crypto.randomUUID() });
    else list[modal.index] = skill;
    commit({ ...profile, [modal.kind]: list }, "Skill saved");
    setModal(null);
  }
  function removeSkill(kind: "teach" | "learn", index: number) {
    if (!window.confirm("Remove this skill from your profile?")) return;
    commit(
      { ...profile, [kind]: profile[kind].filter((_, i) => i !== index) },
      "Skill removed",
    );
  }
  const demoMatch = {
    id: "preview",
    name: "Sara Amrani",
    initials: "SA",
    score: 94,
    helpsWith: profile.learn[0]?.name || "React Native",
    wantsHelpWith: profile.teach[0]?.name || "UI Design",
    availability: "Available this evening",
    format: "30 min project review",
  };
  const match =
      profile.bestMatch || (!isSupabaseConfigured ? demoMatch : undefined),
    matchLearn = match?.helpsWith || profile.learn[0]?.name || "your goal",
    matchTeach = match?.wantsHelpWith || profile.teach[0]?.name || "your skill";
  return (
    <section className="hub-dashboard">
      {notice && (
        <div
          className={`hub-toast ${notice.startsWith("Could") ? "error" : ""}`}
        >
          {notice === "Saving…" ? <CircleDot /> : <Check />}
          {notice}
        </div>
      )}
      <header className="hub-welcome">
        <div>
          <div className="eyebrow">Your learning loop</div>
          <h1>Welcome back, {firstName}.</h1>
          <p>Ready to exchange knowledge today?</p>
        </div>
        <div className="hub-header-actions">
          <Link to="/profile" className="hub-profile-link">
            <UserRound /> View my skill profile
          </Link>
          <Link to="/discover" className="button button-primary">
            <Compass /> Find people
          </Link>
        </div>
      </header>
      <div className="hub-snapshot">
        <article className="snapshot-goal">
          <span>
            <Target />
          </span>
          <div>
            <small>MAIN LEARNING GOAL</small>
            <strong>
              {profile.goal || "Add a goal to focus your matches"}
            </strong>
          </div>
          <Link to="/profile" aria-label="Edit main learning goal">
            <Edit3 />
          </Link>
        </article>
        <article>
          <span>
            <Coins />
          </span>
          <div>
            <small>SKILL CREDITS</small>
            <strong>{profile.credits.available} available</strong>
          </div>
        </article>
        <article>
          <span>
            <Sparkles />
          </span>
          <div>
            <small>PROFILE</small>
            <strong>{profile.profileCompletion}% complete</strong>
          </div>
          <i>
            <b style={{ width: `${profile.profileCompletion}%` }} />
          </i>
        </article>
      </div>
      <ActivationPanel profile={profile} userId={user?.id} />
      <div className="hub-feature-row">
        {match ? (
          <article className="best-match-card">
            <div className="match-ribbon">
              <Sparkles />{" "}
              {isSupabaseConfigured
                ? "TODAY'S BEST MATCH"
                : "PREVIEW RECOMMENDATION"}
            </div>
            <div className="best-match-main">
              <div className="match-person">
                <span>
                  {match.initials}
                  <i />
                </span>
                <div>
                  <h2>{match.name}</h2>
                  <p>
                    {isSupabaseConfigured
                      ? "SkillLoop member"
                      : "Example match · Preview mode"}
                  </p>
                </div>
                <b>
                  {match.score}%<small>match</small>
                </b>
              </div>
              <div className="match-exchange">
                <span>
                  <small>CAN HELP YOU WITH</small>
                  <strong>{matchLearn}</strong>
                </span>
                <HeartHandshake />
                <span>
                  <small>WANTS HELP WITH</small>
                  <strong>{matchTeach}</strong>
                </span>
              </div>
              <div className="match-availability">
                <Clock3 />
                <span>
                  <strong>{match.availability}</strong>
                  <small>{match.format}</small>
                </span>
              </div>
            </div>
            <div className="best-match-actions">
              <div className="match-reasons">
                <span>Goals align</span>
                <span>Skills complement</span>
                <span>Worth exploring</span>
              </div>
              <Link className="button button-primary" to="/discover">
                Open this match <ArrowRight />
              </Link>
            </div>
          </article>
        ) : (
          <article className="best-match-card empty-best-match">
            <Compass />
            <div>
              <div className="match-ribbon">MATCHING IN PROGRESS</div>
              <h2>We’re preparing your matches.</h2>
              <p>Add more skills to improve your results.</p>
              <Link to="/profile">
                Improve my profile <ArrowRight />
              </Link>
            </div>
          </article>
        )}
        <aside className="wallet-card">
          <div className="wallet-head">
            <span>
              <Coins />
            </span>
            <div>
              <small>MY SKILL WALLET</small>
              <strong>{profile.credits.available}</strong>
            </div>
            <Link to="/wallet">
              History <ArrowRight />
            </Link>
          </div>
          <div className="wallet-metrics">
            <span>
              <small>Earned</small>
              <strong>+{profile.credits.earned}</strong>
            </span>
            <span>
              <small>Spent</small>
              <strong>{profile.credits.spent}</strong>
            </span>
            <span>
              <small>Pending</small>
              <strong>{profile.credits.pending}</strong>
            </span>
          </div>
          <p>
            {profile.credits.available
              ? "Help others to earn more credits and keep your loop moving."
              : "Help someone today to earn your first Skill Credit."}
          </p>
        </aside>
      </div>
      <section className="hub-section">
        <div className="hub-section-head">
          <div>
            <span className="section-icon teach">
              <Lightbulb />
            </span>
            <h2>Skills I can teach</h2>
            <p>The knowledge you bring to the loop.</p>
          </div>
          <button onClick={() => setModal({ kind: "teach" })}>
            <Plus /> Add skill
          </button>
        </div>
        {profile.teach.length ? (
          <div className="hub-skill-grid">
            {profile.teach.map((skill, index) => (
              <article
                className="hub-skill-card teach-card"
                key={skill.id || skill.name}
              >
                <header>
                  <span>{skill.name.slice(0, 2).toUpperCase()}</span>
                  <div>
                    <small>{skill.level.replace("_", " ")}</small>
                    <h3>{skill.name}</h3>
                  </div>
                  <div className="skill-card-actions">
                    <button
                      onClick={() => setModal({ kind: "teach", index })}
                      aria-label="Edit skill"
                    >
                      <Edit3 />
                    </button>
                    <button
                      onClick={() => removeSkill("teach", index)}
                      aria-label="Delete skill"
                    >
                      <Trash2 />
                    </button>
                  </div>
                </header>
                <p>
                  {skill.description ||
                    `Friendly, practical help with ${skill.name}.`}
                </p>
                <div className="skill-format">
                  <Video /> {skill.format}
                </div>
                <footer>
                  <span>
                    <UsersRound />
                    <b>{skill.peopleHelped || 0}</b> helped
                  </span>
                  <span>
                    <Star />
                    <b>{skill.rating ? skill.rating.toFixed(1) : "New"}</b>
                  </span>
                </footer>
              </article>
            ))}
          </div>
        ) : (
          <div className="hub-empty-inline">
            <Lightbulb />
            <div>
              <h3>What could you help someone learn?</h3>
              <p>Add your first teach skill to become discoverable.</p>
            </div>
            <button onClick={() => setModal({ kind: "teach" })}>
              Add a skill
            </button>
          </div>
        )}
      </section>
      <section className="hub-section">
        <div className="hub-section-head">
          <div>
            <span className="section-icon learn">
              <BookOpen />
            </span>
            <h2>Skills I want to learn</h2>
            <p>Where your curiosity is taking you.</p>
          </div>
          <button onClick={() => setModal({ kind: "learn" })}>
            <Plus /> Add skill
          </button>
        </div>
        {profile.learn.length ? (
          <div className="hub-learn-list">
            {profile.learn.map((skill, index) => (
              <article
                className={`hub-learn-card ${skill.completed ? "completed" : ""}`}
                key={skill.id || skill.name}
              >
                <div className="learn-skill-mark">
                  <BookOpen />
                </div>
                <div className="learn-skill-copy">
                  <small>
                    {skill.level} · {skill.format}
                  </small>
                  <h3>{skill.name}</h3>
                  <p>{skill.goal || `Build confidence in ${skill.name}.`}</p>
                </div>
                <div className="suggested-count">
                  <UsersRound />
                  <strong>{skill.matches ?? 0}</strong>
                  <small>suggested matches</small>
                </div>
                <div className="learn-actions">
                  <button onClick={() => setModal({ kind: "learn", index })}>
                    <Edit3 /> Edit
                  </button>
                  <button
                    onClick={() =>
                      commit(
                        {
                          ...profile,
                          learn: profile.learn.map((s, i) =>
                            i === index ? { ...s, completed: !s.completed } : s,
                          ),
                        },
                        skill.completed
                          ? "Moved back to learning"
                          : "Skill marked complete",
                      )
                    }
                  >
                    <Check /> {skill.completed ? "Reopen" : "Mark completed"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="hub-empty-inline">
            <BookOpen />
            <div>
              <h3>What would you love to learn next?</h3>
              <p>Add a learning skill to improve your recommendations.</p>
            </div>
            <button onClick={() => setModal({ kind: "learn" })}>
              Add a skill
            </button>
          </div>
        )}
      </section>
      <div className="hub-lower-grid">
        <section className="request-panel">
          <div className="hub-section-head compact">
            <div>
              <h2>Active requests</h2>
              <p>Conversations waiting for your next move.</p>
            </div>
            <Link to="/requests">
              View all <ArrowRight />
            </Link>
          </div>
          <div className="request-tabs">
            <button className="active">
              Incoming <b>{profile.requests.incoming}</b>
            </button>
            <button>
              Outgoing <b>{profile.requests.outgoing}</b>
            </button>
            <button>
              Confirmations <b>{profile.requests.confirmations}</b>
            </button>
          </div>
          <div className="request-empty">
            <HeartHandshake />
            <div>
              <strong>
                {profile.requests.incoming
                  ? "A request is waiting for your review."
                  : "No active requests yet."}
              </strong>
              <small>
                {profile.requests.incoming
                  ? "Open requests to see the details and respond."
                  : "Your next exchange can start with a thoughtful match."}
              </small>
            </div>
            <Link to={profile.requests.incoming ? "/requests" : "/discover"}>
              {profile.requests.incoming ? "Review" : "Explore"}{" "}
              <ChevronRight />
            </Link>
          </div>
        </section>
        <section className="progress-panel">
          <div className="hub-section-head compact">
            <div>
              <h2>Your progress</h2>
              <p>Growth that compounds with every exchange.</p>
            </div>
            <Link to="/passport">
              Skill Passport <ArrowRight />
            </Link>
          </div>
          <div className="progress-grid">
            <article>
              <span>
                <Video />
              </span>
              <strong>{profile.progress.sessions}</strong>
              <small>Sessions completed</small>
            </article>
            <article>
              <span>
                <MessageCircle />
              </span>
              <strong>{profile.progress.reviews}</strong>
              <small>Reviews received</small>
            </article>
            <article>
              <span>
                <Award />
              </span>
              <strong>{profile.progress.badges}</strong>
              <small>Badges earned</small>
            </article>
            <article>
              <span>
                <TrendingUp />
              </span>
              <strong>{profile.progress.improved}</strong>
              <small>Skills improved</small>
            </article>
          </div>
        </section>
      </div>
      <section className="hub-section circles-section">
        <div className="hub-section-head">
          <div>
            <span className="section-icon circles">
              <UsersRound />
            </span>
            <h2>Suggested learning circles</h2>
            <p>Small communities that fit your goals.</p>
          </div>
          <Link to="/circles">
            Explore circles <ArrowRight />
          </Link>
        </div>
        <div className="suggested-circles">
          {circlesLoading ? (
            <div className="hub-empty-inline"><LoaderCircle className="spin" /><div><h3>Loading circles…</h3><p>Finding communities that fit your goals.</p></div></div>
          ) : circles.length > 0 ? (
            circles.map((circle) => (
              <article key={circle.id}>
                <div className={`circle-cover ${circle.category === "Design" ? "blue" : circle.category === "Coding" ? "mint" : "yellow"}`}>
                  <span>{circle.category.slice(0, 2).toUpperCase()}</span>
                  <i /><i /><i />
                </div>
                <div>
                  <small>{circle.category}</small>
                  <h3>{circle.name}</h3>
                  <p>{circle.memberCount} learners exchanging weekly</p>
                  <div className="circle-bottom">
                    <span><i>{circle.activityLevel}</i></span>
                    <Link to={`/circles/${circle.id}`}>View circle <ArrowRight /></Link>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="hub-empty-inline"><UsersRound /><div><h3>No circles yet.</h3><p>Be the first to start a learning community.</p></div><Link className="button button-secondary" to="/circles">Explore circles</Link></div>
          )}
        </div>
      </section>
      {!hasProfile && (
        <div className="hub-match-empty">
          <Compass />
          <div>
            <h3>We’re preparing your matches.</h3>
            <p>Add more skills to improve your results.</p>
          </div>
          <Link to="/onboarding">
            Complete profile <ArrowRight />
          </Link>
        </div>
      )}
      {modal && (
        <SkillModal
          kind={modal.kind}
          initial={
            modal.index === undefined
              ? undefined
              : profile[modal.kind][modal.index]
          }
          onClose={() => setModal(null)}
          onSave={saveSkill}
        />
      )}{" "}
    </section>
  );
}
