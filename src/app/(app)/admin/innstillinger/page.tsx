import { requireAdmin } from "@/server/requireAdmin";
import InnstillingerClient from "./InnstillingerClient";

export default async function InnstillingerPage() {
  await requireAdmin();
  return <InnstillingerClient />;
}
