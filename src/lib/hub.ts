/**
 * Server-Sent Events hub — single-process pub/sub for realtime updates.
 * Topics: "leaderboard", "competitions", "config".
 */

type Listener = (payload: string) => void;

const g = globalThis as unknown as { tapHub?: Map<string, Set<Listener>> };
const channels = g.tapHub ?? new Map<string, Set<Listener>>();
g.tapHub = channels;

export function subscribe(topic: string, fn: Listener) {
  if (!channels.has(topic)) channels.set(topic, new Set());
  channels.get(topic)!.add(fn);
  return () => {
    channels.get(topic)?.delete(fn);
  };
}

export function publish(topic: string, data: Record<string, unknown>) {
  const set = channels.get(topic);
  if (!set || set.size === 0) return;
  const payload = JSON.stringify(data);
  for (const fn of set) {
    try {
      fn(payload);
    } catch {
      /* dropped listener */
    }
  }
}
