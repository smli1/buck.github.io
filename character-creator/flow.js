// character-creator/flow.js - step 8 sync, navigation, review card and save/export
// Extracted from character-creator.html; loaded there in page order.

    // ───────────────────────────────────────────────────────────
    // Step 8 sync (reads from DOM on save)
    // ───────────────────────────────────────────────────────────

    // ───────────────────────────────────────────────────────────
    // Navigation
    // ───────────────────────────────────────────────────────────
    function goStep(target) {
        target = Math.max(0, Math.min(CONSTANTS.totalSteps - 1, target));
        if (target > currentStep) {
            const ok = validateStep(currentStep);
            if (!ok) return;
        }
        if (target === 2) syncAbilitiesFromInputs();
        if (target === 4) { renderItems(); renderGearList(); fillWeaponsChips(); }
        if (target === 5) { refreshStep5(); if (draft.spellcaster) renderSpellList(); }
        if (target === 7) renderFeatures();
        if (target === 10) { if (!EDIT_MODE && !BLOCK_SUGGESTIONS) { suggestClassFeatures(); suggestRaceFeatures(); suggestBackgroundFeatures(); } renderCard(); }
        // persist DOM-to-draft for later steps
        document.querySelectorAll('.step-panel').forEach(p => p.classList.remove('active'));
        document.getElementById('step-' + target).classList.add('active');
        currentStep = target;
        updateProgress();
        syncDictionaryHighlights();
        document.getElementById('cc-back').style.visibility = currentStep === 0 ? 'hidden' : 'visible';
        const nextBtn = document.getElementById('cc-next');
        if (currentStep === CONSTANTS.totalSteps - 1) {
            nextBtn.textContent = 'Finish ✓';
        } else {
            nextBtn.textContent = 'Next →';
        }
    }

    function syncAbilitiesFromInputs() {
        ABILITY_KEYS.forEach(k => {
            const v = Number(document.getElementById('a-' + k).value) || 10;
            draft.abilities[k] = Math.max(1, Math.min(30, v));
        });
    }

    function validateStep(step) {
        if (step === 0) {
            if (!SYSTEM) { alert('Please choose a game system first.'); return false; }
        }
        if (step === 1) {
            if (!document.getElementById('s1-race').value || !document.getElementById('s1-class').value) {
                alert('Please choose at least a race and a class.');
                return false;
            }
        }
        if (step === 9) {
            const name = document.getElementById('s9-name').value.trim();
            if (!name) { alert('Your character needs a name.'); return false; }
            draft.name = name;
        }
        return true;
    }

    function updateProgress() {
        const bar = document.getElementById('cc-progress');
        bar.innerHTML = '';
        for (let i = 1; i <= CONSTANTS.totalSteps; i++) {
            const dot = document.createElement('div');
            dot.className = 'dot' + (i < currentStep ? ' done' : (i === currentStep ? ' current' : ''));
            bar.appendChild(dot);
        }
    }

    function removeRow(containerId, i, type) {
        if (type === 'item') draft.items.splice(i, 1); renderItems();
        if (type === 'feature') draft.features.splice(i, 1); renderFeatures();
        if (type === 'attack') draft.attacks.splice(i, 1); renderAttacks();
        if (type === 'spell') draft.spells.splice(i, 1); renderSpellList();
    }

    function gatherSpellInfo() {
        draft.spellSlots = document.getElementById('s5-spell-slots').value;
    }

    function copyDomToDraft() {
        draft.gold = Math.max(0, Number(document.getElementById('s4-gold').value) || 0);
        draft.otherProficiencies = document.getElementById('s3-other').value.trim();
        const subSel = document.getElementById('s1-subclass');
        if (subSel.value === '__custom__') draft.subclass = document.getElementById('s1-subclass-custom').value.trim();
        else draft.subclass = subSel.value.trim();
        draft.background = document.getElementById('s1-background').value;
        draft.alignment = document.getElementById('s9-alignment').value;
        draft.appearance = document.getElementById('s9-appearance').value;
        draft.notes = document.getElementById('s9-notes').value;
        draft.name = document.getElementById('s9-name').value.trim();
        draft.savingThrows = s3SavesSet.slice();
        draft.skills = s3SkillsSet.slice();
        draft.languages = s3LangsSet.slice();
        draft.spellAbility = document.getElementById('s5-spell-ability').value;
        gatherSpellInfo();
        const hp = Number(document.getElementById('s6-maxhp').value);
        const cur = Number(document.getElementById('s6-curhp').value);
        if (Number.isFinite(hp) && hp > 0) draft.maxHp = hp;
        if (Number.isFinite(cur) && cur >= 0) draft.currentHp = cur;
        const ac = Number(document.getElementById('s6-ac').value);
        if (Number.isFinite(ac) && ac > 0) draft.ac = ac;
        const sp = Number(document.getElementById('s6-speed').value);
        if (Number.isFinite(sp) && sp > 0) draft.speed = sp;
        draft.traits.personality = document.getElementById('s8-personality').value;
        draft.traits.ideals = document.getElementById('s8-ideals').value;
        draft.traits.bonds = document.getElementById('s8-bonds').value;
        draft.traits.flaws = document.getElementById('s8-flaws').value;
    }

    // ───────────────────────────────────────────────────────────
    // Review card
    // ───────────────────────────────────────────────────────────
    function esc(s) { const d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; }
    function escAttr(s) { return esc(s).replace(/"/g, '&quot;'); }

    function buildCharacterObject() {
        copyDomToDraft();
        const now = new Date().toISOString();
        const pb = draft.profBonus;
        return {
            id: draft._editId || ('char-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7)),
            system: SYSTEM,
            systemName: SYSTEM_NAME,
            name: draft.name || 'Unnamed',
            level: draft.level,
            race: RACES[draft.race] ? RACES[draft.race].name : draft.race,
            class: CLASSES[draft.class] ? CLASSES[draft.class].name : draft.class,
            subclass: draft.subclass,
            background: draft.background && BACKGROUNDS[draft.background] ? { name: BACKGROUNDS[draft.background].name, bonuses: {} } : null,
            alignment: draft.alignment,
            dataSource: null,
            appearance: draft.appearance || '',
            proficiencyBonus: pb,
            abilityScores: { ...draft.abilities },
            maxHp: draft.maxHp,
            maxHpOverride: null,
            currentHp: draft.currentHp ?? draft.maxHp,
            ac: draft.ac,
            acOverride: null,
            hitDice: { die: 'd' + classHitDieValue(), total: draft.level, remaining: draft.level },
            armor: draft.armor ? { name: ARMORS[draft.armor].name, ac: ARMORS[draft.armor].ac, dexCap: ARMORS[draft.armor].dexCap } : null,
            speed: { walk: draft.speed, fly: null, swim: null, climb: null },
            longbowHit: null,
            longbowHitOverride: null,
            styles: {},
            savingThrows: draft.savingThrows,
            skills: draft.skills,
            languages: draft.languages,
            otherProficiencies: draft.otherProficiencies,
            features: draft.features.map(f => ({ name: f.name, description: f.desc })),
            traits: { ...draft.traits },
            attacks: draft.attacks.map(a => ({
                name: a.name,
                ability: a.ability || 'str',
                damage: a.damage,
                range: a.range,
                attackBonus: pb + abilityMod(draft.abilities[a.ability || 'str'])
            })),
            spellcasting: draft.spellcaster ? {
                ability: draft.spellAbility,
                saveDC: DC_BASE + pb + abilityMod(draft.abilities[draft.spellAbility]),
                spellAttack: pb + abilityMod(draft.abilities[draft.spellAbility]),
                slots: draft.spellSlots,
                spells: draft.spells
            } : null,
            feats: [],
            resources: {},
            gold: draft.gold,
            inventory: { gold: draft.gold, notes: '', items: draft.items.map(it => ({ name: it.name, quantity: it.qty || 1, description: '' })), quickAccessIndices: [] },
            notes: draft.notes,
            settings: {},
            createdAt: draft._editCreatedAt || now,
            updatedAt: now
        };
    }

    function renderCard() {
        copyDomToDraft();
        const obj = buildCharacterObject();
        const pb = obj.proficiencyBonus;
        const ab = obj.abilityScores;
        const mod = (s) => formatMod(abilityMod(s));
        const skillRows = obj.skills.map(sk => {
            const abi = SKILL_ABILITIES[sk];
            return { sk, abi };
        });

        const armorName = obj.armor ? obj.armor.name : 'No Armor';
        const traits = obj.traits;

        let html = `
        <div class="cc-card-sheet">
            <div class="cc-sheet-header">
                <div>
                    <h2>${esc(obj.name)}</h2>
                    <div class="cc-sheet-sub">${esc(obj.systemName || 'Custom')} · ${esc(obj.race)} ${esc(obj.class)} ${obj.subclass ? '— ' + esc(obj.subclass) : ''} · Lv ${obj.level}</div>
                    <div class="cc-sheet-sub">${esc(obj.background ? obj.background.name : '')}${obj.alignment ? ' · ' + esc(obj.alignment) : ''}</div>
                </div>
                <div class="cc-tag-row" style="flex-direction:column; align-items:flex-end; gap:4px;">
                    <span class="cs-tag class">${esc(BONUS_LABEL)} ${formatMod(pb)}</span>
                    <span class="cs-tag race">Init ${mod(ab.dex)}</span>
                    <span class="cs-tag background">HP ${obj.currentHp}/${obj.maxHp} · AC ${obj.ac}</span>
                </div>
            </div>
            <div class="cc-sheet-body">

                <div class="cc-sheet-grid cols-2">
                    <div class="cc-block">
                        <h4>Ability Scores</h4>
                        <div class="grid-6">
                            ${ABILITY_KEYS.map(k => `
                                <div class="cc-ability-big">
                                    <div class="label">${k.toUpperCase()}</div>
                                    <div class="score">${ab[k]}</div>
                                    <div class="mod">${mod(ab[k])}</div>
                                </div>`).join('')}
                        </div>
                    </div>
                    <div class="cc-block" style="display:grid; gap:8px;">
                        <h4>Combat</h4>
                        <div class="grid-3" style="text-align:center;">
                            <div><div class="cc-ability-big mod" style="font-size:1.2rem;">${obj.maxHp}</div><div class="cc-ability-big label">Max HP</div></div>
                            <div><div class="cc-ability-big mod" style="font-size:1.2rem;">${obj.ac}</div><div class="cc-ability-big label">AC</div></div>
                            <div><div class="cc-ability-big mod" style="font-size:1.2rem;">${obj.speed.walk}</div><div class="cc-ability-big label">Speed</div></div>
                        </div>
                        <div class="cc-note">Hit Dice: d${classHitDieValue()} × ${obj.level} · Armor: ${esc(armorName)}</div>
                        <div class="cc-note">HP formula suggestion: ${document.getElementById('s6-formula').textContent}</div>
                    </div>
                </div>

                <div class="cc-sheet-grid cols-2">
                    <div class="cc-block">
                        <h4>Saving Throws & Skills</h4>
                        <div class="cc-chips">
                            ${obj.savingThrows.map(k => `<span class="cc-chip">${k.toUpperCase()} ${formatMod(abilityMod(ab[k]))}</span>`).join('') || '<span class="cc-note">None selected</span>'}
                        </div>
                        <div style="height:8px;"></div>
                        <div class="cc-chips">
                            ${ABILITY_KEYS.filter(k => skillRows.some(r => r.abi === k)).map(k => `
                            <div class="cc-sk-row">
                                <b>${k.toUpperCase()}</b>
                                ${skillRows.filter(r => r.abi === k).map(r => `<span class="cc-chip">${esc(skillLabel(r.sk))} ${formatMod(pb + abilityMod(ab[r.abi]))}</span>`).join('')}
                            </div>`).join('') || '<span class="cc-note">No skills selected</span>'}
                        </div>
                        <div style="height:8px;"></div>
                        <div class="cc-note"><b>Languages:</b> ${obj.languages.join(', ') || '—'}</div>
                        ${obj.otherProficiencies ? `<div class="cc-note"><b>Other:</b> ${esc(obj.otherProficiencies)}</div>` : ''}
                    </div>

                    <div class="cc-block">
                        <h4>Attacks</h4>
                        ${obj.attacks.length ? obj.attacks.map(a => `
                            <div style="padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.06); display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap;">
                                <strong>${esc(a.name) || 'Attack'}</strong>
                                <span class="cc-note">hit ${formatMod(a.attackBonus)} · dmg ${esc(a.damage)} · ${esc(a.range)}</span>
                            </div>`).join('') : '<div class="cc-note">No attacks defined.</div>'}
                        ${obj.spellcasting ? `
                            <div style="height:10px;"></div>
                            <h4>Spellcasting (${obj.spellcasting.ability.toUpperCase()})</h4>
                            <div class="cc-note">DC <b>${obj.spellcasting.saveDC}</b> · Attack <b>${formatMod(obj.spellcasting.spellAttack)}</b> · Slots ${esc(obj.spellcasting.slots || '—')}</div>
                            ${obj.spellcasting.spells ? `<div class="cc-note">${esc(obj.spellcasting.spells)}</div>` : ''}
                        ` : ''}
                    </div>
                </div>

                <div class="cc-sheet-grid">
                    <div class="cc-block">
                        <h4>Features & Traits</h4>
                        <ul style="margin:0; padding-left:18px;">
                            ${obj.features.filter(f => f.name).map(f => `<li><strong>${esc(f.name)}</strong>${f.description ? ' — ' + esc(f.description) : ''}</li>`).join('') || '<li class="cc-note">No features recorded.</li>'}
                        </ul>
                    </div>
                </div>

                <div class="cc-sheet-grid cols-2">
                    <div class="cc-block"><h4>Personality</h4><div class="cc-note">${esc(traits.personality) || '—'}</div></div>
                    <div class="cc-block"><h4>Ideals</h4><div class="cc-note">${esc(traits.ideals) || '—'}</div></div>
                    <div class="cc-block"><h4>Bonds</h4><div class="cc-note">${esc(traits.bonds) || '—'}</div></div>
                    <div class="cc-block"><h4>Flaws</h4><div class="cc-note">${esc(traits.flaws) || '—'}</div></div>
                </div>

                ${obj.notes ? `<div class="cc-block"><h4>Notes</h4><div class="cc-note">${esc(obj.notes)}</div></div>` : ''}
                ${obj.gold ? `<div class="cc-block"><h4>Equipment</h4><div class="cc-note">Gold: ${obj.gold} gp · ${obj.inventory.items.filter(i => i.name).map(i => esc(i.name) + (i.quantity > 1 ? ' ×' + i.quantity : '')).join(', ') || 'No items'}</div></div>` : ''}
            </div>
        </div>`;
        document.getElementById('s10-card').innerHTML = html;
    }

    // ───────────────────────────────────────────────────────────
    // Edit mode: preload an existing character into the wizard
    // ───────────────────────────────────────────────────────────
    const EDIT_MODE = new URLSearchParams(window.location.search).has('edit');
    let PRELOAD_ID = new URLSearchParams(window.location.search).get('edit') || null;
    let BLOCK_SUGGESTIONS = false;

    function findKeyByDisplay(map, display) {
        if (!display) return '';
        const hit = Object.keys(map || {}).find(k => map[k] && map[k].name === display);
        return hit || '';
    }

    function preloadCharacter(ch) {
        if (!ch || typeof ch !== 'object') return false;

        // select the game system first (resets races/classes/abilities to that system's defaults)
        const sys = (ch.system && SYSTEMS[ch.system]) ? ch.system : 'dnd-5e-2014';
        try { if (SYSTEM !== sys) applySystem(sys); } catch (e) { /* keep current */ }

        const scores = ch.abilityScores || ch.abilities || {};
        // manual method keeps stored values as-is (setMethod resets scores, so call it first)
        try { setMethod('manual'); } catch (e) { draft.method = 'manual'; }
        ABILITY_KEYS.forEach(k => { draft.abilities[k] = Number.isFinite(Number(scores[k])) ? Number(scores[k]) : 10; });

        const raceKey = findKeyByDisplay(RACES, ch.race);
        const classKey = findKeyByDisplay(CLASSES, ch.class);
        const bgName = (typeof ch.background === 'string') ? ch.background : (ch.background && ch.background.name);
        const bgKey = findKeyByDisplay(BACKGROUNDS, bgName);

        draft.race = raceKey;
        draft.class = classKey;
        draft.background = bgKey;
        draft.subclass = ch.subclass || '';
        draft._prevRaceBonuses = RACES[raceKey] ? Object.assign({}, RACES[raceKey].bonuses || {}) : {};
        draft.level = Math.max(1, Math.min(20, Number(ch.level) || 1));
        draft.name = ch.name || '';
        draft.alignment = ch.alignment || '';
        draft.appearance = ch.appearance || '';
        draft.notes = ch.notes || '';
        draft.speed = Number((ch.speed && ch.speed.walk) || 30) || 30;
        draft.maxHp = Number.isFinite(Number(ch.maxHp)) ? Number(ch.maxHp) : null;
        draft.currentHp = Number.isFinite(Number(ch.currentHp)) ? Number(ch.currentHp) : draft.maxHp;
        draft.ac = Number.isFinite(Number(ch.ac)) ? Number(ch.ac) : null;
        draft.gold = Number(ch.gold) || 0;
        draft.savingThrows = Array.isArray(ch.savingThrows) ? ch.savingThrows.slice() : [];
        draft.skills = Array.isArray(ch.skills) ? ch.skills.slice() : [];
        draft.languages = (Array.isArray(ch.languages) && ch.languages.length) ? ch.languages.slice() : ['Common'];
        draft.otherProficiencies = ch.otherProficiencies || '';
        draft.features = Array.isArray(ch.features)
            ? ch.features.map(f => ({ name: (f && f.name) || '', desc: (f && (f.description || f.desc)) || '' }))
            : [];
        draft.traits = {
            personality: (ch.traits && ch.traits.personality) || '',
            ideals: (ch.traits && ch.traits.ideals) || '',
            bonds: (ch.traits && ch.traits.bonds) || '',
            flaws: (ch.traits && ch.traits.flaws) || ''
        };
        draft.attacks = Array.isArray(ch.attacks) ? ch.attacks.map(a => ({ ...a })) : [];
        draft.spellcaster = !!(ch.spellcasting);
        draft.spellAbility = (ch.spellcasting && ch.spellcasting.ability) || 'int';
        draft.spells = Array.isArray(ch.spellcasting && ch.spellcasting.spells)
            ? ch.spellcasting.spells.map(s => typeof s === 'string' ? { level: 0, name: s } : { level: Number(s.level) || 0, name: s.name || '' })
            : [];
        draft.spellSlots = (ch.spellcasting && ch.spellcasting.slots) || '';
        draft.items = (ch.inventory && Array.isArray(ch.inventory.items))
            ? ch.inventory.items.map(it => ({ name: it.name || '', qty: Number(it.quantity) || 1 }))
            : [];

        // keep original identity + creation timestamp when editing
        draft._editId = String(ch.id || PRELOAD_ID || '');
        draft._editCreatedAt = ch.createdAt || null;

        // mark combat fields as user-specified so refreshCombatSuggestions() won't override them
        draft._hpTouched = true; draft._curTouched = true; draft._acTouched = true; draft._speedTouched = true;

        // hunger-strike flags: subclass is a display value; keep custom in the custom input
        s3SavesSet = draft.savingThrows.slice();
        s3SkillsSet = draft.skills.slice();
        s3LangsSet = draft.languages.slice();

        // identify the armor choice by display name (best effort)
        const armorName = ch.armor && typeof ch.armor === 'object' ? ch.armor.name : null;
        draft.armor = armorName === 'No Armor (Unarmored)' || armorName === 'No Armor' ? '' : findKeyByDisplay(ARMORS, armorName);

        // ── sync DOM ───────────────────────────────────────────
        const setVal = (id, value) => { const el = document.getElementById(id); if (el) el.value = value != null ? value : ''; };
        setVal('s1-race', raceKey);
        setVal('s1-class', classKey);
        setVal('s1-background', bgKey);
        setVal('s1-level', draft.level);
        setVal('s6-speed', draft.speed);
        setVal('s6-maxhp', draft.maxHp != null ? draft.maxHp : '');
        setVal('s6-curhp', draft.currentHp != null ? draft.currentHp : '');
        setVal('s6-ac', draft.ac != null ? draft.ac : '');
        setVal('s4-gold', draft.gold);
        setVal('s4-armor', draft.armor);
        setVal('s3-other', draft.otherProficiencies);
        setVal('s9-name', draft.name);
        setVal('s9-alignment', draft.alignment);
        setVal('s9-appearance', draft.appearance);
        setVal('s9-notes', draft.notes);
        setVal('s8-personality', draft.traits.personality);
        setVal('s8-ideals', draft.traits.ideals);
        setVal('s8-bonds', draft.traits.bonds);
        setVal('s8-flaws', draft.traits.flaws);

        document.getElementById('s1-race-hint').textContent = (RACES[raceKey] || { notes: '' }).notes || '';
        document.getElementById('s1-class-hint').textContent = (CLASSES[classKey] || { notes: '' }).notes || '';
        document.getElementById('s1-bg-hint').textContent = (BACKGROUNDS[bgKey] || { notes: '' }).notes || '';
        document.getElementById('s1-pb').textContent = formatMod(PROF_BONUS(draft.level));

        // hit die + subclass options
        const die = CLASSES[classKey] ? CLASSES[classKey].hitDie : 'd10';
        document.getElementById('s6-hitdie').value = die;
        refreshSubclassOptions();
        const subSel = document.getElementById('s1-subclass');
        if (draft.subclass) {
            const matched = subSel.options && Array.prototype.some.call(subSel.options, o => o.value === draft.subclass);
            if (matched) subSel.value = draft.subclass;
            else {
                subSel.value = '__custom__';
                document.getElementById('s1-subclass-custom').value = draft.subclass;
            }
        }

        // spellcasting box
        const spellBox = document.getElementById('s5-spellcaster');
        spellBox.checked = draft.spellcaster;
        document.getElementById('s5-spell-box').style.display = draft.spellcaster ? 'grid' : 'none';
        document.getElementById('s5-spell-ability').value = draft.spellAbility;
        document.getElementById('s5-spell-slots').value = draft.spellSlots;
        draft._slotsTouched = draft.spellcaster;

        // ability grid (manual mode keeps stored values as-is)
        syncAbilitiesToInputs();

        // step-3 chips (saves/skills/languages)
        rebuildStep3();

        // items, weapons (best-effort: weapons list is id-based; we leave chips as-is)
        renderItems();
        fillWeaponsChips();

        // attacks + spells
        renderAttacks();
        if (draft.spellcaster) { renderSpellList(); refreshStep5(); } else { renderAttacks(); }

        // features + combat suggestions (won't override touched HP/AC)
        renderFeatures();
        refreshCombatSuggestions();

        // review card at step 10
        try { goStep(10); } catch (e) { /* ignore */ }
        return true;
    }

    async function loadEditableCharacter(id) {
        // localStorage overlay first (characters saved in this browser)
        const overlay = loadLocalOverlay();
        if (overlay[id]) return overlay[id];
        // fall back to the data folder via the registry
        try {
            const res = await fetch('data/characters.json');
            if (!res.ok) return null;
            const data = await res.json();
            const registry = Array.isArray(data) ? data : (Array.isArray(data.characters) ? data.characters : []);
            const entry = registry.find(e => String(e.id) === id);
            if (!entry) return null;
            const file = String(entry.file || `characters/${id}.json`);
            const r = await fetch('data/' + file);
            if (!r.ok) return null;
            return await r.json();
        } catch (e) {
            return null;
        }
    }

    async function initEditMode() {
        if (!EDIT_MODE || !PRELOAD_ID) return;
        const ch = await loadEditableCharacter(PRELOAD_ID);
        if (!ch) {
            showDialog('Character not found', '"' + PRELOAD_ID + '" was not found. It may need to be re-exported into data/ or re-saved in this browser.', []);
            return;
        }
        preloadCharacter(ch);
    }

    // ───────────────────────────────────────────────────────────
    // Auto-save the in-progress draft (NEW characters only)
    // Stored separately from the roster so the character selector can show
    // it as a resumable draft card that cannot be launched.
    // ───────────────────────────────────────────────────────────
    const AUTOSAVE_KEY = 'rpg_creator_draft';
    let draftAutosaveTimer = null;

    function buildDraftSnapshot() {
        try { copyDomToDraft(); } catch (e) { /* keep whatever draft holds */ }
        const f = {
            abilities: Object.assign({}, draft.abilities || {}),
            level: draft.level, race: draft.race, class: draft.class,
            background: draft.background, subclass: draft.subclass,
            name: draft.name, alignment: draft.alignment, appearance: draft.appearance, notes: draft.notes,
            speed: draft.speed, maxHp: draft.maxHp, currentHp: draft.currentHp, ac: draft.ac, gold: draft.gold,
            otherProficiencies: draft.otherProficiencies,
            features: (draft.features || []).map(x => ({ name: (x && x.name) || '', desc: (x && (x.desc || x.description)) || '' })),
            attacks: (draft.attacks || []).map(a => ({ ...a })),
            spellcaster: !!draft.spellcaster, spellAbility: draft.spellAbility || 'int',
            spellSlots: draft.spellSlots || '', spells: (draft.spells || []).map(s => ({ level: Number(s.level) || 0, name: (s && s.name) || '' })),
            items: (draft.items || []).map(it => ({ name: (it && it.name) || '', qty: Number(it.qty) || Number(it.quantity) || 1 })),
            traits: { personality: (draft.traits && draft.traits.personality) || '', ideals: (draft.traits && draft.traits.ideals) || '', bonds: (draft.traits && draft.traits.bonds) || '', flaws: (draft.traits && draft.traits.flaws) || '' },
            _hpTouched: !!draft._hpTouched, _curTouched: !!draft._curTouched,
            _acTouched: !!draft._acTouched, _speedTouched: !!draft._speedTouched, _slotsTouched: !!draft._slotsTouched
        };
        return {
            v: 1,
            system: SYSTEM || '',
            step: currentStep,
            method: draft.method || 'standard',
            saves: (typeof s3SavesSet !== 'undefined' ? s3SavesSet : []).slice(),
            skills: (typeof s3SkillsSet !== 'undefined' ? s3SkillsSet : []).slice(),
            langs: (typeof s3LangsSet !== 'undefined' ? s3LangsSet : []).slice(),
            draftFields: f,
            savedAt: Date.now()
        };
    }

    function saveDraftSnapshot() {
        try { localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(buildDraftSnapshot())); }
        catch (e) { /* storage full / private mode */ }
    }

    function scheduleAutosave() {
        if (draftAutosaveTimer) clearTimeout(draftAutosaveTimer);
        draftAutosaveTimer = setTimeout(saveDraftSnapshot, 500);
    }

    function clearDraftSnapshot() {
        try { localStorage.removeItem(AUTOSAVE_KEY); } catch (e) { /* ignore */ }
    }

    // Restore an auto-saved draft into the wizard (NEW-character flow only).
    // Returns true when a draft was restored, false otherwise.
    function restoreDraft() {
        if (EDIT_MODE) return false;
        let raw = null;
        try { raw = localStorage.getItem(AUTOSAVE_KEY); } catch (e) { return false; }
        if (!raw) return false;
        let snap = null;
        try { snap = JSON.parse(raw); } catch (e) { return false; }
        if (!snap || !snap.draftFields || !snap.draftFields.abilities) return false;

        const f = snap.draftFields;
        const sys = (snap.system && SYSTEMS[snap.system]) ? snap.system : 'dnd-5e-2014';
        try { if (SYSTEM !== sys) applySystem(sys); } catch (e) { /* keep current */ }
        try { setMethod((snap.method === 'standard' || snap.method === 'pointbuy') ? snap.method : 'manual'); } catch (e) { draft.method = 'manual'; }
        ABILITY_KEYS.forEach(k => { draft.abilities[k] = Number.isFinite(Number(f.abilities[k])) ? Number(f.abilities[k]) : 10; });

        draft.level = Math.max(1, Math.min(20, Number(f.level) || 1));
        draft.race = f.race || ''; draft.class = f.class || ''; draft.background = f.background || ''; draft.subclass = f.subclass || '';
        draft._prevRaceBonuses = (draft.race && RACES[draft.race] && RACES[draft.race].bonuses) ? Object.assign({}, RACES[draft.race].bonuses) : {};
        draft.name = f.name || ''; draft.alignment = f.alignment || ''; draft.appearance = f.appearance || ''; draft.notes = f.notes || '';
        draft.speed = Number(f.speed) || 30;
        draft.maxHp = Number.isFinite(Number(f.maxHp)) ? Number(f.maxHp) : null;
        draft.currentHp = Number.isFinite(Number(f.currentHp)) ? Number(f.currentHp) : draft.maxHp;
        draft.ac = Number.isFinite(Number(f.ac)) ? Number(f.ac) : null;
        draft.gold = Number(f.gold) || 0;
        draft.otherProficiencies = f.otherProficiencies || '';
        draft.features = (f.features || []).map(x => ({ name: (x && x.name) || '', desc: (x && (x.desc || x.description)) || '' }));
        draft.attacks = (f.attacks || []).map(a => ({ ...a }));
        draft.spellcaster = !!f.spellcaster;
        draft.spellAbility = f.spellAbility || 'int';
        draft.spellSlots = f.spellSlots || '';
        draft.spells = (f.spells || []).map(s => ({ level: Number(s.level) || 0, name: (s && s.name) || '' }));
        draft.items = (f.items || []).map(it => ({ name: (it && it.name) || '', qty: Number(it.qty) || Number(it.quantity) || 1 }));
        draft.traits = { personality: (f.traits && f.traits.personality) || '', ideals: (f.traits && f.traits.ideals) || '', bonds: (f.traits && f.traits.bonds) || '', flaws: (f.traits && f.traits.flaws) || '' };
        draft.savingThrows = (snap.saves || []).slice();
        draft.skills = (snap.skills || []).slice();
        draft.languages = (snap.langs && snap.langs.length) ? snap.langs.slice() : ['Common'];
        draft._hpTouched = !!f._hpTouched; draft._curTouched = !!f._curTouched;
        draft._acTouched = !!f._acTouched; draft._speedTouched = !!f._speedTouched; draft._slotsTouched = !!f._slotsTouched;

        // ── sync DOM ───────────────────────────────────────────
        const setVal = (id, value) => { const el = document.getElementById(id); if (el) el.value = value != null ? value : ''; };
        setVal('s1-race', draft.race);
        setVal('s1-class', draft.class);
        setVal('s1-background', draft.background);
        setVal('s1-level', draft.level);
        setVal('s6-speed', draft.speed);
        setVal('s6-maxhp', draft.maxHp != null ? draft.maxHp : '');
        setVal('s6-curhp', draft.currentHp != null ? draft.currentHp : '');
        setVal('s6-ac', draft.ac != null ? draft.ac : '');
        setVal('s4-gold', draft.gold);
        setVal('s4-armor', '');
        setVal('s3-other', draft.otherProficiencies);
        setVal('s9-name', draft.name);
        setVal('s9-alignment', draft.alignment);
        setVal('s9-appearance', draft.appearance);
        setVal('s9-notes', draft.notes);
        setVal('s8-personality', draft.traits.personality);
        setVal('s8-ideals', draft.traits.ideals);
        setVal('s8-bonds', draft.traits.bonds);
        setVal('s8-flaws', draft.traits.flaws);
        setVal('s6-hitdie', (CLASSES[draft.class] && CLASSES[draft.class].hitDie) || 'd10');

        refreshSubclassOptions();
        const subSel = document.getElementById('s1-subclass');
        if (draft.subclass) {
            const matched = subSel.options && Array.prototype.some.call(subSel.options, o => o.value === draft.subclass);
            if (matched) subSel.value = draft.subclass;
            else { subSel.value = '__custom__'; document.getElementById('s1-subclass-custom').value = draft.subclass; }
        } else {
            subSel.value = '';
        }
        document.getElementById('s1-race-hint').textContent = (RACES[draft.race] || { notes: '' }).notes || '';
        document.getElementById('s1-class-hint').textContent = (CLASSES[draft.class] || { notes: '' }).notes || '';
        document.getElementById('s1-bg-hint').textContent = (BACKGROUNDS[draft.background] || { notes: '' }).notes || '';
        document.getElementById('s1-pb').textContent = formatMod(PROF_BONUS(draft.level));

        const spellBox = document.getElementById('s5-spellcaster');
        spellBox.checked = draft.spellcaster;
        document.getElementById('s5-spell-box').style.display = draft.spellcaster ? 'grid' : 'none';
        document.getElementById('s5-spell-ability').value = draft.spellAbility;
        document.getElementById('s5-spell-slots').value = draft.spellSlots;

        s3SavesSet = draft.savingThrows.slice();
        s3SkillsSet = draft.skills.slice();
        s3LangsSet = draft.languages.slice();

        syncAbilitiesToInputs();
        rebuildStep3();
        renderItems();
        fillWeaponsChips();
        renderAttacks();
        if (draft.spellcaster) { renderSpellList(); refreshStep5(); }
        renderFeatures();
        refreshCombatSuggestions();

        const target = Math.max(0, Math.min(CONSTANTS.totalSteps - 1, Number(snap.step) || 0));
        BLOCK_SUGGESTIONS = true;
        try { goStep(target); } catch (e) { /* ignore */ }
        BLOCK_SUGGESTIONS = false;
        return true;
    }

    // ───────────────────────────────────────────────────────────
    // Save / Export (compatible with data/characters/<id>.json + registry)
    // ───────────────────────────────────────────────────────────
    function loadLocalOverlay() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            const obj = raw ? JSON.parse(raw) : {};
            return (obj && typeof obj === 'object' && !Array.isArray(obj)) ? obj : {};
        } catch (e) { return {}; }
    }

    function saveToLocalOverlay() {
        const obj = loadLocalOverlay();
        obj[finalChar.id] = finalChar;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    }

    let finalChar = null;

    function ensureFinalChar() {
        if (!finalChar) finalChar = buildCharacterObject();
        return finalChar;
    }

    function showDialog(title, msg, exportList, primaryLabel) {
        document.getElementById('dialog-title').textContent = title;
        document.getElementById('dialog-msg').textContent = msg || '';
        const listEl = document.getElementById('export-list');
        listEl.innerHTML = '';
        (exportList || []).forEach(f => {
            const row = document.createElement('div');
            row.className = 'e-row';
            const code = document.createElement('code');
            code.textContent = f.path;
            row.appendChild(code);
            const b = document.createElement('button');
            b.className = 'btn btn-secondary-ghost';
            b.style.cssText = 'flex:0;padding:4px 10px;font-size:0.8rem;';
            b.textContent = '⬇';
            b.onclick = () => downloadJson(f.path, JSON.stringify(f.json, null, 2));
            row.appendChild(b);
            listEl.appendChild(row);
        });
        const primary = document.getElementById('dialog-primary');
        primary.textContent = primaryLabel || 'OK';
        document.getElementById('dialog-overlay').classList.remove('hidden');
    }

    function closeDialog() { document.getElementById('dialog-overlay').classList.add('hidden'); }

    function downloadJson(filename, content) {
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(url);
    }

    function finishSave() {
        finalChar = buildCharacterObject();
        saveToLocalOverlay();
        clearDraftSnapshot();
        // Return to the app and auto-launch this character (the select screen reads pending_launch_id).
        try { localStorage.setItem('pending_launch_id', finalChar.id); } catch (e) { /* ignore */ }
        // Auto-export the character as its own file + an updated registry, so it's easy to
        // keep data/characters/<id>.json as a separate, transferable file.
        downloadJson(`data/characters/${finalChar.id}.json`, JSON.stringify(finalChar, null, 2));
        downloadJson('data/characters.json', JSON.stringify(buildRegistry(), null, 2));
        // Give the downloads a moment to start, then return to the app.
        window.setTimeout(function () { window.location.href = 'index.html'; }, 400);
    }

    function finishExport() {
        finalChar = buildCharacterObject();
        saveToLocalOverlay();
        const files = [];
        files.push({ path: `data/characters/${finalChar.id}.json`, json: finalChar });
        files.push({ path: 'data/characters.json', json: buildRegistry() });
        showDialog('Export character files', 'Download each file and place it in the matching path in your repo.', files);
    }

    function buildRegistry() {
        const list = Object.values(loadLocalOverlay()).map(c => c);
        return {
            version: 2,
            meta: { description: 'Registry of RPG character files for character-select.html', schema: 'player-data-v2', updated: new Date().toISOString().slice(0, 10) },
            characters: list.map(c => ({
                id: c.id,
                file: `characters/${c.id}.json`,
                name: c.name,
                level: c.level,
                race: c.race,
                class: c.class,
                subclass: c.subclass || '',
                background: c.background && typeof c.background === 'object' ? c.background.name : c.background,
                system: c.system || '',
                systemName: c.systemName || ''
            }))
        };
    }

