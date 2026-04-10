import { redirect } from "next/navigation";

export default function OrganisasjonPage() {
  redirect("/admin/innstillinger?tab=generelt");
}
