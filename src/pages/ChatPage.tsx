import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  Coins,
  HeartHandshake,
  LoaderCircle,
  MessageCircle,
  Search,
  Send,
  Sparkles,
  UserRound,
  Video,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { SafetyActions } from "../components/SafetyActions";
import { confirmExchange } from "../lib/exchange";
import {
  loadConversations,
  loadMessages,
  markConversationRead,
  sendMessage,
  subscribeToMessages,
  type ChatMessage,
  type Conversation,
} from "../lib/collaboration";

const time = (value: string) =>
  new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(
    new Date(value),
  );
export function ChatPage() {
  const { user } = useAuth(),
    [params] = useSearchParams(),
    [conversations, setConversations] = useState<Conversation[]>([]),
    [selected, setSelected] = useState(""),
    [messages, setMessages] = useState<ChatMessage[]>([]),
    [loading, setLoading] = useState(true),
    [threadLoading, setThreadLoading] = useState(false),
    [search, setSearch] = useState(""),
    [error, setError] = useState(""),
    [sending, setSending] = useState(false),
    [mobileThread, setMobileThread] = useState(false),
    bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let live = true;
    loadConversations()
      .then((rows) => {
        if (!live) return;
        setConversations(rows);
        const requested = params.get("conversation"),
          first =
            rows.find((row) => row.id === requested)?.id || rows[0]?.id || "";
        setSelected(first);
        setLoading(false);
      })
      .catch((err) => {
        if (live) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load conversations.",
          );
          setLoading(false);
        }
      });
    return () => {
      live = false;
    };
  }, [params]);
  useEffect(() => {
    if (!selected) return;
    let live = true;
    loadMessages(selected)
      .then((rows) => {
        if (live) {
          setMessages(rows);
          setThreadLoading(false);
          markConversationRead(selected);
        }
      })
      .catch((err) => {
        if (live) {
          setError(
            err instanceof Error ? err.message : "Could not load messages.",
          );
          setThreadLoading(false);
        }
      });
    const stop = subscribeToMessages(selected, (message) =>
      setMessages((current) =>
        current.some((item) => item.id === message.id)
          ? current
          : [...current, message],
      ),
    );
    return () => {
      live = false;
      stop();
    };
  }, [selected]);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  const active = conversations.find((item) => item.id === selected),
    filtered = useMemo(
      () =>
        conversations.filter((item) =>
          item.partnerName.toLowerCase().includes(search.toLowerCase()),
        ),
      [conversations, search],
    );
  function choose(id: string) {
    setThreadLoading(true);
    setSelected(id);
    setMobileThread(true);
    setConversations((items) =>
      items.map((item) =>
        item.id === id ? { ...item, unreadCount: 0 } : item,
      ),
    );
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      input = form.elements.namedItem("message") as HTMLTextAreaElement,
      body = input.value.trim();
    if (!body || !selected) return;
    setSending(true);
    try {
      await sendMessage(selected, body, user?.id);
      input.value = "";
      setMessages(await loadMessages(selected));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Message could not be sent.",
      );
    } finally {
      setSending(false);
    }
  }
  async function confirm() {
    if (!active?.session) return;
    try {
      await confirmExchange(active.session.id, "confirm");
      setConversations(await loadConversations());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not confirm completion.",
      );
    }
  }
  return (
    <section
      className={`chat-page ${mobileThread ? "mobile-thread-open" : ""}`}
    >
      <aside className="conversation-list">
        <header>
          <div>
            <div className="eyebrow">
              <MessageCircle /> Learning together
            </div>
            <h1>Messages</h1>
          </div>
          <span>
            {conversations.reduce((sum, item) => sum + item.unreadCount, 0)}{" "}
            unread
          </span>
        </header>
        <label>
          <Search />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations…"
          />
        </label>
        {loading ? (
          <div className="conversation-loading">
            {[1, 2, 3, 4].map((i) => (
              <span key={i} />
            ))}
          </div>
        ) : filtered.length ? (
          <nav>
            {filtered.map((item) => (
              <button
                className={selected === item.id ? "active" : ""}
                key={item.id}
                onClick={() => choose(item.id)}
              >
                <span className="conversation-avatar">
                  {item.partnerName
                    .split(" ")
                    .map((v) => v[0])
                    .join("")
                    .slice(0, 2)}
                  <i />
                </span>
                <div>
                  <strong>{item.partnerName}</strong>
                  <p>{item.lastMessage}</p>
                </div>
                <small>{time(item.lastMessageAt)}</small>
                {item.unreadCount > 0 && <b>{item.unreadCount}</b>}
              </button>
            ))}
          </nav>
        ) : (
          <div className="conversation-empty">
            <MessageCircle />
            <strong>No conversations yet.</strong>
            <p>Accepted requests open a focused space to prepare together.</p>
            <Link to="/discover">Find a match</Link>
          </div>
        )}
      </aside>
      <main className="message-thread">
        {active ? (
          <>
            <header>
              <button
                className="chat-back"
                onClick={() => setMobileThread(false)}
              >
                <ArrowLeft />
              </button>
              <span className="thread-avatar">
                {active.partnerName
                  .split(" ")
                  .map((v) => v[0])
                  .join("")
                  .slice(0, 2)}
                <i />
              </span>
              <div>
                <h2>{active.partnerName}</h2>
                <p>
                  <span /> Learning exchange active
                </p>
              </div>
              <Link to={`/profile/${active.partnerId}`}>
                <UserRound /> View profile
              </Link>
              <SafetyActions compact targetType="profile" targetId={active.partnerId} userId={active.partnerId} />
            </header>
            <div className="message-scroll">
              {threadLoading ? (
                <div className="thread-loading">
                  <LoaderCircle className="spin" /> Opening conversation…
                </div>
              ) : messages.length ? (
                messages.map((message, index) =>
                  message.type === "system" ? (
                    <div className="system-message" key={message.id}>
                      <Sparkles />
                      <span>{message.body}</span>
                      <small>{time(message.createdAt)}</small>
                    </div>
                  ) : (
                    <div
                      className={`chat-bubble ${message.senderId === user?.id || message.senderId === "preview" ? "mine" : "theirs"}`}
                      key={message.id}
                    >
                      <p>{message.body}</p>
                      <footer>
                        <span>{time(message.createdAt)}</span>
                      {message.senderId === user?.id ? <Check /> : <SafetyActions compact targetType="message" targetId={message.id} />}
                      </footer>
                      {index === messages.length - 1 &&
                        message.senderId !== user?.id && (
                          <small className="sender-name">
                            {message.senderName || active.partnerName}
                          </small>
                        )}
                    </div>
                  ),
                )
              ) : (
                <div className="thread-empty">
                  <HeartHandshake />
                  <h3>Your learning conversation starts here.</h3>
                  <p>
                    Share your goal, a useful link, or what would make the
                    session valuable.
                  </p>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
            <form className="message-composer" onSubmit={submit}>
              <textarea
                name="message"
                rows={1}
                placeholder={`Message ${active.partnerName.split(" ")[0]}…`}
                maxLength={5000}
              />
              <div>
                <span>Keep it kind, clear, and useful.</span>
                <button disabled={sending}>
                  {sending ? <LoaderCircle className="spin" /> : <Send />}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="chat-welcome">
            <span>
              <MessageCircle />
            </span>
            <h2>Choose a conversation.</h2>
            <p>
              Your accepted exchanges will appear here with everything you need
              to prepare.
            </p>
          </div>
        )}
      </main>
      <aside className="session-context">
        {active?.session ? (
          <>
            <header>
              <span>
                <Sparkles />
              </span>
              <div>
                <small>SESSION CONTEXT</small>
                <strong>{active.session.skill}</strong>
              </div>
            </header>
            <div className="context-exchange">
              <span>
                <small>LEARNING</small>
                <strong>{active.session.skill}</strong>
              </span>
              <HeartHandshake />
              <span>
                <small>
                  {active.session.offeredSkill ? "OFFERING" : "TYPE"}
                </small>
                <strong>
                  {active.session.offeredSkill ||
                    active.session.requestType.replaceAll("_", " ")}
                </strong>
              </span>
            </div>
            <div className="context-details">
              <span>
                <CalendarDays />
                <div>
                  <small>PROPOSED TIME</small>
                  <strong>
                    {new Intl.DateTimeFormat("en", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    }).format(new Date(active.session.startsAt))}
                  </strong>
                </div>
              </span>
              <span>
                <Clock3 />
                <div>
                  <small>DURATION</small>
                  <strong>{active.session.duration} minutes</strong>
                </div>
              </span>
              <span>
                <Video />
                <div>
                  <small>FORMAT</small>
                  <strong>{active.session.format}</strong>
                </div>
              </span>
              <span>
                <Coins />
                <div>
                  <small>CREDITS</small>
                  <strong>
                    {active.session.creditCost
                      ? `${active.session.creditCost} pending`
                      : "Free swap"}
                  </strong>
                </div>
              </span>
            </div>
            <div className={`context-status status-${active.session.status}`}>
              <i />
              <span>
                <small>SESSION STATUS</small>
                <strong>{active.session.status.replace("_", " ")}</strong>
              </span>
            </div>
            <Link
              className="context-session-link"
              to={`/sessions/${active.session.id}`}
            >
              Open session room <ArrowRight />
            </Link>
            {["scheduled", "in_progress"].includes(active.session.status) && (
              <button className="button button-primary" onClick={confirm}>
                <Check /> Confirm completion
              </button>
            )}
            <p className="context-safe">
              <Coins /> Credits move only after both people confirm.
            </p>
          </>
        ) : (
          <div className="context-empty">
            <CalendarDays />
            <h3>No session linked.</h3>
            <p>Accept a request to create the shared session space.</p>
          </div>
        )}
      </aside>
      {error && (
        <div className="chat-error">
          {error}
          <button onClick={() => setError("")}>×</button>
        </div>
      )}
    </section>
  );
}
