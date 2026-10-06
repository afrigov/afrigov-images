/**
 * The kinds of image on an afrigov page, with the widths to make and the weight limit for the
 * largest one. The limits match https://afrigov.dev/styles/images.html
 */
export interface Kind {
  name: KindName;
  /** What it is, for the help text. */
  label: string;
  /** Widths to make, smallest first. For a logo these are heights. */
  sizes: number[];
  /** "width" for photographs, "height" for logos, which are set by height. */
  by: "width" | "height";
  /** The most the largest copy may weigh, in bytes. */
  limit: number;
  /** The sizes attribute: how wide the image is shown on each screen. Empty for a logo. */
  shown: string;
  /** Whether the image is usually in the first screen, so it should not wait to load. */
  eager: boolean;
}

export type KindName = "hero" | "wide" | "card" | "portrait" | "thumb" | "flyer" | "logo";

const KB = 1024;

export const KINDS: Record<KindName, Kind> = {
  hero: {
    name: "hero",
    label: "Hero or cover photograph",
    sizes: [480, 960, 1600],
    by: "width",
    limit: 150 * KB,
    shown: "100vw",
    eager: true,
  },
  wide: {
    name: "wide",
    label: "Image beside text, or in a news article",
    sizes: [480, 800],
    by: "width",
    limit: 80 * KB,
    shown: "(min-width: 64em) 50vw, 100vw",
    eager: false,
  },
  card: {
    name: "card",
    label: "Card picture or video poster",
    sizes: [320, 640],
    by: "width",
    limit: 40 * KB,
    shown: "(min-width: 64em) 33vw, (min-width: 48em) 50vw, 100vw",
    eager: false,
  },
  portrait: {
    name: "portrait",
    label: "Portrait",
    sizes: [240, 480],
    by: "width",
    limit: 40 * KB,
    shown: "(min-width: 48em) 25vw, 50vw",
    eager: false,
  },
  thumb: {
    name: "thumb",
    label: "List thumbnail",
    sizes: [120, 240],
    by: "width",
    limit: 15 * KB,
    shown: "120px",
    eager: false,
  },
  flyer: {
    name: "flyer",
    label: "Event flyer",
    sizes: [400, 800],
    by: "width",
    limit: 120 * KB,
    shown: "(min-width: 48em) 16rem, 100vw",
    eager: false,
  },
  logo: {
    name: "logo",
    label: "Logo or mark, set by height",
    sizes: [56, 112],
    by: "height",
    limit: 20 * KB,
    shown: "",
    eager: false,
  },
};

export const KIND_NAMES = Object.keys(KINDS) as KindName[];

export function isKind(value: string): value is KindName {
  return Object.prototype.hasOwnProperty.call(KINDS, value);
}
