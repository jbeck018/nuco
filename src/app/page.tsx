import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Bot, Layers, Zap } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl">
            <Zap className="h-5 w-5" />
            <span>Nuco</span>
          </div>
          <nav className="hidden md:flex gap-6">
            <Link href="#features" className="text-sm font-medium hover:underline underline-offset-4">
              Features
            </Link>
            <Link href="#integrations" className="text-sm font-medium hover:underline underline-offset-4">
              Integrations
            </Link>
            <Link href="#pricing" className="text-sm font-medium hover:underline underline-offset-4">
              Pricing
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/auth/login">
              <Button variant="ghost" size="sm">
                Log in
              </Button>
            </Link>
            <Link href="/auth/register">
              <Button size="sm">
                Sign up
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <section className="py-20 md:py-28 lg:py-32">
          <div className="container flex flex-col items-center text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight max-w-3xl">
              AI-Powered Integrations for Your Business Tools
            </h1>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl">
              Nuco seamlessly connects your business tools with AI capabilities, enhancing productivity and unlocking new insights.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Link href="/auth/register">
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

        <section id="features" className="py-20 bg-muted/50">
          <div className="container">
            <h2 className="text-3xl font-bold tracking-tight text-center mb-12">
              Key Features
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="flex flex-col items-center text-center p-6 bg-background rounded-lg shadow-sm">
                <Bot className="h-12 w-12 mb-4 text-primary" />
                <h3 className="text-xl font-bold mb-2">AI-Powered Prompting</h3>
                <p className="text-muted-foreground">
                  Interact with your business data using natural language prompts and get intelligent responses.
                </p>
              </div>
              <div className="flex flex-col items-center text-center p-6 bg-background rounded-lg shadow-sm">
                <Layers className="h-12 w-12 mb-4 text-primary" />
                <h3 className="text-xl font-bold mb-2">Seamless Integrations</h3>
                <p className="text-muted-foreground">
                  Connect with Salesforce, HubSpot, Google, and Slack with just a few clicks.
                </p>
              </div>
              <div className="flex flex-col items-center text-center p-6 bg-background rounded-lg shadow-sm">
                <Zap className="h-12 w-12 mb-4 text-primary" />
                <h3 className="text-xl font-bold mb-2">Real-time Updates</h3>
                <p className="text-muted-foreground">
                  Stay informed with real-time data synchronization across all your connected platforms.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="integrations" className="py-20">
          <div className="container">
            <h2 className="text-3xl font-bold tracking-tight text-center mb-12">
              Integrations
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {["Salesforce", "HubSpot", "Google", "Slack"].map((integration) => (
                <div key={integration} className="flex flex-col items-center text-center p-6 border rounded-lg">
                  <h3 className="text-xl font-bold">{integration}</h3>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="py-20 bg-muted/50">
          <div className="container">
            <h2 className="text-3xl font-bold tracking-tight text-center mb-12">
              Pricing
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="mr-2 h-4 w-4 text-primary"
                        >
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
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
      </main>
      <footer className="border-t py-8">
        <div className="container flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center gap-2 font-bold">
            <Zap className="h-5 w-5" />
            <span>Nuco</span>
          </div>
          <div className="mt-4 md:mt-0 text-sm text-muted-foreground">
            © {new Date().getFullYear()} Nuco. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
