import fs from 'fs';

// Read the adventure file
const adventureFile = 'adventures/alice_in_wornderland_ai.json';
const adventureData = JSON.parse(fs.readFileSync(adventureFile, 'utf-8'));

const errors = [];
const warnings = [];

// Validate Adventure structure
function validateAdventure(adventure) {
  // Required fields
  if (!adventure.id) errors.push('Missing required field: id');
  if (!adventure.name) errors.push('Missing required field: name');
  if (!adventure.description) errors.push('Missing required field: description');
  if (!adventure.startLocationId) errors.push('Missing required field: startLocationId');
  if (!adventure.locations) {
    errors.push('Missing required field: locations');
    return;
  }
  if (!Array.isArray(adventure.locations)) {
    errors.push('locations must be an array');
    return;
  }

  // Validate startLocationId exists
  const locationIds = adventure.locations.map(loc => loc.id);
  if (!locationIds.includes(adventure.startLocationId)) {
    errors.push(`startLocationId "${adventure.startLocationId}" does not exist in locations`);
  }

  // Validate each location
  adventure.locations.forEach((location, index) => {
    validateLocation(location, index, locationIds);
  });
}

function validateLocation(location, index, allLocationIds) {
  const prefix = `Location[${index}] (${location.id || 'unnamed'})`;

  // Required fields
  if (!location.id) errors.push(`${prefix}: Missing required field: id`);
  if (!location.name) errors.push(`${prefix}: Missing required field: name`);
  if (!location.description) errors.push(`${prefix}: Missing required field: description`);

  // Optional but expected fields
  if (!location.exits) {
    warnings.push(`${prefix}: No exits defined`);
  } else if (!Array.isArray(location.exits)) {
    errors.push(`${prefix}: exits must be an array`);
  } else {
    location.exits.forEach((exit, exitIndex) => {
      validateExit(exit, exitIndex, prefix, allLocationIds);
    });
  }

  if (!location.characters) {
    warnings.push(`${prefix}: No characters defined`);
  } else if (!Array.isArray(location.characters)) {
    errors.push(`${prefix}: characters must be an array`);
  } else {
    location.characters.forEach((character, charIndex) => {
      validateCharacter(character, charIndex, prefix);
    });
  }

  if (!location.items) {
    warnings.push(`${prefix}: No items defined`);
  } else if (!Array.isArray(location.items)) {
    errors.push(`${prefix}: items must be an array`);
  } else {
    location.items.forEach((item, itemIndex) => {
      validateItem(item, itemIndex, prefix);
    });
  }
}

function validateExit(exit, index, locationPrefix, allLocationIds) {
  const prefix = `${locationPrefix} > Exit[${index}]`;

  if (!exit.direction) errors.push(`${prefix}: Missing required field: direction`);
  if (!exit.targetLocationId) {
    errors.push(`${prefix}: Missing required field: targetLocationId`);
  } else if (!allLocationIds.includes(exit.targetLocationId)) {
    errors.push(`${prefix}: targetLocationId "${exit.targetLocationId}" does not exist`);
  }
}

function validateCharacter(character, index, locationPrefix) {
  const prefix = `${locationPrefix} > Character[${index}] (${character.id || 'unnamed'})`;

  // Required fields
  if (!character.id) errors.push(`${prefix}: Missing required field: id`);
  if (!character.name) errors.push(`${prefix}: Missing required field: name`);
  
  // dialogue should be an array
  if (!character.dialogue) {
    warnings.push(`${prefix}: No dialogue defined`);
  } else if (!Array.isArray(character.dialogue)) {
    errors.push(`${prefix}: dialogue must be an array`);
  }

  // AI-powered character validation
  if (character.isAiPowered) {
    if (!character.personality) {
      warnings.push(`${prefix}: AI-powered character missing personality field`);
    }
    if (character.aiConfig) {
      if (typeof character.aiConfig !== 'object') {
        errors.push(`${prefix}: aiConfig must be an object`);
      } else {
        if (character.aiConfig.temperature !== undefined) {
          if (typeof character.aiConfig.temperature !== 'number' || 
              character.aiConfig.temperature < 0 || 
              character.aiConfig.temperature > 2) {
            errors.push(`${prefix}: aiConfig.temperature must be a number between 0 and 2`);
          }
        }
        if (character.aiConfig.maxTokens !== undefined) {
          if (typeof character.aiConfig.maxTokens !== 'number' || 
              character.aiConfig.maxTokens < 1) {
            errors.push(`${prefix}: aiConfig.maxTokens must be a positive number`);
          }
        }
      }
    }
  }
}

function validateItem(item, index, locationPrefix) {
  const prefix = `${locationPrefix} > Item[${index}] (${item.id || 'unnamed'})`;

  if (!item.id) errors.push(`${prefix}: Missing required field: id`);
  if (!item.name) errors.push(`${prefix}: Missing required field: name`);
  if (!item.description) errors.push(`${prefix}: Missing required field: description`);
}

// Run validation
console.log('Validating adventure file:', adventureFile);
console.log('='.repeat(60));

validateAdventure(adventureData);

// Report results
console.log('\n📊 VALIDATION RESULTS\n');

if (errors.length === 0 && warnings.length === 0) {
  console.log('✅ No errors or warnings found!');
  console.log('\n📈 STATISTICS:');
  console.log(`   - Locations: ${adventureData.locations.length}`);
  console.log(`   - Total Characters: ${adventureData.locations.reduce((sum, loc) => sum + (loc.characters?.length || 0), 0)}`);
  console.log(`   - AI-Powered Characters: ${adventureData.locations.reduce((sum, loc) => sum + (loc.characters?.filter(c => c.isAiPowered).length || 0), 0)}`);
  console.log(`   - Total Items: ${adventureData.locations.reduce((sum, loc) => sum + (loc.items?.length || 0), 0)}`);
  process.exit(0);
} else {
  if (errors.length > 0) {
    console.log(`❌ ERRORS (${errors.length}):\n`);
    errors.forEach((error, i) => {
      console.log(`   ${i + 1}. ${error}`);
    });
  }

  if (warnings.length > 0) {
    console.log(`\n⚠️  WARNINGS (${warnings.length}):\n`);
    warnings.forEach((warning, i) => {
      console.log(`   ${i + 1}. ${warning}`);
    });
  }

  console.log('\n📈 STATISTICS:');
  console.log(`   - Locations: ${adventureData.locations.length}`);
  console.log(`   - Total Characters: ${adventureData.locations.reduce((sum, loc) => sum + (loc.characters?.length || 0), 0)}`);
  console.log(`   - AI-Powered Characters: ${adventureData.locations.reduce((sum, loc) => sum + (loc.characters?.filter(c => c.isAiPowered).length || 0), 0)}`);
  console.log(`   - Total Items: ${adventureData.locations.reduce((sum, loc) => sum + (loc.items?.length || 0), 0)}`);

  process.exit(errors.length > 0 ? 1 : 0);
}
