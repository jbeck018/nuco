/**
 * HubSpot Property Options Fetcher
 * 
 * This script fetches the available options for properties in HubSpot to ensure
 * we use valid values when creating entities.
 */

import * as dotenv from 'dotenv';
import { Client } from '@hubspot/api-client';
import * as fs from 'fs-extra';
import * as path from 'path';

// Load environment variables
dotenv.config();

// Initialize the HubSpot client with PAT
const hubspotClient = new Client({ 
  accessToken: process.env.HUBSPOT_TEST_PAT 
});

/**
 * Fetch all properties for an object type and save them
 */
async function fetchProperties(objectType: string) {
  console.log(`Fetching properties for ${objectType}...`);
  
  try {
    // Get all properties for the object type
    const response = await hubspotClient.crm.properties.coreApi.getAll(objectType);
    
    // Filter to find properties with options (enum types)
    const propertiesWithOptions = response.results.filter(
      property => property.options && property.options.length > 0
    );
    
    console.log(`Found ${propertiesWithOptions.length} properties with predefined options for ${objectType}`);
    
    // Create a simplified map of property name to its options
    const propertyOptionsMap = {};
    
    for (const property of propertiesWithOptions) {
      propertyOptionsMap[property.name] = {
        label: property.label,
        description: property.description,
        options: property.options.map(option => ({
          label: option.label,
          value: option.value,
          hidden: option.hidden,
          description: option.description
        }))
      };
    }
    
    // Save to file
    const outputDir = path.join(__dirname, 'hubspot-schema');
    fs.ensureDirSync(outputDir);
    
    const outputPath = path.join(outputDir, `${objectType}-property-options.json`);
    fs.writeJsonSync(outputPath, propertyOptionsMap, { spaces: 2 });
    
    console.log(`Saved ${objectType} property options to ${outputPath}`);
    
    return propertyOptionsMap;
  } catch (error) {
    console.error(`Error fetching properties for ${objectType}:`, error);
    throw error;
  }
}

/**
 * Fetch pipeline stages
 */
async function fetchPipelines(objectType: string) {
  console.log(`Fetching pipelines for ${objectType}...`);
  
  try {
    // Get all pipelines for the object type
    const response = await hubspotClient.crm.pipelines.pipelinesApi.getAll(objectType);
    
    console.log(`Found ${response.results.length} pipelines for ${objectType}`);
    
    // Save to file
    const outputDir = path.join(__dirname, 'hubspot-schema');
    fs.ensureDirSync(outputDir);
    
    const outputPath = path.join(outputDir, `${objectType}-pipelines.json`);
    fs.writeJsonSync(outputPath, response.results, { spaces: 2 });
    
    console.log(`Saved ${objectType} pipelines to ${outputPath}`);
    
    return response.results;
  } catch (error) {
    console.error(`Error fetching pipelines for ${objectType}:`, error);
    throw error;
  }
}

/**
 * Create a mapping file for our generic values to HubSpot values
 */
async function createValueMappings() {
  console.log(`Creating value mappings...`);
  
  // Get the property options
  const companyOptions = await fetchProperties('companies');
  const contactOptions = await fetchProperties('contacts');
  const dealOptions = await fetchProperties('deals');
  
  // Get the pipelines
  const dealPipelines = await fetchPipelines('deals');
  
  // Create initial mappings
  const mappings = {
    // Generic industry values -> HubSpot industry values
    industry: {
      "Technology": "COMPUTER_SOFTWARE",
      "Healthcare": "HOSPITAL_HEALTH_CARE",
      "Finance": "FINANCIAL_SERVICES",
      "Manufacturing": "MANUFACTURING",
      "Retail": "RETAIL",
      "Education": "EDUCATION_MANAGEMENT",
      "Consulting": "MANAGEMENT_CONSULTING",
      "Media": "MEDIA_PRODUCTION"
    },
    
    // Deal stages
    dealstage: {}
  };
  
  // Extract deal stages from the default pipeline
  const defaultPipeline = dealPipelines.find(p => p.id === 'default');
  if (defaultPipeline && defaultPipeline.stages) {
    // Map our generic stages to HubSpot stage IDs
    const stageMap = {
      "Qualification": defaultPipeline.stages[0]?.id || "appointmentscheduled",
      "Meeting Scheduled": defaultPipeline.stages[1]?.id || "qualifiedtobuy",
      "Proposal": defaultPipeline.stages[2]?.id || "presentationscheduled",
      "Negotiation": defaultPipeline.stages[3]?.id || "decisionmakerboughtin",
      "Closed Won": defaultPipeline.stages[4]?.id || "closedwon",
      "Closed Lost": defaultPipeline.stages[5]?.id || "closedlost"
    };
    
    mappings.dealstage = stageMap;
  }
  
  // Save the mappings
  const outputDir = path.join(__dirname, 'hubspot-schema');
  fs.ensureDirSync(outputDir);
  
  const outputPath = path.join(outputDir, `value-mappings.json`);
  fs.writeJsonSync(outputPath, mappings, { spaces: 2 });
  
  console.log(`Saved value mappings to ${outputPath}`);
  
  return mappings;
}

/**
 * Create the custom properties we need
 */
async function createCustomProperties() {
  console.log(`Creating custom properties...`);
  
  // Define the object types we need custom properties for
  const objectTypes = ['contacts', 'companies', 'deals'];
  
  // Define the custom properties
  const customProperties = [
    {
      name: 'neuco_test_data',
      label: 'Neuco Test Data',
      description: 'Indicates this is test data created by Neuco',
      type: 'boolean',
      fieldType: 'booleancheckbox',
      groupName: 'neuco_testing'
    }
  ];
  
  // Create the properties for each object type
  for (const objectType of objectTypes) {
    // Create property group if needed
    try {
      await hubspotClient.crm.properties.groupsApi.create(objectType, {
        name: 'neuco_testing',
        label: 'Neuco Testing',
        displayOrder: 999
      });
      console.log(`Created property group neuco_testing for ${objectType}`);
    } catch (error) {
      // Group might already exist
      console.log(`Property group for ${objectType} might already exist, continuing...`);
    }
    
    // Create each property
    for (const property of customProperties) {
      try {
        await hubspotClient.crm.properties.coreApi.create(objectType, property);
        console.log(`Created property ${property.name} for ${objectType}`);
      } catch (error) {
        // Property might already exist
        console.log(`Property ${property.name} for ${objectType} might already exist, continuing...`);
      }
    }
  }
  
  console.log(`Custom properties created.`);
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('Fetching HubSpot schema information...');
    
    // Create the custom properties
    await createCustomProperties();
    
    // Fetch properties for all main object types
    await fetchProperties('companies');
    await fetchProperties('contacts');
    await fetchProperties('deals');
    
    // Fetch pipelines
    await fetchPipelines('deals');
    
    // Create value mappings
    await createValueMappings();
    
    console.log('Successfully fetched all schema information!');
  } catch (error) {
    console.error('Error fetching HubSpot schema:', error);
  }
}

// Run the script
main().catch(console.error);