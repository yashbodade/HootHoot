import { redirect } from "next/navigation";

// The old /login route is superseded by /arena/auth which handles
// both student and company sign-in with role selection.
export default function LoginPage() {
  redirect("/arena/auth");
}
