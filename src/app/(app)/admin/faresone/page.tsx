import { redirect } from "next/navigation";

// Faresone er nå en tab inne i /admin/innstillinger.
// Behold gammel URL som redirect for bookmarks/lenker.
export default function FaresoneRedirect() {
  redirect("/admin/innstillinger?tab=faresone");
}
