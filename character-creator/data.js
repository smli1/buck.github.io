// character-creator/data.js - static game data tables + wizard state (RACES, CLASSES, BACKGROUNDS, systems config)
// Extracted from character-creator.html; loaded there in page order.

    // ───────────────────────────────────────────────────────────
    // Data (PHB-based, simplified for beginners)
    // ───────────────────────────────────────────────────────────
    let RACES = {
        '': { name: '— Select —', speed: 30, bonuses: {}, langs: [], notes: '', traits: [] },
        human: { name: 'Human', speed: 30, bonuses: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 }, langs: ['Common'], notes: '+1 to all six ability scores', traits: [] },
        dwarf: { name: 'Dwarf', speed: 25, bonuses: { con: 2, str: 2 }, langs: ['Common', 'Dwarvish'], notes: '+2 CON, darkvision, speed 25', traits: ['darkvision', 'dwarven-resilience', 'stonecunning'] },
        elf: { name: 'Elf', speed: 30, bonuses: { dex: 2 }, langs: ['Common', 'Elvish'], notes: '+2 DEX, darkvision', traits: ['darkvision', 'fey-ancestry', 'trance', 'keen-senses'] },
        halfling: { name: 'Halfling', speed: 25, bonuses: { dex: 2 }, langs: ['Common', 'Halfling'], notes: '+2 DEX, Lucky, speed 25', traits: ['lucky', 'brave', 'halfling-nimbleness'] },
        'half-elf': { name: 'Half-Elf', speed: 30, bonuses: { cha: 2, int: 1, wis: 1 }, langs: ['Common', 'Elvish'], notes: '+2 CHA, +1 to two of your choice', traits: ['darkvision', 'fey-ancestry', 'skill-versatility'] },
        'half-orc': { name: 'Half-Orc', speed: 30, bonuses: { str: 2, con: 1 }, langs: ['Common', 'Orc'], notes: '+2 STR, +1 CON, darkvision', traits: ['darkvision', 'menacing', 'relentless-endurance', 'savage-attacks'] },
        tiefling: { name: 'Tiefling', speed: 30, bonuses: { cha: 2, int: 1 }, langs: ['Common', 'Infernal'], notes: '+2 CHA, +1 INT, darkvision', traits: ['darkvision', 'hellish-resistance', 'infernal-legacy'] },
        dragonborn: { name: 'Dragonborn', speed: 30, bonuses: { str: 2, cha: 1 }, langs: ['Common', 'Draconic'], notes: '+2 STR, +1 CHA, breath weapon', traits: ['breath-weapon', 'damage-resistance'] },
        gnome: { name: 'Gnome', speed: 25, bonuses: { int: 2 }, langs: ['Common', 'Gnomish'], notes: '+2 INT, darkvision, speed 25', traits: ['darkvision', 'gnome-cunning'] },
        goliath: { name: 'Goliath', speed: 30, bonuses: { str: 2, con: 1 }, langs: ['Common', 'Giant'], notes: '+2 STR, +1 CON', traits: ['powerful-build', 'stones-endurance'] },
        aasimar: { name: 'Aasimar', speed: 30, bonuses: { cha: 2, wis: 1 }, langs: ['Common', 'Celestial'], notes: '+2 CHA, +1 WIS, darkvision', traits: ['darkvision', 'celestial-resistance', 'healing-hands', 'light-bearer'] },
        firbolg: { name: 'Firbolg', speed: 30, bonuses: { wis: 2, str: 1 }, langs: ['Common', 'Elvish', 'Giant'], notes: '+2 WIS, +1 STR', traits: ['firbolg-magic', 'hidden-step', 'powerful-build'] },
        kenku: { name: 'Kenku', speed: 30, bonuses: { dex: 2, wis: 1 }, langs: ['Common', 'Auran'], notes: '+2 DEX, +1 WIS', traits: ['expert-forgery', 'kenku-training', 'mimicry'] },
        tabaxi: { name: 'Tabaxi', speed: 30, bonuses: { dex: 2, cha: 1 }, langs: ['Common'], notes: '+2 DEX, +1 CHA, darkvision', traits: ['darkvision', 'feline-agility', "cat's-claws"] },
        tortle: { name: 'Tortle', speed: 30, bonuses: { str: 2, wis: 1 }, langs: ['Common'], notes: '+2 STR, +1 WIS, natural armor 17', traits: ['natural-armor', 'shell-defense', 'hold-breath'] },
        bugbear: { name: 'Bugbear', speed: 30, bonuses: { str: 2, dex: 1 }, langs: ['Common', 'Goblin'], notes: '+2 STR, +1 DEX, darkvision', traits: ['darkvision', 'long-limbed', 'powerful-build', 'sneaky', 'surprise-attack'] },
        goblin: { name: 'Goblin', speed: 30, bonuses: { dex: 2, con: 1 }, langs: ['Common', 'Goblin'], notes: '+2 DEX, +1 CON, darkvision', traits: ['darkvision', 'fury-of-the-small', 'nimble-escape'] },
        hobgoblin: { name: 'Hobgoblin', speed: 30, bonuses: { con: 2, int: 1 }, langs: ['Common', 'Goblin'], notes: '+2 CON, +1 INT, darkvision', traits: ['darkvision', 'martial-training', 'saving-face'] },
        kobold: { name: 'Kobold', speed: 30, bonuses: { dex: 2 }, langs: ['Common', 'Draconic'], notes: '+2 DEX, darkvision', traits: ['darkvision', 'pack-tactics', 'sunlight-sensitivity'] },
        orc: { name: 'Orc', speed: 30, bonuses: { str: 2, con: 1 }, langs: ['Common', 'Orc'], notes: '+2 STR, +1 CON, darkvision', traits: ['darkvision', 'aggressive', 'powerful-build', 'primal-intuition'] },
        'yuan-ti': { name: 'Yuan-Ti Pureblood', speed: 30, bonuses: { cha: 2, int: 1 }, langs: ['Common', 'Abyssal', 'Draconic', 'Infernal'], notes: '+2 CHA, +1 INT, darkvision', traits: ['darkvision', 'magic-resistance', 'poison-immunity', 'poison-spray'] }
    };

    let CLASSES = {
        '': { name: '— Select —', hitDie: 'd8', saves: [], skillCount: 2, spellAbility: '', notes: '', subclasses: [] },
        barbarian: { name: 'Barbarian', hitDie: 'd12', saves: ['str', 'con'], skillCount: 2, spellAbility: '', notes: 'd12 hit die', subclasses: ['Berserker', 'Totem Warrior', 'Ancestral Guardian', 'Storm Herald', 'Zealot', 'Beast', 'Wild Magic'] },
        bard: { name: 'Bard', hitDie: 'd8', saves: ['dex', 'cha'], skillCount: 3, spellAbility: 'cha', notes: 'Spellcaster (CHA)', subclasses: ['College of Lore', 'College of Valor', 'College of Glamour', 'College of Swords', 'College of Whispers', 'College of Creation', 'College of Eloquence'] },
        cleric: { name: 'Cleric', hitDie: 'd8', saves: ['wis', 'cha'], skillCount: 2, spellAbility: 'wis', notes: 'Spellcaster (WIS), heavy armor', subclasses: ['Knowledge Domain', 'Life Domain', 'Light Domain', 'Nature Domain', 'Tempest Domain', 'Trickery Domain', 'War Domain', 'Forge Domain', 'Grave Domain', 'Order Domain', 'Peace Domain', 'Twilight Domain'] },
        druid: { name: 'Druid', hitDie: 'd8', saves: ['int', 'wis'], skillCount: 2, spellAbility: 'wis', notes: 'Spellcaster (WIS)', subclasses: ['Circle of the Land', 'Circle of the Moon', 'Circle of Dreams', 'Circle of the Shepherd', 'Circle of Spores', 'Circle of Stars', 'Circle of Wildfire'] },
        fighter: { name: 'Fighter', hitDie: 'd10', saves: ['str', 'con'], skillCount: 2, spellAbility: '', notes: 'd10 hit die, armor & weapons', subclasses: ['Champion', 'Battle Master', 'Eldritch Knight', 'Arcane Archer', 'Cavalier', 'Samurai', 'Psi Warrior', 'Rune Knight', 'Echo Knight'] },
        monk: { name: 'Monk', hitDie: 'd8', saves: ['str', 'dex'], skillCount: 2, spellAbility: '', notes: 'd8 hit die, no armor', subclasses: ['Way of the Open Hand', 'Way of Shadow', 'Way of the Four Elements', 'Way of the Drunken Master', 'Way of the Kensei', 'Way of the Sun Soul', 'Way of Mercy', 'Way of the Astral Self', 'Way of the Ascendant Dragon'] },
        paladin: { name: 'Paladin', hitDie: 'd10', saves: ['wis', 'cha'], skillCount: 2, spellAbility: 'cha', notes: 'Spellcaster (CHA), heavy armor', subclasses: ['Oath of Devotion', 'Oath of the Ancients', 'Oath of Vengeance', 'Oath of Conquest', 'Oath of Redemption', 'Oath of Glory', 'Oath of the Watchers', 'Oathbreaker'] },
        ranger: { name: 'Ranger', hitDie: 'd10', saves: ['str', 'dex'], skillCount: 3, spellAbility: 'wis', notes: 'Spellcaster (WIS), ranged expert', subclasses: ['Hunter', 'Beast Master', 'Gloom Stalker', 'Horizon Walker', 'Monster Slayer', 'Fey Wanderer', 'Swarmkeeper', 'Drakewarden'] },
        rogue: { name: 'Rogue', hitDie: 'd8', saves: ['dex', 'int'], skillCount: 4, spellAbility: '', notes: 'd8 hit die, sneak attack', subclasses: ['Thief', 'Assassin', 'Arcane Trickster', 'Mastermind', 'Swashbuckler', 'Inquisitive', 'Scout', 'Phantom', 'Soulknife'] },
        sorcerer: { name: 'Sorcerer', hitDie: 'd6', saves: ['con', 'cha'], skillCount: 2, spellAbility: 'cha', notes: 'Spellcaster (CHA), d6 hit die', subclasses: ['Draconic Bloodline', 'Wild Magic', 'Divine Soul', 'Shadow Magic', 'Storm Sorcery', 'Aberrant Mind', 'Clockwork Soul', 'Lunar Sorcery'] },
        warlock: { name: 'Warlock', hitDie: 'd8', saves: ['wis', 'cha'], skillCount: 2, spellAbility: 'cha', notes: 'Spellcaster (CHA), pact magic', subclasses: ['The Archfey', 'The Fiend', 'The Great Old One', 'The Celestial', 'The Hexblade', 'The Fathomless', 'The Genie', 'The Undead'] },
        wizard: { name: 'Wizard', hitDie: 'd6', saves: ['int', 'wis'], skillCount: 2, spellAbility: 'int', notes: 'Spellcaster (INT), d6 hit die', subclasses: ['School of Abjuration', 'School of Conjuration', 'School of Divination', 'School of Enchantment', 'School of Evocation', 'School of Illusion', 'School of Necromancy', 'School of Transmutation', 'Bladesinging', 'War Magic', 'Chronurgy', 'Graviturgy', 'Order of Scribes'] }
    };

    let BACKGROUNDS = {
        '': { name: '— Select —', notes: '' },
        acolyte: { name: 'Acolyte', notes: 'Ran a temple; gets shelter among faith communities.' },
        charlatan: { name: 'Charlatan', notes: 'A fake identity & forgery kit; good at cons.' },
        criminal: { name: 'Criminal', notes: 'Thieves’ tools and a criminal contact.' },
        entertainer: { name: 'Entertainer', notes: 'Perform in exchange for room & board.' },
        'folk-hero': { name: 'Folk Hero', notes: 'Common folk adore you; trouble finds you.' },
        'guild-artisan': { name: 'Guild Artisan', notes: 'Guild membership with reputation & contacts.' },
        hermit: { name: 'Hermit', notes: 'A discovery or revelation from isolation.' },
        noble: { name: 'Noble', notes: 'Rank, privilege, and a powerful family name.' },
        outlander: { name: 'Outlander', notes: 'Wilderness survival; knows your terrain.' },
        sage: { name: 'Sage', notes: 'Libraries and research; a patron scholar.' },
        sailor: { name: 'Sailor', notes: 'Ships, the sea, and a free passage finder.' },
        soldier: { name: 'Soldier', notes: 'Military rank; friends in the army.' },
        urchin: { name: 'Urchin', notes: 'City streets; knows secret passageways.' }
    };

    let SKILL_ABILITIES = {
        acrobatics: 'dex', 'animal-handling': 'wis', arcana: 'int', athletics: 'str',
        deception: 'cha', history: 'int', insight: 'wis', intimidation: 'cha',
        investigation: 'int', medicine: 'wis', nature: 'int', perception: 'wis',
        performance: 'cha', persuasion: 'cha', religion: 'int',
        'sleight-of-hand': 'dex', stealth: 'dex', survival: 'wis'
    };
    let SKILL_LABELS = {
        acrobatics: 'Acrobatics (DEX)', 'animal-handling': 'Animal Handling (WIS)', arcana: 'Arcana (INT)',
        athletics: 'Athletics (STR)', deception: 'Deception (CHA)', history: 'History (INT)',
        insight: 'Insight (WIS)', intimidation: 'Intimidation (CHA)', investigation: 'Investigation (INT)',
        medicine: 'Medicine (WIS)', nature: 'Nature (INT)', perception: 'Perception (WIS)',
        performance: 'Performance (CHA)', persuasion: 'Persuasion (CHA)', religion: 'Religion (INT)',
        'sleight-of-hand': 'Sleight of Hand (DEX)', stealth: 'Stealth (DEX)', survival: 'Survival (WIS)'
    };

    function skillLabel(short) {
        return (SKILL_LABELS[short] || short).replace(/\s*\((?:str|dex|con|int|wis|cha)\)\s*$/i, '');
    }

    let LANGUAGES = ['Common', 'Dwarvish', 'Elvish', 'Giant', 'Gnomish', 'Goblin', 'Halfling', 'Orc',
        'Abyssal', 'Celestial', 'Draconic', 'Deep Speech', 'Infernal', 'Primordial', 'Sylvan', 'Undercommon'];

    let ARMORS = {
        '': { name: 'No Armor (Unarmored)', ac: 10, dexCap: null },
        padded: { name: 'Padded', ac: 11, dexCap: null },
        leather: { name: 'Leather', ac: 11, dexCap: null },
        'studded-leather': { name: 'Studded Leather', ac: 12, dexCap: null },
        hide: { name: 'Hide (medium)', ac: 12, dexCap: 2 },
        'chain-shirt': { name: 'Chain Shirt (medium)', ac: 13, dexCap: 2 },
        'scale-mail': { name: 'Scale Mail (medium)', ac: 14, dexCap: 2 },
        breastplate: { name: 'Breastplate (medium)', ac: 14, dexCap: 2 },
        'half-plate': { name: 'Half Plate (medium)', ac: 15, dexCap: 2 },
        'ring-mail': { name: 'Ring Mail (heavy)', ac: 14, dexCap: 0 },
        'chain-mail': { name: 'Chain Mail (heavy)', ac: 16, dexCap: 0 },
        splint: { name: 'Splint (heavy)', ac: 17, dexCap: 0 },
        plate: { name: 'Plate (heavy)', ac: 18, dexCap: 0 },
        shield: { name: 'Shield (+2 AC)', ac: 2, dexCap: null, shield: true }
    };

    let WEAPONS = [
        { id: 'dagger', name: 'Dagger (1d4 finesse)', die: '1d4', finesse: true },
        { id: 'shortsword', name: 'Shortsword (1d6 finesse)', die: '1d6', finesse: true },
        { id: 'rapier', name: 'Rapier (1d8 finesse)', die: '1d8', finesse: true },
        { id: 'longsword', name: 'Longsword (1d8 versatile)', die: '1d8', finesse: false },
        { id: 'greataxe', name: 'Greataxe (1d12 two-handed)', die: '1d12', finesse: false },
        { id: 'greatsword', name: 'Greatsword (2d6 heavy)', die: '2d6', finesse: false },
        { id: 'handaxe', name: 'Handaxe (1d6 light)', die: '1d6', finesse: false },
        { id: 'longbow', name: 'Longbow (1d8, 150/600)', die: '1d8', finesse: false, ranged: true },
        { id: 'shortbow', name: 'Shortbow (1d6, 80/320)', die: '1d6', finesse: false, ranged: true },
        { id: 'light-crossbow', name: 'Light Crossbow (1d8, 80/320)', die: '1d8', finesse: false, ranged: true },
        { id: 'quarterstaff', name: 'Quarterstaff (1d6)', die: '1d6', finesse: false },
        { id: 'whip', name: 'Whip (1d4 finesse reach)', die: '1d4', finesse: true },
        { id: 'battleaxe', name: 'Battleaxe (1d8 versatile)', die: '1d8', finesse: false },
        { id: 'mace', name: 'Mace (1d6)', die: '1d6', finesse: false }
    ];

    // ───────────────────────────────────────────────────────────
    // State
    // ───────────────────────────────────────────────────────────
    let ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
    const STORAGE_KEY = 'rpg_characters_v2';
    let CONSTANTS = { totalSteps: 11 };
    let currentStep = 0;

    let SYSTEM = '';
    let SYSTEM_NAME = '';
    let SYSTEM_TAGLINE = '';
    let PROF_BONUS = null;
    let DC_BASE = 8;
    let SAVES_LABEL = 'Saving Throws';
    let BONUS_LABEL = 'Proficiency Bonus';
    let POINT_BUY_POOL = 27;

