export interface Upgrade {
  id:             string;
  name:           string;
  emoji:          string;
  world:          number;
  baseCost:       number;
  costMultiplier: number;
  coinsPerClick:  number;
  coinsPerSecond: number;
  maxLevel:       number;
  description:    string;
}

export interface WorldDef {
  name:         string;
  emoji:        string;
  color:        string;
  prestigeCost: number;   // 0 = final world, no prestige
  fanpassCoins: number;
  badge:        string;
}

export const WORLDS: Record<number, WorldDef> = {
  1: { name: "Tech",       emoji: "🖥️",  color: "violet", prestigeCost:              5_000_000, fanpassCoins:  500, badge: "💻" },
  2: { name: "Eventyr",    emoji: "⚔️",  color: "amber",  prestigeCost:             50_000_000, fanpassCoins: 1000, badge: "🗡️" },
  3: { name: "Romfart",    emoji: "🚀",  color: "cyan",   prestigeCost:            500_000_000, fanpassCoins: 2000, badge: "🌌" },
  4: { name: "Dyphavet",   emoji: "🌊",  color: "blue",   prestigeCost:          5_000_000_000, fanpassCoins: 3500, badge: "🐋" },
  5: { name: "Natur",      emoji: "🌿",  color: "green",  prestigeCost:         50_000_000_000, fanpassCoins: 5000, badge: "🌳" },
  6: { name: "Magi",       emoji: "✨",  color: "pink",   prestigeCost:        500_000_000_000, fanpassCoins: 7500, badge: "🔮" },
  7: { name: "Steampunk",  emoji: "⚙️",  color: "orange", prestigeCost:      5_000_000_000_000, fanpassCoins: 10000, badge: "🔧" },
  8: { name: "Cyberpunk",  emoji: "🤖",  color: "indigo", prestigeCost:     50_000_000_000_000, fanpassCoins: 15000, badge: "💾" },
  9: { name: "Guder",      emoji: "⚡",  color: "gold",   prestigeCost:                      0, fanpassCoins:     0, badge: "👑" },
} as const;

export const MAX_WORLD = 9;

export const UPGRADES: Upgrade[] = [
  // ─── VERDEN 1 – TECH ──────────────────────────────────────────────────────
  { id: "w1_mouse",       world: 1, name: "Bedre mus",        emoji: "🖱️", baseCost:        50, costMultiplier: 1.15, coinsPerClick:    1, coinsPerSecond:    0, maxLevel: 50, description: "En raskere mus" },
  { id: "w1_keyboard",    world: 1, name: "Mek. tastatur",    emoji: "⌨️", baseCost:       500, costMultiplier: 1.15, coinsPerClick:    5, coinsPerSecond:    0, maxLevel: 40, description: "Klikker raskere" },
  { id: "w1_autoclicker", world: 1, name: "Auto-klikker",     emoji: "🤖", baseCost:     2_000, costMultiplier: 1.15, coinsPerClick:    0, coinsPerSecond:    2, maxLevel: 30, description: "Klikker for deg" },
  { id: "w1_gaming_pc",   world: 1, name: "Gaming PC",        emoji: "💻", baseCost:    36_000, costMultiplier: 1.15, coinsPerClick:   15, coinsPerSecond:    8, maxLevel: 25, description: "Kraftig maskin" },
  { id: "w1_server",      world: 1, name: "Dedikert server",  emoji: "🖥️", baseCost:   150_000, costMultiplier: 1.15, coinsPerClick:    0, coinsPerSecond:   30, maxLevel: 20, description: "Alltid på" },
  { id: "w1_datacenter",  world: 1, name: "Datasenter",       emoji: "🏢", baseCost: 1_000_000, costMultiplier: 1.15, coinsPerClick:  100, coinsPerSecond:  150, maxLevel: 15, description: "Massiv kapasitet" },
  { id: "w1_ai",          world: 1, name: "AI-assistent",     emoji: "🧠", baseCost: 5_000_000, costMultiplier: 1.15, coinsPerClick:  500, coinsPerSecond:  800, maxLevel: 10, description: "Fremtidens teknologi" },

  // ─── VERDEN 2 – EVENTYR ───────────────────────────────────────────────────
  { id: "w2_stick",       world: 2, name: "Trepinne",         emoji: "🪵", baseCost:       100, costMultiplier: 1.15, coinsPerClick:    2, coinsPerSecond:    0, maxLevel: 50, description: "Et enkelt våpen" },
  { id: "w2_sword",       world: 2, name: "Sverd",            emoji: "⚔️", baseCost:     1_000, costMultiplier: 1.15, coinsPerClick:   10, coinsPerSecond:    0, maxLevel: 40, description: "Et skikkelig sverd" },
  { id: "w2_armor",       world: 2, name: "Rustning",         emoji: "🛡️", baseCost:     5_000, costMultiplier: 1.15, coinsPerClick:    0, coinsPerSecond:    5, maxLevel: 35, description: "Beskyttelse og styrke" },
  { id: "w2_horse",       world: 2, name: "Hest",             emoji: "🐎", baseCost:    50_000, costMultiplier: 1.15, coinsPerClick:   20, coinsPerSecond:   15, maxLevel: 25, description: "Rask forflytning" },
  { id: "w2_castle",      world: 2, name: "Slott",            emoji: "🏰", baseCost:   500_000, costMultiplier: 1.15, coinsPerClick:    0, coinsPerSecond:   60, maxLevel: 20, description: "Din base" },
  { id: "w2_army",        world: 2, name: "Hær",              emoji: "⚔️", baseCost: 5_000_000, costMultiplier: 1.15, coinsPerClick:  200, coinsPerSecond:  300, maxLevel: 15, description: "Tusenvis av soldater" },
  { id: "w2_kingdom",     world: 2, name: "Kongerike",        emoji: "👑", baseCost:30_000_000, costMultiplier: 1.15, coinsPerClick: 1000, coinsPerSecond: 1500, maxLevel: 10, description: "Herre over alt" },

  // ─── VERDEN 3 – ROMFART ───────────────────────────────────────────────────
  { id: "w3_telescope",   world: 3, name: "Teleskop",         emoji: "🔭", baseCost:       500, costMultiplier: 1.15, coinsPerClick:    5, coinsPerSecond:    0, maxLevel: 50, description: "Se stjernene" },
  { id: "w3_rocket",      world: 3, name: "Rakett",           emoji: "🚀", baseCost:     5_000, costMultiplier: 1.15, coinsPerClick:   20, coinsPerSecond:    0, maxLevel: 40, description: "Til himmels" },
  { id: "w3_satellite",   world: 3, name: "Satellitt",        emoji: "🛰️", baseCost:    30_000, costMultiplier: 1.15, coinsPerClick:    0, coinsPerSecond:   10, maxLevel: 35, description: "Orbiter jorda" },
  { id: "w3_station",     world: 3, name: "Romstasjon",       emoji: "🏗️", baseCost:   300_000, costMultiplier: 1.15, coinsPerClick:   50, coinsPerSecond:   40, maxLevel: 25, description: "Base i verdensrommet" },
  { id: "w3_moonbuggy",   world: 3, name: "Månebil",          emoji: "🌕", baseCost: 3_000_000, costMultiplier: 1.15, coinsPerClick:    0, coinsPerSecond:  120, maxLevel: 20, description: "Utforsk månen" },
  { id: "w3_planet",      world: 3, name: "Planet",           emoji: "🪐", baseCost:30_000_000, costMultiplier: 1.15, coinsPerClick:  500, coinsPerSecond:  600, maxLevel: 15, description: "Eier en hel planet" },
  { id: "w3_galaxy",      world: 3, name: "Galakse",          emoji: "🌌", baseCost:300_000_000,costMultiplier: 1.15, coinsPerClick: 2000, coinsPerSecond: 3000, maxLevel: 10, description: "Herre over galaksen" },

  // ─── VERDEN 4 – DYPHAVET ──────────────────────────────────────────────────
  { id: "w4_snorkel",     world: 4, name: "Snorkelsett",      emoji: "🤿", baseCost:     2_000, costMultiplier: 1.15, coinsPerClick:    3, coinsPerSecond:    0, maxLevel: 50, description: "Utforsk grunt vann" },
  { id: "w4_sub",         world: 4, name: "Mini-ubåt",        emoji: "🌊", baseCost:    20_000, costMultiplier: 1.15, coinsPerClick:   15, coinsPerSecond:    0, maxLevel: 40, description: "Dykk dypere" },
  { id: "w4_sonar",       world: 4, name: "Sonaranlegg",      emoji: "📡", baseCost:   150_000, costMultiplier: 1.15, coinsPerClick:    0, coinsPerSecond:   25, maxLevel: 35, description: "Kartlegg havbunnen" },
  { id: "w4_reef",        world: 4, name: "Korallrev",        emoji: "🪸", baseCost: 1_200_000, costMultiplier: 1.15, coinsPerClick:   50, coinsPerSecond:   40, maxLevel: 25, description: "Rikt økosystem" },
  { id: "w4_whale",       world: 4, name: "Undervannslabo",   emoji: "🐳", baseCost:12_000_000, costMultiplier: 1.15, coinsPerClick:    0, coinsPerSecond:  150, maxLevel: 20, description: "Dyphavsforskning" },
  { id: "w4_drill",       world: 4, name: "Havbunnsdrill",    emoji: "⛏️", baseCost:120_000_000,costMultiplier: 1.15, coinsPerClick:  400, coinsPerSecond:  600, maxLevel: 15, description: "Bryter opp jordskorpen" },
  { id: "w4_atlantis",    world: 4, name: "Atlantis",         emoji: "🏙️", baseCost:1_200_000_000,costMultiplier:1.15,coinsPerClick: 2000,coinsPerSecond: 4000, maxLevel: 10, description: "Den tapte sivilisasjonen" },

  // ─── VERDEN 5 – NATUR ─────────────────────────────────────────────────────
  { id: "w5_seed",        world: 5, name: "Frø",              emoji: "🌱", baseCost:    10_000, costMultiplier: 1.15, coinsPerClick:    5, coinsPerSecond:    0, maxLevel: 50, description: "Plant noe stort" },
  { id: "w5_tree",        world: 5, name: "Urskog",           emoji: "🌲", baseCost:   100_000, costMultiplier: 1.15, coinsPerClick:   25, coinsPerSecond:    0, maxLevel: 40, description: "Eldgamle trær" },
  { id: "w5_river",       world: 5, name: "Elv",              emoji: "🏞️", baseCost:   800_000, costMultiplier: 1.15, coinsPerClick:    0, coinsPerSecond:   60, maxLevel: 35, description: "Livgivende vann" },
  { id: "w5_jungle",      world: 5, name: "Regnskog",         emoji: "🌿", baseCost: 7_000_000, costMultiplier: 1.15, coinsPerClick:   90, coinsPerSecond:   80, maxLevel: 25, description: "Grønn lunge" },
  { id: "w5_volcano",     world: 5, name: "Vulkan",           emoji: "🌋", baseCost:70_000_000, costMultiplier: 1.15, coinsPerClick:    0, coinsPerSecond:  300, maxLevel: 20, description: "Naturens kraft" },
  { id: "w5_continent",   world: 5, name: "Kontinent",        emoji: "🗺️", baseCost:700_000_000,costMultiplier: 1.15, coinsPerClick:  700, coinsPerSecond: 1500, maxLevel: 15, description: "Herre over landmasser" },
  { id: "w5_gaia",        world: 5, name: "Gaia",             emoji: "🌍", baseCost:7_000_000_000,costMultiplier:1.15,coinsPerClick: 3500,coinsPerSecond: 8000, maxLevel: 10, description: "Jordens sjel" },

  // ─── VERDEN 6 – MAGI ──────────────────────────────────────────────────────
  { id: "w6_wand",        world: 6, name: "Tryllestav",       emoji: "🪄", baseCost:    50_000, costMultiplier: 1.15, coinsPerClick:   10, coinsPerSecond:    0, maxLevel: 50, description: "En enkel stav" },
  { id: "w6_grimoire",    world: 6, name: "Grimoire",         emoji: "📖", baseCost:   500_000, costMultiplier: 1.15, coinsPerClick:   50, coinsPerSecond:    0, maxLevel: 40, description: "Bok med mørke spells" },
  { id: "w6_rune",        world: 6, name: "Runestein",        emoji: "🪬", baseCost: 4_000_000, costMultiplier: 1.15, coinsPerClick:    0, coinsPerSecond:  130, maxLevel: 35, description: "Eldgamle symboler" },
  { id: "w6_portal",      world: 6, name: "Magisk portal",    emoji: "🌀", baseCost:40_000_000, costMultiplier: 1.15, coinsPerClick:  180, coinsPerSecond:  180, maxLevel: 25, description: "Transport gjennom dimensjoner" },
  { id: "w6_dragon",      world: 6, name: "Dragehulen",       emoji: "🐉", baseCost:400_000_000,costMultiplier: 1.15, coinsPerClick:    0, coinsPerSecond:  700, maxLevel: 20, description: "Drake som vokter skatten" },
  { id: "w6_wizard",      world: 6, name: "Erkemagiker",      emoji: "🧙", baseCost:4_000_000_000,costMultiplier:1.15,coinsPerClick:1500, coinsPerSecond:3000, maxLevel: 15, description: "Mester over alle spells" },
  { id: "w6_merlin",      world: 6, name: "Merlins tårn",     emoji: "🏰", baseCost:40_000_000_000,costMultiplier:1.15,coinsPerClick:7000,coinsPerSecond:18000,maxLevel: 10, description: "Den største magiker" },

  // ─── VERDEN 7 – STEAMPUNK ─────────────────────────────────────────────────
  { id: "w7_pipe",        world: 7, name: "Kobberrør",        emoji: "🔩", baseCost:   200_000, costMultiplier: 1.15, coinsPerClick:   20, coinsPerSecond:    0, maxLevel: 50, description: "Fundamentet i steampunk" },
  { id: "w7_steam",       world: 7, name: "Dampmaskin",       emoji: "♨️", baseCost: 2_000_000, costMultiplier: 1.15, coinsPerClick:  100, coinsPerSecond:    0, maxLevel: 40, description: "Dampkraft er fremtiden" },
  { id: "w7_airship",     world: 7, name: "Luftskip",         emoji: "🎈", baseCost:20_000_000, costMultiplier: 1.15, coinsPerClick:    0, coinsPerSecond:  350, maxLevel: 35, description: "Seiler over skyene" },
  { id: "w7_clockwork",   world: 7, name: "Mekanisk arme",    emoji: "⚙️", baseCost:200_000_000,costMultiplier: 1.15, coinsPerClick:  500, coinsPerSecond:  400, maxLevel: 25, description: "Presisjonsmekanikk" },
  { id: "w7_factory",     world: 7, name: "Dampfabrikk",      emoji: "🏭", baseCost:2_000_000_000,costMultiplier:1.15,coinsPerClick:   0, coinsPerSecond: 1800, maxLevel: 20, description: "Masser av produksjon" },
  { id: "w7_city",        world: 7, name: "Dampby",           emoji: "🌆", baseCost:20_000_000_000,costMultiplier:1.15,coinsPerClick:4000,coinsPerSecond:8000, maxLevel: 15, description: "En hel by drevet av damp" },
  { id: "w7_emperor",     world: 7, name: "Mekanikernes keiser",emoji:"👑",baseCost:200_000_000_000,costMultiplier:1.15,coinsPerClick:15000,coinsPerSecond:35000,maxLevel:10,description:"Herre over alt mekanisk"},

  // ─── VERDEN 8 – CYBERPUNK ─────────────────────────────────────────────────
  { id: "w8_chip",        world: 8, name: "Neural chip",      emoji: "💾", baseCost:   800_000, costMultiplier: 1.15, coinsPerClick:   40, coinsPerSecond:    0, maxLevel: 50, description: "Øker hjernens kapasitet" },
  { id: "w8_neural",      world: 8, name: "Neural interface", emoji: "🧠", baseCost: 8_000_000, costMultiplier: 1.15, coinsPerClick:  200, coinsPerSecond:    0, maxLevel: 40, description: "Koble til matrixen" },
  { id: "w8_hacker",      world: 8, name: "Hacker-rig",       emoji: "💻", baseCost:80_000_000, costMultiplier: 1.15, coinsPerClick:    0, coinsPerSecond:  800, maxLevel: 35, description: "Bryt inn i alle systemer" },
  { id: "w8_cyborg",      world: 8, name: "Cyborg",           emoji: "🦾", baseCost:800_000_000,costMultiplier: 1.15, coinsPerClick: 1000, coinsPerSecond: 1000, maxLevel: 25, description: "Halvt menneske, halvt maskin" },
  { id: "w8_corp",        world: 8, name: "Megakorp",         emoji: "🏙️", baseCost:8_000_000_000,costMultiplier:1.15,coinsPerClick:   0, coinsPerSecond: 4000, maxLevel: 20, description: "Styrer halve verden" },
  { id: "w8_matrix",      world: 8, name: "Matrix",           emoji: "🌐", baseCost:80_000_000_000,costMultiplier:1.15,coinsPerClick:8000,coinsPerSecond:15000,maxLevel: 15, description: "Kontroll over virkeligheten" },
  { id: "w8_aigod",       world: 8, name: "AI-Gud",           emoji: "🤖", baseCost:800_000_000_000,costMultiplier:1.15,coinsPerClick:30000,coinsPerSecond:70000,maxLevel:10,description:"Superintelligens uten grenser"},

  // ─── VERDEN 9 – GUDER ─────────────────────────────────────────────────────
  { id: "w9_thunder",     world: 9, name: "Tordenbolt",       emoji: "⚡", baseCost: 3_000_000, costMultiplier: 1.15, coinsPerClick:   80, coinsPerSecond:    0, maxLevel: 50, description: "Thors gave" },
  { id: "w9_lightning",   world: 9, name: "Lynskudd",         emoji: "🌩️", baseCost:30_000_000, costMultiplier: 1.15, coinsPerClick:  400, coinsPerSecond:    0, maxLevel: 40, description: "Raskere enn lynet" },
  { id: "w9_tornado",     world: 9, name: "Tornado",          emoji: "🌪️", baseCost:300_000_000,costMultiplier: 1.15, coinsPerClick:    0, coinsPerSecond: 1800, maxLevel: 35, description: "Vindens raseri" },
  { id: "w9_tsunami",     world: 9, name: "Tsunami",          emoji: "🌊", baseCost:3_000_000_000,costMultiplier:1.15,coinsPerClick:2000,coinsPerSecond:3000, maxLevel: 25, description: "Havets vrede" },
  { id: "w9_quake",       world: 9, name: "Jordskjelv",       emoji: "🌋", baseCost:30_000_000_000,costMultiplier:1.15,coinsPerClick:  0,coinsPerSecond:10000,maxLevel: 20, description: "Jordens kraft" },
  { id: "w9_apocalypse",  world: 9, name: "Apokalypse",       emoji: "☄️", baseCost:300_000_000_000,costMultiplier:1.15,coinsPerClick:15000,coinsPerSecond:30000,maxLevel:15,description:"Tidenes ende"},
  { id: "w9_omega",       world: 9, name: "Alfa og Omega",    emoji: "∞",  baseCost:3_000_000_000_000,costMultiplier:1.15,coinsPerClick:60000,coinsPerSecond:150000,maxLevel:10,description:"Begynnelsen og slutten"},
];

// ─── Prestige Shop ────────────────────────────────────────────────────────────

export interface PrestigePerk {
  id:           string;
  name:         string;
  emoji:        string;
  description:  string;
  effect:       string;   // short display label
  cost:         number;   // prestige points per purchase
  maxPurchases: number;
  category:     "income" | "quality" | "special";
}

export const PRESTIGE_PERKS: PrestigePerk[] = [
  // Income
  { id: "base_income",      name: "Grunnbonus",        emoji: "💰", category: "income",  cost: 1, maxPurchases: 10, description: "+5% bonus på all inntekt (stabelbar)",         effect: "+5% inntekt" },
  { id: "click_power",      name: "Klikk-kraft",        emoji: "⚡", category: "income",  cost: 1, maxPurchases:  5, description: "+10% coins per klikk (stabelbar)",             effect: "+10% CPC" },
  { id: "passive_boost",    name: "Passiv boost",       emoji: "⏱️", category: "income",  cost: 1, maxPurchases:  5, description: "+10% passiv inntekt per sekund (stabelbar)",   effect: "+10% CPS" },
  // Quality of Life
  { id: "upgrade_discount", name: "Handelsmann",        emoji: "🛒", category: "quality", cost: 2, maxPurchases:  3, description: "Oppgraderinger koster 10% mindre (stabelbar)",  effect: "-10% kostnad" },
  { id: "offline_hours",    name: "Nattugle",           emoji: "🦉", category: "quality", cost: 2, maxPurchases:  4, description: "+4 timer offline inntekt (maks 24t)",           effect: "+4t offline" },
  { id: "quick_start",      name: "Hurtigstart",        emoji: "🚀", category: "quality", cost: 1, maxPurchases:  5, description: "Start hver verden med +2 000 coins",            effect: "+2K startcoins" },
  // Special
  { id: "lucky_click",      name: "Lykkeklikk",         emoji: "🍀", category: "special", cost: 2, maxPurchases:  4, description: "+5% sjanse for 3× klikk-inntekt (stabelbar)",  effect: "+5% sjanse 3×" },
  { id: "mega_click",       name: "Mega-klikk",         emoji: "💥", category: "special", cost: 3, maxPurchases:  2, description: "2% sjanse for 10× klikk-inntekt (stabelbar)",  effect: "2% sjanse 10×" },
  { id: "prestige_bonus",   name: "Prestige-ekspert",   emoji: "🌟", category: "special", cost: 3, maxPurchases:  5, description: "Prestige gir +5% ekstra permanent bonus",       effect: "+5% perm/prestige" },
];

export interface PerkConfig {
  incomeBonus:    number;   // flat multiplier to all income (CPC+CPS), e.g. 1.15
  clickBonus:     number;   // extra CPC multiplier
  passiveBonus:   number;   // extra CPS multiplier
  costMultiplier: number;   // <1 means cheaper upgrades
  offlineHours:   number;   // extra offline hours
  quickStartCoins: number;  // start coins
  luckyChance:    number;   // 0.0-1.0 total chance
  megaChance:     number;   // 0.0-1.0
  prestigeExtraBonus: number; // extra % per prestige beyond base 10%
}

export function calcPerkConfig(shop: Record<string, number>): PerkConfig {
  const get = (id: string) => shop[id] ?? 0;
  return {
    incomeBonus:     Math.pow(1.05, get("base_income")),
    clickBonus:      Math.pow(1.10, get("click_power")),
    passiveBonus:    Math.pow(1.10, get("passive_boost")),
    costMultiplier:  Math.pow(0.90, get("upgrade_discount")),
    offlineHours:    get("offline_hours") * 4,
    quickStartCoins: get("quick_start") * 2_000,
    luckyChance:     Math.min(0.95, get("lucky_click") * 0.05),
    megaChance:      Math.min(0.95, get("mega_click") * 0.02),
    prestigeExtraBonus: get("prestige_bonus") * 0.05,
  };
}

// ─── Existing helpers ─────────────────────────────────────────────────────────

export function getWorldUpgrades(world: number): Upgrade[] {
  return UPGRADES.filter((u) => u.world === world);
}

export function getUpgradeCost(upgradeId: string, currentLevel: number): number {
  const upgrade = UPGRADES.find((u) => u.id === upgradeId);
  if (!upgrade) return Infinity;
  return Math.floor(upgrade.baseCost * Math.pow(upgrade.costMultiplier, currentLevel));
}

export function calcCoinsPerClick(
  upgrades: { upgradeId: string; level: number }[],
  world: number,
  permanentBonus: number,
): number {
  const base = 1 + upgrades.reduce((sum, u) => {
    const def = UPGRADES.find((x) => x.id === u.upgradeId && x.world === world);
    return sum + (def?.coinsPerClick ?? 0) * u.level;
  }, 0);
  return base * permanentBonus;
}

export function calcCoinsPerSecond(
  upgrades: { upgradeId: string; level: number }[],
  world: number,
  permanentBonus: number,
): number {
  const base = upgrades.reduce((sum, u) => {
    const def = UPGRADES.find((x) => x.id === u.upgradeId && x.world === world);
    return sum + (def?.coinsPerSecond ?? 0) * u.level;
  }, 0);
  return base * permanentBonus;
}

export const MAX_OFFLINE_HOURS = 8;
