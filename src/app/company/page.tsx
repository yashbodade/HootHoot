import { redirect } from "next/navigation";
import { getArenaSession } from "@/lib/arena-auth";
import { getCompanyTests, getAllTestsAnalytics } from "@/features/company/actions";
import CompanyDashboardClient from "./CompanyDashboardClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Company Dashboard — HootHoot",
  description: "Create and manage assessment tests, view results, and analyze candidate performance.",
};

export default async function CompanyPage() {
  const user = await getArenaSession();

  if (!user) {
    redirect("/arena/auth?role=company&redirect=/company");
  }
  if (user.role !== "company") {
    redirect("/arena");
  }

  const [tests, analytics] = await Promise.all([
    getCompanyTests(),
    getAllTestsAnalytics(),
  ]);

  return <CompanyDashboardClient user={user} tests={tests} analytics={analytics} />;
}
