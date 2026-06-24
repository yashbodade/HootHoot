import type { ReactNode } from "react";
import Header from "@/components/common/Header";
import { UserProvider } from "@/context/UserContext";
import { getCurrentUser } from "@/lib/cognito-server";
import type { User } from "@/types/user";

export default async function ArenaLayout({ children }: { children: ReactNode }) {
  const cognitoUser = await getCurrentUser().catch(() => null);

  const user: User | null = cognitoUser
    ? {
        id: cognitoUser.sub,
        email: cognitoUser.email,
        name: cognitoUser.name,
        emailVerified: cognitoUser.email_verified,
        createdAt: new Date(),
        updatedAt: new Date(),
        image: null,
      }
    : null;

  return (
    <UserProvider user={user} streak={{ currentStreak: 0, longestStreak: 0 }}>
      <Header />
      {children}
    </UserProvider>
  );
}
