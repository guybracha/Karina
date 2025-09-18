// src/components/ChatWidget.jsx
import React, { useEffect, useRef, useState, useMemo } from "react";

/** ========= Utilities ========= */
function formatTime(ts) {
  try {
    return new Date(ts).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function linkify(text) {
  const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/gi;
  const parts = String(text || "").split(urlRegex);
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

/** ========= Subcomponents ========= */
function TypingIndicator() {
  return (
    <div className="d-flex justify-content-start mb-2">
      <div className="p-2 rounded-3 bg-light" style={{ maxWidth: 280 }}>
        <div className="d-inline-flex align-items-center gap-1">
          <span className="visually-hidden">כותב...</span>
          <span className="typing-dot" />
          <span className="typing-dot" />
          <span className="typing-dot" />
        </div>
      </div>
    </div>
  );
}

function QuickReplies({ suggestions = [], onPick }) {
  if (!suggestions?.length) return null;
  return (
    <div className="d-flex flex-wrap gap-2 mt-3 justify-content-center">
      {suggestions.map((s, i) => (
        <button
          key={i}
          type="button"
          className="btn btn-outline-primary btn-sm"
          onClick={() => onPick?.(s)}
        >
          {s}
        </button>
      ))}
    </div>
  );
}

function MessageBubble({ role, text, ts, children }) {
  const isUser = role === "user";
  return (
    <div className={`mb-2 d-flex ${isUser ? "justify-content-end" : "justify-content-start"}`}>
      <div
        className={`p-2 rounded-3 ${isUser ? "bg-primary text-white" : "bg-light"}`}
        style={{ maxWidth: 280, whiteSpace: "pre-wrap" }}
      >
        {linkify(text)}
        {children}
      </div>
      <div className="text-muted small mt-1 ms-2 me-2">{formatTime(ts)}</div>
    </div>
  );
}

function AssistantOptions({ options = [], onSelect }) {
  if (!options?.length) return null;
  return (
    <div className="mt-2 d-flex flex-wrap gap-2">
      {options.map((opt, i) => (
        <button
          key={i}
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={() => onSelect?.(opt)}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function FileThumb({ fileName, url, onRemove }) {
  return (
    <div className="d-flex align-items-center gap-2 border rounded px-2 py-1">
      <span className="bi bi-paperclip" aria-hidden="true" />
      <a href={url} target="_blank" rel="noreferrer" className="small text-decoration-underline">
        {fileName}
      </a>
      <button
        type="button"
        className="btn btn-sm btn-link text-danger p-0"
        onClick={onRemove}
        aria-label="הסר קובץ"
      >
        ✕
      </button>
    </div>
  );
}
function ConfirmModal({
  open,
  title,
  body,
  confirmText = "נקה",
  cancelText = "בטל",
  onConfirm,
  onCancel
}) {
  if (!open) return null;

  function handleBackdropClick(e) {
    // נסגור רק אם לחצו מחוץ לכרטיס
    if (e.target === e.currentTarget) onCancel?.();
  }

  return (
    <div
      className="modal-portal"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 3000,               // גבוה יותר מהצ'ט (שהוא ~1030)
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}
      onMouseDown={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      {/* Backdrop כהה + טשטוש */}
      <div
        className="modal-backdrop-custom"
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(15, 23, 42, 0.45)", // navy/black שקוף
          backdropFilter: "blur(3px)",
          WebkitBackdropFilter: "blur(3px)"
        }}
      />

      {/* כרטיס המודל */}
      <div
        className="card shadow-lg border-0 modal-card-contrast"
        style={{
          position: "relative",
          width: "min(92vw, 460px)",
          borderRadius: "16px",
          background: "#ffffff",
          boxShadow: "0 20px 55px rgba(0,0,0,0.35)",
          border: "1px solid rgba(0,0,0,0.06)",
          transform: "scale(1)",
          animation: "modalPop .14s ease-out"
        }}
        dir="rtl"
      >
        <div className="card-header fw-bold bg-white border-0 pb-0" id="confirm-title" style={{fontSize: 18}}>
          {title}
        </div>
        <div className="card-body text-secondary" style={{fontSize: 15}}>
          {body}
        </div>
        <div className="card-footer bg-white border-0 d-flex justify-content-end gap-2 pt-0">
          <button type="button" className="btn btn-light" onClick={onCancel}>
            {cancelText}
          </button>
          <button type="button" className="btn btn-danger" onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>

      {/* אנימציה קצרה */}
      <style>{`
        @keyframes modalPop {
          from { transform: scale(.98); opacity: .7; }
          to   { transform: scale(1);    opacity: 1;  }
        }
      `}</style>
    </div>
  );
}


function ChatInput({
  placeholder,
  pending,
  input,
  setInput,
  onSend,
  onAttach,
  attached,
  removeAttachment,
  inputRef,
  onKeyDown,
}) {
  return (
    <>
      {/* Attachment preview row */}
      {attached && (
        <div className="mb-2">
          <FileThumb fileName={attached.name} url={attached.url} onRemove={removeAttachment} />
        </div>
      )}

      <div className="input-group">
        <button
          type="button"
          className="btn btn-light border"
          aria-label="העלה קובץ"
          onClick={() => document.getElementById("chat-file-input")?.click()}
          disabled={pending}
          title="צרף קובץ"
        >
          📎
        </button>
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
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => onSend()}
          disabled={pending}
          aria-label="שלח"
        >
          {pending ? "שולח…" : "שלח"}
        </button>
      </div>

      {/* hidden file input */}
      <input
        id="chat-file-input"
        type="file"
        className="d-none"
        onChange={onAttach}
        aria-hidden="true"
      />

      <div className="d-flex justify-content-between align-items-center mt-1">
        <div className="small text-muted">Enter לשליחה · Shift+Enter לשורה חדשה</div>
      </div>
    </>
  );
}

/** ========= Main Widget ========= */
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
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [snapshot, setSnapshot] = useState(null); // לשחזור שיחה שנוקתה

  const listRef = useRef(null);
  const inputRef = useRef(null);

  // Persist
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(messages));
  }, [messages, storageKey]);

  // Autoscroll
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open, pending]);

  // Keyboard send
  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // Attachment
  function handleAttach(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setAttached({ name: file.name, url, file });
    e.target.value = "";
  }
  function removeAttachment() {
    setAttached(null);
  }

  // Core send
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
        : { role: "assistant", text: "קיבלתי! (MVP ללא שרת)", ts: Date.now(), options: ["פרטים ליצירת קשר", "הצעת מחיר", "זמני אספקה"] };

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

  // Clear with snapshot & restore
  function askClear() {
    setShowClearConfirm(true);
  }
  function confirmClear() {
    setSnapshot(messages); // שמור לשחזור
    setMessages([]);
    setShowClearConfirm(false);
  }
  function cancelClear() {
    setShowClearConfirm(false);
  }
  function restoreLast() {
    if (snapshot?.length) {
      setMessages(snapshot);
      setSnapshot(null);
    }
  }

  // Header
  const Header = useMemo(() => (
    <div className="d-flex align-items-center justify-content-between p-3 border-bottom position-relative">
      <div className="d-flex align-items-center gap-2">
        <button
          className="btn btn-light shadow-sm rounded-3 px-3"
          onClick={() => setMinimized((v) => !v)}
          aria-label={minimized ? "הגדל" : "מזער"}
          type="button"
        >
          —
        </button>
        <button
          className="btn btn-light shadow-sm rounded-3 px-3"
          onClick={() => setOpen(false)}
          aria-label="סגור"
          type="button"
        >
          ✕
        </button>
      </div>
      <div className="text-center flex-grow-1 position-absolute top-50 start-50 translate-middle">
        <div className="fw-bold">{title}</div>
        <div className="text-muted small">{subtitle}</div>
      </div>
      <div className="d-flex align-items-center justify-content-end" style={{ width: 44 }}>
        <div
          className="rounded-circle bg-primary text-white d-inline-flex align-items-center justify-content-center"
          style={{ width: 32, height: 32 }}
        >
          🤖
        </div>
      </div>
    </div>
  ), [minimized, subtitle, title]);

  const EmptyState = (
    <div className="h-100 w-100 d-flex flex-column align-items-center justify-content-center text-center text-muted">
      <div className="mb-2" style={{ fontSize: 48 }}>💬</div>
      <div className="fw-bold">התחילו שיחה</div>
      <div className="small">כתבו הודעה או בחרו נושא מהיר</div>
      <QuickReplies suggestions={suggestions} onPick={(s) => handleSend(s)} />
      {!!snapshot?.length && (
        <button type="button" className="btn btn-link mt-2" onClick={restoreLast}>
          שחזר שיחה שנמחקה
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* Open Button */}
      {!open && (
        <button
          type="button"
          className="btn btn-primary position-fixed shadow"
          style={{ bottom: 24, insetInlineStart: 24, borderRadius: 9999, padding: "12px 16px", zIndex: 1030 }}
          onClick={() => setOpen(true)}
          aria-label="פתח צ'ט"
        >
          💬 צ'ט
        </button>
      )}

      {/* Minimized Bar */}
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
          <button className="btn btn-sm btn-light" onClick={() => setOpen(false)} aria-label="סגור" type="button">✕</button>
        </div>
      )}

      {/* Full Dialog */}
      {open && !minimized && (
        <div
          className="position-fixed shadow rounded-4 border bg-white d-flex flex-column"
          style={{ insetInlineStart: 24, bottom: 84, width: 380, height: 560, zIndex: 1030 }}
          dir="rtl"
          role="dialog"
          aria-label="חלון צ'ט"
        >
          {Header}

          {/* Messages area */}
          <div ref={listRef} className="flex-grow-1 overflow-auto p-3" style={{ background: "#f7f8fa" }}>
            {messages.length === 0 ? (
              EmptyState
            ) : (
              <>
                {messages.map((m, i) => {
                  const isAssistant = m.role === "assistant";
                  return (
                    <MessageBubble key={i} role={m.role} text={m.text} ts={m.ts}>
                      {/* תמונת קובץ שנשלחה על-ידי המשתמש */}
                      {m.imageUrl && m.role === "user" && (
                        <div className="mt-2">
                          <a href={m.imageUrl} target="_blank" rel="noreferrer" className="small text-decoration-underline">
                            קובץ מצורף: {m.fileName || "file"}
                          </a>
                        </div>
                      )}
                      {/* כפתורי אפשרויות של העוזר */}
                      {isAssistant && m.options?.length > 0 && (
                        <AssistantOptions
                          options={m.options}
                          onSelect={(opt) => handleSend(opt)}
                        />
                      )}
                    </MessageBubble>
                  );
                })}
                {pending && <TypingIndicator />}
              </>
            )}
          </div>

          {/* Input area */}
          <div className="p-2 border-top">
            <ChatInput
              placeholder={placeholder}
              pending={pending}
              input={input}
              setInput={setInput}
              onSend={handleSend}
              onAttach={handleAttach}
              attached={attached}
              removeAttachment={removeAttachment}
              inputRef={inputRef}
              onKeyDown={onKeyDown}
            />
            <div className="d-flex justify-content-between align-items-center mt-1">
              <div className="small text-muted" />
              <div className="d-flex gap-2">
                {messages.length > 0 && (
                  <button type="button" className="btn btn-link btn-sm text-danger" onClick={askClear}>
                    נקה
                  </button>
                )}
                {!!snapshot?.length && messages.length === 0 && (
                  <button type="button" className="btn btn-link btn-sm" onClick={restoreLast}>
                    שחזר
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clear confirm modal */}
      <ConfirmModal
        open={showClearConfirm}
        title="לנקות את השיחה?"
        body="התכתובת תישמר זמנית לשחזור עד שתפתח שיחה חדשה."
        confirmText="נקה"
        cancelText="ביטול"
        onConfirm={confirmClear}
        onCancel={cancelClear}
      />

      {/* Minimal styling for typing dots */}
      <style>{`
        .typing-dot {
          width: 6px; height: 6px; border-radius: 50%;
          display: inline-block; background: #999;
          animation: typingBlink 1.4s infinite both;
          margin-inline: 2px;
        }
        .typing-dot:nth-child(2) { animation-delay: .2s; }
        .typing-dot:nth-child(3) { animation-delay: .4s; }
        @keyframes typingBlink {
          0%, 80%, 100% { opacity: 0; }
          40% { opacity: 1; }
        }
      `}</style>
    </>
  );
}
