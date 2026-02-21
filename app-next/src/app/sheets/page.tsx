import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SheetsList } from "./sheets-list";

export default async function SheetsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  return <SheetsList />;
}
