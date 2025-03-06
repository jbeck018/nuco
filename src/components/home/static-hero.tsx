"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function StaticHero() {
  return (
    <section className="py-20 md:py-28 lg:py-32">
      <div className="container mx-auto px-4 flex flex-col items-center text-center">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight max-w-3xl mx-auto">
          AI-Powered Integrations for Your Business Tools
        </h1>
        <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
          Nuco seamlessly connects your business tools with AI capabilities, enhancing productivity and unlocking new insights.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-4">
          <Link href="/auth/signup">
            <Button size="lg" className="px-8">
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link href="#demo">
            <Button size="lg" variant="outline" className="px-8">
              View Demo
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
} 