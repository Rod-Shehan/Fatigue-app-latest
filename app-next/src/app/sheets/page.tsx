import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions, getManagerSession } from "@/lib/auth";
import { SheetsList } from "./sheets-list";

export default async function SheetsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login?callbackUrl=%2Fsheets");
  const manager = await getManagerSession();
  if (manager) redirect("/manager");
  return <SheetsList />;
}
