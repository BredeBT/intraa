import { db } from "@/server/db";

interface GeoInfo {
  ip:        string | null;
  country:   string | null;
  city:      string | null;
  userAgent: string | null;
}

/**
 * Plukker ut IP + geo fra request-headere. Bruker Vercel edge-headere
 * (x-vercel-ip-*) når tilgjengelig — gratis og nøyaktig på country-nivå.
 * Faller tilbake til x-forwarded-for / x-real-ip for IP når headeren mangler
 * (f.eks. lokal dev eller bak en non-Vercel proxy).
 *
 * Country er ISO 3166-1 alpha-2 ("NO", "US", "TR"). Vi normaliserer aldri
 * — Vercel returnerer alltid uppercase.
 */
export function readGeoFromHeaders(headers: Headers): GeoInfo {
  const country = headers.get("x-vercel-ip-country");
  const city    = headers.get("x-vercel-ip-city");
  const ipFwd   = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ipReal  = headers.get("x-real-ip");
  const ua      = headers.get("user-agent");

  return {
    ip:        ipFwd ?? ipReal ?? null,
    country:   country ? country.toUpperCase() : null,
    city:      city ?? null,
    userAgent: ua ? ua.slice(0, 500) : null,
  };
}

/**
 * Logger en vellykket innlogging og sammenligner mot brukerens FORRIGE
 * innlogging. Hvis landet er endret — og vi faktisk har et land å
 * sammenligne med — flagges hendelsen som suspicious og en notifikasjon
 * sendes til brukeren.
 *
 * Returnerer { suspicious } slik at innloggings-flyten kan vise en advarsel
 * hvis ønsket (men vi varsler via notifikasjons-systemet uansett).
 *
 * Fire-and-forget — fanger alle feil. Skal ALDRI knekke et login.
 */
export async function recordLoginEvent(
  userId: string,
  geo:    GeoInfo,
): Promise<{ suspicious: boolean }> {
  try {
    // Hent forrige event for sammenligning
    const previous = await db.loginEvent.findFirst({
      where:  { userId },
      orderBy: { createdAt: "desc" },
      select: { country: true },
    });

    const previousCountry = previous?.country ?? null;
    // Suspicious = vi har et land NÅ + et land FØR + de er ulike. Mangel på
    // land ene veien hopper vi over (lokal dev, første innlogging, osv).
    const suspicious =
      !!geo.country &&
      !!previousCountry &&
      geo.country !== previousCountry;

    await db.loginEvent.create({
      data: {
        userId,
        ip:               geo.ip,
        country:          geo.country,
        city:             geo.city,
        userAgent:        geo.userAgent,
        suspicious,
        previousCountry:  suspicious ? previousCountry : null,
      },
    });

    if (suspicious) {
      // Varsel til brukeren via eksisterende notifikasjons-system
      await db.notification.create({
        data: {
          userId,
          type:     "SECURITY_LOGIN",
          title:    "Innlogging fra nytt land",
          body:     `Vi registrerte en innlogging fra ${geo.country}${geo.city ? ` (${geo.city})` : ""}. Forrige innlogging var fra ${previousCountry}. Var dette deg? Hvis ikke, bytt passord umiddelbart.`,
          href:     "/innstillinger/sikkerhet",
          priority: 2,
        },
      });
    }

    return { suspicious };
  } catch {
    return { suspicious: false };
  }
}
