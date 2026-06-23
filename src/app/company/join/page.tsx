import { getArenaSession } from "@/lib/arena-auth";
import JoinTestClient from "./JoinTestClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Join Test — HootHoot",
  description: "Enter your invite code to take a company assessment test.",
};

export default async function JoinTestPage() {
  const user = await getArenaSession();
  return <JoinTestClient user={user} />;
}
