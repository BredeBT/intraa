import { NextResponse } from "next/server";

/**
 * Android App Links — assetlinks.json.
 * Lar Android-appen claime intraa.net-URL-er slik at de åpnes direkte i
 * appen istedenfor i nettleseren.
 *
 * VIKTIG: SHA256_FINGERPRINT må byttes ut med signatur-fingerprint fra
 * release-keystoren før vi sender til Play Store. Få den ut med:
 *   keytool -list -v -keystore <release.keystore> -alias <alias>
 *
 * Spec: https://developer.android.com/training/app-links/verify-android-applinks
 */

const PACKAGE_NAME       = process.env.ANDROID_PACKAGE_NAME       ?? "net.intraa.app";
const SHA256_FINGERPRINT = process.env.ANDROID_SHA256_FINGERPRINT ?? "TODO_SHA256_FINGERPRINT";

export async function GET() {
  const assetlinks = [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace:                "android_app",
        package_name:             PACKAGE_NAME,
        sha256_cert_fingerprints: [SHA256_FINGERPRINT],
      },
    },
  ];

  return NextResponse.json(assetlinks, {
    headers: {
      "Content-Type":  "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
