import { getCurrentUser } from "@/lib/cognito-server";
import { UserProvider } from "@/context/UserContext";
import Header from "@/components/common/Header";
import type { User } from "@/types/user";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user: User | null = null;

  try {
    const cognitoUser = await getCurrentUser();
    if (cognitoUser) {
      user = {
        id: cognitoUser.sub,
        email: cognitoUser.email,
        name: cognitoUser.name,
        emailVerified: cognitoUser.email_verified,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
  } catch {
    // Not authenticated — render as guest
  }
  return (
    <UserProvider user={user ?? null}>
              <Header />
      <main className="flex-1 p-6">{children}</main>

    </UserProvider>
  );
}
