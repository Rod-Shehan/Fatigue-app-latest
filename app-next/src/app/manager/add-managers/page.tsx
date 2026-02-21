import { redirect } from "next/navigation";
import { getManagerSession } from "@/lib/auth";
import { AddManagersView } from "./add-managers-view";

export default async function AddManagersPage() {
  const manager = await getManagerSession();
  if (!manager) redirect("/sheets");
  return <AddManagersView />;
}
