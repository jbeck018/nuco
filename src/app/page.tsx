import { Suspense } from "react";
import { StaticPricing } from "@/components/home/static-pricing";
import { DynamicFeatures } from "@/components/home/dynamic-features";
import { DynamicTestimonials } from "@/components/home/dynamic-testimonials";
import { StaticFeatures } from "@/components/home/static-features";
import { StaticHero } from "@/components/home/static-hero";

// Enable PPR for this page
export const dynamic = 'force-static';
export const runtime = 'nodejs';

// Static metadata for the page
export const metadata = {
  title: 'Nuco - AI-Powered Integrations for Your Business Tools',
  description: 'Nuco seamlessly connects your business tools with AI capabilities, enhancing productivity and unlocking new insights.',
};

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1">
        {/* Static Hero Section - Pre-rendered */}
        <StaticHero />
        
        {/* Static Features Section - Pre-rendered */}
        <StaticFeatures />
        
        {/* Dynamic Features Section - Rendered on demand */}
        <Suspense fallback={<div className="py-20 text-center">Loading features...</div>}>
          <DynamicFeatures />
        </Suspense>
        
        {/* Dynamic Testimonials Section - Rendered on demand */}
        <Suspense fallback={<div className="py-20 text-center">Loading testimonials...</div>}>
          <DynamicTestimonials />
        </Suspense>
        
        {/* Static Pricing Section - Pre-rendered */}
        <StaticPricing />
      </main>
    </div>
  );
}
