import { getCurrentUser } from "@/lib/cognito-server";
import { getPracticeLeaderboard } from "@/features/arena/actions";
import ArenaLanding from "./ArenaLanding";
import type { Metadata } from "next";
import type { ArenaUser } from "@/types/arena";

export const metadata: Metadata = {
  title: "Practice Arena — Competitive Real-Time Challenges | Hoot-Hoot",
  description:
    "Test your skills against the clock. 10 progressive questions from our game bank. Real-time leaderboard — see how you stack up.",
};

export default async function ArenaPage() {
  const cognitoUser = await getCurrentUser().catch(() => null);

  const user: ArenaUser | null = cognitoUser
    ? {
        id: cognitoUser.sub,
        email: cognitoUser.email,
        name: cognitoUser.name ?? "Player",
        role: "student",
        avatar_url: null,
        created_at: new Date().toISOString(),
      }
    : null;

  const leaderboard = await getPracticeLeaderboard(20).catch(() => []);

  return <ArenaLanding user={user} leaderboard={leaderboard} />;
}
