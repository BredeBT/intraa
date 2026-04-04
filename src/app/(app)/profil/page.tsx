"use client";

import { useRef, useState } from "react";
import { Camera, Eye, EyeOff } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { getMockUser } from "@/lib/mock-auth";

function Field({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-zinc-400">{label}</label>
      <div className="flex items-center rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 focus-within:border-indigo-500 transition-colors">
        <input
          type={isPassword && show ? "text" : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm text-white placeholder-zinc-600 outline-none"
        />
        {isPassword && (
          <button type="button" onClick={() => setShow((s) => !s)} className="ml-2 text-zinc-500 hover:text-zinc-300">
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
    </div>
  );
}

export default function ProfilPage() {
  const { theme, toggle } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const mockUser = getMockUser();
  const [profile, setProfile] = useState({ name: mockUser.name, username: mockUser.name.split(" ")[0].toLowerCase(), email: mockUser.email, bio: "" });
  const [profileSaved, setProfileSaved] = useState(false);
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [passwordSaved, setPasswordSaved] = useState(false);

  const initials = profile.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setAvatarUrl(url);
  }

  function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  }

  function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordSaved(true);
    setPasswords({ current: "", next: "", confirm: "" });
    setTimeout(() => setPasswordSaved(false), 2000);
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="mb-8 text-xl font-semibold text-white">Profil</h1>

      {/* Avatar */}
      <div className="mb-8 flex items-center gap-5">
        <div className="relative">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="group relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-indigo-600"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-white">{initials}</span>
            )}
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
              <Camera className="h-5 w-5 text-white" />
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
          />
        </div>
        <div>
          <p className="font-medium text-white">{profile.name}</p>
          <p className="text-sm text-zinc-500">@{profile.username}</p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="mt-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Last opp bilde
          </button>
        </div>
      </div>

      {/* Profile form */}
      <section className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="mb-5 text-sm font-semibold text-white">Personlig informasjon</h2>
        <form onSubmit={saveProfile} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Fullt navn" value={profile.name} onChange={(v) => setProfile((p) => ({ ...p, name: v }))} />
            <Field label="Brukernavn" value={profile.username} onChange={(v) => setProfile((p) => ({ ...p, username: v }))} placeholder="eks. anders" />
          </div>
          <Field label="E-post" type="email" value={profile.email} onChange={(v) => setProfile((p) => ({ ...p, email: v }))} />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-400">Bio</label>
            <textarea
              rows={3}
              value={profile.bio}
              onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
              placeholder="Fortell litt om deg selv…"
              className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none transition-colors focus:border-indigo-500"
            />
          </div>
          <div className="flex items-center gap-4 pt-1">
            <button type="submit" className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500">
              Lagre endringer
            </button>
            {profileSaved && <span className="text-sm text-emerald-400">Lagret!</span>}
          </div>
        </form>
      </section>

      {/* Theme */}
      <section className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="mb-1 text-sm font-semibold text-white">Utseende</h2>
        <p className="mb-4 text-sm text-zinc-500">Velg tema for grensesnittet.</p>
        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-300">{theme === "dark" ? "Mørkt tema" : "Lyst tema"}</span>
          <button
            onClick={toggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              theme === "dark" ? "bg-indigo-600" : "bg-zinc-600"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                theme === "dark" ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </section>

      {/* Password */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="mb-5 text-sm font-semibold text-white">Endre passord</h2>
        <form onSubmit={savePassword} className="space-y-4">
          <Field label="Nåværende passord" type="password" value={passwords.current} onChange={(v) => setPasswords((p) => ({ ...p, current: v }))} />
          <Field label="Nytt passord" type="password" value={passwords.next} onChange={(v) => setPasswords((p) => ({ ...p, next: v }))} />
          <Field label="Bekreft nytt passord" type="password" value={passwords.confirm} onChange={(v) => setPasswords((p) => ({ ...p, confirm: v }))} />
          <div className="flex items-center gap-4 pt-1">
            <button type="submit" className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500">
              Oppdater passord
            </button>
            {passwordSaved && <span className="text-sm text-emerald-400">Passord oppdatert!</span>}
          </div>
        </form>
      </section>
    </div>
  );
}
