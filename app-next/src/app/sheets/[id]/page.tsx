import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SheetDetail } from "./sheet-detail";

export default async function SheetPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const { id } = await params;
  return <SheetDetail sheetId={id} />;
}
