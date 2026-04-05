import { notFound } from "next/navigation";

// No contests in DB yet — all dynamic contest IDs return not found.
export default function KonkurranseDetalj() {
  notFound();
}
