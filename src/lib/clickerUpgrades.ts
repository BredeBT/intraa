export interface Upgrade {
  id:             string;
  name:           string;
  emoji:          string;
  world:          1 | 2 | 3;
  baseCost:       number;
  costMultiplier: number;
  coinsPerClick:  number;
  coinsPerSecond: number;
  maxLevel:       number;
  description:    string;
}

export const WORLDS = {
  1: { name: "Tech",    emoji: "🖥️", color: "violet", prestigeCost: 5_000_000,   fanpassCoins: 500,  badge: "💻" },
  2: { name: "Eventyr", emoji: "⚔️", color: "amber",  prestigeCost: 50_000_000,  fanpassCoins: 1000, badge: "🗡️" },
  3: { name: "Romfart", emoji: "🚀", color: "cyan",   prestigeCost: 500_000_000, fanpassCoins: 2000, badge: "🌌" },
} as const;

export const UPGRADES: Upgrade[] = [
  // VERDEN 1 – TECH
  { id: "w1_mouse",       world: 1, name: "Bedre mus",        emoji: "🖱️", baseCost: 50,          costMultiplier: 1.5, coinsPerClick: 1,    coinsPerSecond: 0,    maxLevel: 50, description: "En raskere mus" },
  { id: "w1_keyboard",    world: 1, name: "Mek. tastatur",     emoji: "⌨️", baseCost: 500,         costMultiplier: 1.6, coinsPerClick: 5,    coinsPerSecond: 0,    maxLevel: 40, description: "Klikker raskere" },
  { id: "w1_autoclicker", world: 1, name: "Auto-klikker",      emoji: "🤖", baseCost: 2_000,       costMultiplier: 1.7, coinsPerClick: 0,    coinsPerSecond: 2,    maxLevel: 30, description: "Klikker for deg" },
  { id: "w1_gaming_pc",   world: 1, name: "Gaming PC",         emoji: "💻", baseCost: 20_000,      costMultiplier: 1.8, coinsPerClick: 15,   coinsPerSecond: 8,    maxLevel: 25, description: "Kraftig maskin" },
  { id: "w1_server",      world: 1, name: "Dedikert server",   emoji: "🖥️", baseCost: 150_000,     costMultiplier: 2.0, coinsPerClick: 0,    coinsPerSecond: 30,   maxLevel: 20, description: "Alltid på" },
  { id: "w1_datacenter",  world: 1, name: "Datasenter",        emoji: "🏢", baseCost: 1_000_000,   costMultiplier: 2.2, coinsPerClick: 100,  coinsPerSecond: 150,  maxLevel: 15, description: "Massiv kapasitet" },
  { id: "w1_ai",          world: 1, name: "AI-assistent",      emoji: "🧠", baseCost: 5_000_000,   costMultiplier: 2.5, coinsPerClick: 500,  coinsPerSecond: 800,  maxLevel: 10, description: "Fremtidens teknologi" },
  // VERDEN 2 – EVENTYR
  { id: "w2_stick",       world: 2, name: "Trepinne",          emoji: "🪵", baseCost: 100,         costMultiplier: 1.5, coinsPerClick: 2,    coinsPerSecond: 0,    maxLevel: 50, description: "Et enkelt våpen" },
  { id: "w2_sword",       world: 2, name: "Sverd",             emoji: "⚔️", baseCost: 1_000,       costMultiplier: 1.6, coinsPerClick: 10,   coinsPerSecond: 0,    maxLevel: 40, description: "Et skikkelig sverd" },
  { id: "w2_armor",       world: 2, name: "Rustning",          emoji: "🛡️", baseCost: 5_000,       costMultiplier: 1.7, coinsPerClick: 0,    coinsPerSecond: 5,    maxLevel: 35, description: "Beskyttelse og styrke" },
  { id: "w2_horse",       world: 2, name: "Hest",              emoji: "🐎", baseCost: 50_000,      costMultiplier: 1.8, coinsPerClick: 20,   coinsPerSecond: 15,   maxLevel: 25, description: "Rask forflytning" },
  { id: "w2_castle",      world: 2, name: "Slott",             emoji: "🏰", baseCost: 500_000,     costMultiplier: 2.0, coinsPerClick: 0,    coinsPerSecond: 60,   maxLevel: 20, description: "Din base" },
  { id: "w2_army",        world: 2, name: "Hær",               emoji: "⚔️", baseCost: 5_000_000,   costMultiplier: 2.2, coinsPerClick: 200,  coinsPerSecond: 300,  maxLevel: 15, description: "Tusenvis av soldater" },
  { id: "w2_kingdom",     world: 2, name: "Kongerike",         emoji: "👑", baseCost: 30_000_000,  costMultiplier: 2.5, coinsPerClick: 1000, coinsPerSecond: 1500, maxLevel: 10, description: "Herre over alt" },
  // VERDEN 3 – ROMFART
  { id: "w3_telescope",   world: 3, name: "Teleskop",          emoji: "🔭", baseCost: 500,         costMultiplier: 1.5, coinsPerClick: 5,    coinsPerSecond: 0,    maxLevel: 50, description: "Se stjernene" },
  { id: "w3_rocket",      world: 3, name: "Rakett",            emoji: "🚀", baseCost: 5_000,       costMultiplier: 1.6, coinsPerClick: 20,   coinsPerSecond: 0,    maxLevel: 40, description: "Til himmels" },
  { id: "w3_satellite",   world: 3, name: "Satellitt",         emoji: "🛰️", baseCost: 30_000,      costMultiplier: 1.7, coinsPerClick: 0,    coinsPerSecond: 10,   maxLevel: 35, description: "Orbiter jorda" },
  { id: "w3_station",     world: 3, name: "Romstasjon",        emoji: "🏗️", baseCost: 300_000,     costMultiplier: 1.8, coinsPerClick: 50,   coinsPerSecond: 40,   maxLevel: 25, description: "Base i verdensrommet" },
  { id: "w3_moonbuggy",   world: 3, name: "Månebil",           emoji: "🌕", baseCost: 3_000_000,   costMultiplier: 2.0, coinsPerClick: 0,    coinsPerSecond: 120,  maxLevel: 20, description: "Utforsk månen" },
  { id: "w3_planet",      world: 3, name: "Planet",            emoji: "🪐", baseCost: 30_000_000,  costMultiplier: 2.2, coinsPerClick: 500,  coinsPerSecond: 600,  maxLevel: 15, description: "Eier en hel planet" },
  { id: "w3_galaxy",      world: 3, name: "Galakse",           emoji: "🌌", baseCost: 300_000_000, costMultiplier: 2.5, coinsPerClick: 2000, coinsPerSecond: 3000, maxLevel: 10, description: "Herre over galaksen" },
];

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
