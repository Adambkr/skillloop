import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Camera,
  Check,
  CirclePlus,
  Clock3,
  Flag,
  FolderKanban,
  Globe2,
  HandHeart,
  HelpCircle,
  Languages,
  LoaderCircle,
  LockKeyhole,
  MessageCircle,
  MessageSquareReply,
  Plus,
  Search,
  Send,
  Sparkles,
  Target,
  ThumbsUp,
  TrendingUp,
  UserPlus,
  UsersRound,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  createCirclePost,
  createLearningCircle,
  joinCircle,
  leaveCircle,
  loadCircleDetail,
  loadCirclesWorkspace,
  replyToCirclePost,
  togglePostHelpful,
  type CircleDetail,
  type CirclePost,
  type CirclePostType,
  type CircleSummary,
  type CircleWorkspace,
  type CreateCircleInput,
} from "../lib/circles";
import { uploadCircleCover } from "../lib/storage";
import { SafetyActions } from "../components/SafetyActions";
import { FilterSelect, type FilterOption } from "../components/FilterSelect";

const postLabels: Record<CirclePostType, string> = {
  question: "Question",
  help_request: "Help request",
  resource: "Resource",
  progress_update: "Progress update",
  project_feedback: "Project feedback",
};
const circleTypeOptions: FilterOption[] = [
  { value: "skill", label: "A skill" },
  { value: "goal", label: "A shared goal" },
  { value: "project", label: "A project type" },
  { value: "language", label: "A language" },
  { value: "location", label: "A community" },
];
const circleCategoryOptions: FilterOption[] = [
  "Design", "Coding", "Languages", "Business", "Career", "AI tools", "Local community", "General",
].map((value) => ({ value, label: value }));
const memberLimitOptions: FilterOption[] = [
  { value: "20", label: "20 members" },
  { value: "50", label: "50 members" },
  { value: "100", label: "100 members" },
];
const postTypeOptions: FilterOption[] = Object.entries(postLabels).map(([value, label]) => ({ value, label }));
const categoryIcons: Record<string, string> = {
  Languages: "EN",
  Coding: "DEV",
  Design: "UX",
  "Local community": "MA",
  Career: "CV",
  "AI tools": "AI",
  Business: "MVP",
};
const initials = (name: string) =>
  name
    .split(" ")
    .map((value) => value[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
const timeAgo = (value: string) => {
  const hours = Math.max(
    1,
    Math.round((Date.now() - new Date(value).getTime()) / 3600000),
  );
  return hours < 24 ? `${hours}h ago` : `${Math.round(hours / 24)}d ago`;
};

function CircleCard({
  circle,
  onJoin,
  joining,
}: {
  circle: CircleSummary;
  onJoin: (circle: CircleSummary) => void;
  joining?: boolean;
}) {
  return (
    <article className="community-circle-card">
      <Link
        className={`community-circle-cover${circle.coverUrl ? " has-cover" : ""}`}
        to={`/circles/${circle.id}`}
      >
        {circle.coverUrl && (
          <img className="community-circle-cover-img" src={circle.coverUrl} alt="" />
        )}
        <span>
          {categoryIcons[circle.category] ||
            circle.name.slice(0, 2).toUpperCase()}
        </span>
        <i />
        <i />
        <b>{circle.activityLevel}</b>
      </Link>
      <div className="community-circle-body">
        <header>
          <span>{circle.category}</span>
          <small>
            <Languages /> {circle.language}
          </small>
        </header>
        <Link to={`/circles/${circle.id}`}>
          <h3>{circle.name}</h3>
        </Link>
        <p>{circle.description}</p>
        <div className="community-circle-tags">
          {circle.tags.slice(0, 3).map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
        <footer>
          <div>
            <UsersRound />
            <strong>{circle.memberCount}</strong>
            <small>members</small>
            <MessageCircle />
            <strong>{circle.weeklyPosts}</strong>
            <small>this week</small>
          </div>
          {circle.isMember ? (
            <Link to={`/circles/${circle.id}`}>
              Open circle <ArrowRight />
            </Link>
          ) : circle.membershipStatus === "pending" ? (
            <button disabled>
              <Clock3 /> Requested
            </button>
          ) : (
            <button disabled={joining} onClick={() => onJoin(circle)}>
              {joining ? <LoaderCircle className="spin" /> : <UserPlus />}
              {circle.joinMode === "request" ? "Request" : "Join"}
            </button>
          )}
        </footer>
      </div>
    </article>
  );
}

function CircleShelf({
  title,
  subtitle,
  circles,
  onJoin,
  joining,
  accent,
}: {
  title: string;
  subtitle: string;
  circles: CircleSummary[];
  onJoin: (circle: CircleSummary) => void;
  joining?: string;
  accent: string;
}) {
  if (!circles.length) return null;
  return (
    <section className="circle-shelf">
      <header>
        <span className={`circle-shelf-icon ${accent}`}>
          <UsersRound />
        </span>
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        <small>{circles.length} circles</small>
      </header>
      <div className="circle-card-grid">
        {circles.map((circle) => (
          <CircleCard
            key={circle.id}
            circle={circle}
            onJoin={onJoin}
            joining={joining === circle.id}
          />
        ))}
      </div>
    </section>
  );
}

function CreateCircleModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const { user } = useAuth();
  const [step, setStep] = useState(1),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(""),
    [draft, setDraft] = useState<Record<string, string>>({}),
    [circleType, setCircleType] = useState("skill"),
    [category, setCategory] = useState("Design"),
    [memberLimit, setMemberLimit] = useState("50"),
    [coverUrl, setCoverUrl] = useState(""),
    [coverUploading, setCoverUploading] = useState(false),
    [coverError, setCoverError] = useState("");
  async function onCoverFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setCoverError("");
    if (!user?.id) {
      setCoverError("You need to sign in before adding a cover image.");
      return;
    }
    setCoverUploading(true);
    try {
      const { url } = await uploadCircleCover(file, user.id);
      setCoverUrl(url);
    } catch (err) {
      setCoverError(
        err instanceof Error
          ? err.message
          : "We couldn't upload that image right now. Please try again.",
      );
    } finally {
      setCoverUploading(false);
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (step === 1) {
      const entries: Record<string, string> = {};
      (["name", "description", "circleType", "category"] as const).forEach((key) => {
        entries[key] = String(form.get(key) || "");
      });
      setDraft(entries);
      setStep(2);
      return;
    }
    setSaving(true);
    setError("");
    const split = (value: string) =>
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    const input: CreateCircleInput = {
      name: draft.name,
      category: draft.category,
      description: draft.description,
      circleType: draft.circleType as CreateCircleInput["circleType"],
      language: String(form.get("language")),
      tags: split(draft.tags || ""),
      rules: split(String(form.get("rules") || "")),
      joinMode: String(form.get("joinMode")) as CreateCircleInput["joinMode"],
      memberLimit: Number(form.get("memberLimit") || 50),
      coverUrl: coverUrl || undefined,
    };
    try {
      onCreated(await createLearningCircle(input));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not create the circle.",
      );
      setSaving(false);
    }
  }
  return (
    <div
      className="match-modal-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <form className="create-circle-modal" onSubmit={submit}>
        <header>
          <span>
            <CirclePlus />
          </span>
          <div>
            <small>STEP {step} OF 2</small>
            <h2>
              {step === 1
                ? "Give the circle a clear purpose"
                : "Set the community rhythm"}
            </h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close circle creator">
            <X />
          </button>
        </header>
        <div className="create-circle-progress">
          <i style={{ width: `${step * 50}%` }} />
        </div>
        {step === 1 ? (
          <div className="create-circle-fields">
            <label>
              Circle name
              <input
                name="name"
                required
                minLength={3}
                placeholder="e.g. Portfolio Review Circle"
              />
            </label>
            <div>
              <FilterSelect label="Built around" value={circleType} options={circleTypeOptions} onChange={setCircleType} />
              <input type="hidden" name="circleType" value={circleType} />
              <FilterSelect label="Category" value={category} options={circleCategoryOptions} onChange={setCategory} />
              <input type="hidden" name="category" value={category} />
            </div>
            <label>
              Description
              <textarea
                name="description"
                required
                minLength={20}
                placeholder="Who is this for, and what useful exchange happens here?"
              />
            </label>
            <label>
              Tags
              <input
                name="tags"
                required
                placeholder="Portfolio, Feedback, Career"
              />
              <small>Separate focused topics with commas.</small>
            </label>
          </div>
        ) : (
          <div className="create-circle-fields">
            <div>
              <label>
                Primary language
                <input name="language" required defaultValue="English" />
              </label>
              <FilterSelect label="Member limit" value={memberLimit} options={memberLimitOptions} onChange={setMemberLimit} />
              <input type="hidden" name="memberLimit" value={memberLimit} />
            </div>
            <div className="circle-cover-field">
              <span className="circle-cover-label">Cover image (optional)</span>
              <div className="circle-cover-upload">
                <span className="circle-cover-preview">
                  {coverUrl ? <img src={coverUrl} alt="" /> : <CirclePlus />}
                </span>
                <label
                  className={`button button-secondary${coverUploading ? " is-loading" : ""}`}
                >
                  <Camera /> {coverUrl ? "Change cover" : "Upload cover"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={onCoverFile}
                    disabled={coverUploading}
                    hidden
                  />
                </label>
              </div>
              {coverError && (
                <small className="avatar-upload-error" role="alert">
                  {coverError}
                </small>
              )}
            </div>
            <label>
              Community rules
              <textarea
                name="rules"
                required
                defaultValue="Be generous and specific, Respect every learning level"
              />
              <small>Separate rules with commas.</small>
            </label>
            <fieldset>
              <legend>How people join</legend>
              <label>
                <input
                  type="radio"
                  name="joinMode"
                  value="public"
                  defaultChecked
                />
                <span>
                  <Globe2 />
                  <strong>Open circle</strong>
                  <small>Anyone can join immediately.</small>
                </span>
              </label>
              <label>
                <input type="radio" name="joinMode" value="request" />
                <span>
                  <LockKeyhole />
                  <strong>Request to join</strong>
                  <small>You approve new members.</small>
                </span>
              </label>
            </fieldset>
          </div>
        )}
        {error && <div className="onboarding-error">{error}</div>}
        <footer>
          {step === 2 && (
            <button type="button" onClick={() => setStep(1)}>
              <ArrowLeft /> Back
            </button>
          )}
          <button className="button button-primary" disabled={saving}>
            {saving ? (
              <LoaderCircle className="spin" />
            ) : step === 1 ? (
              <>
                Continue <ArrowRight />
              </>
            ) : (
              <>
                <Sparkles /> Create my circle
              </>
            )}
          </button>
        </footer>
      </form>
    </div>
  );
}

function CirclesDirectory() {
  const navigate = useNavigate(),
    [workspace, setWorkspace] = useState<CircleWorkspace | null>(null),
    [query, setQuery] = useState(""),
    [category, setCategory] = useState("All"),
    [createOpen, setCreateOpen] = useState(false),
    [joining, setJoining] = useState(""),
    [notice, setNotice] = useState(""),
    [error, setError] = useState("");
  const refresh = () =>
    loadCirclesWorkspace()
      .then(setWorkspace)
      .catch((err) =>
        setError(
          err instanceof Error ? err.message : "Could not load circles.",
        ),
      );
  useEffect(() => {
    loadCirclesWorkspace()
      .then(setWorkspace)
      .catch((err) =>
        setError(
          err instanceof Error ? err.message : "Could not load circles.",
        ),
      );
  }, []);
  const filtered = useMemo(
    () =>
      workspace?.circles.filter(
        (circle) =>
          (category === "All" || circle.category === category) &&
          `${circle.name} ${circle.description} ${circle.tags.join(" ")}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ) || [],
    [workspace, query, category],
  );
  async function join(circle: CircleSummary) {
    setJoining(circle.id);
    setError("");
    try {
      const status = await joinCircle(circle.id, circle.joinMode);
      setNotice(
        status === "pending"
          ? "Your request was sent to the circle host."
          : `You joined ${circle.name}.`,
      );
      await refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not join this circle.",
      );
    } finally {
      setJoining("");
    }
  }
  if (!workspace)
    return (
      <section className="circles-loading">
        <LoaderCircle className="spin" />
        <h2>Finding your communities…</h2>
        <p>Matching skills, goals, language, and active groups.</p>
      </section>
    );
  const recommended = [...filtered]
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 4),
    popular = [...filtered]
      .sort((a, b) => b.memberCount - a.memberCount)
      .slice(0, 4),
    newCircles = [...filtered]
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      .slice(0, 4),
    mine = filtered.filter(
      (circle) => circle.isMember || circle.membershipStatus === "pending",
    );
  return (
    <section className="circles-page">
      <header className="circles-hero">
        <div>
          <div className="eyebrow">
            <Sparkles /> Communities with a purpose
          </div>
          <h1>
            Learn better with a <em>small circle.</em>
          </h1>
          <p>
            Find focused people, ask useful questions, and keep moving when a
            one-to-one match is not enough.
          </p>
          <div className="circle-search">
            <Search />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search skills, goals, languages, or communities"
            />
            {query && (
              <button onClick={() => setQuery("")} aria-label="Clear circle search">
                <X />
              </button>
            )}
          </div>
        </div>
        <aside>
          <span>
            <UsersRound />
          </span>
          <strong>Knowledge grows when it moves.</strong>
          <p>
            Every circle is built around giving help, asking clearly, and making
            progress visible.
          </p>
          <button
            className="button button-primary"
            onClick={() => setCreateOpen(true)}
          >
            <Plus /> Create a circle
          </button>
        </aside>
      </header>
      <nav className="circle-categories">
        <button
          className={category === "All" ? "active" : ""}
          onClick={() => setCategory("All")}
        >
          All circles
        </button>
        {workspace.categories.map((item) => (
          <button
            className={category === item ? "active" : ""}
            onClick={() => setCategory(item)}
            key={item}
          >
            {item}
          </button>
        ))}
      </nav>
      {notice && (
        <div className="circle-notice">
          <Check />
          {notice}
          <button onClick={() => setNotice("")} aria-label="Dismiss notice">
            <X />
          </button>
        </div>
      )}
      {error && (
        <div className="circle-notice error">
          <Flag />
          {error}
        </div>
      )}
      {filtered.length ? (
        <>
          <CircleShelf
            title="Recommended for you"
            subtitle="Based on your skills, goals, languages, and active communities."
            circles={recommended}
            onJoin={join}
            joining={joining}
            accent="mint"
          />
          <CircleShelf
            title="My circles"
            subtitle="The communities where your learning already has a home."
            circles={mine}
            onJoin={join}
            joining={joining}
            accent="blue"
          />
          <CircleShelf
            title="Popular circles"
            subtitle="Consistent communities with useful exchanges happening now."
            circles={popular}
            onJoin={join}
            joining={joining}
            accent="yellow"
          />
          <CircleShelf
            title="New circles"
            subtitle="Fresh spaces ready for their first generous contributors."
            circles={newCircles}
            onJoin={join}
            joining={joining}
            accent="violet"
          />
        </>
      ) : (
        <div className="circles-empty">
          <Search />
          <h2>No circles match that search.</h2>
          <p>
            Try a broader topic or create the focused circle you hoped to find.
          </p>
          <button
            className="button button-primary"
            onClick={() => setCreateOpen(true)}
          >
            <CirclePlus /> Create a circle
          </button>
        </div>
      )}
      {createOpen && (
        <CreateCircleModal
          onClose={() => setCreateOpen(false)}
          onCreated={(id) => navigate(`/circles/${id}`)}
        />
      )}
    </section>
  );
}

function PostComposer({
  circleId,
  name,
  onPosted,
}: {
  circleId: string;
  name: string;
  onPosted: () => void;
}) {
  const [saving, setSaving] = useState(false),
    [error, setError] = useState(""),
    [postType, setPostType] = useState("question");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget,
      data = new FormData(form);
    setSaving(true);
    setError("");
    try {
      await createCirclePost(
        circleId,
        {
          type: String(data.get("type")) as CirclePostType,
          title: String(data.get("title")),
          body: String(data.get("body")),
          skillTag: String(data.get("skillTag")),
        },
        name,
      );
      form.reset();
      onPosted();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not publish your post.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <form className="circle-post-composer" onSubmit={submit}>
      <header>
        <span>{initials(name)}</span>
        <div>
          <strong>Share something useful</strong>
          <small>Clear context gets better help.</small>
        </div>
        <FilterSelect inline label="Post type" value={postType} options={postTypeOptions} onChange={setPostType} />
        <input type="hidden" name="type" value={postType} />
      </header>
      <input
        name="title"
        required
        minLength={3}
        maxLength={140}
        placeholder="Give your post a clear title"
      />
      <textarea
        name="body"
        required
        minLength={3}
        maxLength={5000}
        placeholder="What are you trying, learning, or stuck on?"
      />
      <footer>
        <label>
          <Target />
          <input name="skillTag" placeholder="Skill tag" />
        </label>
        {error && <small>{error}</small>}
        <button className="button button-primary" disabled={saving}>
          {saving ? <LoaderCircle className="spin" /> : <Send />} Share with circle
        </button>
      </footer>
    </form>
  );
}

function PostCard({
  post,
  isMember,
  name,
  onChanged,
  onNotice,
}: {
  post: CirclePost;
  isMember: boolean;
  name: string;
  onChanged: () => void;
  onNotice: (message: string) => void;
}) {
  const [replying, setReplying] = useState(false),
    [sending, setSending] = useState(false);
  const typeIcon =
    post.type === "question" ? (
      <HelpCircle />
    ) : post.type === "resource" ? (
      <BookOpen />
    ) : post.type === "progress_update" ? (
      <TrendingUp />
    ) : post.type === "project_feedback" ? (
      <FolderKanban />
    ) : (
      <HandHeart />
    );
  async function helpful() {
    if (!isMember) {
      onNotice("Join the circle to mark posts helpful.");
      return;
    }
    await togglePostHelpful(post.id, post.hasHelpful);
    onChanged();
  }
  async function reply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget,
      body = String(new FormData(form).get("reply"));
    if (!body.trim()) return;
    setSending(true);
    await replyToCirclePost(post.id, body, name);
    form.reset();
    setReplying(false);
    setSending(false);
    onChanged();
  }
  return (
    <article className="circle-post-card">
      <header>
        <span className={`circle-post-type type-${post.type}`}>
          {typeIcon}
          {postLabels[post.type]}
        </span>
        <SafetyActions compact targetType="circle_post" targetId={post.id} userId={post.author.id} />
      </header>
      <div className="circle-post-author">
        <span>{initials(post.author.name)}</span>
        <div>
          <strong>{post.author.name}</strong>
          <small>
            {post.author.reputationLabel || "Circle member"} ·{" "}
            {timeAgo(post.createdAt)}
          </small>
        </div>
        {post.skillTag && <b>{post.skillTag}</b>}
      </div>
      <h3>{post.title}</h3>
      <p>{post.body}</p>
      <footer>
        <button className={post.hasHelpful ? "active" : ""} onClick={helpful}>
          <ThumbsUp /> Helpful <b>{post.helpfulCount}</b>
        </button>
        <button
          onClick={() =>
            isMember
              ? setReplying(!replying)
              : onNotice("Join the circle to reply.")
          }
        >
          <MessageSquareReply /> {post.replies.length} replies
        </button>
      </footer>
      {post.replies.length > 0 && (
        <div className="circle-replies">
          {post.replies.map((reply) => (
            <article key={reply.id}>
              <span>{initials(reply.author.name)}</span>
              <div>
                <header>
                  <strong>{reply.author.name}</strong>
                  <small>{timeAgo(reply.createdAt)}</small>
                  <SafetyActions compact targetType="circle_reply" targetId={reply.id} userId={reply.author.id} />
                </header>
                <p>{reply.body}</p>
              </div>
            </article>
          ))}
        </div>
      )}
      {replying && (
        <form className="circle-reply-form" onSubmit={reply}>
          <span>{initials(name)}</span>
          <input
            name="reply"
            autoFocus
            maxLength={3000}
            placeholder="Add a thoughtful reply…"
          />
          <button disabled={sending} aria-label="Post reply">
            {sending ? <LoaderCircle className="spin" /> : <Send />}
          </button>
        </form>
      )}
    </article>
  );
}

function CircleDetailPage({ id }: { id: string }) {
  const { user } = useAuth(),
    name =
      user?.user_metadata?.full_name ||
      localStorage.getItem("skillloop_preview_name") ||
      "SkillLoop Member",
    [detail, setDetail] = useState<CircleDetail | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [joining, setJoining] = useState(false);
  const refresh = () =>
    loadCircleDetail(id)
      .then(setDetail)
      .catch((err) =>
        setError(
          err instanceof Error ? err.message : "Could not load this circle.",
        ),
      );
  useEffect(() => {
    loadCircleDetail(id)
      .then(setDetail)
      .catch((err) =>
        setError(
          err instanceof Error ? err.message : "Could not load this circle.",
        ),
      );
  }, [id]);
  async function membership() {
    if (!detail) return;
    setJoining(true);
    try {
      if (detail.circle.isMember) {
        await leaveCircle(id);
        setNotice("You left the circle.");
      } else {
        const status = await joinCircle(id, detail.circle.joinMode);
        setNotice(
          status === "pending"
            ? "Your request is waiting for the host."
            : "Welcome to the circle.",
        );
      }
      await refresh();
    } catch (err) {
      setNotice(
        err instanceof Error ? err.message : "Could not update membership.",
      );
    } finally {
      setJoining(false);
    }
  }
  if (error)
    return (
      <section className="circle-detail-empty">
        <UsersRound />
        <h1>Circle unavailable</h1>
        <p>{error}</p>
        <Link to="/circles">
          <ArrowLeft /> Back to circles
        </Link>
      </section>
    );
  if (!detail)
    return (
      <section className="circles-loading">
        <LoaderCircle className="spin" />
        <h2>Opening the circle…</h2>
      </section>
    );
  const circle = detail.circle;
  return (
    <section className="circle-detail-page">
      <Link className="circle-back" to="/circles">
        <ArrowLeft /> All learning circles
      </Link>
      <header className="circle-detail-hero">
        <div className="circle-detail-mark">
          <span>
            {categoryIcons[circle.category] ||
              circle.name.slice(0, 2).toUpperCase()}
          </span>
          <i />
          <i />
        </div>
        <div>
          <div className="circle-detail-meta">
            <span>{circle.category}</span>
            <span>
              <Languages /> {circle.language}
            </span>
            <span className="active">
              <i /> {circle.activityLevel}
            </span>
          </div>
          <h1>{circle.name}</h1>
          <p>{circle.description}</p>
          <div className="community-circle-tags">
            {circle.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        </div>
        <aside>
          <div>
            <strong>{circle.memberCount}</strong>
            <span>members</span>
          </div>
          <div>
            <strong>{circle.weeklyPosts}</strong>
            <span>posts this week</span>
          </div>
          {circle.isOwner ? (
            <button disabled>
              <Check /> You host this circle
            </button>
          ) : circle.membershipStatus === "pending" ? (
            <button disabled>
              <Clock3 /> Request pending
            </button>
          ) : (
            <button
              className={circle.isMember ? "leave" : ""}
              onClick={membership}
              disabled={joining}
            >
              {joining ? (
                <LoaderCircle className="spin" />
              ) : circle.isMember ? (
                <Check />
              ) : (
                <UserPlus />
              )}
              {circle.isMember
                ? "Joined"
                : circle.joinMode === "request"
                  ? "Request to join"
                  : "Join circle"}
            </button>
          )}
        </aside>
      </header>
      {notice && (
        <div className="circle-notice">
          <Sparkles />
          {notice}
          <button onClick={() => setNotice("")} aria-label="Dismiss notice">
            <X />
          </button>
        </div>
      )}
      <div className="circle-detail-layout">
        <main>
          {circle.isMember && (
            <PostComposer circleId={id} name={name} onPosted={refresh} />
          )}
          <section className="circle-feed-head">
            <div>
              <h2>Circle posts</h2>
              <p>Questions, progress, resources, and useful requests.</p>
            </div>
            <span className="feed-order">Latest first</span>
          </section>
          {detail.posts.length ? (
            <div className="circle-feed">
              {detail.posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  isMember={circle.isMember}
                  name={name}
                  onChanged={refresh}
                  onNotice={setNotice}
                />
              ))}
            </div>
          ) : (
            <div className="circle-feed-empty">
              <MessageCircle />
              <h3>Start the first useful thread.</h3>
              <p>Share a focused question or a small piece of progress.</p>
            </div>
          )}
        </main>
        <aside>
          <section className="circle-rituals">
            <header>
              <span>
                <Sparkles />
              </span>
              <div>
                <h2>Circle rituals</h2>
                <p>Small prompts that keep the group moving.</p>
              </div>
            </header>
            {detail.rituals.map((ritual) => (
              <article key={ritual.id}>
                <small>{ritual.cadence}</small>
                <h3>{ritual.title}</h3>
                <p>{ritual.description}</p>
                <button onClick={() => setNotice(ritual.prompt)}>
                  Open prompt <ArrowRight />
                </button>
              </article>
            ))}
          </section>
          <section className="circle-members-panel">
            <header>
              <div>
                <h2>Members</h2>
                <p>{circle.memberCount} people learning together</p>
              </div>
              <UsersRound />
            </header>
            <div>
              {detail.members.slice(0, 5).map((member) => (
                <Link to={`/profile/${member.id}`} key={member.id}>
                  <span>{initials(member.name)}</span>
                  <div>
                    <strong>{member.name}</strong>
                    <small>{member.reputationLabel}</small>
                  </div>
                  {member.role && member.role !== "member" && (
                    <b>{member.role}</b>
                  )}
                </Link>
              ))}
            </div>
          </section>
          <section className="circle-rules">
            <header>
              <LockKeyhole />
              <div>
                <h2>Circle rules</h2>
                <p>Clarity protects useful exchange.</p>
              </div>
            </header>
            <ol>
              {circle.rules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ol>
          </section>
          <section className="recommended-circle-members">
            <h2>People worth meeting</h2>
            <p>Active members who may fit your goals.</p>
            {detail.recommendedMembers.slice(0, 3).map((member) => (
              <Link to={`/profile/${member.id}`} key={member.id}>
                <span>{initials(member.name)}</span>
                <div>
                  <strong>{member.name}</strong>
                  <small>{member.headline || member.reputationLabel}</small>
                </div>
                <ArrowRight />
              </Link>
            ))}
          </section>
        </aside>
      </div>
    </section>
  );
}

export function CirclesPage() {
  const { id } = useParams();
  return id ? <CircleDetailPage id={id} /> : <CirclesDirectory />;
}
