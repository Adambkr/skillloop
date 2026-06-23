import {
  ArrowRight,
  Award,
  BookOpen,
  CalendarDays,
  Camera,
  Check,
  Coins,
  Edit3,
  Globe2,
  HeartHandshake,
  Languages,
  Lightbulb,
  MapPin,
  MessageCircle,
  Plus,
  Save,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  UsersRound,
  X,
} from "lucide-react";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { SkillModal } from "../components/SkillModal";
import { SafetyActions } from "../components/SafetyActions";
import { useAuth } from "../context/AuthContext";
import {
  loadLocalProfile,
  loadRemoteProfile,
  saveSkillProfile,
  type SkillItem,
  type SkillProfile,
} from "../lib/skillProfile";
import { loadSkillPassport, type SkillPassport } from "../lib/passport";
import { uploadAvatar } from "../lib/storage";

const styleOptions = [
  "Simple explanations",
  "Step-by-step guidance",
  "Practice tasks",
  "Feedback on my work",
  "Live call",
  "Chat support",
  "Challenge-based learning",
];
const availabilityOptions = [
  "Morning",
  "Afternoon",
  "Evening",
  "Weekend",
  "Flexible",
];
function toggle(list: string[], value: string) {
  return list.includes(value)
    ? list.filter((v) => v !== value)
    : [...list, value];
}

export function ProfilePage() {
  const { id } = useParams(),
    { user } = useAuth(),
    targetId = id || user?.id,
    own = !id || id === user?.id;
  const fallback =
    user?.user_metadata?.full_name ||
    localStorage.getItem("skillloop_preview_name") ||
    "SkillLoop learner";
  const [profile, setProfile] = useState<SkillProfile>(() =>
      loadLocalProfile(targetId, fallback),
    ),
    [passport, setPassport] = useState<SkillPassport | null>(null),
    [editing, setEditing] = useState(false),
    [draft, setDraft] = useState<SkillProfile>(profile),
    [message, setMessage] = useState(""),
    [skillModal, setSkillModal] = useState<{
      kind: "teach" | "learn";
      index?: number;
    } | null>(null),
    [avatarUploading, setAvatarUploading] = useState(false),
    [avatarError, setAvatarError] = useState("");
  useEffect(() => {
    if (targetId)
      loadRemoteProfile(targetId, fallback).then((value) => {
        setProfile(value);
        setDraft(value);
      });
  }, [targetId, fallback]);
  useEffect(() => {
    loadSkillPassport(targetId, fallback).then(setPassport);
  }, [targetId, fallback]);
  const initials = profile.full_name
    .split(" ")
    .map((v) => v[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  async function onAvatarFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setAvatarError("");
    if (!user?.id) {
      setAvatarError("You need to sign in before uploading a photo.");
      return;
    }
    setAvatarUploading(true);
    try {
      const { url } = await uploadAvatar(file, user.id);
      setDraft((current) => ({ ...current, avatar_url: url }));
    } catch (err) {
      setAvatarError(
        err instanceof Error
          ? err.message
          : "We couldn't upload your photo right now. Please try again.",
      );
    } finally {
      setAvatarUploading(false);
    }
  }
  async function saveBasics(e: FormEvent) {
    e.preventDefault();
    setMessage("Saving…");
    try {
      await saveSkillProfile(draft, user?.id);
      setProfile(draft);
      setEditing(false);
      setMessage("Profile updated");
      window.setTimeout(() => setMessage(""), 2000);
    } catch {
      setMessage("Could not save your profile.");
    }
  }
  async function saveSkill(skill: SkillItem) {
    if (!skillModal) return;
    const list = [...profile[skillModal.kind]];
    if (skillModal.index === undefined)
      list.push({ ...skill, id: crypto.randomUUID() });
    else list[skillModal.index] = skill;
    const next = { ...profile, [skillModal.kind]: list };
    setProfile(next);
    setDraft(next);
    setSkillModal(null);
    await saveSkillProfile(next, user?.id);
  }
  async function deleteSkill() {
    if (!skillModal || skillModal.index === undefined) return;
    if (!window.confirm("Remove this skill from your profile?")) return;
    const list = profile[skillModal.kind].filter((_, index) => index !== skillModal.index);
    const next = { ...profile, [skillModal.kind]: list };
    setProfile(next);
    setDraft(next);
    setSkillModal(null);
    await saveSkillProfile(next, user?.id);
    setMessage("Skill removed");
    window.setTimeout(() => setMessage(""), 2000);
  }
  return (
    <section className="profile-page">
      {message && (
        <div className="hub-toast">
          <Check />
          {message}
        </div>
      )}
      <div className="profile-cover">
        <span />
        <span />
        <span />
        <div className="profile-cover-copy">
          <Sparkles /> Knowledge grows when it moves.
        </div>
      </div>
      <header className="profile-identity">
        <div className="profile-avatar">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" />
          ) : (
            <span>{initials}</span>
          )}
          <i>
            <ShieldCheck />
          </i>
        </div>
        <div className="profile-name">
          <div className="eyebrow">SkillLoop profile</div>
          <h1>{profile.full_name}</h1>
          <p>
            {profile.bio ||
              "A curious learner sharing what they know and building what comes next."}
          </p>
          <div>
            <span>
              <MapPin /> {profile.timezone || "Flexible location"}
            </span>
            <span>
              <Languages /> {profile.languages.join(", ")}
            </span>
            <span>
              <CalendarDays /> Available{" "}
              {profile.availability.join(", ").toLowerCase() || "flexibly"}
            </span>
          </div>
        </div>
        <div className="profile-actions">
          {own ? (
            <>
              <Link className="profile-share" to="/passport">
                <Globe2 /> View my Passport
              </Link>
              <button
                className="button button-primary"
                onClick={() => {
                  setDraft(profile);
                  setEditing(true);
                }}
              >
                <Edit3 /> Shape my profile
              </button>
            </>
          ) : (
            <>
              <SafetyActions
                targetType="profile"
                targetId={targetId || "preview-profile"}
                userId={targetId}
              />
              <Link className="button button-primary" to="/discover">
                <HeartHandshake /> Find an exchange fit
              </Link>
            </>
          )}
        </div>
      </header>
      <div className="profile-layout">
        <main className="profile-main">
          <section className="profile-goal">
            <span>
              <Target />
            </span>
            <div>
              <small>MY MAIN LEARNING GOAL</small>
              <h2>{profile.goal || "Still choosing the next big goal."}</h2>
            </div>
            {own && (
              <button onClick={() => setEditing(true)} aria-label="Edit main learning goal">
                <Edit3 />
              </button>
            )}
          </section>
          {passport && (
            <section className="profile-trust-section">
              <header>
                <div>
                  <ShieldCheck />
                  <span>
                    <small>TRUST & REPUTATION</small>
                    <h2>{passport.profile.reputationLabel}</h2>
                  </span>
                </div>
                <Link to={targetId ? `/passport/${targetId}` : "/passport"}>
                  View Skill Passport <ArrowRight />
                </Link>
              </header>
              <div className="profile-trust-metrics">
                <span>
                  <strong>{passport.profile.rating || "New"}</strong>
                  <small>Average rating</small>
                </span>
                <span>
                  <strong>{passport.profile.sessions}</strong>
                  <small>Sessions completed</small>
                </span>
                <span>
                  <strong>{passport.profile.responseRate}%</strong>
                  <small>Response rate</small>
                </span>
                <span>
                  <strong>
                    {passport.badges.filter((b) => b.unlocked).length}
                  </strong>
                  <small>Badges earned</small>
                </span>
              </div>
              <div className="profile-trust-proof">
                <div>
                  <small>TOP BADGES</small>
                  {passport.badges.filter((b) => b.unlocked).slice(0, 3)
                    .length ? (
                    <span>
                      {passport.badges
                        .filter((b) => b.unlocked)
                        .slice(0, 3)
                        .map((b) => (
                          <b key={b.id}>
                            <Award />
                            {b.name}
                          </b>
                        ))}
                    </span>
                  ) : (
                    <p>
                      Your first badge unlocks after your first completed
                      session.
                    </p>
                  )}
                </div>
                <div>
                  <small>REVIEW HIGHLIGHTS</small>
                  {passport.reviews.length ? (
                    <span>
                      {[...new Set(passport.reviews.flatMap((r) => r.tags))]
                        .slice(0, 4)
                        .map((tag) => (
                          <b key={tag}>
                            <Check />
                            {tag}
                          </b>
                        ))}
                    </span>
                  ) : (
                    <p>Complete your first exchange to start building trust.</p>
                  )}
                </div>
              </div>
            </section>
          )}
          <section className="profile-section">
            <div className="profile-section-head">
              <div>
                <span className="teach">
                  <Lightbulb />
                </span>
                <h2>Can teach</h2>
              </div>
              {own && (
            <button onClick={() => setSkillModal({ kind: "teach" })}>
              <Plus /> Add teach skill
                </button>
              )}
            </div>
            {profile.teach.length ? (
              <div className="profile-skill-list">
                {profile.teach.map((skill, index) => (
                  <article key={skill.id || skill.name}>
                    <span className="profile-skill-icon teach">
                      {skill.name.slice(0, 2).toUpperCase()}
                    </span>
                    <div>
                      <h3>{skill.name}</h3>
                      <p>
                        {skill.description ||
                          `Practical, friendly help with ${skill.name}.`}
                      </p>
                      <span>
                        <b>{skill.level}</b>
                        <b>{skill.format}</b>
                      </span>
                    </div>
                    <div className="profile-skill-proof">
                      <span>
                        <UsersRound /> {skill.peopleHelped || 0} helped
                      </span>
                      <span>
                        <Star />{" "}
                        {skill.rating ? skill.rating.toFixed(1) : "New"}
                      </span>
                      {own && (
                        <button
                          aria-label={`Edit ${skill.name}`}
                          onClick={() =>
                            setSkillModal({ kind: "teach", index })
                          }
                        >
                          <Edit3 />
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="profile-empty">
                <Lightbulb />
                <div>
                  <h3>No teach skills yet</h3>
                  <p>
                    Add something you would enjoy helping another person
                    understand.
                  </p>
                </div>
                {own && (
                  <button onClick={() => setSkillModal({ kind: "teach" })}>
                    Add skill
                  </button>
                )}
              </div>
            )}
          </section>
          <section className="profile-section">
            <div className="profile-section-head">
              <div>
                <span className="learn">
                  <BookOpen />
                </span>
                <h2>Wants to learn</h2>
              </div>
              {own && (
            <button onClick={() => setSkillModal({ kind: "learn" })}>
              <Plus /> Add learning skill
                </button>
              )}
            </div>
            {profile.learn.length ? (
              <div className="profile-learning-grid">
                {profile.learn.map((skill, index) => (
                  <article key={skill.id || skill.name}>
                    <header>
                      <BookOpen />
                      <span>
                        <small>{skill.level}</small>
                        <h3>{skill.name}</h3>
                      </span>
                      {skill.completed && (
                        <b>
                          <Check /> Improved
                        </b>
                      )}
                    </header>
                    <p>
                      {skill.goal || `Build real confidence in ${skill.name}.`}
                    </p>
                    <footer>
                      <span>
                        <MessageCircle /> {skill.format}
                      </span>
                      {own && (
                        <button
                          onClick={() =>
                            setSkillModal({ kind: "learn", index })
                          }
                        >
                          <Edit3 /> Edit
                        </button>
                      )}
                    </footer>
                  </article>
                ))}
              </div>
            ) : (
              <div className="profile-empty">
                <BookOpen />
                <div>
                  <h3>No learning skills yet</h3>
                  <p>Add your curiosity so the right people can find you.</p>
                </div>
              </div>
            )}
          </section>
          <section className="profile-section reviews-section">
            <div className="profile-section-head">
              <div>
                <span className="review">
                  <Star />
                </span>
                <h2>Reviews</h2>
              </div>
              <small>{profile.reviews.length} received</small>
            </div>
            {profile.reviews.length ? (
              <div className="review-list">
                {profile.reviews.map((review) => (
                  <article className="review-card" key={review.id}>
                    <div>
                      <span>{review.initials}</span>
                      <strong>{review.reviewer}</strong>
                      <i>
                        {Array.from({ length: review.rating }, (_, index) => (
                          <Star key={index} fill="currentColor" />
                        ))}
                      </i>
                    </div>
                    <p>{review.comment}</p>
                  </article>
                ))}
              </div>
            ) : (
              <div className="profile-empty">
                <MessageCircle />
                <div>
                  <h3>Trust starts with the first exchange.</h3>
                  <p>Complete your first exchange to build trust.</p>
                </div>
              </div>
            )}
          </section>
        </main>
        <aside className="profile-aside">
          <section className="passport-preview-card">
            <div className="passport-card-head">
              <Award />
              <span>
                <small>SKILL PASSPORT</small>
                <strong>Learning identity</strong>
              </span>
              <Link to="/passport" aria-label="Open Skill Passport">
                <ArrowRight />
              </Link>
            </div>
            <div className="passport-score">
              <strong>{profile.progress.sessions}</strong>
              <span>
                verified
                <br />
                exchanges
              </span>
            </div>
            <div className="passport-lines">
              <span>
                <i
                  style={{
                    width: `${Math.max(profile.profileCompletion, 12)}%`,
                  }}
                />
              </span>
              <small>{profile.profileCompletion}% profile strength</small>
            </div>
            <div className="passport-mini-stats">
              <span>
                <b>{profile.teach.length}</b> teach skills
              </span>
              <span>
                <b>{profile.learn.length}</b> learn skills
              </span>
            </div>
          </section>
          <section className="profile-side-card">
            <h3>
              <Coins /> Skill wallet
            </h3>
            <strong>{profile.credits.available} credits</strong>
            <p>
              {profile.credits.earned} earned · {profile.credits.spent} spent
            </p>
          </section>
          <section className="profile-side-card">
            <h3>
              <Sparkles /> Learning style
            </h3>
            <div className="profile-tags">
              {profile.styles.length ? (
                profile.styles.map((s) => <span key={s}>{s}</span>)
              ) : (
                <p>No learning preferences added yet.</p>
              )}
            </div>
          </section>
          <section className="profile-side-card badge-side">
            <h3>
              <Award /> Badges
            </h3>
            {profile.progress.badges ? (
              <div className="badge-row">
                <span>
                  <HeartHandshake />
                </span>
                <span>
                  <Star />
                </span>
                <span>
                  <Sparkles />
                </span>
              </div>
            ) : (
              <p>Complete sessions to unlock your first badge.</p>
            )}
          </section>
        </aside>
      </div>
      {editing && (
        <div className="profile-edit-backdrop">
          <section className="profile-edit-modal">
            <header>
              <div>
                <div className="eyebrow">Private profile settings</div>
                <h2>Edit your learning identity</h2>
              </div>
              <button onClick={() => setEditing(false)}>
                <X />
              </button>
            </header>
            <form onSubmit={saveBasics}>
              <div className="profile-edit-avatar">
                <span>
                  {draft.avatar_url ? (
                    <img src={draft.avatar_url} alt="" />
                  ) : (
                    initials
                  )}
                </span>
                <div className="avatar-upload-fields">
                  <label
                    className={`button button-secondary avatar-upload-button${avatarUploading ? " is-loading" : ""}`}
                  >
                    <Camera />{" "}
                    {draft.avatar_url ? "Change photo" : "Upload photo"}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      onChange={onAvatarFile}
                      disabled={avatarUploading}
                      hidden
                    />
                  </label>
                  <label className="avatar-url-field">
                    Or paste an image URL
                    <input
                      value={draft.avatar_url}
                      onChange={(e) =>
                        setDraft({ ...draft, avatar_url: e.target.value })
                      }
                      placeholder="https://…"
                    />
                  </label>
                  {avatarError && (
                    <small className="avatar-upload-error" role="alert">
                      {avatarError}
                    </small>
                  )}
                </div>
              </div>
              <label>
                Full name
                <input
                  value={draft.full_name}
                  onChange={(e) =>
                    setDraft({ ...draft, full_name: e.target.value })
                  }
                  required
                />
              </label>
              <label>
                Bio
                <textarea
                  value={draft.bio}
                  onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
                  placeholder="What should people know about learning with you?"
                  maxLength={280}
                />
              </label>
              <div className="profile-edit-grid">
                <label>
                  Timezone
                  <input
                    value={draft.timezone}
                    onChange={(e) =>
                      setDraft({ ...draft, timezone: e.target.value })
                    }
                  />
                </label>
                <label>
                  Languages
                  <input
                    value={draft.languages.join(", ")}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        languages: e.target.value
                          .split(",")
                          .map((v) => v.trim())
                          .filter(Boolean),
                      })
                    }
                    placeholder="English, French, Arabic"
                  />
                </label>
              </div>
              <label>
                Main learning goal
                <input
                  value={draft.goal}
                  onChange={(e) => setDraft({ ...draft, goal: e.target.value })}
                />
              </label>
              <fieldset>
                <legend>Availability</legend>
                <div className="edit-chips">
                  {availabilityOptions.map((value) => (
                    <button
                      type="button"
                      key={value}
                      className={
                        draft.availability.includes(value) ? "selected" : ""
                      }
                      onClick={() =>
                        setDraft({
                          ...draft,
                          availability: toggle(draft.availability, value),
                        })
                      }
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend>How I like to learn</legend>
                <div className="edit-chips">
                  {styleOptions.map((value) => (
                    <button
                      type="button"
                      key={value}
                      className={draft.styles.includes(value) ? "selected" : ""}
                      onClick={() =>
                        setDraft({
                          ...draft,
                          styles: toggle(draft.styles, value),
                        })
                      }
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </fieldset>
              <div className="profile-edit-actions">
                <button type="button" onClick={() => setEditing(false)}>
                  Cancel
                </button>
                <button className="button button-primary">
                  <Save /> Save profile
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
      {skillModal && (
        <SkillModal
          kind={skillModal.kind}
          initial={
            skillModal.index === undefined
              ? undefined
              : profile[skillModal.kind][skillModal.index]
          }
          onClose={() => setSkillModal(null)}
          onSave={saveSkill}
          onDelete={skillModal.index === undefined ? undefined : deleteSkill}
        />
      )}{" "}
    </section>
  );
}
