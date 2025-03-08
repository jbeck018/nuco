"use client";

export const runtime = 'edge';

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import PromptTemplateForm from "@/components/templates-components/PromptTemplateForm";
import { IdParam } from "@/lib/shared-types";

interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  content: string;
  variables: { name: string; description: string }[];
  tags: string[];
  isPublic: boolean;
  userId: string;
  organizationId: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function EditTemplatePage(props: {
  params: IdParam;
}) {
  const params = use(props.params);
  const { data: session } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [template, setTemplate] = useState<PromptTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch the template data
  useEffect(() => {
    const fetchTemplate = async () => {
      if (!session?.user) return;

      try {
        const response = await fetch(`/api/chat-templates/${params.id}`);

        if (!response.ok) {
          if (response.status === 404) {
            toast({
              title: "Template not found",
              description: "The requested template does not exist",
              variant: "destructive",
            });
            router.push("/chat-templates");
            return;
          }

          throw new Error("Failed to fetch template");
        }

        const data = await response.json();
        setTemplate(data);
      } catch (error) {
        console.error("Error fetching template:", error);
        toast({
          title: "Error",
          description: "Failed to load template",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchTemplate();
  }, [session, params.id, router, toast]);

  // Handle form submission
  const handleSubmit = async (updatedTemplate: Partial<PromptTemplate>) => {
    if (!template) return;

    setIsSaving(true);

    try {
      const response = await fetch(`/api/chat-templates/${template.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedTemplate),
      });

      if (!response.ok) {
        throw new Error("Failed to update template");
      }

      toast({
        title: "Success",
        description: "Template updated successfully",
      });

      // Update the local template state
      setTemplate({
        ...template,
        ...updatedTemplate,
      });
    } catch (error) {
      console.error("Error updating template:", error);
      toast({
        title: "Error",
        description: "Failed to update template",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle template deletion
  const handleDelete = async () => {
    if (!template) return;

    if (
      !confirm(
        "Are you sure you want to delete this template? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/chat-templates/${template.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete template");
      }

      toast({
        title: "Success",
        description: "Template deleted successfully",
      });

      router.push("/chat-templates");
    } catch (error) {
      console.error("Error deleting template:", error);
      toast({
        title: "Error",
        description: "Failed to delete template",
        variant: "destructive",
      });
    }
  };

  // Check if user has permission to edit
  const canEdit =
    template && session?.user && template.userId === session.user.id;

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Template not found</h1>
          <p className="mb-6">
            The requested template does not exist or you don&apos;t have permission
            to view it.
          </p>
          <Button onClick={() => router.push("/chat-templates")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Templates
          </Button>
        </div>
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Permission Denied</h1>
          <p className="mb-6">
            You don&apos;t have permission to edit this template.
          </p>
          <Button onClick={() => router.push("/chat-templates")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Templates
          </Button>
        </div>
      </div>
    );
  }

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
        <h1 className="text-3xl font-bold">Edit Template</h1>
      </div>

      <PromptTemplateForm
        initialValues={template}
        onSubmit={handleSubmit}
        isSubmitting={isSaving}
        onDelete={handleDelete}
      />
    </div>
  );
}
