import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/cognito-server";
import { getCompanyTests, getAllTestsAnalytics } from "@/features/company/actions";
import CompanyDashboardClient from "./CompanyDashboardClient";
import type { Metadata } from "next";
import type { ArenaUser } from "@/types/arena";

export const metadata: Metadata = {
  title: "Company Dashboard — HootHoot",
  description: "Create and manage assessment tests, view results, and analyze candidate performance.",
};

export default async function CompanyPage() {
  const cognitoUser = await getCurrentUser().catch(() => null);

  if (!cognitoUser) {
    redirect("/arena/auth?role=company&redirect=/company");
  }

  const user: ArenaUser = {
    id: cognitoUser.sub,
    email: cognitoUser.email,
    name: cognitoUser.name ?? "User",
    role: "company",
    avatar_url: null,
    created_at: new Date().toISOString(),
  };

  const [tests, analytics] = await Promise.all([
    getCompanyTests(cognitoUser.sub),
    getAllTestsAnalytics(cognitoUser.sub),
  ]);

  return <CompanyDashboardClient user={user} tests={tests} analytics={analytics} />;
}
