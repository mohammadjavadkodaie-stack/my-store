import type { Message } from "./support-chat-data";
import styles from "./support-chat.module.css";

/**
 * One bubble of the support thread: the text plus the time label under it,
 * which carries the source's "✓✓" on the visitor's own messages.
 *
 * The text is always rendered as plain text — the source injected it with
 * innerHTML, this port never does.
 */
export function SupportChatMessage({ message }: { message: Message }) {
  const side = message.side === "incoming" ? styles.incoming : styles.outgoing;

  return (
    <div className={`${styles.msg} ${side}`}>
      <div className={styles.bubble}>{message.text}</div>
      <div className={styles.time}>
        {message.seen ? `${message.time} ✓✓` : message.time}
      </div>
    </div>
  );
}
