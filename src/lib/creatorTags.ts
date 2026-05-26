/**
 * Kuratert liste av creator-tagger som sponsorer kan filtrere på.
 *
 * Holdes statisk for å unngå tag-eksplosjon. Hvis vi ser etterspørsel etter
 * en tag som mangler, legges den til her — gjennomtenkt og konsistent.
 */
export interface CreatorTag {
  slug:  string;
  label: string;
  emoji: string;
}

export const CREATOR_TAGS: CreatorTag[] = [
  { slug: "streamer",  label: "Streamer",       emoji: "🎮" },
  { slug: "gaming",    label: "Gaming",         emoji: "🕹️" },
  { slug: "esport",    label: "Esport",         emoji: "🏆" },
  { slug: "livsstil",  label: "Livsstil",       emoji: "✨" },
  { slug: "reise",     label: "Reise",          emoji: "✈️" },
  { slug: "mat",       label: "Mat & drikke",   emoji: "🍳" },
  { slug: "fisking",   label: "Fisking",        emoji: "🎣" },
  { slug: "friluft",   label: "Friluftsliv",    emoji: "🏔️" },
  { slug: "mote",      label: "Mote",           emoji: "👗" },
  { slug: "musikk",    label: "Musikk",         emoji: "🎵" },
  { slug: "sport",     label: "Sport",          emoji: "⚽" },
  { slug: "trening",   label: "Trening",        emoji: "💪" },
  { slug: "laering",   label: "Læring",         emoji: "📚" },
  { slug: "tech",      label: "Tech",           emoji: "💻" },
  { slug: "kunst",     label: "Kunst & design", emoji: "🎨" },
  { slug: "foreldre",  label: "Foreldreliv",    emoji: "👶" },
  { slug: "kjaeledyr", label: "Kjæledyr",       emoji: "🐾" },
  { slug: "okonomi",   label: "Økonomi",        emoji: "💰" },
  { slug: "humor",     label: "Humor",          emoji: "😂" },
  { slug: "podcast",   label: "Podcast",        emoji: "🎙️" },
];

export const TAG_BY_SLUG: Record<string, CreatorTag> = Object.fromEntries(
  CREATOR_TAGS.map((t) => [t.slug, t]),
);

/** Returnerer kun gyldige slugs fra en string-array (filtrerer ut ugyldige). */
export function sanitizeTags(input: string[] | undefined | null): string[] {
  if (!input || !Array.isArray(input)) return [];
  return input.filter((s) => typeof s === "string" && s in TAG_BY_SLUG).slice(0, 6);
}

/** Maks-grense per creator — for å unngå "alle tags"-spam */
export const MAX_TAGS_PER_CREATOR = 6;
