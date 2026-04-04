const folders = [
  {
    name: "Manualer",
    files: [
      { name: "Onboarding-guide.pdf", size: "2.4 MB", date: "12.03.2026" },
      { name: "HMS-håndbok.pdf", size: "1.1 MB", date: "05.01.2026" },
    ],
  },
  {
    name: "HR-dokumenter",
    files: [
      { name: "Ansettelseskontrakt-mal.docx", size: "340 KB", date: "20.02.2026" },
      { name: "Feriepenger-oversikt.xlsx", size: "88 KB", date: "01.03.2026" },
    ],
  },
  {
    name: "Design",
    files: [
      { name: "Designsystem-v2.fig", size: "14.7 MB", date: "28.03.2026" },
      { name: "Logoer.zip", size: "5.2 MB", date: "10.11.2025" },
    ],
  },
  {
    name: "IT",
    files: [
      { name: "Nettverkskart.pdf", size: "760 KB", date: "15.02.2026" },
      { name: "Passordpolicy.pdf", size: "210 KB", date: "03.01.2026" },
    ],
  },
];

function FileIcon() {
  return (
    <svg className="h-4 w-4 text-zinc-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg className="h-5 w-5 text-indigo-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
    </svg>
  );
}

export default function FilerPage() {
  return (
    <div className="px-8 py-8">
      <h1 className="mb-6 text-xl font-semibold text-white">Filer</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        {folders.map((folder) => (
          <div key={folder.name} className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="mb-4 flex items-center gap-2">
              <FolderIcon />
              <span className="text-sm font-semibold text-white">{folder.name}</span>
            </div>
            <div className="flex flex-col gap-2">
              {folder.files.map((file) => (
                <div
                  key={file.name}
                  className="flex items-center justify-between rounded-lg px-3 py-2 transition-colors hover:bg-zinc-800"
                >
                  <div className="flex items-center gap-2">
                    <FileIcon />
                    <span className="text-sm text-zinc-300">{file.name}</span>
                  </div>
                  <div className="flex gap-4 text-xs text-zinc-500">
                    <span>{file.size}</span>
                    <span>{file.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
