import { redirect, notFound } from "next/navigation";
import { db } from "@/server/db";
import AcceptInviteForm from "./AcceptInviteForm";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function InviterPage({ params }: Props) {
  const { token } = await params;

  const invitation = await db.invitation.findUnique({
    where: { token },
    include: { organization: { select: { name: true, slug: true } } },
  });

  if (!invitation) notFound();

  // Mark expired if past expiresAt
  if (invitation.status === "PENDING" && invitation.expiresAt < new Date()) {
    await db.invitation.update({ where: { token }, data: { status: "EXPIRED" } });
    redirect("/inviter/utlopt");
  }

  if (invitation.status === "ACCEPTED") {
    redirect("/login?melding=allerede-brukt");
  }

  if (invitation.status === "EXPIRED") {
    redirect("/inviter/utlopt");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-lg font-bold text-white shadow-lg">
            I
          </div>
          <div className="text-2xl font-bold tracking-tight text-white">Intraa</div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 shadow-xl">
          {/* Invite info */}
          <div className="mb-6 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-3">
            <p className="text-xs font-semibold text-indigo-300">Du er invitert til</p>
            <p className="mt-0.5 text-base font-bold text-white">{invitation.organization.name}</p>
            <p className="mt-0.5 text-xs text-indigo-400">
              som {invitation.role === "ADMIN" ? "Administrator" : "Medlem"} · {invitation.email}
            </p>
          </div>

          <h1 className="mb-5 text-lg font-semibold text-white">Opprett konto</h1>

          <AcceptInviteForm
            token={token}
            email={invitation.email}
            orgName={invitation.organization.name}
          />
        </div>
      </div>
    </div>
  );
}
