import { redirect } from "next/navigation";
import { getStaffSession } from "@/lib/auth/session";
import { getMemberSession } from "@/lib/auth/member-session";

export default async function HomePage() {
  const staff = await getStaffSession();
  if (staff) redirect("/dashboard");

  const member = await getMemberSession();
  if (member) redirect("/portal");

  redirect("/login");
}
