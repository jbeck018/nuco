/**
 * HubSpot Custom Property Setup
 * 
 * This script creates custom properties needed for Neuco integration:
 * - neuco_effective_date for all objects (contacts, companies, deals, tickets, notes, tasks)
 * - neuco_stage_probability for deals
 * - neuco_stage_entered_date for deals
 * - neuco_stage_exited_date for deals
 * - neuco_task_due_date for tasks (custom replacement for HubSpot's native property)
 * - neuco_task_reminder_time for tasks (custom replacement for HubSpot's native property)
 * 
 * These custom properties enable proper time travel functionality and ensure compatibility
 * with HubSpot's API requirements.
 */

import * as dotenv from 'dotenv';
import { Client } from '@hubspot/api-client';

// Load environment variables
dotenv.config();

// Initialize the HubSpot client with PAT
const hubspotClient = new Client({ 
  accessToken: process.env.HUBSPOT_TEST_PAT
});

// Property definitions
const PROPERTY_DEFINITIONS = {
  // Property for all object types
  neuco_effective_date: (objectType: string) => ({
    name: 'neuco_effective_date',
    label: 'Neuco Effective Date',
    description: 'The simulated effective date for this record (used by Neuco for time-travel testing)',
    groupName: 'neuco_testing',
    type: 'datetime',
    fieldType: 'date',
    formField: true,
    displayOrder: 999,
    hasUniqueValue: false
  }),
  
  // Deal-specific properties
  neuco_stage_probability: {
    name: 'neuco_stage_probability',
    label: 'Neuco Stage Probability',
    description: 'The probability percentage associated with this deal stage',
    groupName: 'neuco_testing',
    type: 'number',
    fieldType: 'number',
    formField: true,
    displayOrder: 1000,
    hasUniqueValue: false
  },
  
  neuco_stage_entered_date: {
    name: 'neuco_stage_entered_date',
    label: 'Neuco Stage Entered Date',
    description: 'The date when the deal entered its current stage',
    groupName: 'neuco_testing',
    type: 'datetime',
    fieldType: 'date',
    formField: true,
    displayOrder: 1001,
    hasUniqueValue: false
  },
  
  neuco_stage_exited_date: {
    name: 'neuco_stage_exited_date',
    label: 'Neuco Stage Exited Date',
    description: 'The date when the deal exited its previous stage',
    groupName: 'neuco_testing',
    type: 'datetime',
    fieldType: 'date',
    formField: true,
    displayOrder: 1002,
    hasUniqueValue: false
  },

  // Task-specific properties
  neuco_task_due_date: {
    name: 'neuco_task_due_date',
    label: 'Neuco Task Due Date',
    description: 'Custom due date for task (used by Neuco for time-travel testing)',
    groupName: 'neuco_testing',
    type: 'datetime',
    fieldType: 'date',
    formField: true,
    displayOrder: 1003,
    hasUniqueValue: false
  },
  
  neuco_task_reminder_time: {
    name: 'neuco_task_reminder_time',
    label: 'Neuco Task Reminder Time',
    description: 'Custom reminder time for task (used by Neuco for time-travel testing)',
    groupName: 'neuco_testing',
    type: 'datetime',
    fieldType: 'date',
    formField: true,
    displayOrder: 1004,
    hasUniqueValue: false
  }
};

// Create a property group if it doesn't exist
async function createPropertyGroupIfNeeded(objectType: string) {
  try {
    console.log(`Checking if property group neuco_testing exists for ${objectType}...`);
    
    // Try to get all property groups
    const groups = await hubspotClient.crm.properties.groupsApi.getAll(objectType);
    
    // Check if our group already exists
    const existingGroup = groups.results.find(g => g.name === 'neuco_testing');
    
    if (existingGroup) {
      console.log(`Property group neuco_testing already exists for ${objectType}.`);
      return;
    }
    
    // Create the property group if it doesn't exist
    console.log(`Creating property group neuco_testing for ${objectType}...`);
    await hubspotClient.crm.properties.groupsApi.create(objectType, {
      name: 'neuco_testing',
      label: 'Neuco Testing',
      displayOrder: 999
    });
    
    console.log(`Property group neuco_testing created for ${objectType}.`);
  } catch (error) {
    console.error(`Error creating property group for ${objectType}:`, error);
    throw error;
  }
}

// Create a property if it doesn't exist
async function createPropertyIfNeeded(objectType: string, propertyName: string, propertyDefinition: any) {
  try {
    console.log(`Checking if property ${propertyName} exists for ${objectType}...`);
    
    // Get all properties for the object type
    const properties = await hubspotClient.crm.properties.coreApi.getAll(objectType);
    
    // Check if our property already exists
    const existingProperty = properties.results.find(p => p.name === propertyName);
    
    if (existingProperty) {
      console.log(`Property ${propertyName} already exists for ${objectType}.`);
      return;
    }
    
    // Make sure the property group exists
    await createPropertyGroupIfNeeded(objectType);
    
    // Create the property
    console.log(`Creating property ${propertyName} for ${objectType}...`);
    await hubspotClient.crm.properties.coreApi.create(objectType, propertyDefinition);
    
    console.log(`Property ${propertyName} created for ${objectType}.`);
  } catch (error) {
    console.error(`Error creating property ${propertyName} for ${objectType}:`, error);
    throw error;
  }
}

// Main function to set up all properties
async function setupProperties() {
  try {
    // Setup the effective date property for all standard objects
    const standardObjects = ['contacts', 'companies', 'deals', 'tickets', 'notes', 'tasks'];
    for (const objectType of standardObjects) {
      await createPropertyIfNeeded(
        objectType, 
        'neuco_effective_date', 
        PROPERTY_DEFINITIONS.neuco_effective_date(objectType)
      );
    }
    
    // Setup deal-specific properties
    const dealProperties = [
      'neuco_stage_probability',
      'neuco_stage_entered_date',
      'neuco_stage_exited_date'
    ];
    
    for (const propertyName of dealProperties) {
      await createPropertyIfNeeded(
        'deals',
        propertyName,
        PROPERTY_DEFINITIONS[propertyName]
      );
    }
    
    // Setup task-specific properties
    const taskProperties = [
      'neuco_task_due_date',
      'neuco_task_reminder_time'
    ];
    
    for (const propertyName of taskProperties) {
      await createPropertyIfNeeded(
        'tasks',
        propertyName,
        PROPERTY_DEFINITIONS[propertyName]
      );
    }
    
    console.log('\nAll custom properties have been set up successfully!');
    return true;
  } catch (error) {
    console.error('Property setup failed:');
    console.error(error);
    return false;
  }
}

// Only run if called directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  console.log('Running property setup...');
  setupProperties()
    .then(success => {
      if (success) {
        console.log('✅ Property setup completed successfully!');
      } else {
        console.error('❌ Property setup failed!');
        process.exit(1);
      }
    })
    .catch(err => {
      console.error('Unexpected error:', err);
      process.exit(1);
    });
}

// Export for use in other modules
export { setupProperties };