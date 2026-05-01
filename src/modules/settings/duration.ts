// Phase 3 (#5989) duration parsing for the connection-mode timeout
// inputs. Accepts Go-style duration syntax ("1h30m", "5m", "30s") OR
// raw integer seconds for backwards-compat with Phase 1+2 inputs.

// Parses a duration string into seconds. Returns null on parse error
// or empty input. Explicit "0s" returns 0 (= "disabled"). Pure-integer
// input is treated as seconds for backwards-compat.
export function parseDuration(input: string): number | null {
  const trimmed = input.trim().toLowerCase();
  if (trimmed === "") return null;

  // Pure integer = seconds
  if (/^\d+$/.test(trimmed)) return parseInt(trimmed, 10);

  // Go-style "1h30m45s" -- at least one component must be present
  const m = trimmed.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (!m) return null;
  const h = m[1] ? parseInt(m[1], 10) : 0;
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const s = m[3] ? parseInt(m[3], 10) : 0;
  // Reject "" matched (regex matches empty too)
  if (h === 0 && min === 0 && s === 0 && !/^0[hms]/.test(trimmed)) {
    return null;
  }
  return h * 3600 + min * 60 + s;
}

// Formats seconds into the most-natural Go-style string. 0 -> "0s".
export function formatDuration(seconds: number): string {
  if (seconds === 0) return "0s";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  let r = "";
  if (h > 0) r += `${h}h`;
  if (m > 0) r += `${m}m`;
  if (s > 0) r += `${s}s`;
  return r;
}
