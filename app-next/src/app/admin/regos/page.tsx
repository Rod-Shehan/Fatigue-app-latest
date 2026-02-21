import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { RegosAdmin } from "./regos-admin";

export default async function AdminRegosPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  return <RegosAdmin />;
}
