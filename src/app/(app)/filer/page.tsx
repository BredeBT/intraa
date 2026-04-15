import { redirect } from "next/navigation";
import { FileText, FileImage, FileSpreadsheet, File, Folder } from "lucide-react";
import { getUserOrg } from "@/server/getUserOrg";
import { db } from "@/server/db";
import { checkFeature } from "@/server/checkFeature";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

type FileType = "pdf" | "docx" | "xlsx" | "img" | "zip" | "other";

function detectType(name: string): FileType {
  if (name.endsWith(".pdf")) return "pdf";
  if (name.endsWith(".docx") || name.endsWith(".doc")) return "docx";
  if (name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".csv")) return "xlsx";
  if (/\.(png|jpg|jpeg|gif|webp|svg)$/i.test(name)) return "img";
  if (name.endsWith(".zip") || name.endsWith(".tar") || name.endsWith(".gz")) return "zip";
  return "other";
}

function FileIcon({ name, className }: { name: string; className?: string }) {
  const type = detectType(name);
  const cls = `shrink-0 ${className ?? "h-8 w-8"}`;
  if (type === "pdf") return <FileText className={`${cls} text-rose-400`} />;
  if (type === "docx") return <FileText className={`${cls} text-blue-400`} />;
  if (type === "xlsx") return <FileSpreadsheet className={`${cls} text-emerald-400`} />;
  if (type === "img") return <FileImage className={`${cls} text-violet-400`} />;
  return <File className={`${cls} text-zinc-400`} />;
}

export default async function FilerPage() {
  await checkFeature("files");
  const ctx = await getUserOrg();
  if (!ctx) redirect("/feed");

  const files = await db.file.findMany({
    where:   { orgId: ctx.organizationId },
    orderBy: { createdAt: "desc" },
    include: { uploader: { select: { name: true } } },
  });

  return (
    <div className="px-4 py-5 md:px-8 md:py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">Filer</h1>
      </div>

      {files.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
          <Folder className="mb-3 h-10 w-10" />
          <p className="text-sm">Ingen filer ennå.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {files.map((file) => (
            <a
              key={file.id}
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3.5 transition-colors hover:border-zinc-700 hover:bg-zinc-800"
            >
              <FileIcon name={file.name} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{file.name}</p>
                <p className="text-xs text-zinc-500">
                  {formatSize(file.size)} · {file.uploader.name ?? "Ukjent"}
                </p>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
