import { redirect } from "next/navigation";
import { getUserOrg } from "@/server/getUserOrg";

export default async function CommunityFeedPage() {
  const ctx = await getUserOrg();
  if (!ctx) redirect("/login");
  redirect("/feed");
}
