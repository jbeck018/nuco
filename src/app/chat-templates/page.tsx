"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, Search, Tag, Trash2, Edit, Copy } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useSession } from "next-auth/react";

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

export default function TemplatesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("my");

  // Get all unique tags from templates
  const allTags = Array.from(
    new Set(templates.flatMap((template) => template.tags))
  ).sort();

  // Fetch templates based on active tab
  useEffect(() => {
    if (!session?.user) return;

    const fetchTemplates = async () => {
      setIsLoading(true);
      try {
        const queryParams = new URLSearchParams();

        if (searchQuery) {
          queryParams.append("search", searchQuery);
        }

        if (selectedTags.length > 0) {
          queryParams.append("tags", selectedTags.join(","));
        }

        // If org tab is active, fetch org templates
        if (
          activeTab === "organization" &&
          session.user?.defaultOrganizationId
        ) {
          queryParams.append(
            "organizationId",
            session.user.defaultOrganizationId
          );
        }

        const response = await fetch(
          `/api/chat-templates?${queryParams.toString()}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch templates");
        }

        const data = await response.json();
        setTemplates(data);
      } catch (error) {
        console.error("Error fetching templates:", error);
        toast({
          title: "Error",
          description: "Failed to load templates",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchTemplates();
  }, [session, searchQuery, selectedTags, activeTab, toast]);

  // Handle tag selection
  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // Handle template deletion
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      const response = await fetch(`/api/chat-templates/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete template");
      }

      // Remove the deleted template from state
      setTemplates((prev) => prev.filter((template) => template.id !== id));

      toast({
        title: "Success",
        description: "Template deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting template:", error);
      toast({
        title: "Error",
        description: "Failed to delete template",
        variant: "destructive",
      });
    }
  };

  // Handle template duplication
  const handleDuplicate = async (template: PromptTemplate) => {
    try {
      // Destructure only the properties we need to keep
      const { name, description, content, variables, tags, isPublic, organizationId } = template;

      const newTemplate = {
        name: `${name} (Copy)`,
        description,
        content,
        variables,
        tags,
        isPublic,
        organizationId,
      };

      const response = await fetch("/api/chat-templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newTemplate),
      });

      if (!response.ok) {
        throw new Error("Failed to duplicate template");
      }

      // Refresh templates
      const updatedResponse = await fetch(
        `/api/chat-templates?${
          activeTab === "organization" && session?.user?.defaultOrganizationId
            ? `organizationId=${session.user.defaultOrganizationId}`
            : ""
        }`
      );
      const updatedData = await updatedResponse.json();
      setTemplates(updatedData);

      toast({
        title: "Success",
        description: "Template duplicated successfully",
      });
    } catch (error) {
      console.error("Error duplicating template:", error);
      toast({
        title: "Error",
        description: "Failed to duplicate template",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Prompt Templates</h1>
        <Button onClick={() => router.push("/chat-templates/new")}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Create Template
        </Button>
      </div>

      <Tabs defaultValue="my" className="mb-6" onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="my">My Templates</TabsTrigger>
          {session?.user?.defaultOrganizationId && (
            <TabsTrigger value="organization">
              Organization Templates
            </TabsTrigger>
          )}
        </TabsList>
      </Tabs>

      <div className="flex flex-col md:flex-row gap-6 mb-6">
        <div className="w-full md:w-3/4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search templates..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="w-full md:w-1/4">
          <div className="flex items-center gap-2 flex-wrap">
            <Tag className="h-4 w-4 text-muted-foreground" />
            {allTags.map((tag) => (
              <Badge
                key={tag}
                variant={selectedTags.includes(tag) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-xl font-medium mb-2">No templates found</h3>
          <p className="text-muted-foreground mb-6">
            {searchQuery || selectedTags.length > 0
              ? "Try adjusting your search or filters"
              : "Create your first prompt template to get started"}
          </p>
          <Button onClick={() => router.push("/chat-templates/new")}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Template
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <Card key={template.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-xl">{template.name}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {template.description || "No description provided"}
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div className="mb-4">
                  <h4 className="text-sm font-medium mb-1">Variables:</h4>
                  <div className="flex flex-wrap gap-1">
                    {template.variables.length > 0 ? (
                      template.variables.map((variable, index) => (
                        <Badge key={index} variant="secondary">
                          {variable.name}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        No variables
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-1">Tags:</h4>
                  <div className="flex flex-wrap gap-1">
                    {template.tags.length > 0 ? (
                      template.tags.map((tag, index) => (
                        <Badge key={index} variant="outline">
                          {tag}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        No tags
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex justify-between pt-3 border-t">
                <div className="flex items-center">
                  <Badge
                    variant={template.isPublic ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {template.isPublic ? "Public" : "Private"}
                  </Badge>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDuplicate(template)}
                    title="Duplicate"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.push(`/chat-templates/${template.id}`)}
                    title="Edit"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>

                  {session?.user?.id === template.userId && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(template.id)}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
