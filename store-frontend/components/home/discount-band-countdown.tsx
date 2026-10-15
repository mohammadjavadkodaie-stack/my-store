"use client";

import { useEffect, useState } from "react";

/**
 * Live countdown of the home discount band: three white boxes with dark
 * HH : MM : SS digits and white colons between them.
 *
 * The remaining time is derived from the two server-provided ISO timestamps —
 * the band's `timerEndsAt` and the `serverNow` captured when the settings were
 * fetched — so a visitor whose clock is off still sees the real remaining time.
 * The offset between the server clock and the client clock is sampled once when
 * the component mounts, and every later tick corrects for it. The interval is
 * cleared on unmount and the timer renders nothing once it reaches zero.
 *
 * The very first render (also the server render) uses `timerEndsAt - serverNow`,
 * a pure function of the props, so the markup hydrates without a mismatch.
 */

/** Persian digits, always two per part (e.g. 5 -> "۰۵"). */
const pad2 = new Intl.NumberFormat("fa-IR", {
  minimumIntegerDigits: 2,
  useGrouping: false,
});

/** One white rounded box with a dark bold digit pair. */
const BOX_CLASS =
  "flex h-8 min-w-8 items-center justify-center rounded-lg bg-background px-1.5 text-sm font-extrabold tabular-nums text-foreground";
/** The white colon sitting between two boxes. */
const COLON_CLASS = "text-sm font-bold text-primary-foreground";

type DiscountBandCountdownProps = {
  /** ISO-8601 end of the countdown (GET /settings/discount-band). */
  endsAt: string;
  /** ISO-8601 server clock at response time, used to correct client skew. */
  serverNow: string;
};

/** Splits a positive number of milliseconds into whole hours/minutes/seconds. */
function splitDuration(totalMs: number): {
  hours: number;
  minutes: number;
  seconds: number;
} {
  const totalSeconds = Math.floor(totalMs / 1000);
  return {
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

export function DiscountBandCountdown({
  endsAt,
  serverNow,
}: DiscountBandCountdownProps) {
  const endMs = Date.parse(endsAt);
  const serverNowMs = Date.parse(serverNow);

  // Deterministic first paint: both timestamps are props, so the server and the
  // client render the same remaining time and hydration stays clean.
  const [remainingMs, setRemainingMs] = useState(() =>
    Number.isFinite(endMs) && Number.isFinite(serverNowMs)
      ? endMs - serverNowMs
      : 0,
  );

  useEffect(() => {
    if (!Number.isFinite(endMs) || !Number.isFinite(serverNowMs)) {
      return;
    }
    // Sampled once: how far ahead the client clock is of the server clock.
    const clockSkewMs = Date.now() - serverNowMs;
    const tick = () => setRemainingMs(endMs - (Date.now() - clockSkewMs));
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [endMs, serverNowMs]);

  if (!Number.isFinite(remainingMs) || remainingMs <= 0) {
    return null;
  }

  const { hours, minutes, seconds } = splitDuration(remainingMs);

  return (
    <div
      role="timer"
      aria-label="زمان باقی‌مانده تا پایان تخفیف"
      className="flex items-center gap-1"
    >
      <span aria-hidden="true" className={BOX_CLASS}>
        {pad2.format(hours)}
      </span>
      <span aria-hidden="true" className={COLON_CLASS}>
        :
      </span>
      <span aria-hidden="true" className={BOX_CLASS}>
        {pad2.format(minutes)}
      </span>
      <span aria-hidden="true" className={COLON_CLASS}>
        :
      </span>
      <span aria-hidden="true" className={BOX_CLASS}>
        {pad2.format(seconds)}
      </span>
    </div>
  );
}
