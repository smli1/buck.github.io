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
        if (target === 10) { suggestClassFeatures(); suggestRaceFeatures(); suggestBackgroundFeatures(); renderCard(); }
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
            id: 'char-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
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
            createdAt: now,
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
        showDialog('Character saved ✓', `"${finalChar.name}" is now saved in your browser and will appear on the Character Select page. Use Export to add the JSON files into the data/ folder.`);
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

