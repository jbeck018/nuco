"use client";
// This component will be dynamically rendered with PPR
export function DynamicFeatures() {
  return (
    <section id="integrations" className="py-20">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold tracking-tight text-center mb-12">
          Integrations
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-6xl mx-auto">
          {getIntegrations().map((integration) => (
            <IntegrationCard key={integration.name} integration={integration as unknown as Record<string, never>} />
          ))}
        </div>
      </div>
    </section>
  );
}

// Simulated data fetching that would normally come from an API
function getIntegrations() {
  // In a real app, this would be a server action or API call
  return [
    {
      name: "Salesforce",
      description: "Connect your CRM data",
      icon: "💼",
      color: "bg-blue-100 dark:bg-blue-950",
    },
    {
      name: "HubSpot",
      description: "Marketing automation",
      icon: "📊",
      color: "bg-orange-100 dark:bg-orange-950",
    },
    {
      name: "Google",
      description: "Workspace integration",
      icon: "📝",
      color: "bg-green-100 dark:bg-green-950",
    },
    {
      name: "Slack",
      description: "Team communication",
      icon: "💬",
      color: "bg-purple-100 dark:bg-purple-950",
    },
  ];
}

// Integration card component
function IntegrationCard({ integration }: { integration: Record<string, never> }) {
  return (
    <div className={`flex flex-col items-center text-center p-6 border rounded-lg ${integration.color}`}>
      <div className="text-4xl mb-2">{integration.icon}</div>
      <h3 className="text-xl font-bold">{integration.name}</h3>
      <p className="text-sm text-muted-foreground mt-1">{integration.description}</p>
    </div>
  );
} 