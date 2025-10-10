import { redirect } from "next/navigation";

export default function AutomationSettingsPage() {
  redirect("/settings?tab=automation");
}
