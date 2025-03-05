"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DashboardHeader } from "@/components/dashboard/header";
import { DashboardShell } from "@/components/dashboard/shell";

interface ExtensionSetting {
  type: string;
  description?: string;
  default?: string | number | boolean;
  required?: boolean;
  options?: { label: string; value: string }[];
}

interface ExtensionSettings {
  configurable: boolean;
  schema: Record<string, ExtensionSetting>;
  values?: Record<string, string | number | boolean>;
}

interface Extension {
  id: string;
  name: string;
  description: string;
  version: string;
  type: string;
  author: {
    name: string;
    email?: string;
    url?: string;
  };
  settings: ExtensionSettings;
  isActive: boolean;
}

// Define a type for our form values
type FormValues = Record<string, string | number | boolean>;

export default function ExtensionSettingsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { toast } = useToast();
  const [extension, setExtension] = useState<Extension | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dynamically create a Zod schema based on the extension settings
  const createSettingsSchema = useCallback((settings: ExtensionSettings) => {
    if (!settings?.configurable || !settings?.schema) {
      return z.object({});
    }

    const schemaFields: Record<string, z.ZodTypeAny> = {};

    Object.entries(settings.schema).forEach(([key, setting]) => {
      let fieldSchema;

      switch (setting.type) {
        case "string":
          fieldSchema = z.string();
          if (setting.required) {
            fieldSchema = fieldSchema.min(1, "This field is required");
          } else {
            fieldSchema = fieldSchema.optional();
          }
          break;
        case "number":
          fieldSchema = z.number();
          if (setting.required) {
            fieldSchema = fieldSchema.min(0, "This field is required");
          } else {
            fieldSchema = fieldSchema.optional();
          }
          break;
        case "boolean":
          fieldSchema = z.boolean();
          break;
        case "select":
          fieldSchema = z.string();
          if (setting.required) {
            fieldSchema = fieldSchema.min(1, "This field is required");
          } else {
            fieldSchema = fieldSchema.optional();
          }
          break;
        default:
          fieldSchema = z.string().optional();
      }

      schemaFields[key] = fieldSchema;
    });

    return z.object(schemaFields);
  }, []);

  // Create the form schema based on the extension settings
  const formSchema = useMemo(() => {
    if (!extension) return z.object({});
    return createSettingsSchema(extension.settings);
  }, [extension, createSettingsSchema]);

  // Create a form with the schema
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: extension?.settings.values || {},
  });

  // Use useCallback to memoize the fetchExtension function
  const fetchExtension = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/extensions/${params.id}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch extension");
      }
      
      const data = await response.json();
      setExtension(data);
      
      // Reset form with the extension settings values
      if (data.settings.values) {
        form.reset(data.settings.values);
      }
      
      setError(null);
    } catch (err) {
      setError("Failed to load extension settings. Please try again later.");
      console.error("Error fetching extension:", err);
    } finally {
      setLoading(false);
    }
  }, [params.id, form]);

  // Fetch extension data on mount
  useEffect(() => {
    fetchExtension();
  }, [fetchExtension]);

  // Update form when extension data changes
  useEffect(() => {
    if (extension?.settings.values) {
      form.reset(extension.settings.values);
    }
  }, [extension, form]);

  const onSubmit = async (values: FormValues) => {
    if (!extension) return;
    
    try {
      setSaving(true);
      const response = await fetch(`/api/extensions/${params.id}/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ values }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to update settings");
      }
      
      toast({
        title: "Settings updated",
        description: "The extension settings have been successfully updated.",
      });
      
      // Refresh extension data
      fetchExtension();
    } catch (err) {
      toast({
        title: "Update failed",
        description: "Failed to update the extension settings. Please try again.",
        variant: "destructive",
      });
      console.error("Error updating settings:", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardShell>
        <DashboardHeader
          heading="Extension Settings"
          text="Loading extension settings..."
        >
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </DashboardHeader>
        <div className="flex items-center justify-center py-10">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
          <span className="ml-2">Loading settings...</span>
        </div>
      </DashboardShell>
    );
  }

  if (error || !extension) {
    return (
      <DashboardShell>
        <DashboardHeader
          heading="Extension Settings"
          text="Manage extension settings"
        >
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </DashboardHeader>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error || "Failed to load extension"}</AlertDescription>
        </Alert>
      </DashboardShell>
    );
  }

  if (!extension.settings.configurable) {
    return (
      <DashboardShell>
        <DashboardHeader
          heading={`${extension.name} Settings`}
          text="Manage extension settings"
        >
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </DashboardHeader>
        <Card>
          <CardHeader>
            <CardTitle>No Configurable Settings</CardTitle>
            <CardDescription>
              This extension does not have any configurable settings.
            </CardDescription>
          </CardHeader>
        </Card>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <DashboardHeader
        heading={`${extension.name} Settings`}
        text="Configure extension settings"
      >
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </DashboardHeader>
      
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
          <CardDescription>
            Configure the settings for {extension.name} v{extension.version}
          </CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {Object.entries(extension.settings.schema).map(([key, setting]) => (
                <div key={key}>
                  {setting.type === "string" && (
                    <FormField
                      control={form.control}
                      name={key as keyof FormValues}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{key}</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              value={typeof field.value === 'string' ? field.value : ''} 
                            />
                          </FormControl>
                          {setting.description && (
                            <FormDescription>{setting.description}</FormDescription>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  
                  {setting.type === "number" && (
                    <FormField
                      control={form.control}
                      name={key as keyof FormValues}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{key}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value))}
                              value={typeof field.value === 'number' ? field.value : ''}
                            />
                          </FormControl>
                          {setting.description && (
                            <FormDescription>{setting.description}</FormDescription>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  
                  {setting.type === "boolean" && (
                    <FormField
                      control={form.control}
                      name={key as keyof FormValues}
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value === true}
                              onCheckedChange={(checked: boolean | 'indeterminate') => {
                                field.onChange(checked === true);
                              }}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>{key}</FormLabel>
                            {setting.description && (
                              <FormDescription>{setting.description}</FormDescription>
                            )}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  
                  {setting.type === "select" && setting.options && (
                    <FormField
                      control={form.control}
                      name={key as keyof FormValues}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{key}</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={typeof field.value === 'string' ? field.value : ''}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select an option" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {setting.options?.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {setting.description && (
                            <FormDescription>{setting.description}</FormDescription>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              ))}
              
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Settings"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </DashboardShell>
  );
} 