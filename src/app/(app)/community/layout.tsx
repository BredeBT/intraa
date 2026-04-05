// Community pages use the main (app)/layout.tsx sidebar (dynamic per org.type).
// This layout is kept as a thin pass-through.
export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
