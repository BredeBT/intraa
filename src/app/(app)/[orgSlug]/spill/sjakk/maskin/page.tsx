import { auth } from "@/auth";
import { redirect } from "next/navigation";
import ChessVsMachine from "./ChessVsMachine";

export default async function ChessVsMachinePage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/logg-inn");

  const { orgSlug } = await params;

  return (
    <ChessVsMachine
      orgSlug={orgSlug}
      userId={session.user.id}
      userName={session.user.name ?? "Spiller"}
    />
  );
}
