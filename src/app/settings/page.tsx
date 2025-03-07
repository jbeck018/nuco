import { redirect } from "next/navigation";

/**
 * Settings Root Page
 * 
 * This page redirects to the profile settings page by default
 */
export default function SettingsPage() {
  redirect("/settings/profile");
} 