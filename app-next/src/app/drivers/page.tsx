import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DriversList } from "./drivers-list";

export default async function DriversPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  return <DriversList />;
}
