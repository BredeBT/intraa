import Wordle from "./Wordle";

export default async function Page({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  return <Wordle orgSlug={orgSlug} />;
}
