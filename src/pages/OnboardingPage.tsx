import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Clock3,
  Languages,
  Lightbulb,
  LoaderCircle,
  Plus,
  Sparkles,
  Target,
  Trash2,
  UsersRound,
  WandSparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DEFAULT_FORMAT, EXCHANGE_FORMATS } from "../lib/formats";
import { Logo } from "../components/Logo";
import { useAuth } from "../context/AuthContext";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { applyReferral } from "../lib/growth";
import { FilterSelect } from "../components/FilterSelect";

const teachLevels=[{value:'beginner',label:'Beginner friendly'},{value:'intermediate',label:'Intermediate'},{value:'advanced',label:'Advanced'}];
const learnLevels=[{value:'curious',label:'Just starting'},{value:'beginner',label:'Beginner'},{value:'intermediate',label:'Intermediate'},{value:'advanced',label:'Advanced'}];
const urgencyOptions=[{value:'Today',label:'Today'},{value:'This week',label:'This week'},{value:'Long-term',label:'Long-term'}];
const skillFormatOptions=EXCHANGE_FORMATS.map(f=>({value:f,label:f}));

type SkillEntry = {
  name: string;
  level: string;
  format: string;
  description?: string;
  goal?: string;
  urgency?: string;
};
type Draft = {
  roles: string[];
  teach: SkillEntry[];
  learn: SkillEntry[];
  goal: string;
  availability: string[];
  duration: string;
  language: string;
  styles: string[];
};
const blank: Draft = {
  roles: [],
  teach: [],
  learn: [],
  goal: "",
  availability: [],
  duration: "30",
  language: "English",
  styles: [],
};
const roles = [
  "I want to learn a new skill",
  "I want to help others",
  "I want to do both",
  "I want to find learning partners",
  "I want help with a project",
];
const suggestions = [
  "Design",
  "Coding",
  "Languages",
  "Marketing",
  "Business",
  "School subjects",
  "Video editing",
  "AI tools",
  "Writing",
  "Music",
  "Fitness",
  "Career",
];
const goalIdeas = [
  "Speak English confidently",
  "Build my first mobile app",
  "Improve my logo design",
  "Learn React Native",
  "Get better at video editing",
  "Understand marketing",
];
const learningStyles = [
  "Simple explanations",
  "Step-by-step guidance",
  "Practice tasks",
  "Feedback on my work",
  "Live call",
  "Chat support",
  "Challenge-based learning",
];
const availability = ["Morning", "Afternoon", "Evening", "Weekend", "Flexible"];
const stepMeta = [
  "Welcome",
  "Your why",
  "Teach",
  "Learn",
  "Goal",
  "Availability",
  "Learning style",
  "Finish",
];

function toggle(list: string[], item: string) {
  return list.includes(item)
    ? list.filter((value) => value !== item)
    : [...list, item];
}
function SkillBuilder({
  kind,
  items,
  onChange,
}: {
  kind: "teach" | "learn";
  items: SkillEntry[];
  onChange: (value: SkillEntry[]) => void;
}) {
  const isTeach = kind === "teach";
  const add = (name = "") =>
    onChange([
      ...items,
      {
        name,
        level: isTeach ? "beginner" : "curious",
        format: DEFAULT_FORMAT,
        description: "",
        goal: "",
        urgency: "This week",
      },
    ]);
  const update = (index: number, field: keyof SkillEntry, value: string) =>
    onChange(
      items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item,
      ),
    );
  return (
    <div className="skill-builder">
      <div className="suggestion-row">
        <span>Quick add</span>
        {suggestions.map((skill) => (
          <button
            type="button"
            key={skill}
            disabled={items.some((i) => i.name === skill)}
            onClick={() => add(skill)}
          >
            {skill}
            <Plus />
          </button>
        ))}
      </div>
      {!items.length && (
        <div className="onboarding-empty">
          <span>
            <Lightbulb />
          </span>
          <h3>Your list is still open.</h3>
          <p>
            Choose a suggestion or add the specific skill that feels most like
            you.
          </p>
        </div>
      )}
      <div className="skill-editor-list">
        {items.map((item, index) => (
          <article className="skill-editor" key={`${index}-${item.name}`}>
            <div className="skill-editor-head">
              <span>{isTeach ? "I can help with" : "I want to learn"}</span>
              <button
                type="button"
                onClick={() => onChange(items.filter((_, i) => i !== index))}
                aria-label="Remove skill"
              >
                <Trash2 />
              </button>
            </div>
            <label>
              Skill name
              <input
                value={item.name}
                onChange={(e) => update(index, "name", e.target.value)}
                placeholder={isTeach ? "e.g. Logo design" : "e.g. React Native"}
              />
            </label>
            <div className="skill-editor-grid">
              <FilterSelect
                label={isTeach ? "Teaching level" : "Current level"}
                value={item.level}
                options={isTeach ? teachLevels : learnLevels}
                onChange={(value) => update(index, "level", value)}
              />
              <FilterSelect
                label="Preferred format"
                value={item.format}
                options={skillFormatOptions}
                onChange={(value) => update(index, "format", value)}
              />
            </div>
            {isTeach ? (
              <label>
                How can you help?
                <textarea
                  value={item.description}
                  onChange={(e) => update(index, "description", e.target.value)}
                  placeholder="A short, friendly description of what you can share…"
                />
              </label>
            ) : (
              <>
                <label>
                  Your goal
                  <textarea
                    value={item.goal}
                    onChange={(e) => update(index, "goal", e.target.value)}
                    placeholder="What would progress look like?"
                  />
                </label>
                <FilterSelect
                  label="Urgency"
                  value={item.urgency || "This week"}
                  options={urgencyOptions}
                  onChange={(value) => update(index, "urgency", value)}
                />
              </>
            )}
          </article>
        ))}
      </div>
      <button className="add-skill-button" type="button" onClick={() => add()}>
        <Plus /> Add another skill
      </button>
    </div>
  );
}

export function OnboardingPage() {
  const { user, markOnboardingComplete } = useAuth(),
    navigate = useNavigate();
  const draftKey = `skillloop_onboarding_draft_${user?.id || "preview"}`;
  const profileKey = `skillloop_profile_${user?.id || "preview"}`;
  const [step, setStep] = useState(1),
    [draft, setDraft] = useState<Draft>(() => {
      try {
        return JSON.parse(localStorage.getItem(draftKey) || "null") || blank;
      } catch {
        return blank;
      }
    });
  const [error, setError] = useState(""),
    [saving, setSaving] = useState(false),
    [complete, setComplete] = useState(false);
  useEffect(() => {
    localStorage.setItem(draftKey, JSON.stringify(draft));
  }, [draft, draftKey]);
  const progress = Math.round((step / 8) * 100);
  const firstName = (
    user?.user_metadata?.full_name ||
    localStorage.getItem("skillloop_preview_name") ||
    "there"
  ).split(" ")[0];
  const valid = useMemo(() => {
    if (step === 2) return draft.roles.length > 0;
    if (step === 3)
      return draft.teach.length > 0 && draft.teach.every((s) => s.name.trim());
    if (step === 4)
      return (
        draft.learn.length > 0 &&
        draft.learn.every((s) => s.name.trim() && s.goal?.trim())
      );
    if (step === 5) return draft.goal.trim().length >= 5;
    if (step === 6)
      return draft.availability.length > 0 && draft.language.trim();
    if (step === 7) return draft.styles.length > 0;
    return true;
  }, [step, draft]);
  const next = () => {
    if (!valid) {
      setError("Add at least one thoughtful answer before continuing.");
      return;
    }
    setError("");
    setStep(Math.min(8, step + 1));
  };
  async function finish() {
    setSaving(true);
    setError("");
    const payload = {
      ...draft,
      full_name:
        user?.user_metadata?.full_name ||
        localStorage.getItem("skillloop_preview_name") ||
        "SkillLoop Member",
    };
    if (isSupabaseConfigured) {
      if (!user) {
        setError("Your session expired. Please log in again.");
        setSaving(false);
        return;
      }
      const { error } = await supabase.rpc("complete_onboarding", {
        onboarding_payload: payload,
      });
      if (error) {
        setError(error.message);
        setSaving(false);
        return;
      }
    }
    localStorage.setItem(profileKey, JSON.stringify(payload));
    markOnboardingComplete();
    const referralCode=localStorage.getItem("skillloop_pending_referral");
    if(referralCode){try{await applyReferral(referralCode);localStorage.removeItem("skillloop_pending_referral")}catch{ /* Keep onboarding successful; the invite can be retried later. */ }}
    localStorage.removeItem(draftKey);
    setSaving(false);
    setComplete(true);
    const pendingRequest=localStorage.getItem("skillloop_pending_help_request");
    if(pendingRequest)localStorage.removeItem("skillloop_pending_help_request");
    window.setTimeout(() => navigate(pendingRequest?`/help/${pendingRequest}`:"/dashboard"), 1700);
  }

  if (complete)
    return (
      <main className="onboarding-success">
        <div className="success-rings">
          <span />
          <span />
          <div>
            <Check />
          </div>
        </div>
        <div className="eyebrow">Your SkillLoop is ready</div>
        <h1>We found the shape of your first matches.</h1>
        <p>
          Taking you to a dashboard built around what you want to teach and
          learn.
        </p>
        <LoaderCircle className="success-loader" />
      </main>
    );
  return (
    <main className="onboarding-shell">
      <header className="onboarding-top">
        <Logo />
        <button type="button" onClick={() => navigate("/")}>
          <X /> Save and exit
        </button>
      </header>
      <div className="onboarding-layout">
        <aside className="onboarding-rail">
          <span className="rail-kicker">Your learning identity</span>
          <h2>Build a profile that feels like you.</h2>
          <p>
            Nothing here is permanent. Your goals and skills can grow with every
            exchange.
          </p>
          <nav>
            {stepMeta.map((label, i) => (
              <button
                key={label}
                className={`${step === i + 1 ? "active" : ""} ${step > i + 1 ? "done" : ""}`}
                onClick={() => step > i + 1 && setStep(i + 1)}
                disabled={step < i + 1}
              >
                <span>{step > i + 1 ? <Check /> : i + 1}</span>
                {label}
              </button>
            ))}
          </nav>
          <div className="rail-note">
            <Sparkles />
            <span>
              <strong>Your draft saves automatically.</strong>
              <small>Take your time. Your answers stay on this device.</small>
            </span>
          </div>
        </aside>
        <section className="onboarding-stage">
          <div className="onboarding-mobile-progress">
            <span>
              Step {step} of 8 · {stepMeta[step - 1]}
            </span>
            <strong>{progress}%</strong>
            <i>
              <b style={{ width: `${progress}%` }} />
            </i>
          </div>
          <div className="onboarding-step" key={step}>
            {step === 1 && (
              <>
                <span className="step-icon">
                  <Sparkles />
                </span>
                <div className="eyebrow">Welcome, {firstName}</div>
                <h1>Let’s build your SkillLoop profile.</h1>
                <p>
                  Tell us what you know, what you want to learn, and we’ll find
                  people who match your goals.
                </p>
                <div className="welcome-loop">
                  <span>
                    <Lightbulb />
                    <b>What you know</b>
                  </span>
                  <ChevronRight />
                  <span>
                    <UsersRound />
                    <b>Who it can help</b>
                  </span>
                  <ChevronRight />
                  <span>
                    <BookOpen />
                    <b>What you learn</b>
                  </span>
                </div>
              </>
            )}
            {step === 2 && (
              <>
                <div className="eyebrow">Start with your why</div>
                <h1>What brings you here?</h1>
                <p>
                  Select everything that feels true. SkillLoop can be more than
                  one thing for you.
                </p>
                <div className="choice-grid role-grid">
                  {roles.map((role, i) => (
                    <button
                      type="button"
                      key={role}
                      className={draft.roles.includes(role) ? "selected" : ""}
                      onClick={() =>
                        setDraft({ ...draft, roles: toggle(draft.roles, role) })
                      }
                    >
                      <span>
                        {i === 0 ? (
                          <BookOpen />
                        ) : i === 1 ? (
                          <Lightbulb />
                        ) : i === 2 ? (
                          <Sparkles />
                        ) : i === 3 ? (
                          <UsersRound />
                        ) : (
                          <Target />
                        )}
                      </span>
                      <b>{role}</b>
                      {draft.roles.includes(role) && <Check />}
                    </button>
                  ))}
                </div>
              </>
            )}
            {step === 3 && (
              <>
                <div className="eyebrow">Your useful knowledge</div>
                <h1>What can you help others with?</h1>
                <p>
                  Add the skills you can explain, review, demonstrate, or
                  practice with someone.
                </p>
                <SkillBuilder
                  kind="teach"
                  items={draft.teach}
                  onChange={(teach) => setDraft({ ...draft, teach })}
                />
              </>
            )}
            {step === 4 && (
              <>
                <div className="eyebrow">Follow your curiosity</div>
                <h1>What do you want to learn or improve?</h1>
                <p>
                  A clear goal helps us find someone who can meet you exactly
                  where you are.
                </p>
                <SkillBuilder
                  kind="learn"
                  items={draft.learn}
                  onChange={(learn) => setDraft({ ...draft, learn })}
                />
              </>
            )}
            {step === 5 && (
              <>
                <span className="step-icon">
                  <Target />
                </span>
                <div className="eyebrow">Your north star</div>
                <h1>What is your main goal right now?</h1>
                <p>
                  Write it in your own words, or borrow a spark below and make
                  it yours.
                </p>
                <label className="goal-input">
                  <WandSparkles />
                  <textarea
                    value={draft.goal}
                    onChange={(e) =>
                      setDraft({ ...draft, goal: e.target.value })
                    }
                    placeholder="I want to…"
                    maxLength={180}
                  />
                  <small>{draft.goal.length}/180</small>
                </label>
                <div className="goal-suggestions">
                  {goalIdeas.map((goal) => (
                    <button
                      type="button"
                      key={goal}
                      onClick={() => setDraft({ ...draft, goal })}
                    >
                      {goal}
                      <ArrowRight />
                    </button>
                  ))}
                </div>
              </>
            )}
            {step === 6 && (
              <>
                <div className="eyebrow">Make time fit real life</div>
                <h1>When are you usually available?</h1>
                <p>
                  Choose a few windows. You will always approve the final
                  session time.
                </p>
                <div className="choice-chips large">
                  {availability.map((item) => (
                    <button
                      type="button"
                      key={item}
                      className={
                        draft.availability.includes(item) ? "selected" : ""
                      }
                      onClick={() =>
                        setDraft({
                          ...draft,
                          availability: toggle(draft.availability, item),
                        })
                      }
                    >
                      <Clock3 />
                      {item}
                      {draft.availability.includes(item) && <Check />}
                    </button>
                  ))}
                </div>
                <div className="preference-fields">
                  <label>
                    Preferred session duration
                    <div className="segmented">
                      {["15", "30", "60"].map((value) => (
                        <button
                          type="button"
                          key={value}
                          className={draft.duration === value ? "selected" : ""}
                          onClick={() =>
                            setDraft({ ...draft, duration: value })
                          }
                        >
                          {value} min
                        </button>
                      ))}
                    </div>
                  </label>
                  <label>
                    Preferred language
                    <span className="field-with-icon">
                      <Languages />
                      <input
                        value={draft.language}
                        onChange={(e) =>
                          setDraft({ ...draft, language: e.target.value })
                        }
                        placeholder="English"
                      />
                    </span>
                  </label>
                </div>
              </>
            )}
            {step === 7 && (
              <>
                <div className="eyebrow">Your learning personality</div>
                <h1>How do you like to learn?</h1>
                <p>
                  Pick the support that helps a new idea click. Select as many
                  as you like.
                </p>
                <div className="choice-grid style-grid">
                  {learningStyles.map((style, i) => (
                    <button
                      type="button"
                      key={style}
                      className={draft.styles.includes(style) ? "selected" : ""}
                      onClick={() =>
                        setDraft({
                          ...draft,
                          styles: toggle(draft.styles, style),
                        })
                      }
                    >
                      <span>
                        {i % 3 === 0 ? (
                          <Lightbulb />
                        ) : i % 3 === 1 ? (
                          <BookOpen />
                        ) : (
                          <Target />
                        )}
                      </span>
                      <b>{style}</b>
                      {draft.styles.includes(style) && <Check />}
                    </button>
                  ))}
                </div>
              </>
            )}
            {step === 8 && (
              <>
                <span className="step-icon">
                  <Sparkles />
                </span>
                <div className="eyebrow">Your profile, at a glance</div>
                <h1>This is the learner you’re bringing to SkillLoop.</h1>
                <p>
                  Everything looks ready. You can refine any part later as your
                  loop grows.
                </p>
                <div className="finish-summary">
                  <article>
                    <span>
                      <Lightbulb />
                      Can teach
                    </span>
                    <div>
                      {draft.teach.map((s) => (
                        <b key={s.name}>{s.name}</b>
                      ))}
                    </div>
                  </article>
                  <article>
                    <span>
                      <BookOpen />
                      Wants to learn
                    </span>
                    <div>
                      {draft.learn.map((s) => (
                        <b key={s.name}>{s.name}</b>
                      ))}
                    </div>
                  </article>
                  <article>
                    <span>
                      <Target />
                      Main goal
                    </span>
                    <p>{draft.goal}</p>
                  </article>
                  <article>
                    <span>
                      <Clock3 />
                      Availability
                    </span>
                    <p>
                      {draft.availability.join(", ")} · {draft.duration} min ·{" "}
                      {draft.language}
                    </p>
                  </article>
                  <article className="summary-wide">
                    <span>
                      <Sparkles />
                      Learning style
                    </span>
                    <div>
                      {draft.styles.map((s) => (
                        <b key={s}>{s}</b>
                      ))}
                    </div>
                  </article>
                </div>
              </>
            )}
            {error && (
              <div className="onboarding-error" role="alert">
                {error}
              </div>
            )}
            <div className="onboarding-actions">
              {step > 1 && (
                <button
                  className="back-button"
                  type="button"
                  onClick={() => {
                    setError("");
                    setStep(step - 1);
                  }}
                >
                  <ArrowLeft /> Back
                </button>
              )}
              <button
                className="button button-primary"
                type="button"
                onClick={step === 8 ? finish : next}
                disabled={saving}
              >
                {saving
                  ? "Saving your profile…"
                  : step === 1
                    ? "Start my profile"
                    : step === 8
                      ? "Find my first matches"
                      : "Continue"}
                {saving ? <LoaderCircle className="spin" /> : <ArrowRight />}
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
