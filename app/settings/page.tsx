import { redirect } from "next/navigation";

/**
 * /settings redirects to staff Settings (Admin only).
 * You must be logged in as staff with admin role to access Settings.
 */
export default function SettingsRedirect() {
  redirect("/staff/settings");
}
