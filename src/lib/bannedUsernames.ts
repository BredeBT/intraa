export const BANNED_WORDS = [
  // Norske
  "kuk", "fitte", "faen", "helvete", "jævla", "dritt", "pikk", "ræv",
  "hore", "neger", "homo", "retard", "idiot", "dust", "teit",
  // Engelske
  "fuck", "shit", "ass", "dick", "cock", "pussy", "bitch", "cunt",
  "nigger", "nigga", "faggot", "whore", "slut",
  // Reserverte systemnavn
  "admin", "superadmin", "intraa", "support", "root", "system",
  "moderator", "mod", "owner", "staff", "official", "bot",
  "null", "undefined", "test", "demo",
];

export function isUsernameBanned(username: string): boolean {
  const lower = username.toLowerCase().replace(/[^a-z0-9]/g, "");
  return BANNED_WORDS.some((word) => lower.includes(word));
}

export function validateUsername(username: string): { valid: boolean; error?: string } {
  if (!username)              return { valid: false, error: "Brukernavn er påkrevd" };
  if (username.length < 3)   return { valid: false, error: "Brukernavn må være minst 3 tegn" };
  if (username.length > 20)  return { valid: false, error: "Brukernavn kan maks være 20 tegn" };
  if (!/^[a-zA-Z0-9_]+$/.test(username))
    return { valid: false, error: "Kun bokstaver, tall og understrek er tillatt" };
  if (isUsernameBanned(username))
    return { valid: false, error: "Dette brukernavnet er ikke tillatt" };
  return { valid: true };
}
