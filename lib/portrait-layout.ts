import type { CSSProperties } from "react";
import portrait from "./portrait.json";

type Rect = readonly number[];
type ArtStyle = CSSProperties & Record<`--portrait-${string}`, string>;

/** Map a PDF overlay through the crop used to compose its portrait page. */
export function portraitOverlay(page: number, box: Rect): ArtStyle {
  const match = portrait[page - 1].placements.find(
    ({ source }) =>
      box[0] >= source[0] - 1 &&
      box[1] >= source[1] - 1 &&
      box[0] + box[2] <= source[2] + 1 &&
      box[1] + box[3] <= source[3] + 1,
  );
  if (!match) return { "--portrait-display": "none" };
  const { source, target } = match;
  const scale = target[2] / (source[2] - source[0]);
  return {
    "--portrait-left": `${(target[0] + (box[0] - source[0]) * scale) / 10.8}%`,
    "--portrait-top": `${(target[1] + (box[1] - source[1]) * scale) / 19.2}%`,
    "--portrait-width": `${(box[2] * scale) / 10.8}%`,
    "--portrait-height": `${(box[3] * scale) / 19.2}%`,
    "--portrait-display": "block",
  };
}
