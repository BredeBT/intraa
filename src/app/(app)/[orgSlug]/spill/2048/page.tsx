import Game2048 from "./Game2048";

export default async function Page({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  return <Game2048 orgSlug={orgSlug} />;
}
