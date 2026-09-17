const REGISTRY_URL = 'data/characters.json';
const CHARACTER_DIR = 'data/characters';
const STORAGE_KEY = 'rpg_characters_v2';
const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
let characters = [];
let localOverlay = {};
let rosterSource = 'local';
let editingId = null;
let pendingConfirm = null;

// ── Storage ──────────────────────────────────────────────
function loadLocal() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const obj = raw ? JSON.parse(raw) : {};
        return (obj && typeof obj === 'object' && !Array.isArray(obj)) ? obj : {};
    } catch (e) {
        return {};
    }
}

function saveLocal() {
    try {
        const obj = {};
        characters.forEach(c => { obj[c.id] = c; });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    } catch (e) { /* ignore */ }
}

function makeCharacterFile(ch) {
    const c = normalizeChar(ch);
    return {
        id: c.id,
        name: c.name,
        level: c.level,
        race: c.race,
        class: c.class,
        subclass: c.subclass,
        background: c.background,
        alignment: c.alignment,
        dataSource: c.dataSource,
        proficiencyBonus: c.proficiencyBonus,
        abilityScores: c.abilityScores,
        maxHp: c.maxHp,
        maxHpOverride: c.maxHpOverride,
        currentHp: c.currentHp,
        ac: c.ac,
        acOverride: c.acOverride,
        hitDice: c.hitDice,
        armor: c.armor,
        speed: c.speed,
        longbowHit: c.longbowHit,
        longbowHitOverride: c.longbowHitOverride,
        styles: c.styles,
        savingThrows: c.savingThrows,
        skills: c.skills,
        feats: c.feats,
        resources: c.resources,
        gold: c.gold,
        inventory: c.inventory,
        notes: c.notes,
        settings: c.settings,
        // ★ Character-card data
        system: c.system ?? null,
        systemName: c.systemName ?? null,
        appearance: c.appearance ?? '',
        languages: Array.isArray(c.languages) ? c.languages.slice() : [],
        otherProficiencies: c.otherProficiencies ?? '',
        traits: c.traits && typeof c.traits === 'object' ? { ...c.traits } : {},
        features: Array.isArray(c.features)
            ? c.features.map(f => ({ name: (f && f.name) || '', description: (f && (f.description || f.desc)) || '' }))
            : [],
        attacks: Array.isArray(c.attacks) ? c.attacks.map(a => ({ ...a })) : [],
        spellcasting: c.spellcasting || null,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt
    };
}

function makeRegistryFile(list) {
    return {
        version: 2,
        meta: {
            description: 'Registry of RPG character files for character-select.html',
            schema: 'player-data-v2',
            updated: new Date().toISOString().slice(0, 10)
        },
        characters: list.map(c => ({
            id: c.id,
            file: `characters/${c.id}.json`,
            name: c.name,
            level: c.level,
            race: c.race,
            class: c.class,
            subclass: c.subclass,
            background: c.background && typeof c.background === 'object' ? c.background.name : c.background
        }))
    };
}

function downloadJson(filename, content) {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Normalize a character record (handles legacy `abilities`/`maxHp` and new `abilityScores`/`hp`)
function normalizeChar(raw) {
    const ch = raw && typeof raw === 'object' ? raw : {};
    const scores = ch.abilityScores || ch.abilities || {};
    const hp = ch.hp || {};
    const bg = typeof ch.background === 'string' ? { name: ch.background, bonuses: {} } : (ch.background || null);
    return {
        id: String(ch.id || 'char-' + Date.now()),
        name: ch.name || 'Unnamed',
        level: Number(ch.level) || 1,
        race: ch.race || '',
        class: ch.class || '',
        subclass: ch.subclass || '',
        background: bg,
        alignment: ch.alignment || '',
        dataSource: ch.dataSource || ch.source || null,
        proficiencyBonus: Number(ch.proficiencyBonus) || 0,
        abilityScores: {
            str: Number(scores.str) || 10,
            dex: Number(scores.dex) || 10,
            con: Number(scores.con) || 10,
            int: Number(scores.int) || 10,
            wis: Number(scores.wis) || 10,
            cha: Number(scores.cha) || 10
        },
        maxHp: ch.maxHp ?? hp.max ?? null,
        maxHpOverride: ch.maxHpOverride ?? null,
        currentHp: ch.currentHp ?? hp.current ?? ch.maxHp ?? hp.max ?? null,
        ac: ch.ac ?? null,
        acOverride: ch.acOverride ?? null,
        hitDice: (typeof ch.hitDice === 'string')
            ? { die: ch.hitDice, total: Number(ch.level) || 1, remaining: Number(ch.level) || 1 }
            : { die: (ch.hitDice && ch.hitDice.die) || 'd10', total: Number(ch.hitDice && ch.hitDice.total) || Number(ch.level) || 1, remaining: Number(ch.hitDice && ch.hitDice.remaining) || Number(ch.level) || 1 },
        armor: ch.armor || null,
        speed: ch.speed || { walk: 30, fly: null, swim: null, climb: null },
        longbowHit: ch.longbowHit ?? null,
        longbowHitOverride: ch.longbowHitOverride ?? null,
        styles: ch.styles || {},
        savingThrows: Array.isArray(ch.savingThrows) ? ch.savingThrows : [],
        skills: Array.isArray(ch.skills) ? ch.skills : [],
        feats: Array.isArray(ch.feats) ? ch.feats : [],
        resources: ch.resources || {},
        gold: Number(ch.gold) || 0,
        inventory: ch.inventory || { gold: Number(ch.gold) || 0, notes: '', items: [], quickAccessIndices: [] },
        notes: ch.notes || '',
        settings: ch.settings || {},
        // ★ Character-card data (kept by the wizard; must survive app re-save/export)
        system: ch.system ?? null,
        systemName: ch.systemName ?? null,
        appearance: ch.appearance ?? '',
        languages: Array.isArray(ch.languages) ? ch.languages.slice() : [],
        otherProficiencies: ch.otherProficiencies ?? '',
        traits: ch.traits && typeof ch.traits === 'object' ? { ...ch.traits } : {},
        features: Array.isArray(ch.features)
            ? ch.features.map(f => ({ name: (f && f.name) || '', description: (f && (f.description || f.desc)) || '' }))
            : [],
        attacks: Array.isArray(ch.attacks) ? ch.attacks.map(a => ({ ...a })) : [],
        spellcasting: ch.spellcasting || null,
        createdAt: ch.createdAt || null,
        updatedAt: ch.updatedAt || null
    };
}

// ── Load: data/characters.json (remote) + localStorage overlay ──
function setStatus(kind, text) {
    const el = document.getElementById('cs-status');
    if (!el) return;
    el.textContent = text;
    el.className = 'cs-status ' + kind;
}

async function loadRoster() {
    localOverlay = loadLocal();
    setStatus('loading', 'Loading roster…');
    const localList = Object.values(localOverlay).map(normalizeChar);
    try {
        const res = await fetch(REGISTRY_URL);
        if (res.ok) {
            const data = await res.json();
            const registry = Array.isArray(data) ? data : (Array.isArray(data.characters) ? data.characters : []);
            const merged = [];
            const fetchIds = [];
            for (const entry of registry) {
                const id = String(entry.id || '');
                if (!id) continue;
                const file = String(entry.file || `characters/${id}.json`);
                let remoteChar = null;
                try {
                    const r = await fetch(new URL(file, new URL(REGISTRY_URL, window.location.href)));
                    if (r.ok) remoteChar = await r.json();
                } catch (e) { /* ignore per-file errors */ }
                if (remoteChar) {
                    fetchIds.push(id);
                    merged.push(localOverlay[id] ? { ...normalizeChar(remoteChar), ...localOverlay[id] } : normalizeChar(remoteChar));
                }
            }
            // keep local-only characters (created in browser but not yet saved into data folder)
            localList.forEach(c => {
                if (!fetchIds.includes(c.id) && !merged.some(m => m.id === c.id)) merged.push(c);
            });
            characters = merged.length ? merged : (localList.length ? localList : []);
            rosterSource = characters.length ? 'remote' : 'local';
            setStatus('ok', characters.length ? `Loaded ${characters.length} character file(s)` : 'No characters found');
            saveLocal();
            renderSlots();
            maybeAutoLaunch();
            return;
        }
    } catch (e) {
        /* registry fetch fails (e.g. file://) → fall back to local */
    }
    characters = localList;
    rosterSource = 'local';
    setStatus('ok', localList.length ? `Using browser storage (${localList.length})` : 'Using browser storage');
    renderSlots();
    maybeAutoLaunch();
}

// After the wizard's "Save Character" (sets pending_launch_id then redirects here),
// auto-launch the freshly created/edited character.
function maybeAutoLaunch() {
    const pending = localStorage.getItem('pending_launch_id');
    if (!pending) return;
    localStorage.removeItem('pending_launch_id');
    const id = pending;
    if (!characters.some(c => c.id === id)) return;
    if (typeof window.launchCharacter === 'function') {
        launchCharacter(id);
        if (typeof window.closeCharacterSelect === 'function') hideCharacterSelect();
    } else {
        window.location.href = 'index.html';
    }
}

async function reloadRoster() {
    localStorage.removeItem(STORAGE_KEY);
    await loadRoster();
}

function buildExportFiles() {
    const files = [];
    files.push({ path: 'data/characters.json', json: makeRegistryFile(characters) });
    characters.forEach(c => {
        files.push({ path: `data/${CHARACTER_DIR}/${c.id}.json`, json: makeCharacterFile(c) });
    });
    return files;
}

function exportRoster() {
    const files = buildExportFiles();
    const list = document.getElementById('cs-export-list');
    list.innerHTML = '';
    files.forEach(f => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:10px;';
        row.innerHTML = `<code style="color:var(--secondary);font-size:0.85rem;">${esc(f.path)}</code>`;
        const btn = document.createElement('button');
        btn.className = 'btn btn-ghost';
        btn.style.cssText = 'flex:0;padding:4px 10px;font-size:0.8rem;';
        btn.textContent = '⬇';
        btn.onclick = () => {
            downloadJson(f.path, JSON.stringify(f.json, null, 2));
            setStatus('ok', `Exported ${f.path}`);
        };
        row.appendChild(btn);
        list.appendChild(row);
    });
    document.getElementById('cs-export').classList.remove('hidden');
    setStatus('ok', 'Select a file to export');
}

function downloadAllExport() {
    buildExportFiles().forEach((f, i) => {
        window.setTimeout(() => {
            downloadJson(f.path, JSON.stringify(f.json, null, 2));
        }, i * 400);
    });
    setStatus('ok', `Exported ${characters.length} character file(s)`);
}

function closeExport() {
    document.getElementById('cs-export').classList.add('hidden');
}

// ── Render Slots ─────────────────────────────────────────
function discardDraft() {
    try { localStorage.removeItem('rpg_creator_draft'); } catch (e) { /* ignore */ }
    renderDraftCard();
    renderSlots();
}

// Renders the in-progress Guided Creator draft into its own dedicated section.
// The draft card is NOT a playable character and therefore cannot be launched.
function renderDraftCard() {
    const section = document.getElementById('cs-draft-section');
    const card = document.getElementById('cs-draft-card');
    if (!section || !card) return;
    let draftSnap = null;
    try {
        const raw = localStorage.getItem('rpg_creator_draft');
        draftSnap = raw ? JSON.parse(raw) : null;
    } catch (e) { draftSnap = null; }
    if (!(draftSnap && draftSnap.draftFields)) {
        section.classList.add('hidden');
        card.innerHTML = '';
        return;
    }
    const dName = (draftSnap.draftFields && draftSnap.draftFields.name) || 'In-progress draft';
    const dStep = Number(draftSnap.step) || 0;
    section.classList.remove('hidden');
    card.innerHTML = `
        <div class="cs-slot">
            <div class="cs-slot-header">
                <div class="cs-slot-name">✍️ Draft · ${esc(String(dName))}</div>
                <div class="cs-slot-level">Step ${dStep}/10</div>
            </div>
            <div class="cs-slot-meta"><span class="cs-tag race">In progress — not playable yet</span></div>
            <div class="cs-slot-actions" onclick="event.stopPropagation()">
                <button class="btn btn-phrase" onclick="openCreator()">✍️ Continue in Wizard</button>
                <button class="btn btn-delete" onclick="discardDraft()">Discard</button>
            </div>
        </div>`;
}

function renderSlots() {
    const container = document.getElementById('cs-slots');
    let html = '';
    characters.forEach((ch, idx) => {
        const mod = (score) => {
            const s = Number(score) || 10;
            const m = Math.floor((s - 10) / 2);
            return m >= 0 ? '+' + m : String(m);
        };
        const bgName = ch.background && typeof ch.background === 'object' ? ch.background.name : ch.background;
        html += `
        <div class="cs-slot" onclick="launchCharacter('${ch.id}')" data-id="${ch.id}">
            <div class="cs-slot-header">
                <div class="cs-slot-name">${esc(ch.name || 'Unnamed')}</div>
                <div class="cs-slot-level">Lv ${ch.level || 1}</div>
            </div>
            <div class="cs-slot-meta">
                ${ch.systemName || (ch.system ? 'System: ' + esc(ch.system) : '') ? `<span class="cs-tag class">${esc(ch.systemName || ch.system)}</span>` : ''}
                ${ch.race ? `<span class="cs-tag race">${esc(ch.race)}</span>` : ''}
                ${ch.class ? `<span class="cs-tag class">${esc(ch.class)}</span>` : ''}
                ${bgName ? `<span class="cs-tag background">${esc(String(bgName))}</span>` : ''}
            </div>
            <div class="cs-slot-stats">
                ${ABILITY_KEYS.map(k => `
                    <div class="cs-stat-mini">
                        <div class="cs-stat-mini-label">${k.toUpperCase()}</div>
                        <div class="cs-stat-mini-value">${ch.abilityScores?.[k] ?? 10} <span style="color:var(--secondary);font-size:0.75rem;">${mod(ch.abilityScores?.[k])}</span></div>
                    </div>
                `).join('')}
            </div>
            <div class="cs-slot-actions" onclick="event.stopPropagation()">
                <button class="btn btn-phrase" onclick="openCard('${ch.id}')">📇 Card</button>
                <button class="btn btn-phrase" onclick="openWizardEdit('${ch.id}')">🧙 Wizard</button>
                <button class="btn btn-phrase" onclick="openEditor('${ch.id}')">Edit</button>
                <button class="btn btn-delete" onclick="requestDelete('${ch.id}')">Delete</button>
                <button class="btn btn-launch" onclick="launchCharacter('${ch.id}')">Launch</button>
            </div>
        </div>`;
    });

    html += `
    <div class="cs-slot empty-slot" onclick="openCreator()">
        <div style="font-size:2rem; opacity:0.4;">+</div>
        <div style="color:var(--text-muted); font-weight:600;">New Character (Guided Creator)</div>
    </div>`;

    container.innerHTML = html;
    renderDraftCard();
}

// ── Editor ───────────────────────────────────────────────
function openEditor(id) {
    editingId = id;
    const overlay = document.getElementById('cs-editor-overlay');
    const title = document.getElementById('cs-editor-title');

    if (id) {
        const ch = characters.find(c => c.id === id);
        if (!ch) return;
        title.textContent = 'Edit Character';
        document.getElementById('cs-name').value = ch.name || '';
        document.getElementById('cs-level').value = ch.level || 1;
        document.getElementById('cs-race').value = ch.race || '';
        document.getElementById('cs-class').value = ch.class || '';
        const bgName = ch.background && typeof ch.background === 'object' ? ch.background.name : ch.background;
        document.getElementById('cs-background').value = bgName || '';
        document.getElementById('cs-alignment').value = ch.alignment || '';
        document.getElementById('cs-source').value = ch.dataSource || '';
        document.getElementById('cs-maxhp').value = ch.maxHp ?? '';
        document.getElementById('cs-ac').value = ch.ac ?? '';
        document.getElementById('cs-hitdice').value = (ch.hitDice && ch.hitDice.die) ? ch.hitDice.die : (typeof ch.hitDice === 'string' ? ch.hitDice : 'd10');
        document.getElementById('cs-notes').value = ch.notes || '';
        for (const k of ABILITY_KEYS) {
            const el = document.getElementById('cs-ability-' + k);
            if (el) {
                el.value = ch.abilityScores?.[k] ?? 10;
                updateAbilityMod(el, 'cs-mod-' + k);
            }
        }
    } else {
        title.textContent = 'New Character';
        document.getElementById('cs-name').value = '';
        document.getElementById('cs-level').value = 1;
        document.getElementById('cs-race').value = '';
        document.getElementById('cs-class').value = '';
        document.getElementById('cs-background').value = '';
        document.getElementById('cs-alignment').value = '';
        document.getElementById('cs-source').value = '';
        document.getElementById('cs-maxhp').value = '';
        document.getElementById('cs-ac').value = '';
        document.getElementById('cs-hitdice').value = 'd10';
        document.getElementById('cs-notes').value = '';
        for (const k of ABILITY_KEYS) {
            const el = document.getElementById('cs-ability-' + k);
            if (el) {
                el.value = 10;
                updateAbilityMod(el, 'cs-mod-' + k);
            }
        }
    }

    overlay.classList.remove('hidden');
}

function closeEditor() {
    document.getElementById('cs-editor-overlay').classList.add('hidden');
    editingId = null;
}

function saveRosterCharacter() {
    const name = document.getElementById('cs-name').value.trim();
    if (!name) {
        alert('Character name is required.');
        return;
    }

    const abilityScores = {};
    for (const k of ABILITY_KEYS) {
        const v = Number(document.getElementById('cs-ability-' + k).value);
        abilityScores[k] = (Number.isFinite(v) && v >= 1 && v <= 30) ? v : 10;
    }

    const level = Math.max(1, Math.min(20, Number(document.getElementById('cs-level').value) || 1));
    const maxHpRaw = document.getElementById('cs-maxhp').value;
    const acRaw = document.getElementById('cs-ac').value;
    const bgValue = document.getElementById('cs-background').value;
    const hitDie = document.getElementById('cs-hitdice').value;
    const prev = editingId ? characters.find(c => c.id === editingId) : null;

    const data = {
        id: editingId || 'char-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
        name,
        level,
        race: document.getElementById('cs-race').value,
        class: document.getElementById('cs-class').value,
        subclass: prev && prev.subclass ? prev.subclass : '',
        background: bgValue ? { name: bgValue, bonuses: (prev && prev.background && prev.background.bonuses) ? prev.background.bonuses : {} } : null,
        alignment: document.getElementById('cs-alignment').value,
        dataSource: document.getElementById('cs-source').value || null,
        proficiencyBonus: prev && prev.proficiencyBonus ? prev.proficiencyBonus : Math.ceil(level / 4) + 1,
        abilityScores,
        maxHp: maxHpRaw !== '' ? Number(maxHpRaw) : null,
        maxHpOverride: null,
        currentHp: maxHpRaw !== '' ? Number(maxHpRaw) : null,
        ac: acRaw !== '' ? Number(acRaw) : null,
        acOverride: null,
        hitDice: { die: hitDie, total: level, remaining: level },
        armor: prev ? prev.armor : null,
        speed: prev ? prev.speed : { walk: 30, fly: null, swim: null, climb: null },
        longbowHit: prev ? prev.longbowHit : null,
        longbowHitOverride: null,
        styles: prev ? prev.styles : {},
        savingThrows: prev ? prev.savingThrows : [],
        skills: prev ? prev.skills : [],
        feats: prev ? prev.feats : [],
        resources: prev ? prev.resources : {},
        gold: prev ? prev.gold : 0,
        inventory: prev
            ? prev.inventory
            : { gold: 0, notes: '', items: [], quickAccessIndices: [] },
        notes: document.getElementById('cs-notes').value,
        settings: prev ? prev.settings : {},
        // ★ Character-card data (preserve existing values when editing)
        system: prev ? prev.system : null,
        systemName: prev ? prev.systemName : null,
        appearance: prev ? prev.appearance : '',
        languages: prev ? prev.languages.slice() : [],
        otherProficiencies: prev ? prev.otherProficiencies : '',
        traits: prev && prev.traits && typeof prev.traits === 'object' ? { ...prev.traits } : {},
        features: Array.isArray(prev && prev.features)
            ? prev.features.map(f => ({ name: (f && f.name) || '', description: (f && (f.description || f.desc)) || '' }))
            : [],
        attacks: Array.isArray(prev && prev.attacks)
            ? prev.attacks.map(a => ({ ...a }))
            : [],
        spellcasting: prev ? prev.spellcasting : null,
        createdAt: prev ? prev.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    if (editingId) {
        const idx = characters.findIndex(c => c.id === editingId);
        if (idx !== -1) characters[idx] = data;
    } else {
        characters.push(data);
    }

    saveLocal();
    renderSlots();
    closeEditor();
    setStatus('ok', rosterSource === 'remote' ? 'Loaded from data folder · unsaved local edits (⬇ Export to persist)' : 'Using browser storage');
    // Auto-export the character as its own file + an updated registry, so it's easy to
    // keep data/characters/<id>.json as a separate, transferable file.
    downloadJson(`data/characters/${data.id}.json`, JSON.stringify(makeCharacterFile(data), null, 2));
    downloadJson('data/characters.json', JSON.stringify(makeRegistryFile(characters), null, 2));
}

// ── Delete ───────────────────────────────────────────────
function requestDelete(id) {
    const ch = characters.find(c => c.id === id);
    if (!ch) return;
    document.getElementById('cs-confirm-msg').textContent = `Delete "${ch.name}"? This cannot be undone.`;
    document.getElementById('cs-confirm').classList.remove('hidden');
    pendingConfirm = () => {
        characters = characters.filter(c => c.id !== id);
        saveLocal();
        renderSlots();
    };
}

function confirmAction() {
    if (pendingConfirm) pendingConfirm();
    closeConfirm();
}

function closeConfirm() {
    document.getElementById('cs-confirm').classList.add('hidden');
    pendingConfirm = null;
}

// ── Launch (merged: load into running app, no redirect) ──
function launchCharacter(id) {
    const ch = characters.find(c => c.id === id);
    if (!ch) return;
    // Save as active character and load into the merged app (legacy-compatible payload)
    localStorage.setItem('active_character_id', ch.id);
    localStorage.setItem('character.player-1', JSON.stringify({
        id: ch.id,
        name: ch.name,
        level: ch.level,
        dataSource: ch.dataSource || null,
        currentHp: ch.currentHp ?? ch.maxHp ?? null,
        maxHp: ch.maxHp ?? null,
        maxHpOverride: ch.maxHpOverride ?? null,
        ac: ch.ac ?? null,
        acOverride: ch.acOverride ?? null,
        longbowHit: ch.longbowHit ?? null,
        longbowHitOverride: ch.longbowHitOverride ?? null,
        armor: ch.armor ?? null,
        styles: ch.styles || {},
        gold: ch.gold || 0,
        inventory: ch.inventory || { gold: ch.gold || 0, notes: '', items: [], quickAccessIndices: [] },
        resources: ch.resources || {},
        abilities: ch.abilityScores || {},
        background: ch.background || null,
        notes: ch.notes || '',
        feats: ch.feats || []
    }));
    if (typeof window.switchCharacter === 'function') {
        window.switchCharacter({
            id: ch.id,
            name: ch.name,
            level: ch.level,
            dataSource: ch.dataSource || null,
            currentHp: ch.currentHp ?? ch.maxHp ?? null,
            maxHp: ch.maxHp ?? null,
            maxHpOverride: ch.maxHpOverride ?? null,
            ac: ch.ac ?? null,
            acOverride: ch.acOverride ?? null,
            longbowHit: ch.longbowHit ?? null,
            longbowHitOverride: ch.longbowHitOverride ?? null,
            armor: ch.armor ?? null,
            styles: ch.styles || {},
            gold: ch.gold || 0,
            inventory: ch.inventory || { gold: ch.gold || 0, notes: '', items: [], quickAccessIndices: [] },
            resources: ch.resources || {},
            abilities: ch.abilityScores || {},
            background: ch.background || null,
            notes: ch.notes || '',
            feats: ch.feats || []
        });
        hideCharacterSelect();
        // Open the roleplay panel first per user choice; flip to battle via the toggle button.
        if (typeof window.togglePageFlip === 'function') {
            window.togglePageFlip(true);
        }
    } else {
        window.location.href = 'index.html';
    }
}

// ── Screen management ────────────────────────────────────
function openCreator() {
    window.location.href = 'character-creator.html';
}

function openWizardEdit(id) {
    window.location.href = 'character-creator.html?edit=' + encodeURIComponent(id);
}

function openCard(id) {
    window.location.href = 'character-card.html?id=' + encodeURIComponent(id);
}

function openActiveCard() {
    const id = localStorage.getItem('active_character_id') || (window.character && window.character.data ? window.character.data.id : null);
    if (id) window.location.href = 'character-card.html?id=' + encodeURIComponent(id);
}

function showCharacterSelect() {
    const screen = document.getElementById('character-select-screen');
    if (screen) screen.classList.remove('hidden');
    loadRoster();
}

function hideCharacterSelect() {
    const screen = document.getElementById('character-select-screen');
    if (screen) screen.classList.add('hidden');
}

// ── Helpers ──────────────────────────────────────────────
function updateAbilityMod(input, modId) {
    const v = Number(input.value) || 10;
    const mod = Math.floor((v - 10) / 2);
    const el = document.getElementById(modId);
    if (el) el.textContent = mod >= 0 ? '+' + mod : String(mod);
}

function esc(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
}

export function initializeCharacterSelect() {
    // Expose global helpers used by inline handlers in the ported markup.
    window.reloadRoster = reloadRoster;
    window.exportRoster = exportRoster;
    window.openEditor = openEditor;
    window.closeEditor = closeEditor;
    window.saveRosterCharacter = saveRosterCharacter;
    window.requestDelete = requestDelete;
    window.confirmAction = confirmAction;
    window.closeConfirm = closeConfirm;
    window.closeExport = closeExport;
    window.downloadAllExport = downloadAllExport;
    window.updateAbilityMod = updateAbilityMod;
    window.launchCharacter = launchCharacter;
    window.openCharacterSelect = showCharacterSelect;
    window.closeCharacterSelect = hideCharacterSelect;
    window.openCreator = openCreator;
    window.openWizardEdit = openWizardEdit;
    window.openCard = openCard;
    window.openActiveCard = openActiveCard;
    window.discardDraft = discardDraft;
    loadRoster();
}