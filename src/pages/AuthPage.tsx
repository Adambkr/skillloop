import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  LockKeyhole,
  Sparkles,
} from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Logo } from "../components/Logo";
import { useAuth } from "../context/AuthContext";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

function friendlyError(message: string) {
  if (message.toLowerCase().includes("invalid login"))
    return "That email and password do not match. Please try again.";
  if (message.toLowerCase().includes("already registered"))
    return "An account already exists for this email. Try logging in instead.";
  if (message.toLowerCase().includes("rate limit"))
    return "Too many attempts. Take a breath and try again in a moment.";
  return message;
}

export function AuthPage({ mode }: { mode: "login" | "signup" }) {
  const signup = mode === "signup";
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const {markPreviewAuthenticated,refreshAccess}=useAuth();
  const googleEnabled = import.meta.env.VITE_SUPABASE_GOOGLE_ENABLED === "true";
  useEffect(() => {
    const referral = params.get("ref"),
      request = params.get("request");
    if (referral)
      localStorage.setItem(
        "skillloop_pending_referral",
        referral.toUpperCase(),
      );
    if (request)
      localStorage.setItem("skillloop_pending_help_request", request);
  }, [params]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim(),
      email = String(form.get("email")).trim(),
      password = String(form.get("password")),
      confirm = String(form.get("confirm") || "");
    if (signup && name.length < 2)
      return setMessage("Please add your full name.");
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return setMessage("Enter a valid email address.");
    if (
      password.length < 8 ||
      !/[A-Z]/.test(password) ||
      !/[0-9]/.test(password)
    )
      return setMessage(
        "Use at least 8 characters, one uppercase letter, and one number.",
      );
    if (signup && password !== confirm)
      return setMessage("Your passwords do not match yet.");
    if (!isSupabaseConfigured) {
      localStorage.setItem(
        "skillloop_preview_name",
        name || email.split("@")[0],
      );
      markPreviewAuthenticated();
      navigate(signup ? "/onboarding" : "/dashboard");
      return;
    }
    setLoading(true);
    const result = signup
      ? await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })
      : await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (result.error) setMessage(friendlyError(result.error.message));
    else if (signup && !result.data.session)
      setMessage(
        "Account created. Check your inbox to confirm your email, then your profile can begin.",
      );
    else if (signup) navigate("/onboarding");
    else {
      const access = await refreshAccess();
      const redirect = params.get("redirect");
      if (redirect) navigate(redirect);
      else navigate(access?.onboardingComplete ? "/dashboard" : "/onboarding");
    }
  }

  async function googleSignIn() {
    setLoading(true);
    setMessage("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setLoading(false);
      setMessage(friendlyError(error.message));
    }
  }

  return (
    <div className="auth-page auth-premium">
      <div className="auth-panel">
        <div className="auth-top">
          <Logo />
          <Link to="/">
            <ArrowLeft /> Back home
          </Link>
        </div>
        <div className="auth-form-wrap">
          <div className="eyebrow">
            <Sparkles />{" "}
            {signup
              ? "Create your learning identity"
              : "Welcome back to your loop"}
          </div>
          <h1>
            {signup ? "Bring what you know." : "Your people are waiting."}
          </h1>
          <p>
            {signup
              ? "Turn your skills into new possibilities. Your first exchange starts with a simple profile."
              : "Log in to see your matches, requests, and the next skill waiting for you."}
          </p>
          {googleEnabled && (
            <>
              <button
                className="auth-google"
                type="button"
                onClick={googleSignIn}
                disabled={loading}
              >
                <b>G</b> Continue with Google
              </button>
              <div className="auth-divider">
                <span>or use email</span>
              </div>
            </>
          )}
          <form onSubmit={submit} noValidate>
            {signup && (
              <label>
                Full name
                <input
                  name="name"
                  type="text"
                  placeholder="How people will know you"
                  autoComplete="name"
                  required
                />
              </label>
            )}
            <label>
              Email address
              <input
                name="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </label>
            <label>
              Password
              <span className="password-field">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="8+ characters, uppercase, number"
                  minLength={8}
                  autoComplete={signup ? "new-password" : "current-password"}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Show or hide password"
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </span>
            </label>
            {signup && (
              <label>
                Confirm password
                <input
                  name="confirm"
                  type={showPassword ? "text" : "password"}
                  placeholder="Type it once more"
                  autoComplete="new-password"
                  required
                />
              </label>
            )}
            {!signup && (
              <Link className="forgot-link" to="/forgot-password">
                Forgot password?
              </Link>
            )}
            {message && (
              <div
                className={`form-message ${message.startsWith("Account created") ? "success" : ""}`}
                role="status"
              >
                {message.startsWith("Account created") ? (
                  <Check />
                ) : (
                  <LockKeyhole />
                )}
                {message}
              </div>
            )}
            <button
              className={`button button-primary button-full${loading ? " is-loading" : ""}`}
              disabled={loading}
              aria-busy={loading}
            >
              {signup ? "Create my SkillLoop profile" : "Log in"}
              <ArrowRight />
            </button>
          </form>
          <p className="auth-switch">
            {signup ? "Already have an account?" : "New to SkillLoop?"}{" "}
            <Link to={signup ? "/login" : "/signup"}>
              {signup ? "Log in" : "Create an account"}
            </Link>
          </p>
          {!isSupabaseConfigured && (
            <small className="demo-note">
              Preview mode is active. Your onboarding is saved on this device.
            </small>
          )}
        </div>
      </div>
      <aside className="auth-story">
        <div className="story-orbits">
          <span />
          <span />
          <div className="story-card story-card-one">
            <i>UX</i>
            <span>
              <small>You can teach</small>
              <strong>Visual design</strong>
            </span>
            <Check />
          </div>
          <div className="story-card story-card-two">
            <i>RN</i>
            <span>
              <small>You want to learn</small>
              <strong>React Native</strong>
            </span>
          </div>
          <div className="story-match">
            <Sparkles />
            <strong>94% learning match</strong>
            <small>Knowledge finds a way.</small>
          </div>
        </div>
        <blockquote>
          “Everyone arrives knowing something worth sharing.”
          <small>Join curious people learning together.</small>
        </blockquote>
      </aside>
    </div>
  );
}
