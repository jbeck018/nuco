"use client";

import { Button } from "@/components/ui/button";
import { CheckIcon } from "lucide-react";

export function StaticPricing() {
  return (
    <section id="pricing" className="py-20 bg-muted/50">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold tracking-tight text-center mb-12">
          Pricing
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {[
            {
              name: "Basic",
              price: "$9",
              features: ["5 AI prompts per day", "2 integrations", "Basic support"],
            },
            {
              name: "Pro",
              price: "$29",
              features: ["50 AI prompts per day", "All integrations", "Priority support", "Advanced analytics"],
            },
            {
              name: "Enterprise",
              price: "Custom",
              features: ["Unlimited AI prompts", "All integrations", "Dedicated support", "Custom development"],
            },
          ].map((plan) => (
            <div key={plan.name} className="flex flex-col p-6 bg-background rounded-lg shadow-sm">
              <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
              <div className="text-3xl font-bold mb-4">
                {plan.price}
                {plan.price !== "Custom" && <span className="text-sm font-normal text-muted-foreground">/month</span>}
              </div>
              <ul className="mb-6 flex-1 space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center">
                    <CheckIcon className="mr-2 h-4 w-4 text-primary" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button className="w-full">Get Started</Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
} 