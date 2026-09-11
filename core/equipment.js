export class EquipmentManager {
    constructor(data = {}) {
        this.data = {
            equipped: {
                weapon: data.equipped?.weapon || null,
                armor: data.equipped?.armor || null,
                necklace: data.equipped?.necklace || null
            },
            inventory: Array.isArray(data.inventory) ? data.inventory.slice() : []
        };
        this.listeners = new Set();
    }

    // Get all equipped items
    getEquipped() {
        return { ...this.data.equipped };
    }

    // Get equipped item by slot
    getEquippedItem(slot) {
        return this.data.equipped[slot] || null;
    }

    // Equip an item to a specific slot
    equip(slot, item) {
        const validSlots = ['weapon', 'armor', 'necklace'];
        if (!validSlots.includes(slot)) {
            throw new Error(`Invalid slot: ${slot}. Must be one of: ${validSlots.join(', ')}`);
        }

        if (!item) {
            this.data.equipped[slot] = null;
            this._emitChange();
            return true;
        }

        // Validate item structure based on slot
        if (slot === 'weapon') {
            this._validateWeapon(item);
        } else if (slot === 'armor') {
            this._validateArmor(item);
        } else if (slot === 'necklace') {
            this._validateNecklace(item);
        }

        // Shallow clone the item to avoid reference issues
        this.data.equipped[slot] = { ...item };
        this._emitChange();
        return true;
    }

    // Unequip item from a slot
    unequip(slot) {
        return this.equip(slot, null);
    }

    // Validate weapon item structure
    _validateWeapon(item) {
        if (!item.name) throw new Error('Weapon must have a name');
        if (!item.damage) throw new Error('Weapon must have damage value');
    }

    // Validate armor item structure
    _validateArmor(item) {
        if (!item.name) throw new Error('Armor must have a name');
        if (!Number.isFinite(item.ac)) throw new Error('Armor must have AC value');
    }

    // Validate necklace item structure
    _validateNecklace(item) {
        if (!item.name) throw new Error('Necklace must have a name');
    }

    // Calculate weapon attack bonus based on character abilities
    getWeaponAttackBonus(character, weapon) {
        if (!weapon || !character) return 0;

        const abilities = character.data?.abilities || {};
        const proficiencyBonus = character.getProficiencyBonus ? character.getProficiencyBonus() : 2;
        
        let abilityMod = 0;
        if (weapon.type === 'ranged') {
            const dexScore = Number(abilities.dex || 10);
            abilityMod = character.abilityModifier ? character.abilityModifier(dexScore) : Math.floor((dexScore - 10) / 2);
        } else if (weapon.type === 'melee') {
            const strScore = Number(abilities.str || 10);
            abilityMod = character.abilityModifier ? character.abilityModifier(strScore) : Math.floor((strScore - 10) / 2);
        }

        // Add style bonus for archery if using ranged weapon
        let styleBonus = 0;
        if (weapon.type === 'ranged' && character.getStyleBonus) {
            styleBonus = character.getStyleBonus('archery', 'longbowHit', 2);
        }

        // Add feat bonuses
        let featBonus = 0;
        if (weapon.type === 'ranged' && character.data?.featBonuses?.rangedhit) {
            featBonus = Number(character.data.featBonuses.rangedhit) || 0;
        } else if (weapon.type === 'melee' && character.data?.featBonuses?.meleehit) {
            featBonus = Number(character.data.featBonuses.meleehit) || 0;
        }

        return proficiencyBonus + abilityMod + styleBonus + featBonus;
    }

    // Calculate weapon damage bonus
    getWeaponDamageBonus(character, weapon) {
        if (!weapon || !character) return 0;

        const abilities = character.data?.abilities || {};
        
        let abilityMod = 0;
        if (weapon.type === 'ranged') {
            const dexScore = Number(abilities.dex || 10);
            abilityMod = character.abilityModifier ? character.abilityModifier(dexScore) : Math.floor((dexScore - 10) / 2);
        } else if (weapon.type === 'melee') {
            const strScore = Number(abilities.str || 10);
            abilityMod = character.abilityModifier ? character.abilityModifier(strScore) : Math.floor((strScore - 10) / 2);
        }

        // Add feat damage bonuses
        let featBonus = 0;
        if (weapon.type === 'ranged' && character.data?.featBonuses?.rangeddamage) {
            featBonus = Number(character.data.featBonuses.rangeddamage) || 0;
        } else if (weapon.type === 'melee' && character.data?.featBonuses?.meleedamage) {
            featBonus = Number(character.data.featBonuses.meleedamage) || 0;
        }

        return abilityMod + featBonus;
    }

    // Get weapon attack breakdown for tooltip
    getWeaponAttackBreakdown(character, weapon) {
        if (!weapon || !character) return null;

        const abilities = character.data?.abilities || {};
        const proficiencyBonus = character.getProficiencyBonus ? character.getProficiencyBonus() : 2;
        
        let abilityMod = 0;
        let abilityName = '';
        if (weapon.type === 'ranged') {
            const dexScore = Number(abilities.dex || 10);
            abilityMod = character.abilityModifier ? character.abilityModifier(dexScore) : Math.floor((dexScore - 10) / 2);
            abilityName = 'DEX';
        } else if (weapon.type === 'melee') {
            const strScore = Number(abilities.str || 10);
            abilityMod = character.abilityModifier ? character.abilityModifier(strScore) : Math.floor((strScore - 10) / 2);
            abilityName = 'STR';
        }

        let styleBonus = 0;
        let styleName = '';
        if (weapon.type === 'ranged' && character.getStyleBonus) {
            styleBonus = character.getStyleBonus('archery', 'longbowHit', 2);
            styleName = '箭術風格';
        }

        let featBonus = 0;
        if (weapon.type === 'ranged' && character.data?.featBonuses?.rangedhit) {
            featBonus = Number(character.data.featBonuses.rangedhit) || 0;
        } else if (weapon.type === 'melee' && character.data?.featBonuses?.meleehit) {
            featBonus = Number(character.data.featBonuses.meleehit) || 0;
        }

        const total = proficiencyBonus + abilityMod + styleBonus + featBonus;

        return {
            proficiencyBonus,
            abilityMod,
            abilityName,
            styleBonus,
            styleName,
            featBonus,
            total
        };
    }

    // Calculate total AC from equipped armor and necklace
    getTotalAC(character) {
        if (!character) return 10;

        const armor = this.data.equipped.armor;
        const necklace = this.data.equipped.necklace;
        
        const abilities = character.data?.abilities || {};
        const dexScore = Number(abilities.dex || 10);
        const dexMod = character.abilityModifier ? character.abilityModifier(dexScore) : Math.floor((dexScore - 10) / 2);
        
        const styleBonus = character.getStyleBonus ? character.getStyleBonus('defense', 'ac', 1) : 0;
        
        let baseAC = 10;
        let appliedDex = dexMod;

        // Apply armor rules
        if (armor && Number.isFinite(armor.ac)) {
            baseAC = Number(armor.ac);
            if (armor.hasOwnProperty('dexCap') && armor.dexCap !== null && armor.dexCap !== undefined) {
                const cap = Number(armor.dexCap);
                if (Number.isFinite(cap)) {
                    appliedDex = Math.min(dexMod, cap);
                }
            }
        } else {
            // No armor: base 12 + dex
            baseAC = 12;
        }

        // Apply necklace AC bonus if present
        let necklaceBonus = 0;
        if (necklace && necklace.bonuses && necklace.bonuses.ac) {
            necklaceBonus = Number(necklace.bonuses.ac) || 0;
        }

        return baseAC + appliedDex + styleBonus + necklaceBonus;
    }

    // Get AC breakdown for tooltip
    getACBreakdown(character) {
        if (!character) return null;

        const armor = this.data.equipped.armor;
        const necklace = this.data.equipped.necklace;
        
        const abilities = character.data?.abilities || {};
        const dexScore = Number(abilities.dex || 10);
        const dexMod = character.abilityModifier ? character.abilityModifier(dexScore) : Math.floor((dexScore - 10) / 2);
        
        const styleBonus = character.getStyleBonus ? character.getStyleBonus('defense', 'ac', 1) : 0;
        
        let baseAC = armor && Number.isFinite(armor.ac) ? Number(armor.ac) : 12;
        let appliedDex = dexMod;
        let dexCap = null;

        if (armor && armor.hasOwnProperty('dexCap') && armor.dexCap !== null && armor.dexCap !== undefined) {
            const cap = Number(armor.dexCap);
            if (Number.isFinite(cap)) {
                appliedDex = Math.min(dexMod, cap);
                dexCap = cap;
            }
        }

        let necklaceBonus = 0;
        if (necklace && necklace.bonuses && necklace.bonuses.ac) {
            necklaceBonus = Number(necklace.bonuses.ac) || 0;
        }

        const total = baseAC + appliedDex + styleBonus + necklaceBonus;

        return {
            baseAC,
            armorName: armor?.name || '無護甲',
            dexMod,
            appliedDex,
            dexCap,
            styleBonus,
            necklaceBonus,
            necklaceName: necklace?.name || null,
            total
        };
    }

    // Get necklace bonuses
    getNecklaceBonuses() {
        const necklace = this.data.equipped.necklace;
        if (!necklace || !necklace.bonuses) return {};
        
        return { ...necklace.bonuses };
    }

    // Add item to inventory
    addToInventory(item) {
        if (!item || !item.name) return false;
        
        // Check if item already exists in inventory
        const existingIndex = this.data.inventory.findIndex(i => i.name === item.name);
        if (existingIndex !== -1) {
            // Update quantity if it exists
            const currentQty = Number(this.data.inventory[existingIndex].quantity) || 0;
            const addQty = Number(item.quantity) || 1;
            this.data.inventory[existingIndex].quantity = currentQty + addQty;
        } else {
            // Add new item
            this.data.inventory.push({
                name: item.name,
                quantity: Number(item.quantity) || 1,
                description: item.description || '',
                type: item.type || 'misc'
            });
        }
        
        this._emitChange();
        return true;
    }

    // Remove item from inventory
    removeFromInventory(itemName, quantity = 1) {
        const index = this.data.inventory.findIndex(i => i.name === itemName);
        if (index === -1) return false;

        const currentQty = Number(this.data.inventory[index].quantity) || 0;
        const removeQty = Number(quantity) || 1;

        if (currentQty <= removeQty) {
            this.data.inventory.splice(index, 1);
        } else {
            this.data.inventory[index].quantity = currentQty - removeQty;
        }

        this._emitChange();
        return true;
    }

    // Get inventory
    getInventory() {
        return this.data.inventory.slice();
    }

    // Subscribe to changes
    onChange(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    // Emit change event
    _emitChange() {
        this.listeners.forEach(callback => {
            try {
                callback(this.getState());
            } catch (e) {
                console.error('Equipment listener error:', e);
            }
        });
    }

    // Get current state
    getState() {
        return {
            equipped: { ...this.data.equipped },
            inventory: this.data.inventory.slice()
        };
    }

    // Export to JSON
    toJSON() {
        return {
            equipped: { ...this.data.equipped },
            inventory: this.data.inventory.slice()
        };
    }

    // Load from JSON
    static fromJSON(json) {
        return new EquipmentManager(json);
    }
}

// Factory function
export function createEquipmentManager(data = {}) {
    return new EquipmentManager(data);
}

// Expose to window for debugging
export function exposeEquipmentManagerToWindow(manager) {
    if (typeof window !== 'undefined') {
        window.EquipmentManager = EquipmentManager;
        window.equipmentManager = manager;
    }
}
