/**
 * ModelSelector Component
 * 
 * This component provides a dropdown to select an AI model.
 * It can be used in both chat interfaces and organization settings.
 */

"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
// Import the AI config types and models
import { ModelConfig, openAIModels, anthropicModels } from '@/lib/ai/config';
// Import the AI preferences hook
import { useAiPreferences } from '@/hooks/useAiPreferences';
import { getSelectedModel, getDefaultModel } from '@/lib/utils/ai-utils';

// Ensure the model arrays are defined with fallbacks
const safeOpenAIModels = openAIModels || [];
const safeAnthropicModels = anthropicModels || [];

interface ModelSelectorProps {
  isOrganizationSetting?: boolean;
  conversationId?: string;
  className?: string;
  initialModelId?: string;
  onModelChange?: (modelId: string) => void;
  disabled?: boolean;
}

export function ModelSelector({ 
  isOrganizationSetting = false, 
  conversationId,
  className,
  initialModelId,
  onModelChange,
  disabled = false
}: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const { preferences, updateDefaultModel, updateSelectedModel, isLoading } = useAiPreferences();
  
  // Use the models defined in this component
  const models = useMemo(() => {
    // Ensure both arrays are defined before spreading them
    const openAIModelsArray = Array.isArray(safeOpenAIModels) ? safeOpenAIModels : [];
    const anthropicModelsArray = Array.isArray(safeAnthropicModels) ? safeAnthropicModels : [];
    const combinedModels = [...openAIModelsArray, ...anthropicModelsArray];
    
    return combinedModels;
  }, []);
  // Set the initial selected model based on preferences or initialModelId
  useEffect(() => {
    if (initialModelId) {
      setSelectedModelId(initialModelId);
    } else if (preferences) {
      if (isOrganizationSetting) {
        setSelectedModelId(getDefaultModel(preferences));
      } else {
        setSelectedModelId(getSelectedModel(preferences));
      }
    } else {
      // Set a default if no preferences are available
      setSelectedModelId('gpt-3.5-turbo');
    }
  }, [preferences, isOrganizationSetting, initialModelId]);

  // Get the selected model's display name
  const getSelectedModelName = () => {
    const model = models.find(model => model.id === selectedModelId);
    return model ? model.name : 'Select a model';
  };

  // Handle model selection
  const handleSelectModel = useCallback(async (modelId: string) => {
    try {
      setSelectedModelId(modelId);
      
      if (onModelChange) {
        // Use the provided callback for organization settings
        onModelChange(modelId);
      } else if (isOrganizationSetting) {
        // Update the default model for the organization
        await updateDefaultModel(modelId);
      } else {
        // Update the selected model for the current chat
        await updateSelectedModel(modelId);
        
        // You could also store the selected model for this specific conversation
        // if you want to persist it per conversation rather than user-wide
        if (conversationId) {
          // This would require a new API endpoint to update conversation settings
          console.log(`Model ${modelId} selected for conversation ${conversationId}`);
        }
      }
      
      setOpen(false);
    } catch (error) {
      console.error('Error updating model selection:', error);
    }
  }, [isOrganizationSetting, updateDefaultModel, updateSelectedModel, conversationId, onModelChange]);

  const commandList = useMemo(() => models.map((model) => (
    <CommandItem
      key={model.id}
      value={model.id}
      onSelect={() => handleSelectModel(model.id)}
    >
      <Check
        className={cn(
          "mr-2 h-4 w-4",
          selectedModelId === model.id ? "opacity-100" : "opacity-0"
        )}
      />
      {model.name}
    </CommandItem>
  )), [models, selectedModelId, handleSelectModel]);

  if (isLoading) {
    return <div className="h-10 w-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm">Loading...</div>;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-[200px] justify-between", className)}
          disabled={disabled}
        >
          {getSelectedModelName()}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command label="Model Selector">
          <CommandList>
            <CommandInput placeholder="Search models..." />
            <CommandEmpty>No model found.</CommandEmpty>
            <CommandGroup>
                {Array.isArray(models) && models.length > 0 ? commandList : <CommandItem>No models available</CommandItem>}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
} 