// character-creator/dictionary.js - per-step glossary panel (descriptions, badges, highlighting)
// Extracted from character-creator.html; loaded there in page order.

    // ───────────────────────────────────────────────────────────
    // Step dictionary — a glossary for every wizard step that
    // explains the available options (like the Step 5 spellbook
    // panel), highlights the currently selected option, and can
    // be filtered by typing.
    // ───────────────────────────────────────────────────────────
    const SKILL_DESC = {
        acrobatics: 'Balance, tumbling, and staying on your feet (DEX).',
        'animal-handling': 'Calming or controlling animals (WIS).',
        arcana: 'Lore of magic, spells, and magical items (INT).',
        athletics: 'Climbing, jumping, and swimming — raw physical feats (STR).',
        deception: 'Lies and misdirection (CHA).',
        history: 'Knowledge of the past, royalty, and wars (INT).',
        insight: 'Reading intent and detecting lies (WIS).',
        intimidation: 'Coercion through threats (CHA).',
        investigation: 'Searching, deducing, and finding clues (INT).',
        medicine: 'Diagnosis and first aid (WIS).',
        nature: 'Plants, animals, weather, and natural lore (INT).',
        perception: 'Spotting hidden things with your senses (WIS).',
        performance: 'Entertaining through art or music (CHA).',
        persuasion: 'Convincing others with charm and logic (CHA).',
        religion: 'Deities, rites, temples, and holy lore (INT).',
        'sleight-of-hand': 'Pickpocketing and manual trickery (DEX).',
        stealth: 'Moving unseen and unheard (DEX).',
        survival: 'Tracking, foraging, and navigating wilderness (WIS).'
    };

    const LANG_DESC = {
        Common: 'The common trade tongue of the realms; nearly every adventurer speaks it.',
        Dwarvish: 'The guttural, rune-written language of the dwarves.',
        Elvish: 'A flowing, musical language of the elves.',
        Giant: 'The booming tongue of giants and their kin.',
        Gnomish: 'A gnomish language written in the Dwarvish alphabet, rich in technical terms.',
        Goblin: 'The harsh language of goblinoids — goblins, hobgoblins, and bugbears.',
        Halfling: 'A soft, friendly tongue with a simple script.',
        Orc: 'The harsh, guttural language of orcs.',
        Abyssal: 'The corrupt language of demons, written in twisted, chaotic marks.',
        Celestial: 'The divine language of good-aligned immortal beings, found in holy texts.',
        Draconic: 'The ancient language of dragons — the most common script for written magic.',
        'Deep Speech': 'The alien language of aberrations; humans find it hard to pronounce.',
        Infernal: 'The precise, formal language of devils, written in angular script.',
        Primordial: 'The elemental tongue, with dialects for air, earth, fire, and water.',
        Sylvan: 'The lyrical language of the fey, spoken in forests and twilight.',
        Undercommon: 'The trade pidgin of the Underdark, mixing many races.',
        English: 'Real-world language for non-d20 systems such as Call of Cthulhu.',
        Mandarin: 'Real-world language for non-d20 systems such as Call of Cthulhu.',
        Spanish: 'Real-world language for non-d20 systems such as Call of Cthulhu.',
        French: 'Real-world language for non-d20 systems such as Call of Cthulhu.',
        German: 'Real-world language for non-d20 systems such as Call of Cthulhu.',
        Arabic: 'Real-world language for non-d20 systems such as Call of Cthulhu.',
        Russian: 'Real-world language for non-d20 systems such as Call of Cthulhu.',
        Greek: 'Real-world language for non-d20 systems such as Call of Cthulhu.',
        Latin: 'Real-world language for non-d20 systems such as Call of Cthulhu.',
        Egyptian: 'Real-world language for non-d20 systems such as Call of Cthulhu.'
    };

    const CAT_DESC = {
        'Adventuring Gear': 'Everyday supplies for travel and dungeon-delving — rope, lanterns, and sundries.',
        'Gear Kits': 'Specialized kits (climber, healer, disguise…) sized for one broad task.',
        'Light': 'Light sources for dark places — lanterns and torches.',
        'Food & Drink': 'Provisions and drink to keep you fed on the road.',
        'Container': 'Bags, vials, and barrels for carrying or storing things.',
        'Tools': 'Professional tools for a craft or trade, such as thieves’ tools or smith’s tools.',
        'Packs': 'Pre-made bundles of gear — buy a whole adventuring kit at once.',
        'Clothing': 'Clothes for every occasion, from common wear to fine robes.',
        'Ammunition': 'Arrows, bolts, and stones for ranged weapons.',
        'Mounts': 'Animals and tack for riding and hauling.'
    };

    const ALIGN_DESC = {
        'Lawful Good': 'Acts with honor and justice, following the law when it serves good.',
        'Neutral Good': 'Does the greatest good regardless of law or chaos.',
        'Chaotic Good': 'Follows conscience and freedom, ignoring rules that obstruct good.',
        'Lawful Neutral': 'Honors order, tradition, and law above moral whims.',
        'True Neutral': 'Balanced; avoids extremes, committing to nature or pragmatism.',
        'Chaotic Neutral': 'Values personal freedom and follows whims and impulses.',
        'Lawful Evil': 'Uses law and order ruthlessly to gain personal power.',
        'Neutral Evil': 'Does whatever it takes, without honor or scruples.',
        'Chaotic Evil': 'Cruelty and destruction for their own sake — a law unto itself.'
    };

    // Named racial / ancestry traits. `traits` on each race references these keys;
    // any trait whose `match` appears in a race's notes is also picked up automatically,
    // so traits defined by other rulesets (3.5e, PF2, …) still get explained.
    const TRAIT_DESC = {
        darkvision: { name: 'Darkvision', desc: 'See in dim light within 60 ft as if it were bright, and in darkness as if it were dim — shades of gray only.', mod: [modBadge('60 ft', 'key'), modBadge('no color', '')], match: /\bdarkvision\b/i },
        'superior-darkvision': { name: 'Superior Darkvision', desc: 'Darkvision out to 120 ft.', mod: [modBadge('120 ft', 'key')], match: /\bsuperior darkvision\b/i },
        'low-light-vision': { name: 'Low-Light Vision', desc: 'See twice as far as a human in dim light.', mod: [modBadge('dim light ×2', 'key')], match: /\blow-light vision\b/i },
        'sunlight-sensitivity': { name: 'Sunlight Sensitivity', desc: 'Disadvantage on attack rolls and sight-based Perception checks in direct sunlight.', mod: [modBadge('disadvantage in sunlight', 'neg')], match: /\bsunlight sensitivity\b/i },
        trance: { name: 'Trance', desc: 'Meditate 4 hours instead of sleeping 8; you stay semiconscious and gain the same rest.', mod: [modBadge('4 h rest', 'key'), modBadge('immune to magic sleep', 'pos')], match: /\btrance\b/i },
        'fey-ancestry': { name: 'Fey Ancestry', desc: 'Advantage on saving throws against being charmed, and magic cannot put you to sleep.', mod: [modBadge('advantage vs charm', 'pos'), modBadge('immune to sleep', 'pos')], match: /\bfey ancestry\b/i },
        'keen-senses': { name: 'Keen Senses', desc: 'Proficiency in the Perception skill.', mod: [modBadge('Perception', 'pos')], match: /\bkeen senses\b/i },
        'skill-versatility': { name: 'Skill Versatility', desc: 'Gain proficiency in two skills of your choice.', mod: [modBadge('2 skill proficiencies', 'pos')], match: /\bskill versatility\b/i },
        lucky: { name: 'Lucky', desc: 'When you roll a 1 on an attack roll, ability check, or saving throw, you can reroll it and must use the new roll. Once per turn.', mod: [modBadge('reroll a natural 1', 'pos'), modBadge('1/turn', '')], match: /\blucky\b/i },
        brave: { name: 'Brave', desc: 'Advantage on saving throws against being frightened.', mod: [modBadge('advantage vs frightened', 'pos')], match: /\bbrave\b/i },
        'halfling-nimbleness': { name: 'Halfling Nimbleness', desc: 'Move through the space of any creature larger than you.', mod: [modBadge('move through larger creatures', 'key')], match: /\bnimbleness\b/i },
        'stout-resilience': { name: 'Stout Resilience', desc: 'Advantage on saves against poison and resistance to poison damage.', mod: [modBadge('advantage vs poison', 'pos'), modBadge('resistance: poison', 'pos')], match: /\bstout resilience\b/i },
        'dwarven-resilience': { name: 'Dwarven Resilience', desc: 'Advantage on saving throws against poison and resistance to poison damage.', mod: [modBadge('advantage vs poison', 'pos'), modBadge('resistance: poison', 'pos')], match: /\bdwarven resilience\b/i },
        stonecunning: { name: 'Stonecunning', desc: 'Double your proficiency bonus on History checks about stonework.', mod: [modBadge('History ×2 (stone)', 'pos')], match: /\bstonecunning\b/i },
        'relentless-endurance': { name: 'Relentless Endurance', desc: 'When reduced to 0 HP but not killed outright, drop to 1 HP instead. Once per long rest.', mod: [modBadge('survive at 1 HP', 'pos'), modBadge('1/long rest', '')], match: /\brelentless endurance\b/i },
        menacing: { name: 'Menacing', desc: 'Proficiency in the Intimidation skill.', mod: [modBadge('Intimidation', 'pos')], match: /\bmenacing\b/i },
        'savage-attacks': { name: 'Savage Attacks', desc: 'On a critical hit with a melee weapon, roll one of the weapon’s damage dice again and add it.', mod: [modBadge('+1 die on a crit', 'pos')], match: /\bsavage attacks\b/i },
        'hellish-resistance': { name: 'Hellish Resistance', desc: 'Resistance to fire damage.', mod: [modBadge('resistance: fire', 'pos')], match: /\bhellish resistance\b/i },
        'infernal-legacy': { name: 'Infernal Legacy', desc: 'Know the thaumaturgy cantrip; at higher levels cast hellish rebuke and darkness (Charisma).', mod: [modBadge('spells (CHA)', 'key')], match: /\binfernal legacy\b/i },
        'breath-weapon': { name: 'Breath Weapon', desc: 'Exhale destructive energy; targets make a save (DC 8 + CON + proficiency bonus).', mod: [modBadge('DC 8 + CON + PB', 'key'), modBadge('2d6 scaling', '')], match: /\bbreath weapon\b/i },
        'damage-resistance': { name: 'Damage Resistance', desc: 'Resistance to the damage type of your draconic ancestry.', mod: [modBadge('resistance: ancestry type', 'pos')], match: /\bdamage resistance\b/i },
        'gnome-cunning': { name: 'Gnome Cunning', desc: 'Advantage on INT, WIS, and CHA saving throws against magic.', mod: [modBadge('advantage vs magic (INT/WIS/CHA)', 'pos')], match: /\bgnome cunning\b/i },
        'stones-endurance': { name: "Stone's Endurance", desc: 'Use a reaction to reduce damage by 1d12 + CON; uses equal your proficiency bonus, regained on a rest.', mod: [modBadge('1d12 + CON', 'pos'), modBadge('PB uses/rest', '')], match: /stone'?s endurance/i },
        'powerful-build': { name: 'Powerful Build', desc: 'Count as one size larger for carrying capacity and for pushing, dragging, or lifting.', mod: [modBadge('carry capacity +1 size', 'pos')], match: /\bpowerful build\b/i },
        'celestial-resistance': { name: 'Celestial Resistance', desc: 'Resistance to necrotic and radiant damage.', mod: [modBadge('resistance: necrotic & radiant', 'pos')], match: /\bcelestial resistance\b/i },
        'healing-hands': { name: 'Healing Hands', desc: 'Touch a creature to restore HP equal to your level; once per long rest.', mod: [modBadge('heal = level', 'pos'), modBadge('1/long rest', '')], match: /\bhealing hands\b/i },
        'light-bearer': { name: 'Light Bearer', desc: 'Know the light cantrip (Charisma).', mod: [modBadge('light cantrip (CHA)', 'key')], match: /\blight bearer\b/i },
        'firbolg-magic': { name: 'Firbolg Magic', desc: 'Cast detect magic and disguise self (Wisdom); regain the uses on a rest.', mod: [modBadge('spells (WIS)', 'key')], match: /\bfirbolg magic\b/i },
        'hidden-step': { name: 'Hidden Step', desc: 'As a bonus action, turn invisible until your next turn; once per short or long rest.', mod: [modBadge('invisible (bonus action)', 'pos'), modBadge('1/short rest', '')], match: /\bhidden step\b/i },
        'expert-forgery': { name: 'Expert Forgery', desc: 'Duplicate other creatures’ handwriting and craft convincing forgeries.', mod: [modBadge('forgery expertise', 'key')], match: /\bexpert forgery\b/i },
        'kenku-training': { name: 'Kenku Training', desc: 'Proficiency in two skills of your choice from a set list.', mod: [modBadge('2 skill proficiencies', 'pos')], match: /\bkenku training\b/i },
        mimicry: { name: 'Mimicry', desc: 'Mimic sounds and voices you have heard, including speech.', mod: [modBadge('mimic sounds & voices', 'key')], match: /\bmimicry\b/i },
        'feline-agility': { name: 'Feline Agility', desc: 'When you move, double your speed until the end of the turn; recharge by not moving on a turn.', mod: [modBadge('speed ×2 (1 turn)', 'pos')], match: /\bfeline agility\b/i },
        "cat's-claws": { name: "Cat's Claws", desc: 'Climb speed 20 ft and a 1d4 slashing claw attack.', mod: [modBadge('climb 20 ft', 'key'), modBadge('1d4 slashing', '')], match: /cat'?s claws/i },
        'natural-armor': { name: 'Natural Armor', desc: 'Your shell gives AC 17; you cannot wear armor and DEX does not add.', mod: [modBadge('AC 17', 'key')], match: /\bnatural armor\b/i },
        'shell-defense': { name: 'Shell Defense', desc: 'Withdraw into your shell for +4 AC and advantage on STR/CON saves; you cannot act while withdrawn.', mod: [modBadge('+4 AC', 'pos'), modBadge('advantage STR/CON saves', 'pos')], match: /\bshell defense\b/i },
        'hold-breath': { name: 'Hold Breath', desc: 'Hold your breath for up to 1 hour.', mod: [modBadge('1 hour', 'key')], match: /\bhold breath\b/i },
        'long-limbed': { name: 'Long-Limbed', desc: 'Your melee reach is 5 ft longer than normal.', mod: [modBadge('reach +5 ft', 'pos')], match: /\blong-limbed\b/i },
        sneaky: { name: 'Sneaky', desc: 'Proficiency in the Stealth skill.', mod: [modBadge('Stealth', 'pos')], match: /\bsneaky\b/i },
        'surprise-attack': { name: 'Surprise Attack', desc: 'Deal an extra 2d6 damage to a creature you surprise in the first round of combat.', mod: [modBadge('+2d6 vs surprised', 'pos')], match: /\bsurprise attack\b/i },
        'fury-of-the-small': { name: 'Fury of the Small', desc: 'Deal extra damage equal to your level to a larger creature; once per short or long rest.', mod: [modBadge('+level damage', 'pos'), modBadge('1/rest', '')], match: /\bfury of the small\b/i },
        'nimble-escape': { name: 'Nimble Escape', desc: 'Take the Disengage or Hide action as a bonus action.', mod: [modBadge('bonus-action Disengage/Hide', 'pos')], match: /\bnimble escape\b/i },
        'martial-training': { name: 'Martial Training', desc: 'Proficiency with light armor and two martial weapons.', mod: [modBadge('light armor', 'key'), modBadge('2 martial weapons', 'key')], match: /\bmartial training\b/i },
        'saving-face': { name: 'Saving Face', desc: 'Add +1 to a failed check or save; uses equal your proficiency bonus, regained on a rest.', mod: [modBadge('+1 to a roll', 'pos'), modBadge('PB uses/rest', '')], match: /\bsaving face\b/i },
        'pack-tactics': { name: 'Pack Tactics', desc: 'Advantage on attack rolls when an ally is within 5 ft of the target.', mod: [modBadge('advantage with an ally', 'pos')], match: /\bpack tactics\b/i },
        aggressive: { name: 'Aggressive', desc: 'As a bonus action, move up to your speed toward a hostile creature you can see.', mod: [modBadge('bonus-action dash', 'key')], match: /\baggressive\b/i },
        'primal-intuition': { name: 'Primal Intuition', desc: 'Proficiency in two skills of your choice from a set list.', mod: [modBadge('2 skill proficiencies', 'pos')], match: /\bprimal intuition\b/i },
        'magic-resistance': { name: 'Magic Resistance', desc: 'Advantage on saving throws against spells and other magical effects.', mod: [modBadge('advantage vs spells', 'pos')], match: /\bmagic resistance\b/i },
        'poison-immunity': { name: 'Poison Immunity', desc: 'Immune to poison damage and the poisoned condition.', mod: [modBadge('immune: poison', 'pos')], match: /\bpoison immunity\b/i },
        'poison-spray': { name: 'Poison Spray', desc: 'Know the poison spray cantrip.', mod: [modBadge('poison spray cantrip', 'key')], match: /\bpoison spray\b/i },
        'small-size': { name: 'Small Size', desc: 'You are Small: you can move through larger creatures’ spaces and squeeze into tight spots.', mod: [modBadge('size: Small', 'key')], match: /\bsmall size\b/i },
        'bonus-feat': { name: 'Bonus Feat', desc: 'Gain an extra feat at 1st level (ruleset-dependent).', mod: [modBadge('+1 feat', 'pos')], match: /\bbonus feat\b/i },
        'bonus-skill-points': { name: 'Bonus Skill Points', desc: 'Gain extra skill points each level (3.5e-style).', mod: [modBadge('extra skill points', 'pos')], match: /\bbonus skill points\b/i },
        'sleep-immunity': { name: 'Sleep Immunity', desc: 'Magic cannot put you to sleep.', mod: [modBadge('immune to magic sleep', 'pos')], match: /\bimmune to sleep\b/i }
    };

    function getRaceTraits(race) {
        if (!race) return [];
        const keys = Array.isArray(race.traits) ? race.traits.slice() : [];
        const text = String(race.notes || '');
        Object.keys(TRAIT_DESC).forEach(k => {
            if (keys.indexOf(k) !== -1) return;
            const t = TRAIT_DESC[k];
            if (t.match && t.match.test(text)) keys.push(k);
        });
        return keys.map(k => TRAIT_DESC[k] ? { key: k, name: TRAIT_DESC[k].name, desc: TRAIT_DESC[k].desc, mod: TRAIT_DESC[k].mod } : null).filter(Boolean);
    }

    // Modifier badges — show the concrete value and which aspect a choice affects.
    function modBadge(text, cls) { return text == null || text === '' ? null : { text: String(text), cls: cls || '' }; }
    function abilityBadges(bonuses) {
        const out = [];
        Object.keys(bonuses || {}).forEach(k => {
            const v = Number(bonuses[k]) || 0;
            if (!v) return;
            out.push({ text: (v > 0 ? '+' : '') + v + ' ' + k.toUpperCase(), cls: v > 0 ? 'pos' : 'neg' });
        });
        return out;
    }
    function systemBadges(s) {
        const fn = s.profBonus || defaultProfBonus;
        const a = fn(1), b = fn(20);
        const label = s.bonusLabel || 'Proficiency Bonus';
        const range = a === b ? formatMod(a) : formatMod(a) + '→' + formatMod(b);
        return [
            { text: label + ' ' + range, cls: 'key' },
            { text: 'Spell DC ' + (s.dcBase != null ? s.dcBase : 8) + ' + mod', cls: '' }
        ];
    }
    function classBadges(c) {
        const out = [{ text: 'Hit Die ' + c.hitDie, cls: 'key' }];
        if (c.saves && c.saves.length) out.push({ text: 'Saves ' + c.saves.map(x => x.toUpperCase()).join(', '), cls: '' });
        if (c.spellAbility) out.push({ text: 'Spellcasting ' + c.spellAbility.toUpperCase(), cls: 'pos' });
        if (c.skillCount) out.push({ text: c.skillCount + ' skills', cls: '' });
        return out;
    }

    const DICT = {
        0: {
            title: 'Game System',
            build() {
                const out = [];
                out.push({ group: 'How it works', term: 'Bonuses & Difficulty', desc: 'Each ruleset handles attack and skill bonuses differently — a proficiency bonus that grows with level (5e), a flat base attack bonus (3.5e, 4e), or no bonus at all (Shadowdark, OD&D).', mod: [modBadge('Bonus model', 'key'), modBadge('Spell/Check DC', 'key')], active: () => !!SYSTEM });
                Object.keys(SYSTEMS).forEach(k => {
                    const s = SYSTEMS[k];
                    out.push({ group: s.group, term: s.name, desc: s.tagline, mod: systemBadges(s), active: () => SYSTEM === k });
                });
                return out;
            }
        },
        1: {
            title: 'Race, Class & Background',
            build() {
                const out = [];
                out.push({ group: 'Concepts', term: 'Ability Scores', desc: 'Your six core statistics (STR DEX CON INT WIS CHA). Choosing a race may apply bonuses to them automatically.', mod: [modBadge('STR DEX CON INT WIS CHA', 'key')], active: () => !!draft.race });
                out.push({ group: 'Concepts', term: BONUS_LABEL, desc: 'A bonus added to rolls you are trained in. Currently ' + formatMod(PROF_BONUS(draft.level)) + ' at level ' + draft.level + '.', mod: [modBadge(formatMod(PROF_BONUS(draft.level)), 'pos'), modBadge('+ to trained rolls', '')], active: () => !!draft.class });
                out.push({ group: 'Concepts', term: 'Hit Die', desc: 'The die behind your Hit Points — Fighters use d10, Wizards d6. It is set by your class.', mod: [modBadge('d' + classHitDieValue(), 'key'), modBadge('HP per level', '')], active: () => !!draft.class });
                out.push({ group: 'Concepts', term: 'Saving Throws', desc: 'Class gives proficiency in two ' + SAVES_LABEL.toLowerCase() + ' — chosen automatically, editable on Step 3.', mod: [modBadge('2 proficiencies', 'key'), modBadge('d20 + mod (+' + BONUS_LABEL + ')', '')], active: () => !!draft.class });
                out.push({
                    group: 'Concepts',
                    term: 'Subclass',
                    desc: 'A specialization inside your class — e.g. Champion (Fighter), Life Domain (Cleric), Thief (Rogue). Pick one from the Subclass dropdown after choosing a class; it unlocks a unique set of class features as you level and is independent of your race and background.' +
                        (draft.subclass ? ' Currently: ' + draft.subclass + '.' : '') +
                        ' Most classes choose one at level 3; a few (Cleric, Sorcerer, Warlock, Druid, Wizard) choose earlier.',
                    mod: [modBadge('pick 1', 'key'), modBadge('unlocks class features', '')],
                    active: () => !!draft.subclass
                });
                out.push({ group: 'Concepts', term: 'Darkvision', desc: 'See in the dark to a given range (usually 60 ft): dim light counts as bright, darkness as dim — shades only, no color.', mod: [modBadge('60 ft', 'key')] });
                out.push({ group: 'Concepts', term: 'Speed', desc: 'How many feet you can move per turn. Most races move 30 ft; dwarves, gnomes, and halflings move 25 ft.', mod: [modBadge('walk speed (ft)', 'key')] });
                if (draft.class && CLASSES[draft.class] && CLASSES[draft.class].subclasses && CLASSES[draft.class].subclasses.length) {
                    const subs = CLASSES[draft.class].subclasses;
                    out.push({
                        group: 'Subclasses · ' + CLASSES[draft.class].name,
                        term: CLASSES[draft.class].name + ' subclasses',
                        desc: 'Choose one of: ' + subs.join(', ') + '. Each grants its own features; the features of the subclass you pick are listed on Step 7.',
                        mod: [modBadge(subs.length + ' options', 'key')],
                        active: () => !!draft.subclass
                    });
                }
                Object.keys(RACES).filter(k => k).forEach(k => {
                    const r = RACES[k];
                    const mods = abilityBadges(r.bonuses);
                    if (r.speed && r.speed !== 30) mods.push(modBadge('Speed ' + r.speed + ' ft', 'key'));
                    if (r.langs && r.langs.length) mods.push(modBadge(r.langs.length + ' language' + (r.langs.length > 1 ? 's' : ''), ''));
                    out.push({ group: 'Races', term: r.name, desc: r.notes, mod: mods, active: () => draft.race === k });
                });
                if (draft.race && RACES[draft.race]) {
                    const tr = RACES[draft.race];
                    getRaceTraits(tr).forEach(t => {
                        out.push({ group: 'Racial Traits · ' + tr.name, term: t.name, desc: t.desc, mod: t.mod, active: () => true });
                    });
                }
                Object.keys(CLASSES).filter(k => k).forEach(k => {
                    const c = CLASSES[k];
                    out.push({ group: 'Classes', term: c.name, desc: c.notes || '', mod: classBadges(c), active: () => draft.class === k });
                });
                Object.keys(BACKGROUNDS).filter(k => k).forEach(k => {
                    out.push({ group: 'Backgrounds', term: BACKGROUNDS[k].name, desc: BACKGROUNDS[k].notes, mod: [modBadge('2 skill proficiencies + feature', '')], active: () => draft.background === k });
                });
                return out;
            }
        },
        2: {
            title: 'Generating ability scores',
            build() {
                const out = [];
                out.push({ group: 'Concepts', term: 'Ability Score (1–30)', desc: 'The raw value of a statistic — higher is better. Most dice rolls use the modifier, not the raw score.', mod: [modBadge('raw value 1–30', 'key')] });
                out.push({ group: 'Concepts', term: 'Ability Modifier', desc: 'Calculated as floor((score − 10) / 2). 14 → +2, 10 → +0, 8 → −1. This is what gets added to checks, attacks, and saves.', mod: [modBadge('floor((score − 10) / 2)', 'key'), modBadge('added to d20 rolls', 'pos')], active: () => true });
                out.push({ group: 'Methods', term: 'Standard Array', desc: 'The fixed set 15, 14, 13, 12, 10, 8. Click a card to assign the next unplaced value.', mod: [modBadge('15 14 13 12 10 8', 'key')], active: () => draft.method === 'standard' });
                out.push({ group: 'Methods', term: '4d6 Roll', desc: 'Roll four d6, drop the lowest, sum the top three. Repeat six times, then assign results high → low.', mod: [modBadge('4d6 drop lowest', 'key'), modBadge('×6 scores', '')], active: () => draft.method === 'roll' });
                out.push({ group: 'Methods', term: 'Point Buy', desc: 'Spend ' + POINT_BUY_POOL + ' points to buy scores from 8 to 15. Costs: 8=0, 9=1, 10=2, 11=3, 12=4, 13=5, 14=7, 15=9.', mod: [modBadge(POINT_BUY_POOL + ' points', 'key'), modBadge('range 8–15', '')], active: () => draft.method === 'pointbuy' });
                out.push({ group: 'Methods', term: 'Manual', desc: 'Type any scores from 1–30 directly — handy for an existing or pre-rolled character.', mod: [modBadge('typed 1–30', 'key')], active: () => draft.method === 'manual' });
                out.push({ group: 'Concepts', term: 'Racial / ancestry bonuses', desc: 'Bonuses auto-applied when you pick a race on Step 1 (e.g. Dwarf +2 CON, Half-Orc +2 STR).', mod: (draft.race && RACES[draft.race] ? abilityBadges(RACES[draft.race].bonuses) : [modBadge('applied to scores', '')]), active: () => !!draft.race });
                return out;
            }
        },
        3: {
            title: 'Proficiencies, Skills & Languages',
            build() {
                const out = [];
                const abilNames = { str: 'Strength', dex: 'Dexterity', con: 'Constitution', int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma' };
                out.push({ group: 'Concepts', term: 'Saving Throw', desc: 'A roll to resist an effect: d20 + ability modifier (+ proficiency if trained). Your class preselects two.', mod: [modBadge('d20 + ability mod', 'key'), modBadge('+' + BONUS_LABEL + ' if trained', 'pos')], active: () => s3SavesSet.length > 0 });
                out.push({ group: 'Concepts', term: 'Skill', desc: 'A trained area tied to an ability. When proficient, add your proficiency bonus to that check.', mod: [modBadge('d20 + ability mod', 'key'), modBadge('+' + BONUS_LABEL + ' if trained', 'pos')] });
                out.push({ group: 'Concepts', term: 'Proficiency', desc: 'Training in a save, skill, or tool adds your proficiency bonus to its checks.', mod: [modBadge(formatMod(PROF_BONUS(draft.level)) + ' now', 'pos')], active: () => true });
                out.push({ group: 'Concepts', term: 'Other Proficiencies', desc: 'A free-text line for armor, weapons, and tools, e.g. "Light armor, Rapier, Thieves’ tools".', mod: [modBadge('armor · weapons · tools', '')] });
                ABILITY_KEYS.forEach(k => {
                    out.push({ group: 'Saving Throws · ' + SAVES_LABEL, term: k.toUpperCase() + ' Save', desc: 'Resist effects that target ' + (abilNames[k] || k).toLowerCase() + '.', mod: [modBadge(k.toUpperCase(), 'key'), modBadge(formatMod(PROF_BONUS(draft.level)) + ' ' + BONUS_LABEL, 'pos')], active: () => s3SavesSet.includes(k) });
                });
                Object.keys(SKILL_ABILITIES).forEach(sk => {
                    out.push({ group: 'Skills', term: skillLabel(sk), desc: SKILL_DESC[sk] || 'A skill check using ' + SKILL_ABILITIES[sk].toUpperCase() + '.', mod: [modBadge(SKILL_ABILITIES[sk].toUpperCase(), 'key'), modBadge(formatMod(PROF_BONUS(draft.level)) + ' ' + BONUS_LABEL, 'pos')], active: () => s3SkillsSet.includes(sk) });
                });
                LANGUAGES.forEach(lang => {
                    out.push({ group: 'Languages', term: lang, desc: LANG_DESC[lang] || 'A language your character can read, speak, and write.', mod: s3LangsSet.includes(lang) ? [modBadge('known', 'pos')] : [], active: () => s3LangsSet.includes(lang) });
                });
                return out;
            }
        },
        4: {
            title: 'Equipment, Armor & Weapons',
            build() {
                const out = [];
                out.push({ group: 'Concepts', term: 'Gold pieces (gp)', desc: 'Starting money. 1 gp = 10 sp = 100 cp. The value here is saved with the character.', mod: [modBadge('1 gp = 10 sp = 100 cp', 'key')], active: () => draft.gold > 0 });
                out.push({ group: 'Concepts', term: 'Armor categories', desc: 'Light armor adds your full DEX modifier; medium adds a maximum of +2 DEX; heavy adds none. A shield adds +2 to AC.', mod: [modBadge('Light +DEX', 'key'), modBadge('Medium max +2', 'key'), modBadge('Heavy +0', 'key'), modBadge('Shield +2 AC', 'pos')] });
                out.push({ group: 'Concepts', term: 'Finesse', desc: 'Use DEX instead of STR for attack and damage (your choice).', mod: [modBadge('DEX for attack & damage', 'key')] });
                out.push({ group: 'Concepts', term: 'Versatile', desc: 'Usable one-handed, or two-handed for a larger damage die.', mod: [modBadge('larger die when 2H', 'key')] });
                out.push({ group: 'Concepts', term: 'Heavy', desc: 'Large two-handed weapons; small creatures attack with disadvantage.', mod: [modBadge('small creatures: disadvantage', 'neg')] });
                out.push({ group: 'Concepts', term: 'Light', desc: 'Small one-handed weapons that enable two-weapon fighting.', mod: [modBadge('enables two-weapon fighting', 'key')] });
                out.push({ group: 'Concepts', term: 'Ranged', desc: 'Attacks from a distance; each weapon lists its short/long range.', mod: [modBadge('short / long range', 'key')] });
                out.push({ group: 'Concepts', term: 'Gear Reference', desc: 'A searchable list of 5e adventuring gear. Click an item to add it to Inventory; clicking again stacks more.', mod: [modBadge(GEAR_MASTER.length + ' items', 'key')] });
                Object.keys(ARMORS).filter(k => k).forEach(k => {
                    const a = ARMORS[k];
                    const mods = [modBadge('AC ' + a.ac, 'key')];
                    if (a.shield) mods.push(modBadge('held in one hand', ''));
                    else if (a.dexCap !== null && a.dexCap !== undefined) mods.push(modBadge('max DEX +' + a.dexCap, ''));
                    else mods.push(modBadge('full DEX', ''));
                    out.push({ group: 'Armor', term: a.name, desc: a.shield ? 'A flat +2 bonus to AC while held; does not use a hand for attacks.' : 'Base AC that DEX may add to, depending on the armor category.', mod: mods, active: () => draft.armor === k });
                });
                WEAPONS.forEach(w => {
                    const mods = [modBadge(w.die, 'key')];
                    if (w.finesse) mods.push(modBadge('finesse', ''));
                    if (w.ranged) mods.push(modBadge('ranged', ''));
                    out.push({ group: 'Weapons', term: w.name, desc: 'A weapon you can attack with; add your ability modifier to the damage.', mod: mods, active: () => draft.weapons.includes(w.id) });
                });
                const cats = Array.from(new Set(GEAR_MASTER.map(g => g.cat))).sort();
                cats.forEach(c => {
                    const n = GEAR_MASTER.filter(g => g.cat === c).length;
                    out.push({ group: 'Gear categories', term: c, desc: CAT_DESC[c] || 'A category in the Gear Reference picker; each item shows its cost and weight.', mod: [modBadge(n + ' item' + (n > 1 ? 's' : ''), 'key')], active: () => false });
                });
                return out;
            }
        },
        5: {
            title: 'Attacks & Spellcasting',
            build() {
                const out = [];
                out.push({ group: 'Attacks', term: 'Attack Roll', desc: 'A d20 + attack bonus rolled against the target AC. A natural 20 lands an automatic critical hit (some builds crit on 19–20).', mod: [modBadge('d20 + attack bonus', 'key')] });
                out.push({ group: 'Attacks', term: 'Attack Bonus', desc: 'Proficiency + relevant ability modifier (+ extras). Auto-computed from the ability you choose for each row.', mod: [modBadge(formatMod(PROF_BONUS(draft.level)) + ' ' + BONUS_LABEL, 'pos'), modBadge('+ ability mod', 'key')], active: () => draft.attacks.length > 0 });
                out.push({ group: 'Attacks', term: 'Damage Dice', desc: 'The dice rolled on a hit, e.g. 1d8+3. Weapon-specific, plus bonuses.', mod: [modBadge('weapon die + ability mod', 'key')] });
                out.push({ group: 'Spellcasting', term: 'Spellcasting Ability', desc: 'The ability fueling your magic — INT (wizard), WIS (cleric/druid/ranger), CHA (bard/sorcerer/warlock/paladin).', mod: [modBadge('INT / WIS / CHA', 'key')], active: () => draft.spellcaster });
                out.push({ group: 'Spellcasting', term: 'Spell Save DC', desc: 'The number a target must roll to resist your spell: ' + DC_BASE + ' + ' + BONUS_LABEL.toLowerCase() + ' + spellcasting modifier.', mod: [modBadge(DC_BASE + ' + ' + formatMod(PROF_BONUS(draft.level)) + ' + mod', 'key')], active: () => draft.spellcaster });
                out.push({ group: 'Spellcasting', term: 'Spell Attack Bonus', desc: BONUS_LABEL + ' + spellcasting modifier, for spells that require an attack roll.', mod: [modBadge(formatMod(PROF_BONUS(draft.level)) + ' + ability mod', 'key')], active: () => draft.spellcaster });
                out.push({ group: 'Spellcasting', term: 'Spell Slots', desc: 'Daily magic reserves listed by level (e.g. 4,3,2). Casting a spell spends one slot of at least its level.', mod: [modBadge('slots by spell level', 'key')], active: () => draft.spellcaster });
                out.push({ group: 'Spellcasting', term: 'Cantrips', desc: '0-level spells cast at will — no slot required, unlimited uses.', mod: [modBadge('at will · no slot', 'pos')] });
                out.push({ group: 'Spellcasting', term: 'Pact Magic', desc: 'Warlock-style slots that refresh on a short rest and cast at their highest known level.', mod: [modBadge('refresh on short rest', 'key')] });
                out.push({ group: 'Spellcasting', term: 'Concentration', desc: 'Some spells need focus — damage can break it, and only one is maintained at a time.', mod: [modBadge('1 spell at a time', 'key')] });
                out.push({ group: 'Spellbook', term: 'Spell detail panel', desc: 'The spellbook dictionary below lists rules, damage, ranges, areas, and buff/debuff tags for every spell typed in Step 5 — powered by 5e_data/spellbook.js.', mod: [modBadge('damage · range · area · buffs', '')] });
                return out;
            }
        },
        6: {
            title: 'HP & Combat Statistics',
            build() {
                const cls = CLASSES[draft.class];
                const out = [];
                out.push({ group: 'Combat stats', term: 'Hit Die', desc: 'Your class die — currently d' + classHitDieValue() + ' (' + (cls ? cls.name : 'class not chosen') + '). Spent on short rests to recover HP.', mod: [modBadge('d' + classHitDieValue(), 'key'), modBadge('heals on short rest', 'pos')], active: () => true });
                out.push({ group: 'Combat stats', term: 'Max HP', desc: 'Total health. Suggested formula: die + CON mod + (level − 1) × (average die + CON mod).', mod: [modBadge('die + CON', 'key'), modBadge('× level', 'key')], active: () => true });
                out.push({ group: 'Combat stats', term: 'Armor Class (AC)', desc: 'How hard you are to hit. From armor + DEX (capped on medium/heavy) plus class or racial features.', mod: [modBadge('armor + DEX', 'key')], active: () => true });
                out.push({ group: 'Combat stats', term: 'Speed', desc: 'Feet moved per turn; race base is pre-filled (typically 30 ft).', mod: [modBadge('30 ft', 'key')], active: () => true });
                out.push({ group: 'Combat stats', term: 'Initiative', desc: 'DEX modifier added to the d20 that decides turn order at combat start.', mod: [modBadge('d20 + DEX mod', 'key')], active: () => true });
                out.push({ group: 'Combat stats', term: 'CON modifier', desc: 'Your Constitution modifier feeds the HP formula.', mod: [modBadge(formatMod(abilityMod(draft.abilities.con)), abilityMod(draft.abilities.con) >= 0 ? 'pos' : 'neg'), modBadge('to Max HP', 'key')], active: () => true });
                return out;
            }
        },
        7: {
            title: 'Features',
            build() {
                const out = [];
                out.push({ group: 'Concepts', term: 'Feature', desc: 'Anything your character can do — racial traits, class abilities, background perks. Give each a name and short description.', mod: [modBadge('name + description', 'key')], active: () => draft.features.length > 0 });
                out.push({ group: 'Concepts', term: 'Racial features', desc: 'Innate traits from ancestry: darkvision, damage resistance, breath weapons, extra languages.', mod: [modBadge('innate · always on', 'key')], active: () => !!draft.race });
                out.push({ group: 'Concepts', term: 'Class features', desc: 'Abilities gained by leveling — Second Wind, Sneak Attack, Rage, Spellcasting, and more.', mod: [modBadge('gained by level', 'key')], active: () => !!draft.class });
                out.push({ group: 'Concepts', term: 'Background features', desc: 'A small benefit from your background — shelter among the faithful, a criminal contact, and so on.', mod: [modBadge('story perk', 'key')], active: () => !!draft.background });
                return out;
            }
        },
        8: {
            title: 'Personality & Traits',
            build() {
                const out = [];
                out.push({ group: 'Traits', term: 'Personality Traits', desc: 'One or two short sentences describing how your character typically behaves.', mod: (() => { const n = idSync('s8-personality', 'personality').trim().length; return [modBadge(n ? n + ' chars' : 'free text', n ? 'key' : '')]; })(), active: () => idSync('s8-personality', 'personality').trim() !== '' });
                out.push({ group: 'Traits', term: 'Ideals', desc: 'Principles and ambitions that drive your character.', mod: (() => { const n = idSync('s8-ideals', 'ideals').trim().length; return [modBadge(n ? n + ' chars' : 'free text', n ? 'key' : '')]; })(), active: () => idSync('s8-ideals', 'ideals').trim() !== '' });
                out.push({ group: 'Traits', term: 'Bonds', desc: 'People, places, or causes your character cares about deeply.', mod: (() => { const n = idSync('s8-bonds', 'bonds').trim().length; return [modBadge(n ? n + ' chars' : 'free text', n ? 'key' : '')]; })(), active: () => idSync('s8-bonds', 'bonds').trim() !== '' });
                out.push({ group: 'Traits', term: 'Flaws', desc: 'A fear, vice, or weakness — perfect hooks for the DM.', mod: (() => { const n = idSync('s8-flaws', 'flaws').trim().length; return [modBadge(n ? n + ' chars' : 'free text', n ? 'key' : '')]; })(), active: () => idSync('s8-flaws', 'flaws').trim() !== '' });
                return out;
            }
        },
        9: {
            title: 'Name, Alignment & Backstory',
            build() {
                const out = [];
                out.push({ group: 'Identity', term: 'Character Name', desc: 'What the world calls your hero — required before you can save.', mod: [modBadge((String((document.getElementById('s9-name') || {}).value || '').trim() ? 'filled' : 'required'), (String((document.getElementById('s9-name') || {}).value || '').trim() ? 'pos' : 'neg'))], active: () => String((document.getElementById('s9-name') || {}).value || '').trim() !== '' });
                out.push({ group: 'Identity', term: 'Appearance', desc: 'Physical details — height, build, hair, scars, notable features, style.', mod: [modBadge('free text', '')] });
                out.push({ group: 'Identity', term: 'Notes / Backstory', desc: 'Free-form history, goals, relationships, and secrets.', mod: [modBadge('free text', '')] });
                Object.keys(ALIGN_DESC).forEach(a => {
                    const words = a.split(' ');
                    const axis1 = words[0] === 'True' ? 'Neutral' : words[0];
                    const axis2 = words[words.length - 1];
                    const mods = [modBadge(axis1, axis1 === 'Neutral' ? 'key' : (axis1 === 'Chaotic' || axis1 === 'Lawful' ? 'key' : '')), modBadge(axis2, axis2 === 'Good' ? 'pos' : axis2 === 'Evil' ? 'neg' : 'key')];
                    out.push({ group: 'Alignment', term: a, desc: ALIGN_DESC[a], mod: mods, active: () => (document.getElementById('s9-alignment') || {}).value === a });
                });
                return out;
            }
        },
        10: {
            title: 'Save & Export',
            build() {
                const out = [];
                out.push({ group: 'Finish', term: 'Save Character', desc: 'Stores this character in your browser (localStorage) — it appears on the Character Select page for play.', mod: [modBadge('localStorage', 'key')] });
                out.push({ group: 'Finish', term: 'Export JSON files', desc: 'Downloads "data/characters/<id>.json" plus the updated "data/characters.json" registry. Put them in those paths in this repo to publish on GitHub Pages.', mod: [modBadge('JSON download', 'key')] });
                out.push({ group: 'Finish', term: 'Review card', desc: 'The sheet above summarizes everything you built. Give it a final check before saving.', mod: [modBadge('full summary', 'key')] });
                return out;
            }
        }
    };

    function idSync(inputId, key) {
        const el = document.getElementById(inputId);
        if (!el) return '';
        const v = String(el.value || '');
        if (key) draft.traits[key] = v;
        return v;
    }

    function applyDictFilter(dict) {
        const list = dict.querySelector('.dict-list');
        const search = dict.querySelector('.dict-search');
        if (!list || !search) return;
        const q = (search.value || '').trim().toLowerCase();
        list.querySelectorAll('.dict-term').forEach(row => {
            row.classList.toggle('hidden', !!q && !row.textContent.toLowerCase().includes(q));
        });
    }

    function focusedDictTerm() {
        const el = document.activeElement;
        if (!el || el === document.body || el === document.documentElement) return null;
        const byId = {
            's1-race': () => (RACES[draft.race] || {}).name,
            's1-class': () => (CLASSES[draft.class] || {}).name,
            's1-background': () => (BACKGROUNDS[draft.background] || {}).name,
            's1-subclass': () => 'Subclass',
            's1-subclass-custom': () => 'Subclass',
            's1-level': () => BONUS_LABEL,
            's3-other': () => 'Other Proficiencies',
            's4-gold': () => 'Gold pieces (gp)',
            's4-armor': () => (ARMORS[draft.armor] || {}).name,
            's4-gear-cat': () => (el.value || ''),
            's4-item-filter': () => 'Gear Reference',
            's5-spellcaster': () => 'Spellcasting Ability',
            's5-spell-ability': () => 'Spellcasting Ability',
            's5-spell-dc': () => 'Spell Save DC',
            's5-spell-atk': () => 'Spell Attack Bonus',
            's5-spell-slots': () => 'Spell Slots',
            's5-max-level': () => 'Spell Slots',
            's6-hitdie': () => 'Hit Die',
            's6-maxhp': () => 'Max HP',
            's6-curhp': () => 'Max HP',
            's6-formula': () => 'Max HP',
            's6-ac': () => 'Armor Class (AC)',
            's6-speed': () => 'Speed',
            's6-init': () => 'Initiative',
            's8-personality': () => 'Personality Traits',
            's8-ideals': () => 'Ideals',
            's8-bonds': () => 'Bonds',
            's8-flaws': () => 'Flaws',
            's9-name': () => 'Character Name',
            's9-appearance': () => 'Appearance',
            's9-notes': () => 'Notes / Backstory',
            's9-alignment': () => (el.value || '')
        };
        if (el.id && byId[el.id]) return byId[el.id]();
        const chip = el.closest ? el.closest('label.chip') : null;
        if (chip) {
            const label = (chip.textContent || '').trim();
            if (el.closest('#s3-saves')) return label + ' Save';
            return label;
        }
        return null;
    }

    function fillDictList(dict, s) {
        const cfg = DICT[s];
        if (!cfg) return;
        const entries = cfg.build();
        const list = dict.querySelector('.dict-list');
        if (!list) return;
        const scroll = list.scrollTop;
        const flags = entries.map(e => !!(e.active && e.active()));
        const activeCount = flags.filter(Boolean).length;

        const focusTerm = focusedDictTerm();
        let focusIdx = -1;
        if (focusTerm) {
            const want = focusTerm.toLowerCase();
            focusIdx = entries.findIndex(e => e.term.toLowerCase() === want);
            if (focusIdx === -1) focusIdx = entries.findIndex(e => e.term.toLowerCase().includes(want) || want.includes(e.term.toLowerCase()));
        }

        const rowHtml = (e, i) => {
            const mods = e.mod == null ? [] : (Array.isArray(e.mod) ? e.mod : [e.mod]);
            const modHtml = mods.length ? '<span class="dict-mods">' + mods.map(m => {
                if (m == null) return '';
                const text = typeof m === 'string' ? m : (m.text || '');
                if (!text) return '';
                const cls = typeof m === 'string' ? '' : (m.cls ? ' ' + m.cls : '');
                return '<span class="dict-mod' + cls + '">' + escHtml(text) + '</span>';
            }).join('') + '</span>' : '';
            return '<div class="dict-term' + (flags[i] ? ' on' : '') + (i === focusIdx ? ' focus' : '') + '" data-dict-term="' + i + '">' +
                '<span class="dict-name">' + escHtml(e.term) +
                '<span class="dict-tag">✓ selected</span>' +
                (i === focusIdx ? '<span class="dict-ftag">◉ focused</span>' : '') +
                '</span>' +
                '<span class="dict-desc">' + modHtml + escHtml(e.desc) + '</span>' +
                '</div>';
        };

        const activeIdx = entries.map((e, i) => i).filter(i => flags[i]);
        let topIdx = activeIdx.slice();
        if (focusIdx !== -1) topIdx = [focusIdx].concat(topIdx.filter(i => i !== focusIdx));

        let html = '';
        if (topIdx.length) {
            const header = focusIdx !== -1 ? (activeCount ? '◉ Focused · ✓ Selected' : '◉ Focused') : '✓ Selected';
            html += '<div class="dict-group sel">' + header + '</div>';
            topIdx.forEach(i => { html += rowHtml(entries[i], i); });
        }
        let lastGroup = null;
        entries.forEach((e, i) => {
            if (flags[i] || i === focusIdx) return;
            if (e.group && e.group !== lastGroup) {
                html += '<div class="dict-group">' + escHtml(e.group) + '</div>';
                lastGroup = e.group;
            } else if (!e.group) {
                lastGroup = null;
            }
            html += rowHtml(e, i);
        });
        list.innerHTML = html;

        const count = dict.querySelector('.dict-count');
        if (count) count.textContent = entries.length + ' terms' +
            (activeCount ? ' · ' + activeCount + ' selected' : '') +
            (focusIdx !== -1 ? ' · focused' : '');
        list.scrollTop = scroll;
        applyDictFilter(dict);
    }

    function renderStepDictionaries() {
        for (let s = 0; s < CONSTANTS.totalSteps; s++) {
            const panel = document.getElementById('step-' + s);
            if (!panel || !DICT[s]) continue;
            const cfg = DICT[s];
            let dict = panel.querySelector('.cc-dict');
            if (!dict) {
                dict = document.createElement('details');
                dict.className = 'cc-dict';
                panel.appendChild(dict);
            }
            dict.open = true;
            dict.innerHTML =
                '<summary>📖 Dictionary — ' + escHtml(cfg.title) +
                ' <span class="dict-count"></span>' +
                '<span class="dict-caret">▶</span></summary>' +
                '<input class="dict-search" type="text" placeholder="Filter this glossary…">' +
                '<div class="dict-list"></div>';
            const search = dict.querySelector('.dict-search');
            search.addEventListener('input', () => applyDictFilter(dict));
            fillDictList(dict, s);
        }
    }

    function syncDictionaryHighlights() {
        for (let s = 0; s < CONSTANTS.totalSteps; s++) {
            const panel = document.getElementById('step-' + s);
            if (!panel) continue;
            const dict = panel.querySelector('.cc-dict');
            if (!dict || !DICT[s]) continue;
            fillDictList(dict, s);
        }
    }

    function attachDictInputs() {
        const onIn = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('input', fn); };
        onIn('s4-gold', () => { draft.gold = Math.max(0, Number(document.getElementById('s4-gold').value) || 0); syncDictionaryHighlights(); });
        onIn('s8-personality', () => { draft.traits.personality = document.getElementById('s8-personality').value; syncDictionaryHighlights(); });
        onIn('s8-ideals', () => { draft.traits.ideals = document.getElementById('s8-ideals').value; syncDictionaryHighlights(); });
        onIn('s8-bonds', () => { draft.traits.bonds = document.getElementById('s8-bonds').value; syncDictionaryHighlights(); });
        onIn('s8-flaws', () => { draft.traits.flaws = document.getElementById('s8-flaws').value; syncDictionaryHighlights(); });
        onIn('s9-name', () => { draft.name = document.getElementById('s9-name').value.trim(); syncDictionaryHighlights(); });
        onIn('s1-subclass-custom', () => { draft.subclass = document.getElementById('s1-subclass-custom').value.trim(); syncDictionaryHighlights(); });
        const al = document.getElementById('s9-alignment');
        if (al) al.addEventListener('change', () => { draft.alignment = al.value; syncDictionaryHighlights(); });
        document.addEventListener('focusin', () => syncDictionaryHighlights());
        document.addEventListener('focusout', () => setTimeout(syncDictionaryHighlights, 0));
    }

