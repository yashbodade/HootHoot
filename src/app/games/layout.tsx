import { getCurrentUser } from "@/lib/cognito-server";
import { UserProvider } from "@/context/UserContext";
import Footer from "@/components/common/Footer";
import Header from "@/components/common/Header";
import type { User } from "@/types/user";

export default async function GamesLayout({
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
    <UserProvider user={user} streak={{ currentStreak: 0, longestStreak: 0 }}>
      <Header />
      <main>{children}</main>
      <Footer />
    </UserProvider>
  );
}
