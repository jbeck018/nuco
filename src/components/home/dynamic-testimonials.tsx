"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// This component will be dynamically rendered with PPR
export function DynamicTestimonials() {
  // In a real app, this would be a server component with async data fetching
  const testimonials = getTestimonials();
  
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold tracking-tight text-center mb-4">
          What Our Customers Say
        </h2>
        <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
          Hear from businesses that have transformed their workflows with Nuco&apos;s AI-powered integrations.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {testimonials.map((testimonial) => (
            <TestimonialCard key={testimonial.id} testimonial={testimonial as unknown as Record<string, never>} />
          ))}
        </div>
      </div>
    </section>
  );
}

// Simulated data fetching that would normally come from an API
function getTestimonials() {
  // In a real app, this would be a server action or API call
  return [
    {
      id: 1,
      name: "Sarah Johnson",
      role: "Marketing Director",
      company: "TechGrowth Inc.",
      avatar: "/avatars/sarah.jpg",
      content: "Nuco has revolutionized how we manage our marketing campaigns. The AI integration with HubSpot saves us hours every week and provides insights we never had before.",
    },
    {
      id: 2,
      name: "Michael Chen",
      role: "Sales Manager",
      company: "GlobalSales Co.",
      avatar: "/avatars/michael.jpg",
      content: "The Salesforce integration is seamless. Our sales team can now focus on closing deals instead of data entry. The AI-powered recommendations have increased our conversion rate by 23%.",
    },
    {
      id: 3,
      name: "Emily Rodriguez",
      role: "Operations Lead",
      company: "Streamline Solutions",
      avatar: "/avatars/emily.jpg",
      content: "We've connected all our business tools through Nuco, and the difference is night and day. The real-time data synchronization ensures everyone is working with the most up-to-date information.",
    },
  ];
}

// Testimonial card component with animation
function TestimonialCard({ testimonial }: { testimonial: Record<string, never> }) {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => { 
    // Simple animation to fade in the testimonial
    const timeout = setTimeout(() => setIsVisible(true), 100 * testimonial.id);
    return () => clearTimeout(timeout);
  }, [testimonial.id]);
  
  return (
    <Card className={`transition-opacity duration-700 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <CardContent className="p-6">
        <div className="flex items-center mb-4">
          <Avatar className="h-10 w-10 mr-4">
            <AvatarImage src={testimonial.avatar} alt={testimonial.name} />
            <AvatarFallback>{(testimonial.name as string).charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{testimonial.name}</p>
            <p className="text-sm text-muted-foreground">{testimonial.role}, {testimonial.company}</p>
          </div>
        </div>
        <p className="italic">{testimonial.content}</p>
      </CardContent>
    </Card>
  );
} 