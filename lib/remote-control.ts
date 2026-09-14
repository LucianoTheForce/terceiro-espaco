export type RemoteCommand =
  | { type: "next" | "previous" | "pause" | "play" }
  | { type: "goto"; index: number };

export type RemoteState = {
  type: "state";
  current: number;
  paused: boolean;
  tv: boolean;
  pages: { number: number; title: string }[];
};

export function isCommand(value: unknown): value is RemoteCommand {
  if (
    !value ||
    typeof value !== "object" ||
    !("type" in value) ||
    typeof value.type !== "string"
  )
    return false;
  if (["next", "previous", "pause", "play"].includes(String(value.type)))
    return true;
  return (
    value.type === "goto" &&
    "index" in value &&
    Number.isInteger(value.index) &&
    Number(value.index) >= 0 &&
    Number(value.index) < 45
  );
}

export function isRemoteState(value: unknown): value is RemoteState {
  if (!value || typeof value !== "object") return false;
  const state = value as RemoteState;
  return (
    state.type === "state" &&
    typeof state.paused === "boolean" &&
    typeof state.tv === "boolean" &&
    Array.isArray(state.pages) &&
    state.pages.length > 0 &&
    state.pages.length <= 45 &&
    Number.isInteger(state.current) &&
    state.current >= 0 &&
    state.current < state.pages.length &&
    state.pages.every(
      (page) =>
        page &&
        Number.isInteger(page.number) &&
        page.number >= 1 &&
        page.number <= 45 &&
        typeof page.title === "string" &&
        page.title.length < 1000,
    )
  );
}
