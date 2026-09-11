import { EquipmentManager } from './equipment.js';
import { Character } from './character.js';

// Test equipment system integration
console.log('Testing Equipment System...\n');

// Create a test character
const characterData = {
    id: 'test-1',
    name: 'Test Character',
    level: 5,
    abilities: { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 8 },
    styles: { defense: true, archery: true }
};

const character = new Character(characterData);
console.log('Character created:', character.data.name);
console.log('Base AC:', character.data.ac);
console.log('Base abilities:', character.data.abilities);

// Test equipment manager initialization
console.log('\n--- Equipment Manager Initialization ---');
if (character.equipmentManager) {
    console.log('✓ Equipment manager initialized successfully');
    console.log('Equipped items:', character.equipmentManager.getEquipped());
} else {
    console.log('✗ Equipment manager not initialized');
}

// Test equipping armor
console.log('\n--- Testing Armor Equipping ---');
const testArmor = { name: 'Chain Mail', ac: 16, dexCap: 0, type: 'heavy' };
try {
    character.setArmor(testArmor);
    console.log('✓ Armor equipped:', testArmor.name);
    console.log('New AC:', character.data.ac);
    
    const acBreakdown = character.getACBreakdown();
    if (acBreakdown) {
        console.log('AC Breakdown:', acBreakdown);
    }
} catch (e) {
    console.log('✗ Error equipping armor:', e.message);
}

// Test equipping weapon
console.log('\n--- Testing Weapon Equipping ---');
const testWeapon = { name: 'Longbow', damage: '1d8', type: 'ranged', range: '150/600' };
try {
    character.equipWeapon(testWeapon);
    console.log('✓ Weapon equipped:', testWeapon.name);
    
    const equippedWeapon = character.getEquippedWeapon();
    console.log('Equipped weapon:', equippedWeapon);
    
    const attackBonus = character.getWeaponAttackBonus(testWeapon);
    console.log('Weapon attack bonus:', attackBonus);
    
    const damageBonus = character.getWeaponDamageBonus(testWeapon);
    console.log('Weapon damage bonus:', damageBonus);
    
    const attackBreakdown = character.getWeaponAttackBreakdown(testWeapon);
    if (attackBreakdown) {
        console.log('Weapon attack breakdown:', attackBreakdown);
    }
} catch (e) {
    console.log('✗ Error equipping weapon:', e.message);
}

// Test equipping necklace
console.log('\n--- Testing Necklace Equipping ---');
const testNecklace = { 
    name: 'Amulet of the Bear', 
    description: 'Strength bonus', 
    bonuses: { str: 2 }, 
    rarity: 'uncommon' 
};
try {
    character.equipNecklace(testNecklace);
    console.log('✓ Necklace equipped:', testNecklace.name);
    
    const equippedNecklace = character.getEquippedNecklace();
    console.log('Equipped necklace:', equippedNecklace);
    
    console.log('AC after necklace:', character.data.ac);
    
    const acBreakdown = character.getACBreakdown();
    if (acBreakdown) {
        console.log('AC Breakdown with necklace:', acBreakdown);
    }
} catch (e) {
    console.log('✗ Error equipping necklace:', e.message);
}

// Test inventory management
console.log('\n--- Testing Inventory Management ---');
try {
    character.equipmentManager.addToInventory({ name: 'Health Potion', quantity: 3, description: 'Restores HP' });
    character.equipmentManager.addToInventory({ name: 'Torch', quantity: 5, description: 'Light source' });
    console.log('✓ Items added to inventory');
    console.log('Inventory:', character.equipmentManager.getInventory());
    
    character.equipmentManager.removeFromInventory('Health Potion', 1);
    console.log('✓ Removed 1 Health Potion');
    console.log('Updated inventory:', character.equipmentManager.getInventory());
} catch (e) {
    console.log('✗ Error managing inventory:', e.message);
}

// Test JSON serialization
console.log('\n--- Testing JSON Serialization ---');
try {
    const json = character.toJSON();
    console.log('✓ Character serialized to JSON');
    console.log('Equipment in JSON:', json.equipment);
    
    // Test loading from JSON
    const newCharacter = new Character(json);
    console.log('✓ Character loaded from JSON');
    console.log('Loaded equipment:', newCharacter.equipmentManager ? newCharacter.equipmentManager.getEquipped() : 'No equipment manager');
} catch (e) {
    console.log('✗ Error in JSON serialization:', e.message);
}

console.log('\n--- Equipment System Test Complete ---');
