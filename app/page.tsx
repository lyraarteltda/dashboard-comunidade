import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session.isLoggedIn) {
    redirect("/login");
  }

  return <DashboardShell />;
}
