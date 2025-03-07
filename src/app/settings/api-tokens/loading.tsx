import { redirect } from "next/navigation";

export default function ApiTokensLoadingRedirect() {
  redirect("/api-tokens");
} 