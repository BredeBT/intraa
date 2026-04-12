import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/server/db";
import UsersClient from "./UsersClient";

export const dynamic   = "force-dynamic";
export const revalidate = 0;

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; orgId?: string; sort?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id || !session.user.isSuperAdmin) redirect("/home");

  const params = await searchParams;
  const page   = Math.max(1, parseInt(params.page   ?? "1", 10));
  const search = params.search?.trim() ?? "";
  const orgId  = params.orgId?.trim()  ?? "";
  const sort   = params.sort           ?? "newest";
  const limit  = 20;

  const orderBy = sort === "oldest"
    ? { createdAt: "asc" as const }
    : sort === "name"
    ? { name: "asc" as const }
    : { createdAt: "desc" as const };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (orgId)  where.memberships = { some: { organizationId: orgId } };
  if (search) where.OR = [
    { name:     { contains: search, mode: "insensitive" } },
    { username: { contains: search, mode: "insensitive" } },
    { email:    { contains: search, mode: "insensitive" } },
  ];

  const [users, total, orgName] = await Promise.all([
    db.user.findMany({
      where,
      orderBy,
      skip:  (page - 1) * limit,
      take:  limit,
      select: {
        id:          true,
        name:        true,
        username:    true,
        email:       true,
        avatarUrl:   true,
        isSuperAdmin: true,
        createdAt:   true,
        _count:      { select: { memberships: true } },
        fanPasses:   { where: { status: "ACTIVE", cancelledAt: null }, select: { id: true, endDate: true }, take: 1 },
      },
    }),
    db.user.count({ where }),
    orgId
      ? db.organization.findUnique({ where: { id: orgId }, select: { name: true } }).then((o) => o?.name ?? null)
      : Promise.resolve(null),
  ]);

  const mappedUsers = users.map((u) => ({
    id:          u.id,
    name:        u.name,
    username:    u.username,
    email:       u.email,
    avatarUrl:   u.avatarUrl,
    isSuperAdmin: u.isSuperAdmin,
    createdAt:   u.createdAt.toISOString(),
    memberCount: u._count.memberships,
    hasFanpass:  u.fanPasses.length > 0,
    fanpassEnd:  u.fanPasses[0]?.endDate.toISOString() ?? null,
  }));

  return (
    <UsersClient
      initialUsers={mappedUsers}
      total={total}
      page={page}
      limit={limit}
      initialSearch={search}
      initialSort={sort}
      orgId={orgId}
      orgName={orgName}
    />
  );
}
