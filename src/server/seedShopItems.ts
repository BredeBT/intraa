import { db } from "@/server/db";

const DEFAULT_ITEMS = [
  // Badges
  { name: "OG Badge",    type: "BADGE" as const, value: "👑", coinCost: 400,  description: "For de første medlemmene",         fanpassOnly: false },
  { name: "Fan Badge",   type: "BADGE" as const, value: "❤️", coinCost: 250,  description: "Vis din støtte",                   fanpassOnly: false },
  { name: "Gamer Badge", type: "BADGE" as const, value: "🎮", coinCost: 350,  description: "For de dedikerte spillerne",        fanpassOnly: false },
  { name: "VIP Badge",   type: "BADGE" as const, value: "⭐", coinCost: 1500, description: "Eksklusiv VIP-status",             fanpassOnly: true  },
  // Navnefarger
  { name: "Gull-navn",   type: "NAME_COLOR" as const, value: "#FFD700", coinCost: 700,  description: "Gyllen navnefarge i chat",  fanpassOnly: false },
  { name: "Lilla-navn",  type: "NAME_COLOR" as const, value: "#A855F7", coinCost: 450,  description: "Lilla navnefarge i chat",   fanpassOnly: false },
  { name: "Rød-navn",    type: "NAME_COLOR" as const, value: "#EF4444", coinCost: 450,  description: "Rød navnefarge i chat",     fanpassOnly: false },
  { name: "Neon-navn",   type: "NAME_COLOR" as const, value: "#22D3EE", coinCost: 800,  description: "Neon blå navnefarge",      fanpassOnly: true  },
  // VIP
  { name: "VIP-tilgang", type: "VIP_ROLE" as const,   value: "vip",     coinCost: 2000, description: "Tilgang til VIP-kanal og eksklusive fordeler", fanpassOnly: false },
  // Profilrammer
  { name: "Gull-ramme",  type: "PROFILE_FRAME" as const, value: "gold",   coinCost: 1500, description: "Gyllen ramme rundt profilbilde", fanpassOnly: true  },
  { name: "Lilla-ramme", type: "PROFILE_FRAME" as const, value: "violet", coinCost: 1000, description: "Lilla ramme rundt profilbilde",  fanpassOnly: false },
];

export async function seedShopItems(organizationId: string) {
  const existing = await db.shopItem.findMany({
    where:  { organizationId },
    select: { name: true },
  });
  const existingNames = new Set(existing.map((i) => i.name));
  const toCreate = DEFAULT_ITEMS.filter((i) => !existingNames.has(i.name));

  if (toCreate.length > 0) {
    await db.shopItem.createMany({
      data: toCreate.map((i) => ({ ...i, organizationId })),
    });
  }
}
