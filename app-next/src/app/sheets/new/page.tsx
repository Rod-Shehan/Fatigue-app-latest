import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NewSheetRedirect } from "./new-sheet-redirect";

export default async function NewSheetPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  return <NewSheetRedirect />;
}
