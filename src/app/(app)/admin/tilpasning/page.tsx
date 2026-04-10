import { redirect } from "next/navigation";

export default function TilpasningPage() {
  redirect("/admin/innstillinger?tab=utseende");
}
