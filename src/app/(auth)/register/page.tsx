import { redirect } from "next/navigation";

// The old /register route is superseded by /arena/auth which handles
// both student and company sign-up with role selection.
export default function RegisterPage() {
  redirect("/arena/auth");
}
