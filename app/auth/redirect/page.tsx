import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";

export default async function AuthRedirectPage() {
  const user = await currentUser();
  if (!user) redirect("/?login=1");
  redirect(user.role === "admin" ? "/admin" : "/dashboard");
}
