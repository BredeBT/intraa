import { NextResponse } from "next/server";

/**
 * Apple App Site Association (AASA) — kreves for iOS Universal Links.
 * Når en bruker tapper på en intraa.net-lenke i Mail/Messages/Safari, åpner
 * iOS appen direkte istedenfor Safari hvis stien matcher en av paths under.
 *
 * VIKTIG: TEAM_ID må byttes ut med ditt faktiske Apple Developer Team ID
 * før vi sender til App Store. Bundle-ID matcher capacitor.config.ts.
 *
 * Spec: https://developer.apple.com/documentation/xcode/supporting-associated-domains
 */

const TEAM_ID   = process.env.APPLE_TEAM_ID   ?? "TODO_TEAM_ID";
const BUNDLE_ID = process.env.APPLE_BUNDLE_ID ?? "net.intraa.app";

export async function GET() {
  const aasa = {
    applinks: {
      apps: [],
      details: [
        {
          appID: `${TEAM_ID}.${BUNDLE_ID}`,
          paths: [
            // Inkluder alle in-app-paths. Ekskluder /api, /sw.js, /.well-known
            // og statiske assets så Safari fortsatt åpner dem direkte.
            "NOT /api/*",
            "NOT /_next/*",
            "NOT /sw.js",
            "NOT /.well-known/*",
            "NOT /manifest.json",
            "NOT /*.png",
            "NOT /*.jpg",
            "NOT /*.ico",
            "NOT /*.svg",
            "/*",
          ],
        },
      ],
    },
    // Brukes for at native app kan dele credentials med Safari (Password AutoFill)
    webcredentials: {
      apps: [`${TEAM_ID}.${BUNDLE_ID}`],
    },
  };

  return NextResponse.json(aasa, {
    headers: {
      "Content-Type":  "application/json",
      // Apple cacher AASA aggressivt — kort max-age så endringer slår igjennom
      "Cache-Control": "public, max-age=3600",
    },
  });
}
