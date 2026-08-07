import { redirect } from "next/navigation";

/** Legacy Settings Profile tab — Profile is now a first-class route. */
export default function LegacySettingsProfileRedirect() {
  redirect("/profile");
}
