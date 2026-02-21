import { redirect } from "next/navigation";
import { getManagerSession } from "@/lib/auth";
import { ManagerView } from "./manager-view";

export default async function ManagerPage() {
  const manager = await getManagerSession();
  if (!manager) redirect("/sheets");
  return <ManagerView />;
}
