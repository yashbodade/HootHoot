import type { Metadata } from "next";
import { UserProvider } from "@/context/UserContext";
import Header from "@/components/common/Header";

// Gameplay pages are not SEO targets — the /games/* pages are.
// noindex prevents Google from indexing auth-gated gameplay URLs.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user: any = null;

  return (
    <UserProvider user={user} streak={{ currentStreak: 0, longestStreak: 0 }}>
      <Header />
      <main className="flex-1 p-3 sm:p-6">{children}</main>
    </UserProvider>
  );
}
