export const BANNER_PRESETS = [
  {
    id:    "violet-dark",
    label: "Lilla natt",
    css:   "linear-gradient(135deg, #1e1b4b 0%, #4c1d95 50%, #1e1b4b 100%)",
  },
  {
    id:    "blue-ocean",
    label: "Havdyp",
    css:   "linear-gradient(135deg, #0c1445 0%, #1e40af 50%, #0891b2 100%)",
  },
  {
    id:    "green-forest",
    label: "Mørk skog",
    css:   "linear-gradient(135deg, #052e16 0%, #166534 50%, #14532d 100%)",
  },
  {
    id:    "red-fire",
    label: "Ild",
    css:   "linear-gradient(135deg, #450a0a 0%, #991b1b 50%, #c2410c 100%)",
  },
  {
    id:    "pink-sunset",
    label: "Solnedgang",
    css:   "linear-gradient(135deg, #4a044e 0%, #be185d 50%, #f97316 100%)",
  },
] as const;

export type BannerPresetId = typeof BANNER_PRESETS[number]["id"];

export const AVATAR_PRESETS = [
  {
    id:    "gaming",
    label: "Gaming",
    emoji: "🎮",
    bg:    "linear-gradient(135deg, #4c1d95, #7c3aed)",
  },
  {
    id:    "music",
    label: "Musikk",
    emoji: "🎵",
    bg:    "linear-gradient(135deg, #1e3a5f, #2563eb)",
  },
  {
    id:    "fire",
    label: "Ild",
    emoji: "🔥",
    bg:    "linear-gradient(135deg, #7f1d1d, #dc2626)",
  },
  {
    id:    "star",
    label: "Stjerne",
    emoji: "⭐",
    bg:    "linear-gradient(135deg, #713f12, #d97706)",
  },
  {
    id:    "rocket",
    label: "Rakett",
    emoji: "🚀",
    bg:    "linear-gradient(135deg, #0c4a6e, #0891b2)",
  },
] as const;

export type AvatarPresetId = typeof AVATAR_PRESETS[number]["id"];
