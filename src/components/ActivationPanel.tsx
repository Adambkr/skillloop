import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowRight,
  Award,
  BookOpen,
  Check,
  CirclePlus,
  Coins,
  Copy,
  HeartHandshake,
  Lightbulb,
  Link2,
  LoaderCircle,
  Send,
  Share2,
  Sparkles,
  UsersRound,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import type { SkillProfile } from "../lib/skillProfile";
import {
  createPublicHelpRequest,
  loadGrowthWorkspace,
  type GrowthWorkspace,
} from "../lib/growth";

const steps = [
  [
    "teachSkill",
    "Add one skill you can teach",
    "Your knowledge makes the exchange possible.",
    "/profile",
    Lightbulb,
  ],
  [
    "learnSkill",
    "Add one skill you want to learn",
    "A clear goal helps the right person find you.",
    "/profile",
    BookOpen,
  ],
  [
    "sentRequest",
    "Send your first request",
    "A thoughtful hello is how every exchange begins.",
    "/discover",
    Send,
  ],
  [
    "joinedCircle",
    "Join one learning circle",
    "Small communities keep your momentum alive.",
    "/circles",
    UsersRound,
  ],
  [
    "completedExchange",
    "Complete your first exchange",
    "Close the loop and build your reputation.",
    "/sessions",
    HeartHandshake,
  ],
] as const;

export function ActivationPanel({
  profile,
  userId,
}: {
  profile: SkillProfile;
  userId?: string;
}) {
  const [growth, setGrowth] = useState<GrowthWorkspace | null>(null),
    [notice, setNotice] = useState(""),
    [creating, setCreating] = useState(false);
  const refresh = () =>
    loadGrowthWorkspace(userId, profile.full_name).then(setGrowth);
  useEffect(() => {
    let live = true;
    loadGrowthWorkspace(userId, profile.full_name).then((value) => {
      if (live) setGrowth(value);
    });
    return () => {
      live = false;
    };
  }, [
    userId,
    profile.full_name,
    profile.teach.length,
    profile.learn.length,
    profile.progress.sessions,
  ]);
  if (!growth)
    return (
      <section className="activation-card activation-loading">
        <LoaderCircle className="spin" /> Preparing your first-win path…
      </section>
    );
  const completed = steps.filter(([key]) => growth.checklist[key]).length,
    percent = (completed / steps.length) * 100,
    inviteUrl = `${window.location.origin}/signup?ref=${growth.referralCode}`,
    passportUrl = `${window.location.origin}/u/${growth.username}`;
  async function copy(value: string, message: string) {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      window.prompt("Copy this link:", value);
    }
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2200);
  }
  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget),
      slug = await createPublicHelpRequest(
        String(form.get("needed")),
        String(form.get("offered")),
        String(form.get("message")),
        profile.full_name,
      );
    setCreating(false);
    await refresh();
    await copy(
      `${window.location.origin}/help/${slug}`,
      "Public help request created. Link copied.",
    );
  }
  return (
    <>
      <section className="activation-card">
        <header>
          <div
            className="activation-ring"
            style={
              { "--activation": `${percent * 3.6}deg` } as React.CSSProperties
            }
          >
            <span>
              <strong>{completed}</strong>
              <small>of 5</small>
            </span>
          </div>
          <div>
            <div className="eyebrow">
              <Sparkles /> Your first meaningful exchange
            </div>
            <h2>
              {completed === 5
                ? "Your learning loop is alive."
                : "Turn your profile into momentum."}
            </h2>
            <p>
              {completed === 5
                ? "You completed the activation path and unlocked the Loop Activated badge."
                : `${5 - completed} clear step${5 - completed === 1 ? "" : "s"} stand between you and a durable learning habit.`}
            </p>
          </div>
          {completed === 5 && (
            <span className="activation-badge">
              <Award /> Loop Activated
            </span>
          )}
        </header>
        <div className="activation-progress">
          <i style={{ width: `${percent}%` }} />
        </div>
        <div className="activation-steps">
          {steps.map(([key, title, copyText, to, Icon], index) => (
            <article className={growth.checklist[key] ? "done" : ""} key={key}>
              <span>{growth.checklist[key] ? <Check /> : <Icon />}</span>
              <div>
                <small>STEP {index + 1}</small>
                <strong>{title}</strong>
                <p>{copyText}</p>
              </div>
              {growth.checklist[key] ? (
                <b>Done</b>
              ) : (
                <Link to={to}>
                  Do this next <ArrowRight />
                </Link>
              )}
            </article>
          ))}
        </div>
      </section>
      <section className="growth-actions">
        <article className="invite-card">
          <span>
            <UsersRound />
          </span>
          <small>GROW TOGETHER</small>
          <h2>Bring one curious friend.</h2>
          <p>When they finish onboarding, you both receive one Skill Credit.</p>
          <div>
            <code>{growth.referralCode}</code>
            <button onClick={() => copy(inviteUrl, "Invite link copied.")}>
              <Copy /> Copy invite link
            </button>
          </div>
          <footer>
            <strong>{growth.referrals.rewarded}</strong>
            <span>friends activated</span>
            <b>+{growth.referrals.creditsEarned} credits</b>
          </footer>
        </article>
        <article className="share-loop-card">
          <span>
            <Share2 />
          </span>
          <small>SHARE YOUR LOOP</small>
          <h2>Let your skills travel.</h2>
          <p>
            Your public Passport and focused help requests make it easy for the
            right person to say yes.
          </p>
          <button
            onClick={() => copy(passportUrl, "Skill Passport link copied.")}
          >
            <Link2 /> Share my Skill Passport
          </button>
          <button onClick={() => setCreating(true)}>
            <CirclePlus /> Create a public help request
          </button>
        </article>
      </section>
      {notice && (
        <div className="hub-toast">
          <Check />
          {notice}
        </div>
      )}
      {creating && (
        <div className="match-modal-backdrop">
          <form className="public-request-modal" onSubmit={submitRequest}>
            <header>
              <span>
                <Sparkles />
              </span>
              <div>
                <small>SHAREABLE MATCH REQUEST</small>
                <h2>Ask clearly. Offer generously.</h2>
              </div>
              <button type="button" onClick={() => setCreating(false)}>
                <X />
              </button>
            </header>
            <label>
              I need help with
              <input
                name="needed"
                defaultValue={profile.learn[0]?.name || ""}
                required
                placeholder="React Native"
              />
            </label>
            <label>
              I can help with
              <input
                name="offered"
                defaultValue={profile.teach[0]?.name || ""}
                placeholder="UI Design"
              />
            </label>
            <label>
              Give people useful context
              <textarea
                name="message"
                required
                minLength={20}
                maxLength={1000}
                defaultValue={profile.learn[0]?.goal || ""}
                placeholder="What are you trying to do, and what kind of help would move you forward?"
              />
            </label>
            <div className="public-request-preview">
              <Coins />
              <span>
                <strong>Shared outside SkillLoop</strong>
                <small>
                  People will see your public learning identity, never private
                  contact details.
                </small>
              </span>
            </div>
            <footer>
              <button type="button" onClick={() => setCreating(false)}>
                Not now
              </button>
              <button className="button button-primary">
                <Share2 /> Create & copy link
              </button>
            </footer>
          </form>
        </div>
      )}
    </>
  );
}
