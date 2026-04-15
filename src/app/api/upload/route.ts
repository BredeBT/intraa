import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createSupabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const maxDuration = 30;

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_BYTES     = 10 * 1024 * 1024; // 10 MB

/** POST /api/upload — uploads an image to Supabase Storage, returns { url } */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file)                               return NextResponse.json({ error: "Ingen fil" }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: "Kun bilder er tillatt" }, { status: 400 });
  if (file.size > MAX_BYTES)              return NextResponse.json({ error: "Maks 10 MB" }, { status: 400 });

  const ext      = file.name.split(".").pop() ?? "jpg";
  const filename = `${session.user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const buffer   = Buffer.from(await file.arrayBuffer());

  const supabase = createSupabaseServer();
  const { error } = await supabase.storage
    .from("uploads")
    .upload(filename, buffer, { contentType: file.type, upsert: false });

  if (error) {
    console.error("[upload] Supabase Storage error:", error);
    return NextResponse.json({ error: "Opplasting feilet" }, { status: 500 });
  }

  const { data: urlData } = supabase.storage.from("uploads").getPublicUrl(filename);
  return NextResponse.json({ url: urlData.publicUrl });
}
