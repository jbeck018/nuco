#!/usr/bin/env bun

/**
 * This script helps set up Cloudflare Hyperdrive by:
 * 1. Creating a Hyperdrive instance if it doesn't exist
 * 2. Updating the Hyperdrive configuration with the correct parameters
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';

// Load environment variables
config();

// Configuration
const HYPERDRIVE_NAME = 'nuco-hyperdrive';
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

console.log('🚀 Setting up Cloudflare Hyperdrive...');

// Check if Hyperdrive instance exists and create/update as needed
try {
  console.log('📋 Checking if Hyperdrive instance exists...');
  
  // First, try to get the list of existing Hyperdrive instances
  let existingId = null;
  try {
    const listOutput = execSync('wrangler hyperdrive list').toString();
    console.log('📋 Current Hyperdrive instances:');
    console.log(listOutput);
    
    // Parse the output to find our instance
    // The format is typically a table with columns like NAME, ID, etc.
    const lines = listOutput.split('\n').filter(line => line.trim() !== '');
    
    // Find the line with our Hyperdrive name
    const hyperdriveIdLine = lines.find(line => line.includes(HYPERDRIVE_NAME));
    
    if (hyperdriveIdLine) {
      // The ID is typically the second column in the output
      const parts = hyperdriveIdLine.split(/\s+/).filter(part => part.trim() !== '');
      if (parts.length >= 2) {
        existingId = parts[1]; // Assuming ID is the second column
        console.log(`✅ Found existing Hyperdrive instance '${HYPERDRIVE_NAME}' with ID: ${existingId}`);
      }
    }
  } catch (listError) {
    console.log('⚠️ Could not list existing Hyperdrive instances:', listError.message);
  }
  
  if (existingId) {
    // Update the existing Hyperdrive instance
    console.log(`📝 Updating Hyperdrive configuration for ID: ${existingId}...`);
    try {
      execSync(`wrangler hyperdrive update ${existingId} --connection-string="${DATABASE_URL}"`, { 
        stdio: 'inherit' 
      });
      console.log('✅ Hyperdrive configuration updated successfully');
    } catch (updateError) {
      console.error('⚠️ Error updating Hyperdrive:', updateError.message);
      console.log('🔄 Trying to create a new instance instead...');
      existingId = null; // Reset so we try to create a new instance
    }
  }
  
  if (!existingId) {
    // Try to create a new Hyperdrive instance
    try {
      console.log(`🆕 Creating new Hyperdrive instance '${HYPERDRIVE_NAME}'...`);
      execSync(`wrangler hyperdrive create ${HYPERDRIVE_NAME} --connection-string="${DATABASE_URL}"`, { 
        stdio: 'inherit'
      });
      console.log('✅ Hyperdrive instance created successfully');
    } catch (createError) {
      console.error('❌ Error creating Hyperdrive instance:', createError.message);
      throw createError;
    }
  }
  
  // Update wrangler.toml with the Hyperdrive binding
  console.log('📝 Updating wrangler.toml with Hyperdrive binding...');
  const wranglerPath = join(process.cwd(), 'wrangler.toml');
  let wranglerContent = readFileSync(wranglerPath, 'utf8');
  
  // Check if Hyperdrive binding already exists
  if (!wranglerContent.includes('[[hyperdrive]]')) {
    // Add Hyperdrive binding
    wranglerContent += `\n# Hyperdrive configuration\n[[hyperdrive]]\nbinding = "HYPERDRIVE"\nid = "${HYPERDRIVE_NAME}"\n`;
    writeFileSync(wranglerPath, wranglerContent);
    console.log('✅ Added Hyperdrive binding to wrangler.toml');
  } else {
    console.log('✅ Hyperdrive binding already exists in wrangler.toml');
  }
  
  console.log('🎉 Cloudflare Hyperdrive setup complete!');
} catch (error) {
  console.error('❌ Error setting up Hyperdrive:', error.message);
  process.exit(1);
} 