import { redirect } from "next/navigation";
import { getManagerSession } from "@/lib/auth";
import { ManagerMapView } from "./manager-map-view";

export default async function ManagerMapPage() {
  const manager = await getManagerSession();
  if (!manager) redirect("/login");
  return <ManagerMapView />;
}
