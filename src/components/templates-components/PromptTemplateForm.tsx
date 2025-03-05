"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, X, Save, Trash2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  createdAt?: string;
  updatedAt?: string;
}

interface PromptTemplateFormProps {
  initialValues: Partial<PromptTemplate>;
  onSubmit: (data: Partial<PromptTemplate>) => Promise<void>;
  isSubmitting: boolean;
  onDelete?: () => Promise<void>;
  isNew?: boolean;
}

export default function PromptTemplateForm({
  initialValues,
  onSubmit,
  isSubmitting,
  onDelete,
  isNew = false,
}: PromptTemplateFormProps) {
  const { data: session } = useSession();
  const [formData, setFormData] = useState<Partial<PromptTemplate>>({
    name: "",
    description: "",
    content: "",
    variables: [],
    tags: [],
    isPublic: false,
    organizationId: null,
    ...initialValues,
  });

  const [newTag, setNewTag] = useState("");
  const [newVariable, setNewVariable] = useState<TemplateVariable>({
    name: "",
    description: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState("content");
  const [organizations, setOrganizations] = useState<
    { id: string; name: string }[]
  >([]);

  // Fetch user's organizations
  useEffect(() => {
    const fetchOrganizations = async () => {
      if (!session?.user) return;

      try {
        // This is a placeholder - you'll need to implement the API endpoint
        const response = await fetch("/api/organizations");
        if (response.ok) {
          const data = await response.json();
          setOrganizations(data);
        }
      } catch (error) {
        console.error("Error fetching organizations:", error);
      }
    };

    fetchOrganizations();
  }, [session]);

  // Handle input changes
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error for this field if it exists
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Handle switch toggle
  const handleSwitchChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, isPublic: checked }));
  };

  // Handle organization selection
  const handleOrganizationChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      organizationId: value === "none" ? null : value,
    }));
  };

  // Add a new tag
  const handleAddTag = () => {
    if (!newTag.trim()) return;

    // Don't add duplicate tags
    if (formData.tags?.includes(newTag.trim())) {
      setNewTag("");
      return;
    }

    setFormData((prev) => ({
      ...prev,
      tags: [...(prev.tags || []), newTag.trim()],
    }));

    setNewTag("");
  };

  // Remove a tag
  const handleRemoveTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags?.filter((tag) => tag !== tagToRemove) || [],
    }));
  };

  // Handle variable input changes
  const handleVariableChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewVariable((prev) => ({ ...prev, [name]: value }));
  };

  // Add a new variable
  const handleAddVariable = () => {
    if (!newVariable.name.trim()) return;

    // Don't add duplicate variables
    if (formData.variables?.some((v) => v.name === newVariable.name.trim())) {
      setNewVariable({ name: "", description: "" });
      return;
    }

    setFormData((prev) => ({
      ...prev,
      variables: [
        ...(prev.variables || []),
        {
          name: newVariable.name.trim(),
          description: newVariable.description.trim(),
        },
      ],
    }));

    setNewVariable({ name: "", description: "" });
  };

  // Remove a variable
  const handleRemoveVariable = (variableName: string) => {
    setFormData((prev) => ({
      ...prev,
      variables: prev.variables?.filter((v) => v.name !== variableName) || [],
    }));
  };

  // Validate the form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = "Name is required";
    }

    if (!formData.content?.trim()) {
      newErrors.content = "Content is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      setActiveTab("content");
      return;
    }

    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Template Content</CardTitle>
              <CardDescription>
                Define your prompt template and its variables
              </CardDescription>
            </CardHeader>

            <CardContent>
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
              >
                <TabsList className="mb-4">
                  <TabsTrigger value="content">Content</TabsTrigger>
                  <TabsTrigger value="variables">Variables</TabsTrigger>
                </TabsList>

                <TabsContent value="content" className="space-y-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="name"
                      className={errors.name ? "text-destructive" : ""}
                    >
                      Template Name *
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name || ""}
                      onChange={handleChange}
                      placeholder="Enter a name for your template"
                      className={errors.name ? "border-destructive" : ""}
                    />
                    {errors.name && (
                      <p className="text-sm text-destructive">{errors.name}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      name="description"
                      value={formData.description || ""}
                      onChange={handleChange}
                      placeholder="Describe what this template is for"
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="content"
                      className={errors.content ? "text-destructive" : ""}
                    >
                      Template Content *
                    </Label>
                    <Textarea
                      id="content"
                      name="content"
                      value={formData.content || ""}
                      onChange={handleChange}
                      placeholder="Enter your prompt template content. Use {{variable_name}} syntax for variables."
                      rows={10}
                      className={errors.content ? "border-destructive" : ""}
                    />
                    {errors.content ? (
                      <p className="text-sm text-destructive">
                        {errors.content}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Use {{ variable_name }} syntax to define variables in
                        your template.
                      </p>
                    )}
                  </div>

                  {formData.content &&
                    formData.variables &&
                    formData.variables.length > 0 && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Preview</AlertTitle>
                        <AlertDescription>
                          <div className="mt-2 p-3 bg-muted rounded-md text-sm whitespace-pre-wrap">
                            {formData.content.replace(
                              /\{\{([^}]+)\}\}/g,
                              (match, variableName) => {
                                const variable = formData.variables?.find(
                                  (v) => v.name === variableName
                                );
                                return variable ? `[${variableName}]` : match;
                              }
                            )}
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}
                </TabsContent>

                <TabsContent value="variables" className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex flex-col space-y-2">
                      <Label htmlFor="variableName">Variable Name</Label>
                      <div className="flex space-x-2">
                        <Input
                          id="variableName"
                          name="name"
                          value={newVariable.name}
                          onChange={handleVariableChange}
                          placeholder="e.g. customer_name"
                        />
                        <Button
                          type="button"
                          onClick={handleAddVariable}
                          disabled={!newVariable.name.trim()}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="variableDescription">
                        Description (Optional)
                      </Label>
                      <Input
                        id="variableDescription"
                        name="description"
                        value={newVariable.description}
                        onChange={handleVariableChange}
                        placeholder="What this variable represents"
                      />
                    </div>
                  </div>

                  {formData.variables && formData.variables.length > 0 ? (
                    <div className="space-y-2">
                      <Label>Defined Variables</Label>
                      <div className="border rounded-md divide-y">
                        {formData.variables.map((variable, index) => (
                          <div
                            key={index}
                            className="p-3 flex justify-between items-start"
                          >
                            <div>
                              <h4 className="font-medium">{`{{${variable.name}}}`}</h4>
                              {variable.description && (
                                <p className="text-sm text-muted-foreground">
                                  {variable.description}
                                </p>
                              )}
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                handleRemoveVariable(variable.name)
                              }
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      No variables defined yet
                    </div>
                  )}

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Variable Usage</AlertTitle>
                    <AlertDescription>
                      Variables should be referenced in your template content
                      using the {{ variable_name }} syntax.
                    </AlertDescription>
                  </Alert>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
              <CardDescription>
                Configure template settings and metadata
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="isPublic">Public Template</Label>
                    <p className="text-sm text-muted-foreground">
                      Make this template visible to others in your organization
                    </p>
                  </div>
                  <Switch
                    id="isPublic"
                    checked={formData.isPublic || false}
                    onCheckedChange={handleSwitchChange}
                  />
                </div>

                {organizations.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="organizationId">Organization</Label>
                    <Select
                      value={formData.organizationId || "none"}
                      onValueChange={handleOrganizationChange}
                    >
                      <SelectTrigger id="organizationId">
                        <SelectValue placeholder="Select an organization" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          Personal (No Organization)
                        </SelectItem>
                        {organizations.map((org) => (
                          <SelectItem key={org.id} value={org.id}>
                            {org.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      Associate this template with an organization
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <div className="flex space-x-2">
                  <Input
                    id="tags"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add a tag"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={handleAddTag}
                    disabled={!newTag.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.tags && formData.tags.length > 0 ? (
                    formData.tags.map((tag, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        {tag}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => handleRemoveTag(tag)}
                        />
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No tags added
                    </p>
                  )}
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex justify-between border-t pt-6">
              {!isNew && onDelete && (
                <Button type="button" variant="outline" onClick={onDelete}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              )}

              <div className={isNew ? "w-full flex justify-end" : ""}>
                <Button type="submit" disabled={isSubmitting}>
                  <Save className="h-4 w-4 mr-2" />
                  {isSubmitting
                    ? "Saving..."
                    : isNew
                    ? "Create Template"
                    : "Save Changes"}
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </form>
  );
}
