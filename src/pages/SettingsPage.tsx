import { useEffect, useState } from "react";
import {
  Bell,
  Check,
  ChevronRight,
  Eye,
  Globe2,
  Languages,
  LoaderCircle,
  LockKeyhole,
  Mail,
  MessageCircle,
  Save,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

type Settings = {
  in_app: boolean;
  email_requests: boolean;
  email_messages: boolean;
  email_sessions: boolean;
  email_credits: boolean;
  email_community: boolean;
  profile_visibility: "public" | "members";
  allow_match_requests: boolean;
  allow_circle_invites: boolean;
};
const defaults: Settings = {
  in_app: true,
  email_requests: true,
  email_messages: true,
  email_sessions: true,
  email_credits: true,
  email_community: false,
  profile_visibility: "public",
  allow_match_requests: true,
  allow_circle_invites: true,
};
const key = "skillloop_preview_settings";
export function SettingsPage() {
  const { user } = useAuth(),
    [settings, setSettings] = useState<Settings>(() => {
      try {
        return {
          ...defaults,
          ...JSON.parse(localStorage.getItem(key) || "{}"),
        };
      } catch {
        return defaults;
      }
    }),
    [loading, setLoading] = useState(isSupabaseConfigured),
    [saving, setSaving] = useState(false),
    [notice, setNotice] = useState("");
  useEffect(() => {
    if (!isSupabaseConfigured || !user?.id) return;
    supabase
      .from("user_preferences")
      .select(
        "notification_settings,profile_visibility,allow_match_requests,allow_circle_invites",
      )
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data)
          setSettings({
            ...defaults,
            ...data.notification_settings,
            profile_visibility: data.profile_visibility || "public",
            allow_match_requests: data.allow_match_requests ?? true,
            allow_circle_invites: data.allow_circle_invites ?? true,
          });
        setLoading(false);
      });
  }, [user?.id]);
  const toggle = (field: keyof Settings) =>
    setSettings((current) => ({ ...current, [field]: !current[field] }));
  async function save() {
    setSaving(true);
    if (isSupabaseConfigured && user?.id) {
      const {
        in_app,
        email_requests,
        email_messages,
        email_sessions,
        email_credits,
        email_community,
        ...privacy
      } = settings;
      const { error } = await supabase
        .from("user_preferences")
        .update({
          ...privacy,
          notification_settings: {
            in_app,
            email_requests,
            email_messages,
            email_sessions,
            email_credits,
            email_community,
          },
        })
        .eq("user_id", user.id);
      if (error) {
        setNotice("Could not save these preferences.");
        setSaving(false);
        return;
      }
    } else localStorage.setItem(key, JSON.stringify(settings));
    setNotice("Your preferences are saved.");
    setSaving(false);
    window.setTimeout(() => setNotice(""), 2200);
  }
  if (loading)
    return (
      <section className="settings-loading">
        <LoaderCircle className="spin" /> Opening your preferences…
      </section>
    );
  return (
    <section className="settings-page">
      <header>
        <div>
          <div className="eyebrow">
            <Sparkles /> Your SkillLoop, your boundaries
          </div>
          <h1>Preferences that protect your focus.</h1>
          <p>
            Choose how people can reach you and which moments deserve an email.
          </p>
        </div>
        <button
          className="button button-primary"
          onClick={save}
          disabled={saving}
        >
          {saving ? <LoaderCircle className="spin" /> : <Save />} Save preferences
        </button>
      </header>
      {notice && (
        <div
          className={`settings-notice ${notice.startsWith("Could") ? "error" : ""}`}
        >
          <Check />
          {notice}
        </div>
      )}
      <div className="settings-layout">
        <main>
          <section className="settings-card">
            <header>
              <Bell />
              <div>
                <h2>Notifications</h2>
                <p>Keep the signals that move an exchange forward.</p>
              </div>
            </header>
            <SettingToggle
              icon={<Bell />}
              title="In-app notifications"
              copy="Requests, sessions, credits, and community activity inside SkillLoop."
              value={settings.in_app}
              onChange={() => toggle("in_app")}
            />
            <SettingToggle
              icon={<Mail />}
              title="Requests and acceptances"
              copy="Know when someone wants your help or accepts your request."
              value={settings.email_requests}
              onChange={() => toggle("email_requests")}
            />
            <SettingToggle
              icon={<MessageCircle />}
              title="New messages"
              copy="Email me when a learning partner sends a message."
              value={settings.email_messages}
              onChange={() => toggle("email_messages")}
            />
            <SettingToggle
              icon={<ShieldCheck />}
              title="Session confirmations and reviews"
              copy="Remind me when credits or reputation are waiting on my action."
              value={settings.email_sessions}
              onChange={() => toggle("email_sessions")}
            />
            <SettingToggle
              icon={<Sparkles />}
              title="Credits received"
              copy="Celebrate completed exchanges and referral rewards."
              value={settings.email_credits}
              onChange={() => toggle("email_credits")}
            />
            <SettingToggle
              icon={<UsersRound />}
              title="Circle activity"
              copy="Occasional community prompts and circle invitations."
              value={settings.email_community}
              onChange={() => toggle("email_community")}
            />
          </section>
          <section className="settings-card">
            <header>
              <LockKeyhole />
              <div>
                <h2>Privacy and discovery</h2>
                <p>Control what is public and who can start an exchange.</p>
              </div>
            </header>
            <div className="visibility-choice">
              <button
                className={
                  settings.profile_visibility === "public" ? "active" : ""
                }
                onClick={() =>
                  setSettings({ ...settings, profile_visibility: "public" })
                }
              >
                <Globe2 />
                <strong>Public Passport</strong>
                <small>
                  Anyone with your link can see your learning identity.
                </small>
              </button>
              <button
                className={
                  settings.profile_visibility === "members" ? "active" : ""
                }
                onClick={() =>
                  setSettings({ ...settings, profile_visibility: "members" })
                }
              >
                <UserRound />
                <strong>Members only</strong>
                <small>Keep your profile inside the SkillLoop community.</small>
              </button>
            </div>
            <SettingToggle
              icon={<Eye />}
              title="Allow skill requests"
              copy="Let matched members send thoughtful exchange requests."
              value={settings.allow_match_requests}
              onChange={() => toggle("allow_match_requests")}
            />
            <SettingToggle
              icon={<UsersRound />}
              title="Allow circle invitations"
              copy="Let community hosts invite you to relevant learning circles."
              value={settings.allow_circle_invites}
              onChange={() => toggle("allow_circle_invites")}
            />
          </section>
        </main>
        <aside>
          <section>
            <h2>Shape your learning identity</h2>
            <p>These preferences work best with an accurate profile.</p>
            <Link to="/profile">
              <UserRound /> Edit profile <ChevronRight />
            </Link>
            <Link to="/onboarding">
              <Languages /> Revisit learning preferences <ChevronRight />
            </Link>
          </section>
          <section className="settings-trust">
            <ShieldCheck />
            <h2>Your safety controls travel with you.</h2>
            <p>
              Blocked users cannot contact you. Suspended accounts cannot create
              or update platform activity.
            </p>
          </section>
        </aside>
      </div>
      <div className="settings-legal-links">
        <Link to="/terms">Terms of Service</Link>
        <span>·</span>
        <Link to="/privacy">Privacy Policy</Link>
      </div>
      <div className="settings-mobile-save">
        <button className="button button-primary" onClick={save}>
          <Save /> Save preferences
        </button>
      </div>
    </section>
  );
}
function SettingToggle({
  icon,
  title,
  copy,
  value,
  onChange,
}: {
  icon: React.ReactNode;
  title: string;
  copy: string;
  value: boolean;
  onChange: () => void;
}) {
  return (
    <article className="setting-row">
      <span>{icon}</span>
      <div>
        <strong>{title}</strong>
        <p>{copy}</p>
      </div>
      <button
        className={value ? "on" : ""}
        onClick={onChange}
        role="switch"
        aria-checked={value}
        aria-label={title}
      >
        <i />
      </button>
    </article>
  );
}
