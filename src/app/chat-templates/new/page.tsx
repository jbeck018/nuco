"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import PromptTemplateForm from "@/components/templates-components/PromptTemplateForm";

// Define the PromptTemplate interface
interface TemplateVariable {
  name: string;
  description: string;
}

interface PromptTemplate {
  id?: string;
  name: string;
  description: string;
  content: string;
  variables: TemplateVariable[];
  tags: string[];
  isPublic: boolean;
  userId?: string;
  organizationId: string | null;
}

// Default empty template
const emptyTemplate: PromptTemplate = {
  name: "",
  description: "",
  content: "",
  variables: [],
  tags: [],
  isPublic: false,
  organizationId: null,
};

export default function NewTemplatePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle form submission
  const handleSubmit = async (templateData: Partial<PromptTemplate>) => {
    if (!session?.user) {
      toast({
        title: "Error",
        description: "You must be logged in to create a template",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/chat-templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(templateData),
      });

      if (!response.ok) {
        throw new Error("Failed to create template");
      }

      // Successfully created template
      await response.json();

      toast({
        title: "Success",
        description: "Template created successfully",
      });

      // Redirect to the templates list
      router.push("/chat-templates");
    } catch (error) {
      console.error("Error creating template:", error);
      toast({
        title: "Error",
        description: "Failed to create template",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push("/chat-templates")}
          className="mr-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">Create New Template</h1>
      </div>

      <PromptTemplateForm
        initialValues={emptyTemplate}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        isNew
      />
    </div>
  );
}
