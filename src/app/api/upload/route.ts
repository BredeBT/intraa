import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_BYTES     = 10 * 1024 * 1024; // 10 MB

const r2Configured =
  !!process.env.R2_ACCOUNT_ID &&
  !!process.env.R2_ACCESS_KEY_ID &&
  !!process.env.R2_SECRET_ACCESS_KEY &&
  !!process.env.R2_BUCKET_NAME &&
  !!process.env.R2_PUBLIC_URL;

/** POST /api/upload — uploads an image to Cloudflare R2 (or base64 fallback), returns { url } */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file)                               return NextResponse.json({ error: "Ingen fil" }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: "Kun bilder er tillatt" }, { status: 400 });
  if (file.size > MAX_BYTES)              return NextResponse.json({ error: "Maks 10 MB" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());

  // ── R2 upload ────────────────────────────────────────────────────────────────
  if (r2Configured) {
    try {
      const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
      const r2 = new S3Client({
        region:   "auto",
        endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId:     process.env.R2_ACCESS_KEY_ID!,
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
        },
      });
      const ext = file.name.split(".").pop() ?? "jpg";
      const key = `posts/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      await r2.send(new PutObjectCommand({
        Bucket:      process.env.R2_BUCKET_NAME!,
        Key:         key,
        Body:        buffer,
        ContentType: file.type,
      }));
      return NextResponse.json({ url: `${process.env.R2_PUBLIC_URL}/${key}` });
    } catch (error) {
      console.error("[upload] R2 feil:", error);
      return NextResponse.json({ error: String(error) }, { status: 500 });
    }
  }

  // ── Base64 fallback (ingen R2-konfig) ─────────────────────────────────────
  const base64 = `data:${file.type};base64,${buffer.toString("base64")}`;
  if (base64.length > 500_000) {
    return NextResponse.json({ error: "Bildet er for stort. Maks ~375 KB uten R2." }, { status: 400 });
  }
  return NextResponse.json({ url: base64 });
}
