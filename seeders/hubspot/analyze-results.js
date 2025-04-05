// Analysis script for association results
const fs = require('fs');
const path = require('path');

// Usage check
if (process.argv.length < 3) {
  console.error('Please provide the organization ID');
  console.error('Usage: node analyze-results.js <organization-id>');
  process.exit(1);
}

const orgId = process.argv[2];
const resultsPath = path.join(__dirname, 'data', orgId, 'association-results.json');

// Verify file exists
if (!fs.existsSync(resultsPath)) {
  console.error(`Results file not found: ${resultsPath}`);
  console.error('Please run the create-associations.ts script first');
  process.exit(1);
}

// Read and parse results
const data = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));
const allResults = data.results.all;

// Group by entity type combination and success
const successByTypeCombo = {};

allResults.forEach(result => {
  const key = `${result.fromType} → ${result.toType} (Type: ${result.associationTypeId})`;
  if (!successByTypeCombo[key]) {
    successByTypeCombo[key] = { success: 0, failure: 0, examples: [] };
  }
  
  if (result.success) {
    successByTypeCombo[key].success++;
  } else {
    successByTypeCombo[key].failure++;
    if (successByTypeCombo[key].examples.length < 1) {
      successByTypeCombo[key].examples.push({
        error: result.error,
        errorDetails: result.errorDetails
      });
    }
  }
});

// Print results
console.log('='.repeat(80));
console.log(`ASSOCIATION RESULTS ANALYSIS FOR ${orgId}`);
console.log('='.repeat(80));
console.log();
console.log('SUMMARY:');
console.log(`Total associations attempted: ${data.metadata.summary.total}`);
console.log(`Successful: ${data.metadata.summary.successful} (${data.metadata.summary.successRate})`);
console.log(`Failed: ${data.metadata.summary.failed}`);
console.log();
console.log('RESULTS BY ENTITY TYPE COMBO:');
console.log('='.repeat(80));

for (const [combo, stats] of Object.entries(successByTypeCombo)) {
  const total = stats.success + stats.failure;
  const successRate = (stats.success / total * 100).toFixed(2);
  
  console.log(`${combo}:`);
  console.log(`  Success: ${stats.success}/${total} (${successRate}%)`);
  
  if (stats.failure > 0 && stats.examples.length > 0) {
    console.log('  Example error:');
    console.log(`    ${stats.examples[0].error}`);
    if (stats.examples[0].errorDetails) {
      console.log(`    Context: ${JSON.stringify(stats.examples[0].errorDetails.context || {})}`);
    }
  }
  
  console.log();
}

// Build recommended association strategy
console.log('='.repeat(80));
console.log('RECOMMENDED ASSOCIATION STRATEGY:');
console.log('='.repeat(80));

const strategy = [];

// Go through each entity type pair and find which direction works
const pairs = [
  // Standard objects
  { from: 'contacts', to: 'companies' },
  { from: 'deals', to: 'contacts' },
  { from: 'deals', to: 'companies' },
  { from: 'tickets', to: 'contacts' },
  { from: 'tickets', to: 'companies' },
  
  // Engagements
  { from: 'notes', to: 'contacts' },
  { from: 'notes', to: 'companies' },
  { from: 'notes', to: 'deals' },
  { from: 'notes', to: 'tickets' },
  { from: 'tasks', to: 'contacts' },
  { from: 'tasks', to: 'companies' },
  { from: 'tasks', to: 'deals' },
  { from: 'tasks', to: 'tickets' },
];

pairs.forEach(pair => {
  // Check forward direction
  const forwardKey = `${pair.from} → ${pair.to}`;
  const forwardEntries = Object.entries(successByTypeCombo).filter(([key]) => key.startsWith(forwardKey));
  const forwardWorks = forwardEntries.some(([_, stats]) => stats.success > 0);
  
  // Check reverse direction
  const reverseKey = `${pair.to} → ${pair.from}`;
  const reverseEntries = Object.entries(successByTypeCombo).filter(([key]) => key.startsWith(reverseKey));
  const reverseWorks = reverseEntries.some(([_, stats]) => stats.success > 0);
  
  // Find working association type
  let workingTypeId = null;
  if (forwardWorks) {
    const workingEntry = forwardEntries.find(([_, stats]) => stats.success > 0);
    if (workingEntry) {
      const match = workingEntry[0].match(/\(Type: (\d+)\)/);
      if (match) workingTypeId = match[1];
    }
  } else if (reverseWorks) {
    const workingEntry = reverseEntries.find(([_, stats]) => stats.success > 0);
    if (workingEntry) {
      const match = workingEntry[0].match(/\(Type: (\d+)\)/);
      if (match) workingTypeId = match[1];
    }
  }
  
  // Add to strategy
  strategy.push({
    entities: `${pair.from} and ${pair.to}`,
    forwardWorks,
    reverseWorks,
    recommendation: forwardWorks 
      ? `Use ${pair.from} → ${pair.to} with type ID ${workingTypeId}`
      : reverseWorks 
        ? `Use ${pair.to} → ${pair.from} with type ID ${workingTypeId}`
        : 'No working direction found'
  });
});

// Print strategy recommendations
strategy.forEach(item => {
  console.log(`${item.entities}:`);
  if (item.forwardWorks && item.reverseWorks) {
    console.log(`  Both directions work, but recommend: ${item.recommendation}`);
  } else if (item.forwardWorks || item.reverseWorks) {
    console.log(`  ${item.recommendation}`);
  } else {
    console.log('  ⚠️ NO WORKING SOLUTION FOUND');
  }
  console.log();
});

// Print final strategy summary
console.log('='.repeat(80));
console.log('IMPLEMENTATION STRATEGY:');
console.log('='.repeat(80));
console.log('When creating associations between different entity types in HubSpot:');
console.log();

strategy.filter(s => s.forwardWorks || s.reverseWorks).forEach(item => {
  console.log(`- ${item.recommendation}`);
});

console.log();
console.log('No working solutions found for:');
strategy.filter(s => !s.forwardWorks && !s.reverseWorks).forEach(item => {
  console.log(`- ${item.entities}`);
});