// src/components/ChatWidget.jsx (expanded with restore option)
import React, { useEffect, useRef, useState } from "react";

export default function ChatWidget({
  onSend,
  title = "עוזר קארינה",
  subtitle = "בממוצע עונים תוך דקות",
  placeholder = "כתבו הודעה…",
  suggestions = ["הצעת מחיר", "מידות", "העלאת לוגו"],
  storageKey = "karina:chat",
}) {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (saved && Array.isArray(saved)) return saved;
    } catch {}
    return [];
  });
  const [pending, setPending] = useState(false);
  const [attached, setAttached] = useState(null);

  const listRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(messages));
  }, [messages, storageKey]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open, pending]);

  function formatTime(ts) {
    try {
      return new Date(ts).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  }

  function linkify(text) {
    const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/gi;
    const parts = String(text).split(urlRegex);
    return parts.map((part, i) => {
      if (!part) return null;
      const isUrl = /^(https?:\/\/|www\.)/i.test(part);
      if (isUrl) {
        const href = part.startsWith("http") ? part : `https://${part}`;
        return (
          <a key={i} href={href} target="_blank" rel="noreferrer noopener" className="text-decoration-underline">
            {part}
          </a>
        );
      }
      return <span key={i}>{part}</span>;
    });
  }

  async function handleSend(raw) {
    const text = (raw ?? input).trim();
    if (!text && !attached) return;

    const userMsg = attached
      ? { role: "user", text, imageUrl: attached.url, fileName: attached.name, ts: Date.now() }
      : { role: "user", text, ts: Date.now() };

    setMessages((m) => [...m, userMsg]);
    setInput("");
    setAttached(null);
    inputRef.current?.focus();

    setPending(true);
    try {
      const reply = onSend
        ? await onSend(text, messages.concat(userMsg))
        : { role: "assistant", text: "קיבלתי! (MVP ללא שרת)", ts: Date.now() };

      const assistantMsg = reply?.ts ? reply : { ...reply, ts: Date.now() };
      if (assistantMsg) setMessages((m) => [...m, assistantMsg]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: "assistant", text: "חלה שגיאה. נסו שוב או פנו בטלפון.", ts: Date.now() },
      ]);
    } finally {
      setPending(false);
    }
  }

  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleAttach(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setAttached({ name: file.name, url, file });
    e.target.value = "";
  }

  async function handleClear() {
    if (window.confirm && window.confirm("לנקות את השיחה?")) {
      setMessages([]);
    }
  }

  const Header = (
    <div className="d-flex align-items-center justify-content-between p-3 border-bottom position-relative">
      <div className="d-flex align-items-center gap-2">
        <button
          className="btn btn-light shadow-sm rounded-3 px-3"
          onClick={() => setMinimized((v) => !v)}
          aria-label={minimized ? "הגדל" : "מזער"}
        >
          —
        </button>
        <button
          className="btn btn-light shadow-sm rounded-3 px-3"
          onClick={() => setOpen(false)}
          aria-label="סגור"
        >
          ✕
        </button>
      </div>
      <div className="text-center flex-grow-1 position-absolute top-50 start-50 translate-middle">
        <div className="fw-bold">{title}</div>
        <div className="text-muted small">{subtitle}</div>
      </div>
      <div className="d-flex align-items-center justify-content-end" style={{ width: 44 }}>
        <div className="rounded-circle bg-primary text-white d-inline-flex align-items-center justify-content-center" style={{ width: 32, height: 32 }}>🤖</div>
      </div>
    </div>
  );

  const EmptyState = (
    <div className="h-100 w-100 d-flex flex-column align-items-center justify-content-center text-center text-muted">
      <div className="mb-2" style={{ fontSize: 48 }}>💬</div>
      <div className="fw-bold">התחילו שיחה</div>
      <div className="small">כתבו הודעה או בחרו נושא מהיר</div>
    </div>
  );

  return (
    <>
      {!open && (
        <button
          className="btn btn-primary position-fixed shadow"
          style={{ bottom: 24, insetInlineStart: 24, borderRadius: 9999, padding: "12px 16px", zIndex: 1030 }}
          onClick={() => setOpen(true)}
          aria-label="פתח צ'ט"
        >
          💬 צ'ט
        </button>
      )}

      {open && minimized && (
        <div
          className="position-fixed shadow rounded-4 border bg-white d-flex align-items-center justify-content-between p-2"
          style={{ insetInlineStart: 24, bottom: 84, width: 280, zIndex: 1030 }}
          dir="rtl"
        >
          <div className="d-flex align-items-center gap-2" onClick={() => setMinimized(false)} style={{ cursor: "pointer" }}>
            <div className="rounded-circle bg-primary text-white d-inline-flex align-items-center justify-content-center" style={{ width: 28, height: 28 }}>🤖</div>
            <div>
              <div className="fw-bold">{title}</div>
              <div className="text-muted small">{subtitle}</div>
            </div>
          </div>
          <button className="btn btn-sm btn-light" onClick={() => setOpen(false)} aria-label="סגור">✕</button>
        </div>
      )}

      {open && !minimized && (
        <div
          className="position-fixed shadow rounded-4 border bg-white d-flex flex-column"
          style={{ insetInlineStart: 24, bottom: 84, width: 380, height: 560, zIndex: 1030 }}
          dir="rtl"
          role="dialog"
          aria-label="חלון צ'ט"
        >
          {Header}

          <div ref={listRef} className="flex-grow-1 overflow-auto p-3" style={{ background: "#f7f8fa" }}>
            {messages.length === 0 ? (
              EmptyState
            ) : (
              messages.map((m, i) => (
                <div key={i} className={`mb-2 d-flex ${m.role === "user" ? "justify-content-end" : "justify-content-start"}`}>
                  <div className={`p-2 rounded-3 ${m.role === "user" ? "bg-primary text-white" : "bg-light"}`} style={{ maxWidth: 280, whiteSpace: "pre-wrap" }}>
                    {linkify(m.text || "")}
                  </div>
                  <div className="text-muted small mt-1">{formatTime(m.ts)}</div>
                </div>
              ))
            )}
            {pending && (
              <div className="d-flex justify-content-start mb-2">
                <div className="p-2 rounded-3 bg-light" style={{ maxWidth: 280 }}>
                  כותב...
                </div>
              </div>
            )}
          </div>

          <div className="p-2 border-top">
            <div className="input-group">
              <textarea
                ref={inputRef}
                className="form-control"
                placeholder={placeholder}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                rows={2}
                aria-label="כתוב הודעה"
                disabled={pending}
                style={{ resize: "none" }}
              />
              <button className="btn btn-primary" onClick={() => handleSend()} disabled={pending} aria-label="שלח">
                {pending ? "שולח…" : "שלח"}
              </button>
            </div>
            <div className="d-flex justify-content-between align-items-center mt-1">
              <div className="small text-muted">Enter לשליחה · Shift+Enter לשורה חדשה</div>
              <button className="btn btn-link btn-sm text-danger" onClick={handleClear}>נקה</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}