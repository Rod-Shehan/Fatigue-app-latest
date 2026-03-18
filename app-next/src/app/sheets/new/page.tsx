import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions, getManagerSession } from "@/lib/auth";
import { NewSheetRedirect } from "./new-sheet-redirect";

export default async function NewSheetPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const manager = await getManagerSession();
  if (manager) redirect("/manager");
  return <NewSheetRedirect />;
}
