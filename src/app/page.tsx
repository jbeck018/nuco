import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  const session = await auth();

  // If user is authenticated, redirect to dashboard
  if (session?.user) {
    redirect("/dashboard");
  }

  // Show landing page for unauthenticated users
  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-3xl space-y-8 text-center">
        <div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Welcome to Neuco
          </h1>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            Your AI-powered platform for seamless integration and automation.
          </p>
        </div>
        
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Button asChild size="lg">
            <Link href="/auth/login">
              Get Started
            </Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href="/about">
              Learn More
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
} 