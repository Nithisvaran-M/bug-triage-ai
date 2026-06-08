import { notFound } from "next/navigation";
import RoleReportPage, { type RoleName } from "@/components/role-report-page";

const ROLE_MAP: Record<string, RoleName> = {
  manager: "Manager",
  developer: "Developer",
  qa: "QA",
  security: "Security",
  devops: "DevOps",
  product: "Product",
};

export default async function RolePage({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  const normalized = ROLE_MAP[role.toLowerCase()];
  if (!normalized) notFound();
  return <RoleReportPage role={normalized} />;
}
