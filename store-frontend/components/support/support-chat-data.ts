/**
 * Static data and shared types of the support chat.
 *
 * Nothing here is fetched or stored: the four bubbles and the canned answer are
 * exactly the ones the static source shipped with, and `timeLabel` produces the
 * same label its script built with toLocaleTimeString([], {hour, minute}).
 */

/** Side of the thread a bubble belongs to. */
export type Side = "incoming" | "outgoing";

/** One bubble: its text, the label below it and (outgoing only) the ticks. */
export type Message = {
  id: number;
  side: Side;
  text: string;
  time: string;
  /** The source's "✓✓" only appears on the visitor's own messages. */
  seen: boolean;
};

/** The four bubbles the static markup shipped with. */
export const INITIAL_MESSAGES: readonly Message[] = [
  {
    id: 1,
    side: "incoming",
    text: "Hey! How can I help you today? 👋",
    time: "9:41 AM",
    seen: false,
  },
  {
    id: 2,
    side: "outgoing",
    text: "I need help designing a landing page",
    time: "9:42 AM",
    seen: true,
  },
  {
    id: 3,
    side: "incoming",
    // Source: "…landing page:<br><br>1. …<br>2. …<br>3. …".
    text:
      "Sure! Here are a few tips for a great landing page:\n\n" +
      "1. Clear headline above the fold\n" +
      "2. Single call-to-action button\n" +
      "3. Social proof (testimonials)",
    time: "9:42 AM",
    seen: false,
  },
  {
    id: 4,
    side: "outgoing",
    text: "That's really helpful, thanks!",
    time: "9:43 AM",
    seen: true,
  },
];

/** The canned answer the source script queued after a visitor message. */
export const AUTO_REPLY = "Got it! Let me look into that for you… 🔍";

/** Delay the source used before appending that answer. */
export const REPLY_DELAY_MS = 900;

/** Same label the source produced: toLocaleTimeString([], {hour, minute}). */
export function timeLabel(): string {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
