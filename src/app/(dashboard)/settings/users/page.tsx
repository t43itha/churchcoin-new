import { redirect } from "next/navigation";

export default function ManageUsersPage() {
  redirect("/settings?tab=team");
}
