// character-creator/steps-6-7.js - step 6 (combat) and step 7 (features)
// Extracted from character-creator.html; loaded there in page order.

    // ───────────────────────────────────────────────────────────
    // Step 6
    // ───────────────────────────────────────────────────────────
    function classHitDieValue() {
        const cls = CLASSES[draft.class];
        const dieStr = cls && cls.hitDie ? cls.hitDie : 'd10';
        return Number(dieStr.replace('d', ''));
    }

    function refreshCombatSuggestions() {
        const conMod = abilityMod(draft.abilities.con);
        const die = classHitDieValue();
        const dieAvg = Math.floor(die / 2) + 1;
        draft.profBonus = PROF_BONUS(draft.level);
        const lvl = draft.level;
        document.getElementById('s6-hitdie').value = `d${die}`;
        document.getElementById('s6-formula').textContent = `${die} + ${conMod} (CON) + ${Math.max(0, lvl - 1)} × (${dieAvg} + ${conMod}) = ${die + conMod + Math.max(0, lvl - 1) * (dieAvg + conMod)}`;

        if (!draft._hpTouched) {
            document.getElementById('s6-maxhp').value = die + conMod + Math.max(0, lvl - 1) * (dieAvg + conMod);
            draft.maxHp = Number(document.getElementById('s6-maxhp').value);
        }
        if (!draft._curTouched) document.getElementById('s6-curhp').value = document.getElementById('s6-maxhp').value;
        if (!draft._acTouched) {
            const dexMod = abilityMod(draft.abilities.dex);
            let ac = 10 + dexMod;
            const armorKey = draft.armor;
            const arm = ARMORS[armorKey];
            if (draft.armor && arm && !arm.shield) {
                ac = arm.ac + Math.min(dexMod, arm.dexCap !== null ? arm.dexCap : 99);
            } else if (draft.armor && arm && arm.shield) {
                ac += arm.ac;
            } else {
                if (draft.class === 'monk') ac = Math.max(ac, 10 + dexMod + abilityMod(draft.abilities.wis));
                if (draft.class === 'barbarian') ac = Math.max(ac, 10 + dexMod + abilityMod(draft.abilities.con));
                if (draft.race === 'tortle') ac = Math.max(ac, 17);
            }
            document.getElementById('s6-ac').value = ac;
            draft.ac = ac;
        }
        document.getElementById('s6-init').value = formatMod(abilityMod(draft.abilities.dex));
        updateHpHint();
    }

    function updateHpHint() {
        document.getElementById('s6-hint').textContent = `Hit Die d${classHitDieValue()} from ${CLASSES[draft.class] ? CLASSES[draft.class].name : 'your class'} + ${abilityMod(draft.abilities.con)} CON.`;
    }

    function formatMod(v) { v = Number(v); return v >= 0 ? '+' + v : String(v); }

    // ───────────────────────────────────────────────────────────
    // Step 7 features
    // ───────────────────────────────────────────────────────────
    function renderFeatures() {
        const list = document.getElementById('s7-features');
        list.innerHTML = '';
        draft.features.forEach((f, i) => {
            const row = document.createElement('div');
            row.className = 'cc-row';
            row.innerHTML = `<input value="${escAttr(f.name)}" placeholder="Feature name" data-fi="${i}" data-k="name" style="flex:1.2;">
                <input value="${escAttr(f.desc)}" placeholder="Description" data-fi="${i}" data-k="desc" style="flex:2;">
                <button class="btn btn-delete" type="button" style="flex:0; padding:4px 10px;" onclick="removeRow('s7-features', ${i}, 'feature')">✕</button>`;
            list.appendChild(row);
        });
        list.querySelectorAll('input').forEach(el => {
            el.addEventListener('input', () => {
                const i = Number(el.dataset.fi);
                const k = el.dataset.k;
                if (draft.features[i]) draft.features[i][k] = el.value;
            });
        });
    }

    function addFeatureRow() { draft.features.push({ name: '', desc: '' }); renderFeatures(); }

    function suggestClassFeatures() {
        const cls = draft.class;
        const map = {
            fighter: ['Fighting Style (choose one)', 'Second Wind (bonus action heal)', 'Action Surge (extra action)'],
            barbarian: ['Rage (advantage STR & bonus damage)', 'Unarmored Defense (10 + DEX + CON)', 'Reckless Attack (advantage = attacks against you too)'],
            rogue: ['Expertise (double proficiency in 2 skills)', 'Sneak Attack (extra damage once/turn)', 'Thieves’ Cant (secret language)'],
            wizard: ['Spellcasting (INT)', 'Arcane Recovery (regain spell slots on short rest)', 'Ritual Casting'],
            cleric: ['Spellcasting (WIS)', 'Divine Domain (domain spells & features)', 'Channel Divinity (once per short rest)'],
            bard: ['Spellcasting (CHA)', 'Bardic Inspiration (d6 die to allies)', 'Jack of All Trades'],
            druid: ['Spellcasting (WIS)', 'Druidic (secret language)', 'Wild Shape (transform into beasts)'],
            monk: ['Martial Arts (unarmed strikes)', 'Unarmored Defense', 'Ki (flurry of blows etc.)'],
            paladin: ['Divine Sense', 'Lay on Hands (healing pool)', 'Fighting Style'],
            ranger: ['Favored Enemy / Favored Foe', 'Natural Explorer', 'Fighting Style'],
            sorcerer: ['Spellcasting (CHA)', 'Sorcerous Origin', 'Font of Magic (sorcery points)'],
            warlock: ['Otherworldly Patron', 'Pact Magic (short-rest slots)', 'Eldritch Invocations']
        };
        const chosen = map[draft.class] || [];
        chosen.forEach(n => {
            if (!draft.features.some(f => f.name === n)) draft.features.push({ name: n, desc: '' });
        });
    }

    function suggestRaceFeatures() {
        const map = {
            dwarf: ['Darkvision (60 ft)', 'Dwarven Resilience (advantage on poison saves)'],
            elf: ['Darkvision (60 ft)', 'Fey Ancestry (advantage vs charm)', 'Trance (4 hr rest)'],
            halfling: ['Lucky (reroll 1s)', 'Brave (advantage vs frightened)'],
            'half-elf': ['Darkvision (60 ft)', 'Fey Ancestry (advantage vs charm)', 'Skill Versatility (+2 skills)'],
            'half-orc': ['Darkvision (60 ft)', 'Relentless Endurance (drop to 1 HP instead of 0)', 'Savage Attacks (extra crit die)'],
            tiefling: ['Darkvision (60 ft)', 'Hellish Resistance (fire resistance)', 'Infernal Legacy (thaumaturgy)'],
            dragonborn: ['Draconic Ancestry (breath weapon)', 'Damage Resistance (your draconic type)'],
            gnome: ['Darkvision (60 ft)', 'Gnome Cunning (advantage INT/WIS/CHA magic saves)'],
            goliath: ['Powerful Build', 'Stone’s Endurance (reduce damage 1/turn)'],
            aasimar: ['Darkvision (60 ft)', 'Celestial Resistance (radiant & necrotic)', 'Healing Hands'],
            firbolg: ['Firbolg Magic (detect magic, disguise self)', 'Hidden Step (turn invisible)'],
            kenku: ['Expert Forgery', 'Mimicry (copy sounds)'],
            tabaxi: ['Darkvision (60 ft)', 'Feline Agility (double speed free)', 'Cat’s Claws'],
            tortle: ['Natural Armor (AC 17)', 'Shell Defense', 'Hold Breath (1 hr)'],
            bugbear: ['Darkvision (60 ft)', 'Long-Limbed (extra reach)', 'Sneaky'],
            goblin: ['Darkvision (60 ft)', 'Fury of the Small', 'Nimble Escape'],
            hobgoblin: ['Darkvision (60 ft)', 'Saving Face', 'Martial Training'],
            kobold: ['Darkvision (60 ft)', 'Pack Tactics (advantage when ally nearby)', 'Sunlight Sensitivity'],
            orc: ['Darkvision (60 ft)', 'Aggressive (bonus action move)', 'Menacing'],
            'yuan-ti': ['Darkvision (60 ft)', 'Magic Resistance (advantage vs spells)', 'Poison Immunity'],
            human: ['Versatility (see stat bonuses)']
        };
        (map[draft.race] || []).forEach(n => {
            if (!draft.features.some(f => f.name === n)) draft.features.push({ name: n, desc: '' });
        });
    }

    function suggestBackgroundFeatures() {
        const bg = draft.background || '';
        if (bg) {
            const label = BACKGROUNDS[bg].notes;
            const name = 'Feature: ' + (BACKGROUNDS[bg].name || '');
            if (!draft.features.some(f => f.name === name)) draft.features.push({ name: name, desc: label });
        }
    }

