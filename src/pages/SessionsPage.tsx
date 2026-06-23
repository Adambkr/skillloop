import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  Clock3,
  Coins,
  HeartHandshake,
  Languages,
  Link2,
  LoaderCircle,
  MessageCircle,
  Paperclip,
  Play,
  Save,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Video,
  X,
} from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { SafetyActions } from "../components/SafetyActions";
import { confirmExchange, requestTypeLabel } from "../lib/exchange";
import { flagNoShow } from "../lib/safety";
import {
  loadSessions,
  savePreparation,
  startLearningSession,
  submitReview,
  updateSchedule,
  type Preparation,
  type SessionRecord,
} from "../lib/collaboration";
import { EXCHANGE_FORMATS, normalizeFormat } from "../lib/formats";
import { FilterSelect } from "../components/FilterSelect";

const durationOptions=[{value:'15',label:'15 minutes'},{value:'30',label:'30 minutes'},{value:'60',label:'60 minutes'},{value:'90',label:'90 minutes'}];
const sessionFormatOptions=EXCHANGE_FORMATS.map(f=>({value:f,label:f}));

const learnerTasks = [
  "Share what you need help with",
  "Add project link or question",
  "Prepare your goal for the session",
];
const helperTasks = [
  "Review learner goal",
  "Prepare a simple explanation",
  "Ask for missing details",
];
const reviewTags = [
  "Clear explanation",
  "Patient",
  "Helpful",
  "Reliable",
  "Good communication",
  "Practical advice",
  "Great feedback",
];
const when = (value: string) =>
  new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));

export function SessionsPage() {
  const { id } = useParams(),
    { user } = useAuth();
  const [sessions, setSessions] = useState<SessionRecord[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [reviewing, setReviewing] = useState(false);
  useEffect(() => {
    let live = true;
    loadSessions()
      .then((rows) => {
        if (live) {
          setSessions(rows);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (live) {
          setError(
            err instanceof Error ? err.message : "Could not load sessions.",
          );
          setLoading(false);
        }
      });
    return () => {
      live = false;
    };
  }, []);
  const session = sessions.find((item) => item.id === id);
  async function refresh(message?: string) {
    setSessions(await loadSessions());
    if (message) {
      setNotice(message);
      window.setTimeout(() => setNotice(""), 2500);
    }
  }
  async function action(kind: "start" | "confirm" | "dispute") {
    if (!session) return;
    try {
      if (kind === "start") await startLearningSession(session.id);
      else await confirmExchange(session.id, kind);
      await refresh(
        kind === "start"
          ? "Session started."
          : kind === "dispute"
            ? "Session sent for review."
            : "Completion confirmation saved.",
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not update session.",
      );
    }
  }

  if (id)
    return (
      <section className="session-detail-page">
        {notice && (
          <div className="hub-toast">
            <Check />
            {notice}
          </div>
        )}
        {loading ? (
          <div className="session-page-loading">
            <LoaderCircle className="spin" />
          </div>
        ) : session ? (
          <SessionDetail
            session={session}
            userId={user?.id}
            onAction={action}
            onRefresh={refresh}
            onReview={() => setReviewing(true)}
          />
        ) : (
          <div className="session-not-found">
            <CalendarDays />
            <h1>Session not found.</h1>
            <Link to="/sessions">Back to sessions</Link>
          </div>
        )}
        {reviewing && session && (
          <ReviewModal
            session={session}
            onClose={() => setReviewing(false)}
            onSaved={() => {
              setReviewing(false);
              refresh("Review shared. Thank you for building trust.");
            }}
          />
        )}
        {error && (
          <div className="chat-error">
            {error}
            <button onClick={() => setError("")}>×</button>
          </div>
        )}
      </section>
    );

  const groups = {
    active: sessions.filter((s) =>
      ["scheduled", "in_progress"].includes(s.status),
    ),
    completed: sessions.filter((s) => s.status === "completed"),
    closed: sessions.filter((s) =>
      ["cancelled", "disputed"].includes(s.status),
    ),
  };
  return (
    <section className="sessions-page">
      <header className="sessions-header">
        <div>
          <div className="eyebrow">
            <CalendarDays /> Learning in motion
          </div>
          <h1>My sessions</h1>
          <p>Prepare well, show up clearly, and close the loop together.</p>
        </div>
        <Link className="button button-primary" to="/discover">
          <Sparkles /> Find another match
        </Link>
      </header>
      {loading ? (
        <div className="sessions-loading">
          {[1, 2, 3].map((i) => (
            <article key={i} />
          ))}
        </div>
      ) : sessions.length ? (
        <>
          {(["active", "completed", "closed"] as const).map(
            (group) =>
              groups[group].length > 0 && (
                <section className="session-group" key={group}>
                  <div className="session-group-title">
                    <h2>{group}</h2>
                    <span>{groups[group].length}</span>
                  </div>
                  <div className="session-list">
                    {groups[group].map((item) => (
                      <SessionCard
                        key={item.id}
                        session={item}
                        userId={user?.id}
                      />
                    ))}
                  </div>
                </section>
              ),
          )}
        </>
      ) : (
        <div className="sessions-empty">
          <CalendarDays />
          <h2>No sessions yet.</h2>
          <p>
            When a request is accepted, the shared session room will appear
            here.
          </p>
          <Link to="/discover">
            Discover matches <ArrowRight />
          </Link>
        </div>
      )}
    </section>
  );
}

function SessionCard({
  session,
  userId,
}: {
  session: SessionRecord;
  userId?: string;
}) {
  const partner =
    userId === session.learnerId ? session.helperName : session.learnerName;
  return (
    <Link className="session-list-card" to={`/sessions/${session.id}`}>
      <div className="session-date">
        <strong>{new Date(session.startsAt).getDate()}</strong>
        <span>
          {new Intl.DateTimeFormat("en", { month: "short" }).format(
            new Date(session.startsAt),
          )}
        </span>
      </div>
      <div className="session-list-copy">
        <div className={`session-status-pill ${session.status}`}>
          <i />
          {session.status.replace("_", " ")}
        </div>
        <h3>
          {session.skill} with {partner}
        </h3>
        <p>
          <Clock3 /> {when(session.startsAt)} · {session.duration} min ·{" "}
          {normalizeFormat(session.format)}
        </p>
      </div>
      <div className="session-list-credit">
        <Coins />
        <strong>{session.creditCost || "Free"}</strong>
        <small>{session.creditCost ? "credits" : "swap"}</small>
      </div>
      <ArrowRight />
    </Link>
  );
}

function SessionDetail({
  session,
  userId,
  onAction,
  onRefresh,
  onReview,
}: {
  session: SessionRecord;
  userId?: string;
  onAction: (kind: "start" | "confirm" | "dispute") => void;
  onRefresh: (message?: string) => Promise<void>;
  onReview: () => void;
}) {
  const learner = userId === session.learnerId,
    tasks = learner ? learnerTasks : helperTasks;
  const otherUserId = learner ? session.helperId : session.learnerId;
  const [preparation, setPreparation] = useState<Preparation>(
      session.myPreparation || { notes: "", projectLink: "", checklist: [] },
    ),
    [editingSchedule, setEditingSchedule] = useState(false),
    [start, setStart] = useState(
      new Date(session.startsAt).toISOString().slice(0, 16),
    ),
    [duration, setDuration] = useState(session.duration),
    [format, setFormat] = useState<string>(normalizeFormat(session.format)),
    [saving, setSaving] = useState(false);
  async function savePrep() {
    setSaving(true);
    try {
      await savePreparation(session.id, preparation);
      await onRefresh("Preparation saved.");
    } finally {
      setSaving(false);
    }
  }
  async function schedule(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateSchedule(
        session.id,
        new Date(start).toISOString(),
        duration,
        format,
      );
      setEditingSchedule(false);
      await onRefresh("Schedule updated and your partner notified.");
    } finally {
      setSaving(false);
    }
  }
  async function noShow(){const details=window.prompt("Add context for the safety team about the missed session:");if(details===null)return;await flagNoShow(session.id,otherUserId,details);await onRefresh("No-show flag sent to the safety team.")}
  return (
    <>
      <header className="session-detail-header">
        <Link to="/sessions">
          <ArrowLeft /> All sessions
        </Link>
        <div className={`session-status-pill ${session.status}`}>
          <i />
          {session.status.replace("_", " ")}
        </div>
      </header>
      <div className="session-hero">
        <div className="session-participants">
          <span>
            {session.learnerName
              .split(" ")
              .map((v) => v[0])
              .join("")
              .slice(0, 2)}
          </span>
          <HeartHandshake />
          <span>
            {session.helperName
              .split(" ")
              .map((v) => v[0])
              .join("")
              .slice(0, 2)}
          </span>
        </div>
        <div>
          <div className="eyebrow">{requestTypeLabel[session.requestType]}</div>
          <h1>{session.skill}</h1>
          <p>
            {session.learnerName} is learning with help from{" "}
            {session.helperName}.
          </p>
        </div>
        <div className="session-hero-actions">
          <SafetyActions compact targetType="session" targetId={session.id} />
          {session.conversationId && (
            <Link to={`/chat?conversation=${session.conversationId}`}>
              <MessageCircle /> Open chat
            </Link>
          )}
          {session.status === "scheduled" && (
            <button
              className="button button-primary"
              onClick={() => onAction("start")}
            >
              <Play /> Start session
            </button>
          )}
          {session.status === "in_progress" && (
            <button
              className="button button-primary"
              onClick={() => onAction("confirm")}
            >
              <Check /> Complete session
            </button>
          )}
          {session.status === "completed" && !session.hasReviewed && (
            <button className="button button-primary" onClick={onReview}>
              <Star /> Leave review
            </button>
          )}
        </div>
      </div>
      <div className="session-detail-layout">
        <main>
          <section className="session-info-card">
            <header>
              <div>
                <CalendarDays />
                <span>
                  <h2>Session plan</h2>
                  <p>The shared details for this exchange.</p>
                </span>
              </div>
              {session.status === "scheduled" && (
                <button onClick={() => setEditingSchedule(!editingSchedule)}>
                  {editingSchedule ? "Close" : "Reschedule"}
                </button>
              )}
            </header>
            {editingSchedule ? (
              <form className="schedule-form" onSubmit={schedule}>
                <label>
                  Date and time
                  <input
                    type="datetime-local"
                    value={start}
                    min={new Date().toISOString().slice(0, 16)}
                    onChange={(e) => setStart(e.target.value)}
                    required
                  />
                </label>
                <FilterSelect
                  label="Duration"
                  value={String(duration)}
                  options={durationOptions}
                  onChange={(value) => setDuration(Number(value))}
                />
                <FilterSelect
                  label="Format"
                  value={format}
                  options={sessionFormatOptions}
                  onChange={setFormat}
                />
                <button className="button button-primary" disabled={saving}>
                  <Save /> Save schedule
                </button>
              </form>
            ) : (
              <div className="session-info-grid">
                <span>
                  <CalendarDays />
                  <small>DATE & TIME</small>
                  <strong>{when(session.startsAt)}</strong>
                </span>
                <span>
                  <Clock3 />
                  <small>DURATION</small>
                  <strong>{session.duration} minutes</strong>
                </span>
                <span>
                  <Video />
                  <small>FORMAT</small>
                  <strong>{normalizeFormat(session.format)}</strong>
                </span>
                <span>
                  <Coins />
                  <small>CREDIT INFO</small>
                  <strong>
                    {session.creditCost
                      ? `${session.creditCost} pending credits`
                      : "No credits · Direct swap"}
                  </strong>
                </span>
              </div>
            )}
          </section>
          <section className="preparation-card">
            <header>
              <div>
                <Target />
                <span>
                  <h2>Your preparation</h2>
                  <p>
                    {learner
                      ? "Help your guide understand the outcome you need."
                      : "Arrive ready to make the idea feel simple."}
                  </p>
                </span>
              </div>
              <small>
                {preparation.checklist.length}/{tasks.length} ready
              </small>
            </header>
            <div className="preparation-progress">
              <i
                style={{
                  width: `${(preparation.checklist.length / tasks.length) * 100}%`,
                }}
              />
            </div>
            <div className="preparation-checklist">
              {tasks.map((task) => (
                <label
                  key={task}
                  className={preparation.checklist.includes(task) ? "done" : ""}
                >
                  <input
                    type="checkbox"
                    checked={preparation.checklist.includes(task)}
                    onChange={() =>
                      setPreparation({
                        ...preparation,
                        checklist: preparation.checklist.includes(task)
                          ? preparation.checklist.filter((v) => v !== task)
                          : [...preparation.checklist, task],
                      })
                    }
                  />
                  <span>
                    <Check />
                  </span>
                  {task}
                </label>
              ))}
            </div>
            <label className="prep-field">
              Preparation notes
              <textarea
                value={preparation.notes}
                onChange={(e) =>
                  setPreparation({ ...preparation, notes: e.target.value })
                }
                placeholder={
                  learner
                    ? "Share the question, blocker, or outcome you need…"
                    : "Add the explanation, examples, or questions you want ready…"
                }
              />
            </label>
            <label className="prep-field">
              <Link2 /> Project link or useful resource
              <input
                type="url"
                value={preparation.projectLink}
                onChange={(e) =>
                  setPreparation({
                    ...preparation,
                    projectLink: e.target.value,
                  })
                }
                placeholder="https://…"
              />
            </label>
            <button className="save-prep" onClick={savePrep} disabled={saving}>
              {saving ? <LoaderCircle className="spin" /> : <Save />} Save
              preparation
            </button>
          </section>
        </main>
        <aside>
          <section className="session-people-card">
            <h2>People in this session</h2>
            <article>
              <span>{session.learnerName.slice(0, 2).toUpperCase()}</span>
              <div>
                <small>LEARNER</small>
                <strong>{session.learnerName}</strong>
              </div>
              {session.learnerConfirmed && <Check />}
            </article>
            <article>
              <span>{session.helperName.slice(0, 2).toUpperCase()}</span>
              <div>
                <small>HELPER</small>
                <strong>{session.helperName}</strong>
              </div>
              {session.helperConfirmed && <Check />}
            </article>
          </section>
          <section className="session-focus-card">
            <BookOpen />
            <small>SKILL FOCUS</small>
            <h3>{session.skill}</h3>
            {session.offeredSkill && (
              <p>
                Exchanging for <strong>{session.offeredSkill}</strong>
              </p>
            )}
            <span>
              <Languages /> {requestTypeLabel[session.requestType]}
            </span>
            {session.attachmentUrl && (
              <a
                className="session-attachment-link"
                href={session.attachmentUrl}
                target="_blank"
                rel="noreferrer"
              >
                <Paperclip /> View project attachment
              </a>
            )}
          </section>
          {["scheduled", "in_progress"].includes(session.status) && (
            <section className="completion-card">
              <ShieldCheck />
              <h3>Close the loop together.</h3>
              <p>Both people must confirm before credits settle.</p>
              <button onClick={() => onAction("confirm")}>
                <Check /> Confirm completed
              </button>
              <button onClick={() => onAction("dispute")}>
                <AlertTriangle /> Report an issue
              </button>
              <button onClick={noShow}><Clock3/> Flag no-show</button>
            </section>
          )}
          {session.status === "completed" && (
            <section className="completed-session-card">
              <Sparkles />
              <h3>Exchange complete</h3>
              <p>
                {session.hasReviewed
                  ? "Your review is part of their reputation."
                  : "Share what made this exchange helpful."}
              </p>
              {!session.hasReviewed && (
                <button onClick={onReview}>
                  Write a review <ArrowRight />
                </button>
              )}
            </section>
          )}
        </aside>
      </div>
    </>
  );
}

function ReviewModal({
  session,
  onClose,
  onSaved,
}: {
  session: SessionRecord;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [rating, setRating] = useState(5),
    [tags, setTags] = useState<string[]>([]),
    [comment, setComment] = useState(""),
    [again, setAgain] = useState(true),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await submitReview(session.id, rating, tags, comment, again);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save review.");
      setSaving(false);
    }
  }
  return (
    <div className="match-modal-backdrop">
      <section className="review-modal">
        <header>
          <span>
            <Star />
          </span>
          <div>
            <div className="eyebrow">Build meaningful trust</div>
            <h2>How was the exchange?</h2>
          </div>
          <button onClick={onClose} aria-label="Close review form">
            <X />
          </button>
        </header>
        <form onSubmit={submit}>
          <div className="rating-picker">
            <span>YOUR RATING</span>
            <div>
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  type="button"
                  key={value}
                  onClick={() => setRating(value)}
                  className={rating >= value ? "active" : ""}
                >
                  <Star fill={rating >= value ? "currentColor" : "none"} />
                </button>
              ))}
            </div>
            <strong>
              {rating === 5
                ? "Excellent"
                : rating === 4
                  ? "Very helpful"
                  : rating === 3
                    ? "Good"
                    : "Needs improvement"}
            </strong>
          </div>
          <label>
            What stood out?
            <div className="review-tags">
              {reviewTags.map((tag) => (
                <button
                  type="button"
                  className={tags.includes(tag) ? "active" : ""}
                  onClick={() =>
                    setTags(
                      tags.includes(tag)
                        ? tags.filter((v) => v !== tag)
                        : [...tags, tag],
                    )
                  }
                  key={tag}
                >
                  {tags.includes(tag) && <Check />}
                  {tag}
                </button>
              ))}
            </div>
          </label>
          <label>
            Written review
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={1500}
              placeholder="What did they do that helped you move forward?"
            />
            <small>{comment.length}/1500</small>
          </label>
          <fieldset>
            <legend>Would you exchange with them again?</legend>
            <button
              type="button"
              className={again ? "active" : ""}
              onClick={() => setAgain(true)}
            >
              Yes, gladly
            </button>
            <button
              type="button"
              className={!again ? "active" : ""}
              onClick={() => setAgain(false)}
            >
              Not this time
            </button>
          </fieldset>
          {error && <div className="onboarding-error">{error}</div>}
          <footer>
            <button type="button" onClick={onClose}>
              Maybe later
            </button>
            <button className="button button-primary" disabled={saving}>
              {saving ? <LoaderCircle className="spin" /> : <Star />} Publish
              review
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
