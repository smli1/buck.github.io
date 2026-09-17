// character-creator/core.js - game-system selection, ability score setup, point buy, and shared helpers
// Extracted from character-creator.html; loaded there in page order.

    // ───────────────────────────────────────────────────────────
    // Game systems (Step 0) — the wizard adapts its data per system
    // ───────────────────────────────────────────────────────────
    const BASE_TABLES = { RACES, CLASSES, BACKGROUNDS, SKILL_ABILITIES, SKILL_LABELS, LANGUAGES, ARMORS, WEAPONS, ABILITY_KEYS };

    // Derived: 2024 rules — races provide no ability score modifiers.
    const RACES_2024 = {};
    Object.keys(BASE_TABLES.RACES).forEach(k => {
        RACES_2024[k] = { ...BASE_TABLES.RACES[k], bonuses: {}, notes: BASE_TABLES.RACES[k].name + ' — no racial ability score modifiers in the 2024 rules.' };
    });

    // D&D 3.5e — real modifiers (some negative) and classic classes.
    const RACES_35 = {
        '': { name: '— Select —', speed: 30, bonuses: {}, langs: ['Common'], notes: '' },
        human: { name: 'Human', speed: 30, bonuses: {}, langs: ['Common'], notes: 'No modifier — bonus skill points + feat instead.' },
        dwarf: { name: 'Dwarf', speed: 20, bonuses: { con: 2, cha: -2 }, langs: ['Common', 'Dwarvish'], notes: '+2 CON, −2 CHA, darkvision, speed 20.' },
        elf: { name: 'Elf', speed: 30, bonuses: { dex: 2, con: -2 }, langs: ['Common', 'Elvish'], notes: '+2 DEX, −2 CON, darkvision, trance.' },
        gnome: { name: 'Gnome', speed: 20, bonuses: { con: 2, str: -2 }, langs: ['Common', 'Gnomish'], notes: '+2 CON, −2 STR, low-light vision, speed 20.' },
        'half-elf': { name: 'Half-Elf', speed: 30, bonuses: {}, langs: ['Common', 'Elvish'], notes: 'No modifier; immune to sleep, +2 vs enchantment.' },
        'half-orc': { name: 'Half-Orc', speed: 30, bonuses: { str: 2, int: -2, cha: -2 }, langs: ['Common', 'Orc'], notes: '+2 STR, −2 INT, −2 CHA, darkvision.' },
        halfling: { name: 'Halfling', speed: 20, bonuses: { dex: 2, str: -2 }, langs: ['Common', 'Halfling'], notes: '+2 DEX, −2 STR, small size, speed 20.' }
    };
    const CLASSES_35 = {
        '': { name: '— Select —', hitDie: 'd8', saves: [], skillCount: 2, spellAbility: '', notes: '' },
        barbarian: { name: 'Barbarian', hitDie: 'd12', saves: ['str', 'con'], skillCount: 4, spellAbility: '', notes: 'd12, rage, fast movement.' },
        bard: { name: 'Bard', hitDie: 'd6', saves: ['dex', 'cha'], skillCount: 6, spellAbility: 'cha', notes: 'Spellcaster (CHA), d6.' },
        cleric: { name: 'Cleric', hitDie: 'd8', saves: ['con', 'wis'], skillCount: 2, spellAbility: 'wis', notes: 'Spellcaster (WIS), heavy armor.' },
        druid: { name: 'Druid', hitDie: 'd8', saves: ['con', 'wis'], skillCount: 4, spellAbility: 'wis', notes: 'Spellcaster (WIS), d8.' },
        fighter: { name: 'Fighter', hitDie: 'd10', saves: ['str', 'con'], skillCount: 2, spellAbility: '', notes: 'd10, bonus feats, full BAB.' },
        monk: { name: 'Monk', hitDie: 'd8', saves: ['str', 'con', 'wis'], skillCount: 4, spellAbility: '', notes: 'd8, unarmored, ki.' },
        paladin: { name: 'Paladin', hitDie: 'd10', saves: ['con', 'cha', 'wis'], skillCount: 2, spellAbility: 'cha', notes: 'Spellcaster (CHA), d10, heavy armor.' },
        ranger: { name: 'Ranger', hitDie: 'd8', saves: ['con', 'dex', 'wis'], skillCount: 6, spellAbility: 'wis', notes: 'Spellcaster (WIS), d8.' },
        rogue: { name: 'Rogue', hitDie: 'd6', saves: ['con', 'dex'], skillCount: 8, spellAbility: '', notes: 'd6, sneak attack (DEX).' },
        sorcerer: { name: 'Sorcerer', hitDie: 'd4', saves: ['con', 'cha'], skillCount: 2, spellAbility: 'cha', notes: 'Spellcaster (CHA), d4.' },
        wizard: { name: 'Wizard', hitDie: 'd4', saves: ['con', 'int'], skillCount: 2, spellAbility: 'int', notes: 'Spellcaster (INT), d4.' }
    };

    // Pathfinder 2e — simple fixed ancestry boosts (+2/+2).
    const RACES_PF2 = {
        '': { name: '— Select —', speed: 30, bonuses: {}, langs: ['Common'], notes: '' },
        human: { name: 'Human', speed: 30, bonuses: { str: 2, cha: 2 }, langs: ['Common'], notes: '+2 to two ability scores (your choice — simplified).' },
        dwarf: { name: 'Dwarf', speed: 20, bonuses: { con: 2, wis: 2 }, langs: ['Common', 'Dwarvish'], notes: '+2 CON, +2 WIS, darkvision, speed 20.' },
        elf: { name: 'Elf', speed: 30, bonuses: { dex: 2, int: 2 }, langs: ['Common', 'Elvish'], notes: '+2 DEX, +2 INT, low-light vision.' },
        halfling: { name: 'Halfling', speed: 25, bonuses: { dex: 2, cha: 2 }, langs: ['Common', 'Halfling'], notes: '+2 DEX, +2 CHA, small size.' },
        gnome: { name: 'Gnome', speed: 25, bonuses: { con: 2, cha: 2 }, langs: ['Common', 'Gnomish'], notes: '+2 CON, +2 CHA, low-light vision.' },
        'half-orc': { name: 'Half-Orc', speed: 30, bonuses: { str: 2, con: 2 }, langs: ['Common', 'Orc'], notes: '+2 STR, +2 CON, darkvision.' },
        tiefling: { name: 'Tiefling', speed: 30, bonuses: { int: 2, cha: 2 }, langs: ['Common', 'Undercommon'], notes: '+2 INT, +2 CHA, darkvision.' },
        goblin: { name: 'Goblin', speed: 25, bonuses: { dex: 2, cha: 2 }, langs: ['Common', 'Goblin'], notes: '+2 DEX, +2 CHA, darkvision.' },
        kobold: { name: 'Kobold', speed: 25, bonuses: { dex: 2, con: 2 }, langs: ['Common', 'Draconic'], notes: '+2 DEX, +2 CON, darkvision.' }
    };

    // D&D 4e — roles instead of strict class identity.
    const CLASSES_4E = {
        '': { name: '— Select —', hitDie: 'd8', saves: [], skillCount: 2, spellAbility: '', notes: '' },
        fighter: { name: 'Fighter (Defender)', hitDie: 'd10', saves: ['str', 'con'], skillCount: 4, spellAbility: '', notes: 'Defender — keeps enemies on him.' },
        paladin: { name: 'Paladin (Defender)', hitDie: 'd10', saves: ['con', 'cha'], skillCount: 4, spellAbility: 'cha', notes: 'Defender + off-healer (CHA).' },
        rogue: { name: 'Rogue (Striker)', hitDie: 'd8', saves: ['dex', 'int'], skillCount: 6, spellAbility: '', notes: 'Striker — sneak attack.' },
        ranger: { name: 'Ranger (Striker)', hitDie: 'd8', saves: ['str', 'dex'], skillCount: 6, spellAbility: '', notes: 'Striker — twin strike.' },
        warlock: { name: 'Warlock (Striker)', hitDie: 'd8', saves: ['con', 'cha'], skillCount: 4, spellAbility: 'cha', notes: 'Striker — eldritch blast (CHA).' },
        cleric: { name: 'Cleric (Leader)', hitDie: 'd8', saves: ['con', 'wis'], skillCount: 4, spellAbility: 'wis', notes: 'Leader — heals and blesses (WIS).' },
        warlord: { name: 'Warlord (Leader)', hitDie: 'd8', saves: ['con', 'cha'], skillCount: 4, spellAbility: '', notes: 'Leader — tactical buffs.' },
        wizard: { name: 'Wizard (Controller)', hitDie: 'd6', saves: ['int', 'wis'], skillCount: 4, spellAbility: 'int', notes: 'Controller — area magic (INT).' }
    };

    // Shadowdark — no proficiency bonus; modifiers only.
    const CLASSES_SHADOWDARK = {
        '': { name: '— Select —', hitDie: 'd8', saves: [], skillCount: 2, spellAbility: '', notes: '' },
        fighter: { name: 'Fighter', hitDie: 'd10', saves: ['str', 'con'], skillCount: 2, spellAbility: '', notes: 'Deals +1 damage per level.' },
        thief: { name: 'Thief', hitDie: 'd4', saves: ['dex', 'int'], skillCount: 2, spellAbility: '', notes: 'Backstab, pick locks.' },
        cleric: { name: 'Cleric', hitDie: 'd8', saves: ['con', 'wis'], skillCount: 2, spellAbility: 'wis', notes: 'Holy magic, turn undead.' },
        wizard: { name: 'Wizard', hitDie: 'd4', saves: ['dex', 'int'], skillCount: 2, spellAbility: 'int', notes: 'Fragile, potent spells.' },
        ranger: { name: 'Ranger', hitDie: 'd8', saves: ['str', 'dex'], skillCount: 2, spellAbility: '', notes: 'Track and hunt.' }
    };

    // Call of Cthulhu 7e — d100 skills, different ability set.
    const CLASSES_COC = {
        '': { name: '— Select —', hitDie: 'd6', saves: [], skillCount: 6, spellAbility: 'int', notes: '' },
        investigator: { name: 'Investigator', hitDie: 'd6', saves: ['dex', 'int', 'pow'], skillCount: 8, spellAbility: 'int', notes: 'Skill-based investigator; HP reflect fragility, not heroism.' }
    };
    const SKILLS_COC = {
        accounting: 'int', anthropology: 'int', appraise: 'int', archaeology: 'int', charm: 'cha',
        climb: 'str', 'credit-rating': 'cha', dodge: 'dex', drive: 'dex', 'fast-talk': 'cha',
        'fighting-brawl': 'str', firearms: 'dex', intimidate: 'cha', listen: 'pow', occult: 'int',
        persuade: 'cha', psychology: 'int', 'spot-hidden': 'pow', stealth: 'dex', swim: 'str'
    };
    const SKILL_LABELS_COC = {
        accounting: 'Accounting (INT)', anthropology: 'Anthropology (INT)', appraise: 'Appraise (INT)',
        archaeology: 'Archaeology (INT)', charm: 'Charm (CHA)', climb: 'Climb (STR)',
        'credit-rating': 'Credit Rating (CHA)', dodge: 'Dodge (DEX)', drive: 'Drive Auto (DEX)',
        'fast-talk': 'Fast Talk (CHA)', 'fighting-brawl': 'Fighting (Brawl) (STR)', firearms: 'Firearms (DEX)',
        intimidate: 'Intimidate (CHA)', listen: 'Listen (POW)', occult: 'Occult (INT)', persuade: 'Persuade (CHA)',
        psychology: 'Psychology (INT)', 'spot-hidden': 'Spot Hidden (POW)', stealth: 'Stealth (DEX)', swim: 'Swim (STR)'
    };
    const LANGUAGES_COC = ['English', 'Mandarin', 'Spanish', 'French', 'German', 'Arabic', 'Russian', 'Greek', 'Latin', 'Egyptian'];

    const SYSTEMS = {
        'dnd-5e-2014': { name: 'D&D 5e (2014)', group: 'D&D Editions', tagline: 'Classic 5th edition: ability scores, proficiency +2 → +6, spell DC 8 + PB + modifier.' },
        'dnd-5e-2024': { name: 'D&D 5.5e (2024)', group: 'D&D Editions', tagline: 'Revised 2024 rules: races give no ability modifiers, proficiency up to +6.', profBonus: lvl => Math.min(6, 2 + Math.floor((Number(lvl) || 1) / 4)), races: RACES_2024 },
        'dnd-3e35': { name: 'D&D 3.5e', group: 'D&D Editions', tagline: 'Classic d20: Base Attack Bonus, Fort/Ref/Will saves, spell DC 10 + level + mod.', races: RACES_35, classes: CLASSES_35, savesLabel: 'Saves (Fort / Ref / Will)', bonusLabel: 'Base Attack Bonus', dcBase: 10, profBonus: lvl => Number(lvl) || 1, pointBuyPool: 32 },
        'dnd-4e': { name: 'D&D 4e', group: 'D&D Editions', tagline: 'Roles — Defender / Striker / Leader / Controller — with half-level bonuses.', classes: CLASSES_4E, bonusLabel: 'Level Bonus', dcBase: 10, profBonus: lvl => Math.floor((Number(lvl) || 1) / 2) },
        'dnd-2e': { name: 'AD&D 2e', group: 'D&D Editions', tagline: 'The 1989 classic. Simplified to ascending AC — no THAC0 bookkeeping here.', bonusLabel: 'Combat Bonus', dcBase: 10, profBonus: () => 0 },
        'dnd-odnd': { name: 'OD&D / AD&D 1e', group: 'D&D Editions', tagline: 'The 1974 vintage. Very freeform — enter what your DM calls for.', bonusLabel: 'Attack Bonus', dcBase: 10, profBonus: () => 0 },
        'pathfinder-2e': { name: 'Pathfinder 2e', group: 'Other d20', tagline: 'd20 with proficiency tiers: trained = 2 + level, spell DC 10 + proficiency + mod.', races: RACES_PF2, bonusLabel: 'Proficiency', dcBase: 10, profBonus: lvl => 2 + (Number(lvl) || 1) },
        'shadowdark': { name: 'Shadowdark', group: 'Other d20', tagline: 'Old-school d20: no proficiency bonus, modifiers only, spell DC 10 + ability mod.', classes: CLASSES_SHADOWDARK, bonusLabel: 'Ability Modifier', dcBase: 10, profBonus: () => 0 },
        'coc-7e': {
            name: 'Call of Cthulhu 7e', group: 'Non-d20', tagline: 'd100 roll-under horror: stats are STR/CON/DEX/INT/POW/CHA, HP is fragile.',
            abilityKeys: ['str', 'con', 'dex', 'int', 'pow', 'cha'],
            races: { '': { name: '— Select —', speed: 30, bonuses: {}, langs: ['English'], notes: '' }, human: { name: 'Human', speed: 30, bonuses: {}, langs: ['English'], notes: 'Every investigator is human. Choose your occupation for skills.' } },
            classes: CLASSES_COC, skillAbilities: SKILLS_COC, skillLabels: SKILL_LABELS_COC, languages: LANGUAGES_COC,
            backgrounds: {
                '': { name: '— Select —', notes: '' },
                academic: { name: 'Academic', notes: 'Scholar, librarian, doctor — libraries and archives.' },
                criminal: { name: 'Criminal', notes: 'Thief, gangster, boxer — the bad side of town.' },
                occultist: { name: 'Occultist', notes: 'Mystic, antique dealer, cultist — too curious for comfort.' },
                'ex-military': { name: 'Ex-Military', notes: 'Soldier, veteran, survivalist — steady under fire.' },
                'working-class': { name: 'Working Class', notes: 'Laborer, mechanic, driver — handy and grounded.' }
            },
            bonusLabel: 'Skill Bonus', dcBase: 10, profBonus: () => 0
        },
        'custom': { name: 'Custom / Other', group: 'Other', tagline: 'Any system at all — 5e-style data as a starting point, edit the JSON freely.' }
    };

    function selectSystem(key) {
        if (SYSTEM === key) return;
        applySystem(key);
    }

    function applySystem(key) {
        const s = SYSTEMS[key] || SYSTEMS['dnd-5e-2014'];

        // undo the previous race's ability bonuses, then rebuild for the new ability set
        if (draft._prevRaceBonuses) {
            Object.keys(draft._prevRaceBonuses).forEach(k => { draft.abilities[k] = clampAbility((draft.abilities[k] || 10) - draft._prevRaceBonuses[k]); });
        }
        draft._prevRaceBonuses = null;
        const oldAbil = draft.abilities;
        draft.abilities = {};
        (s.abilityKeys || BASE_TABLES.ABILITY_KEYS).forEach(k => { draft.abilities[k] = oldAbil[k] || 10; });

        RACES = s.races || BASE_TABLES.RACES;
        CLASSES = s.classes || BASE_TABLES.CLASSES;
        BACKGROUNDS = s.backgrounds || BASE_TABLES.BACKGROUNDS;
        SKILL_ABILITIES = s.skillAbilities || BASE_TABLES.SKILL_ABILITIES;
        SKILL_LABELS = s.skillLabels || BASE_TABLES.SKILL_LABELS;
        LANGUAGES = s.languages || BASE_TABLES.LANGUAGES;
        ARMORS = s.armors || BASE_TABLES.ARMORS;
        WEAPONS = s.weapons || BASE_TABLES.WEAPONS;
        ABILITY_KEYS = s.abilityKeys || BASE_TABLES.ABILITY_KEYS;
        PROF_BONUS = s.profBonus || defaultProfBonus;
        DC_BASE = s.dcBase != null ? s.dcBase : 8;
        SAVES_LABEL = s.savesLabel || 'Saving Throws';
        BONUS_LABEL = s.bonusLabel || 'Proficiency Bonus';
        POINT_BUY_POOL = s.pointBuyPool || 27;
        SYSTEM = key;
        SYSTEM_NAME = s.name;
        SYSTEM_TAGLINE = s.tagline || '';

        // reset choices that belonged to the old dataset
        draft.race = ''; draft.class = ''; draft.background = ''; draft.subclass = '';
        draft.speed = 30; draft.armor = ''; draft.spellAbility = '';
        draft.attacks = []; draft.weapons = []; draft.spellcaster = false; draft.features = []; draft.spells = []; draft.spellSlots = '';
        draft._slotsTouched = false;
        document.getElementById('s1-subclass').value = '';
        refreshSubclassOptions();
        document.getElementById('s4-armor').value = '';
        document.getElementById('s5-spellcaster').checked = false;
        document.getElementById('s5-spell-box').style.display = 'none';
        document.getElementById('s5-spell-ability').value = 'int';
        document.getElementById('s6-speed').value = 30;
        s3SavesSet = []; s3SkillsSet = []; s3LangsSet = LANGUAGES[0] ? [LANGUAGES[0]] : [];

        // rebuild system-dependent UI
        document.getElementById('s1-system-hint').innerHTML = 'System: <b>' + esc(SYSTEM_NAME) + '</b> — ' + esc(SYSTEM_TAGLINE);
        document.getElementById('s1-pb-label').textContent = BONUS_LABEL;
        document.getElementById('s1-pb').textContent = formatMod(PROF_BONUS(draft.level));
        document.getElementById('s3-saves-title').textContent = SAVES_LABEL;
        fillSelect(document.getElementById('s1-race'), RACES, '');
        fillSelect(document.getElementById('s1-class'), CLASSES, '');
        fillSelect(document.getElementById('s1-background'), BACKGROUNDS, '');
        document.getElementById('s1-race-hint').textContent = (RACES[''] || {}).notes || '';
        document.getElementById('s1-class-hint').textContent = (CLASSES[''] || {}).notes || '';
        document.getElementById('s1-bg-hint').textContent = '';
        renderAbilityGrid();
        fillArmorSelect();
        fillWeaponsChips();
        renderItems();
        renderAttacks();
        renderFeatures();
        rebuildStep3();
        refreshCombatSuggestions();

        document.querySelectorAll('.system-card').forEach(el => el.classList.toggle('active', el.dataset.sys === key));
        document.getElementById('s0-summary').style.display = 'grid';
        document.getElementById('s0-current').textContent = SYSTEM_NAME;
        document.getElementById('s0-tagline').textContent = SYSTEM_TAGLINE;
        renderStepDictionaries();
        syncDictionaryHighlights();
    }

    function renderSystemGrid() {
        const grid = document.getElementById('s0-systems');
        grid.innerHTML = '';
        const groups = {};
        Object.keys(SYSTEMS).forEach(k => { const s = SYSTEMS[k]; (groups[s.group] = groups[s.group] || []).push([k, s]); });
        Object.keys(groups).forEach(gname => {
            const lbl = document.createElement('div');
            lbl.className = 'system-group-label'; lbl.textContent = gname;
            grid.appendChild(lbl);
            groups[gname].forEach(([k, s]) => {
                const b = document.createElement('button');
                b.type = 'button';
                b.className = 'system-card' + (SYSTEM === k ? ' active' : '');
                b.dataset.sys = k;
                b.innerHTML = `<span class="sys-name">${esc(s.name)}</span><span class="sys-tag">${esc(s.tagline)}</span>`;
                b.onclick = () => selectSystem(k);
                grid.appendChild(b);
            });
        });
    }

    const ABILITY_META = {
        str: { name: 'Strength' }, dex: { name: 'Dexterity' }, con: { name: 'Constitution' },
        int: { name: 'Intelligence' }, wis: { name: 'Wisdom' }, cha: { name: 'Charisma' },
        pow: { name: 'Power' }, edu: { name: 'Education' }, siz: { name: 'Size' }, app: { name: 'Appearance' }
    };

    function renderAbilityGrid() {
        const g = document.getElementById('ability-grid');
        g.innerHTML = '';
        ABILITY_KEYS.forEach(k => {
            const meta = ABILITY_META[k] || { name: k.toUpperCase() };
            const box = document.createElement('div');
            box.className = 'cc-ability' + (draft.method === 'standard' ? ' assignable' : '');
            box.id = 'ab-' + k;
            const lo = draft.method === 'pointbuy' ? 8 : 1;
            const hi = draft.method === 'pointbuy' ? 15 : 30;
            const modCls = 'cc-ability-mod' + (abilityMod(draft.abilities[k]) < 0 ? ' neg' : '');
            const foot = draft.method === 'standard' ? '<span class="cc-ability-clickhint">click to assign</span>' : '';
            box.innerHTML = `
                <div class="cc-ability-head">
                    <span class="cc-ability-abbr">${esc(k.toUpperCase())}</span>
                    <span class="cc-ability-name">${esc(meta.name)}</span>
                </div>
                <div class="cc-ability-core">
                    <input id="a-${k}" type="number" min="${lo}" max="${hi}" step="1" value="${Number(draft.abilities[k]) || 10}" oninput="onAbilityInput('${k}')">
                    <span class="${modCls}" id="m-${k}">${formatMod(abilityMod(draft.abilities[k]))}</span>
                </div>
                <div class="cc-ability-foot" id="pf-${k}">${foot}</div>`;
            if (draft.method === 'standard') {
                box.addEventListener('click', e => {
                    if (e.target.tagName !== 'INPUT') assignStd(k);
                });
            }
            g.appendChild(box);
        });
        if (draft.method === 'pointbuy') renderPointBuySteppers();
        updateAbilityMeter();
    }

    function assignStd(k) {
        if (draft.method !== 'standard') return;
        const copy = [15, 14, 13, 12, 10, 8];
        ABILITY_KEYS.forEach(x => {
            const v = draft.abilities[x];
            const i = copy.indexOf(v);
            if (i > -1) copy.splice(i, 1);
        });
        if (!copy.length) return;
        draft.abilities[k] = copy[0];
        syncAbilitiesToInputs();
    }

    function pointBuyUsed() {
        return ABILITY_KEYS.reduce((s, k) => s + (POINT_BUY_COSTS[draft.abilities[k]] ?? 0), 0);
    }

    function renderPointBuySteppers() {
        ABILITY_KEYS.forEach(k => {
            const f = document.getElementById('pf-' + k);
            if (!f) return;
            const v = draft.abilities[k];
            const cost = POINT_BUY_COSTS[v] ?? 0;
            const used = pointBuyUsed();
            f.innerHTML = '';
            const minus = document.createElement('button');
            minus.className = 'cc-pbstep'; minus.textContent = '−';
            minus.disabled = v <= 8;
            minus.onclick = () => pbStep(k, -1);
            const val = document.createElement('span');
            val.className = 'cc-pbcost'; val.textContent = cost + ' pt' + (cost === 1 ? '' : 's');
            const plus = document.createElement('button');
            plus.className = 'cc-pbstep'; plus.textContent = '+';
            const nextCost = POINT_BUY_COSTS[v + 1] ?? 99;
            plus.disabled = v >= 15 || used + (nextCost - cost) > POINT_BUY_POOL;
            plus.onclick = () => pbStep(k, 1);
            f.appendChild(minus); f.appendChild(val); f.appendChild(plus);
        });
    }

    function pbStep(key, dir) {
        if (draft.method !== 'pointbuy') return;
        const cur = draft.abilities[key];
        const nv = cur + dir;
        if (nv < 8 || nv > 15) return;
        const delta = (POINT_BUY_COSTS[nv] ?? 0) - (POINT_BUY_COSTS[cur] ?? 0);
        if (pointBuyUsed() + delta > POINT_BUY_POOL) return;
        draft.abilities[key] = nv;
        syncAbilitiesToInputs();
    }

    function updateAbilityMeter() {
        const el = document.getElementById('ab-total');
        if (!el) return;
        const vals = ABILITY_KEYS.map(k => Number(draft.abilities[k]) || 10);
        const total = vals.reduce((a, b) => a + b, 0);
        const mods = vals.reduce((a, v) => a + abilityMod(v), 0);
        el.innerHTML = `Array total <b>${total}</b> · modifiers <em>${formatMod(mods)}</em>`;
    }

    const draft = {
        name: '', level: 1, race: '', class: '', subclass: '', background: '', alignment: '', appearance: '', notes: '',
        abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
        method: 'standard',
        savingThrows: [], skills: [], languages: ['Common'], otherProficiencies: '',
        gold: 0, armor: '', shield: false, weapons: [], items: [],
        attacks: [], spellcaster: false, spellAbility: '', spells: [], spellSlots: '',
        maxHp: null, currentHp: null, ac: null, speed: 30,
        features: [],
        traits: { personality: '', ideals: '', bonds: '', flaws: '' }
    };

    function abilityMod(s) { return Math.floor(((Number(s) || 10) - 10) / 2); }
    function defaultProfBonus(level) { return Math.ceil(Math.max(1, Number(level) || 1) / 4) + 1; }
    PROF_BONUS = defaultProfBonus;

