import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions, getManagerSession } from "@/lib/auth";
import { DriverMessagesView } from "@/components/messaging/DriverMessagesView";

/** Driver inbox only — managers are sent to /manager/messages */
export default async function DriverMessagesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login?callbackUrl=%2Fdriver%2Fmessages");
  const manager = await getManagerSession();
  if (manager) redirect("/manager/messages");
  return <DriverMessagesView />;
}
