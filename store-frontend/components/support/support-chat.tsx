"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SupportChatMessage } from "./support-chat-message";
import {
  AUTO_REPLY,
  INITIAL_MESSAGES,
  REPLY_DELAY_MS,
  timeLabel,
  type Message,
} from "./support-chat-data";
import styles from "./support-chat.module.css";

/**
 * Support chat — client-only, visual port of the static chat window in the
 * "پشتیبانی" source folder.
 *
 * The source script (`sendMsg`) appended an outgoing bubble and, 900ms later, a
 * canned assistant answer, both through createElement/innerHTML. The same
 * behaviour is plain React state here: text is rendered as text, nothing is
 * sent anywhere and no storage is touched.
 */
export function SupportChat() {
  const [messages, setMessages] = useState<Message[]>(() => [...INITIAL_MESSAGES]);
  const [draft, setDraft] = useState("");
  /** The thread element the source scrolled to its end after every append. */
  const threadRef = useRef<HTMLDivElement | null>(null);
  /** Ids of the appended bubbles; the four initial ones are 1…4. */
  const nextIdRef = useRef(INITIAL_MESSAGES.length + 1);
  /** Pending auto-reply timers, cleared when the page is left. */
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const timer of timers) {
        window.clearTimeout(timer);
      }
      timers.length = 0;
    };
  }, []);

  // The source set scrollTop = scrollHeight after every append.
  useEffect(() => {
    const thread = threadRef.current;
    if (thread !== null) {
      thread.scrollTop = thread.scrollHeight;
    }
  }, [messages]);

  const send = useCallback(() => {
    const text = draft.trim();
    if (text === "") {
      return; // the source ignored empty/blank input
    }
    const time = timeLabel();
    setMessages((previous) => [
      ...previous,
      { id: nextIdRef.current++, side: "outgoing", text, time, seen: true },
    ]);
    setDraft("");

    timersRef.current.push(
      window.setTimeout(() => {
        setMessages((previous) => [
          ...previous,
          { id: nextIdRef.current++, side: "incoming", text: AUTO_REPLY, time, seen: false },
        ]);
      }, REPLY_DELAY_MS),
    );
  }, [draft]);

  return (
    <div className={styles.root}>
      <div className={styles.chatWrap}>
        {/* Header: avatar with its online dot, name/status and the decorative
            "⋯" button (the source gave it no handler either). */}
        <div className={styles.chatHeader}>
          <div className={styles.avatarWrap}>
            <div className={styles.avatar}>AI</div>
            <span className={styles.onlineDot} />
          </div>
          <div className={styles.info}>
            <div className={styles.name}>Assistant</div>
            <div className={styles.status}>Online</div>
          </div>
          <button type="button" className={styles.moreBtn} aria-label="More options">
            ⋯
          </button>
        </div>

        <div
          ref={threadRef}
          role="log"
          aria-label="Messages"
          className={styles.messages}
        >
          {messages.map((message) => (
            <SupportChatMessage key={message.id} message={message} />
          ))}
        </div>

        <div className={styles.chatInput}>
          <input
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                send();
              }
            }}
            placeholder="Type a message…"
            aria-label="Type a message"
          />
          <button
            type="button"
            className={styles.sendBtn}
            onClick={send}
            aria-label="Send message"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              aria-hidden="true"
              focusable="false"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
