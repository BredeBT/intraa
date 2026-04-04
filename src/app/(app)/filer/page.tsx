"use client";

import { useRef, useState } from "react";
import { ChevronRight, Upload, Folder, FileText, FileImage, FileSpreadsheet, File } from "lucide-react";

interface MockFile {
  id: string;
  name: string;
  size: number;
  date: string;
  type: "pdf" | "docx" | "xlsx" | "img" | "zip" | "other";
}

interface FolderNode {
  id: string;
  name: string;
  children: FolderNode[];
  files: MockFile[];
}

const ROOT: FolderNode[] = [
  {
    id: "manualer",
    name: "Manualer",
    children: [
      {
        id: "manualer-it",
        name: "IT",
        children: [],
        files: [
          { id: "f7", name: "Nettverkskart.pdf", size: 778240, date: "15.02.2026", type: "pdf" },
          { id: "f8", name: "Passordpolicy.pdf", size: 215040, date: "03.01.2026", type: "pdf" },
        ],
      },
    ],
    files: [
      { id: "f1", name: "Onboarding-guide.pdf", size: 2516582, date: "12.03.2026", type: "pdf" },
      { id: "f2", name: "HMS-håndbok.pdf", size: 1153434, date: "05.01.2026", type: "pdf" },
    ],
  },
  {
    id: "hr",
    name: "HR-dokumenter",
    children: [],
    files: [
      { id: "f3", name: "Ansettelseskontrakt-mal.docx", size: 348160, date: "20.02.2026", type: "docx" },
      { id: "f4", name: "Feriepenger-oversikt.xlsx", size: 90112, date: "01.03.2026", type: "xlsx" },
    ],
  },
  {
    id: "design",
    name: "Design",
    children: [],
    files: [
      { id: "f5", name: "Designsystem-v2.fig", size: 15414886, date: "28.03.2026", type: "other" },
      { id: "f6", name: "Logoer.zip", size: 5452595, date: "10.11.2025", type: "zip" },
    ],
  },
];

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function FileIcon({ type, className }: { type: MockFile["type"]; className?: string }) {
  const cls = `shrink-0 ${className ?? "h-8 w-8"}`;
  if (type === "pdf") return <FileText className={`${cls} text-rose-400`} />;
  if (type === "docx") return <FileText className={`${cls} text-blue-400`} />;
  if (type === "xlsx") return <FileSpreadsheet className={`${cls} text-emerald-400`} />;
  if (type === "img") return <FileImage className={`${cls} text-violet-400`} />;
  return <File className={`${cls} text-zinc-400`} />;
}

function findFolder(nodes: FolderNode[], id: string): FolderNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const found = findFolder(n.children, id);
    if (found) return found;
  }
  return null;
}

function buildCrumbs(nodes: FolderNode[], path: string[]): { id: string; name: string }[] {
  const crumbs: { id: string; name: string }[] = [];
  let current = nodes;
  for (const id of path) {
    const node = current.find((n) => n.id === id);
    if (!node) break;
    crumbs.push({ id: node.id, name: node.name });
    current = node.children;
  }
  return crumbs;
}

export default function FilerPage() {
  const [path, setPath] = useState<string[]>([]);
  const [files, setFiles] = useState<Record<string, MockFile[]>>({});
  const uploadRef = useRef<HTMLInputElement>(null);

  const current: FolderNode | null =
    path.length === 0 ? null : findFolder(ROOT, path[path.length - 1]);

  const folders = path.length === 0 ? ROOT : (current?.children ?? []);
  const currentFiles = path.length === 0
    ? []
    : [...(current?.files ?? []), ...(files[path[path.length - 1]] ?? [])];

  const crumbs = buildCrumbs(ROOT, path);

  function navigate(id: string) {
    setPath((p) => [...p, id]);
  }

  function navigateTo(index: number) {
    setPath((p) => p.slice(0, index + 1));
  }

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || path.length === 0) return;
    const folderId = path[path.length - 1];
    const newFile: MockFile = {
      id: `upload-${Date.now()}`,
      name: file.name,
      size: file.size,
      date: new Date().toLocaleDateString("no-NO"),
      type: file.name.endsWith(".pdf") ? "pdf"
        : file.name.endsWith(".docx") ? "docx"
        : file.name.endsWith(".xlsx") ? "xlsx"
        : file.name.match(/\.(png|jpg|jpeg|gif|webp)$/) ? "img"
        : "other",
    };
    setFiles((prev) => ({
      ...prev,
      [folderId]: [...(prev[folderId] ?? []), newFile],
    }));
    e.target.value = "";
  }

  return (
    <div className="px-8 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Filer</h1>
          {/* Breadcrumb */}
          <nav className="mt-1.5 flex items-center gap-1 text-sm">
            <button
              onClick={() => setPath([])}
              className="text-zinc-400 transition-colors hover:text-white"
            >
              Filer
            </button>
            {crumbs.map((crumb, i) => (
              <span key={crumb.id} className="flex items-center gap-1">
                <ChevronRight className="h-3.5 w-3.5 text-zinc-600" />
                <button
                  onClick={() => navigateTo(i)}
                  className={
                    i === crumbs.length - 1
                      ? "font-medium text-white"
                      : "text-zinc-400 transition-colors hover:text-white"
                  }
                >
                  {crumb.name}
                </button>
              </span>
            ))}
          </nav>
        </div>
        {path.length > 0 && (
          <button
            onClick={() => uploadRef.current?.click()}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
          >
            <Upload className="h-4 w-4" />
            Last opp fil
          </button>
        )}
        <input ref={uploadRef} type="file" onChange={handleUpload} className="hidden" />
      </div>

      {/* Folders */}
      {folders.length > 0 && (
        <div className="mb-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">Mapper</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {folders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => navigate(folder.id)}
                className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3.5 text-left transition-colors hover:border-zinc-700 hover:bg-zinc-800"
              >
                <Folder className="h-5 w-5 shrink-0 text-indigo-400" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{folder.name}</p>
                  <p className="text-xs text-zinc-500">
                    {folder.files.length + folder.children.length} elementer
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Files */}
      {currentFiles.length > 0 && (
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">Filer</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {currentFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3.5 transition-colors hover:border-zinc-700 hover:bg-zinc-800"
              >
                <FileIcon type={file.type} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{file.name}</p>
                  <p className="text-xs text-zinc-500">{formatSize(file.size)} · {file.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {folders.length === 0 && currentFiles.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
          <Folder className="mb-3 h-10 w-10" />
          <p className="text-sm">Denne mappen er tom.</p>
        </div>
      )}

      {/* Root: show all files across folders when nothing is selected */}
      {path.length === 0 && (
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">Nylig opplastet</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ROOT.flatMap((f) => f.files).slice(0, 6).map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3.5"
              >
                <FileIcon type={file.type} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{file.name}</p>
                  <p className="text-xs text-zinc-500">{formatSize(file.size)} · {file.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
