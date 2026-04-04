// Phase 2 mock auth — replaced with real NextAuth in Phase 4
export interface MockUser {
  id: string;
  name: string;
  initials: string;
  email: string;
  role: "ADMIN" | "MEMBER";
}

const MOCK_USER: MockUser = {
  id: "1",
  name: "Anders Sørensen",
  initials: "AS",
  email: "anders@intraa.net",
  role: "ADMIN",
};

export function getMockUser(): MockUser {
  return MOCK_USER;
}

export function isMockAdmin(): boolean {
  return MOCK_USER.role === "ADMIN";
}
