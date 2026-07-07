import { createBattleApp } from './battle.js';
import { Character } from './character.js';
import { initializeKeywordTooltips } from './tooltip.js';
import {
    initializeManualButtons,
    openManualPopup,
    closeManualPopup,
    clearManualPopup,
    calculateManualScenario,
    recordManualMiss,
    computeActualAttack,
    recordActualMiss,
    computeActualDamage,
    rollSecondWind,
    rollRanged,
    rollMeleeCombo,
    setManualScenario,
    selectManualField,
    setManualDiceValue,
    updateManualFieldsVisibility
} from './manual.js';
import { initializePopupInteractionHandlers, bringElementToFront } from './utils.js';

let character = null;

function exposeBattleHelpers(viewModel) {
    window.modHP = (amt) => viewModel.modHP(amt);
    window.copyText = (txt) => viewModel.copyText(txt);
    window.appendLog = (html) => viewModel.appendLog(html);
    window.log = (msg) => viewModel.log(msg);
    window.clearLog = () => viewModel.clearLog();
    window.exportLog = () => viewModel.exportLog();
    window.toggleLogMinimize = (event) => viewModel.toggleLogMinimize(event);
    window.startLogDrag = (event) => viewModel.startLogDrag(event);
    window.stopLogDrag = () => viewModel.stopLogDrag();
    window.dragLog = (event) => viewModel.dragLog(event);
    window.battleApp = viewModel;
}

function exposeManualHelpers() {
    window.initializeManualButtons = initializeManualButtons;
    window.openManualPopup = openManualPopup;
    window.closeManualPopup = closeManualPopup;
    window.clearManualPopup = clearManualPopup;
    window.calculateManualScenario = calculateManualScenario;
    window.recordManualMiss = recordManualMiss;
    window.computeActualAttack = computeActualAttack;
    window.recordActualMiss = recordActualMiss;
    window.computeActualDamage = computeActualDamage;
    window.rollSecondWind = rollSecondWind;
    window.rollRanged = rollRanged;
    window.rollMeleeCombo = rollMeleeCombo;
    window.setManualScenario = setManualScenario;
    window.selectManualField = selectManualField;
    window.setManualDiceValue = setManualDiceValue;
    window.updateManualFieldsVisibility = updateManualFieldsVisibility;
}

function renderCharacterSetupForm() {
    const activeCharacter = window.character || character;
    if (!activeCharacter) return;
    const st = activeCharacter.getState();
    const nameEl = document.getElementById('settings-char-name');
    const levelEl = document.getElementById('settings-char-level');
    if (nameEl) nameEl.value = st.name || '';
    if (levelEl) levelEl.value = st.level ?? 1;
    for (const key of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
        const el = document.getElementById(`settings-ability-${key}`);
        if (el) {
            const value = Number(st.abilities?.[key] ?? activeCharacter._baseAbilities?.[key] ?? 10);
            el.value = Number.isFinite(value) ? value : 10;
        }
    }
}

function applyCharacterSetupFromForm() {
    const activeCharacter = window.character || character;
    if (!activeCharacter) return false;
    const nameEl = document.getElementById('settings-char-name');
    const levelEl = document.getElementById('settings-char-level');
    const abilityValues = {};
    for (const key of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
        const el = document.getElementById(`settings-ability-${key}`);
        if (!el) continue;
        const value = Number(el.value);
        if (!Number.isFinite(value) || value < 1 || value > 30) {
            alert(`${key.toUpperCase()} 的數值必須介於 1 到 30。`);
            return false;
        }
        abilityValues[key] = value;
    }
    if (nameEl && nameEl.value) {
        activeCharacter.set('name', nameEl.value);
    }
    if (levelEl) {
        const level = Number(levelEl.value);
        if (!Number.isFinite(level) || level < 1 || level > 20) {
            alert('等級必須介於 1 到 20。');
            return false;
        }
        activeCharacter.set('level', level);
    }
    if (Object.keys(abilityValues).length) {
        activeCharacter.setBaseAbilities?.(abilityValues);
    }
    window.renderSettingsSummary?.();
    renderCharacterSetupForm();
    return true;
}

function resetCharacterSetupForm() {
    renderCharacterSetupForm();
}

function markResourceTracker(resourceKey) {
    // prefer grouped checkboxes (multiple charges)
    const group = document.querySelector(`.checkbox-group[data-resource-group="${resourceKey}"]`);
    if (group) {
        const boxes = Array.from(group.querySelectorAll('input[type="checkbox"]'));
        const target = boxes.find((box) => !box.checked);
        if (!target) return false;
        target.checked = true;
        return true;
    }
    // fallback: single checkbox with the data attribute on the input itself
    const single = document.querySelector(`input[type="checkbox"][data-resource-group="${resourceKey}"]`);
    if (single && !single.checked) {
        single.checked = true;
        return true;
    }
    return false;
}
// expose to other modules / inline handlers so manual.js can call it
window.markResourceTracker = markResourceTracker;

function handleTrackedButtonClick(event) {
    const button = event.target.closest('button[data-track-resource]');
    if (!button) return;
    const resourceKey = button.dataset.trackResource;
    if (!resourceKey) return;
    const marked = markResourceTracker(resourceKey);
    if (marked) {
        const label = {
            secondwind: '回氣',
            'action-surge': '動作如潮',
            unyielding: '不屈重投'
        }[resourceKey] || resourceKey;
        window.appendLog?.(`<span style="color:var(--secondary)">[資源] 已記錄：${label}</span>`);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    // create character and hydrate battle initial state
    const saved = Character.load?.() ?? null;
    character = saved ?? new Character();
    const battleApp = createBattleApp(character.getState());
    exposeBattleHelpers(battleApp);
    // expose the character object so UI can bind to it
    window.character = character;
    window.setCharacter = (key, value) => character.set(key, value);
    window.saveCharacter = () => character.save();
    // expose file export/import helpers
    window.exportCharacterToFile = (filename) => character.exportToFile?.(filename);
    window.importCharacterFile = async (fileOrFileList) => {
        const file = fileOrFileList?.files ? fileOrFileList.files[0] : (fileOrFileList?.[0] || fileOrFileList);
        if (!file) return Promise.reject(new Error('No file provided'));
        await character.loadFromFile(file);
        // update battle view with new character state
        if (battleApp && battleApp.model && battleApp.view) {
            const nextState = character.getState();
            battleApp.model.state.maxHp = nextState.maxHp;
            battleApp.model.state.currentHp = nextState.currentHp;
            battleApp.model.state.ac = nextState.ac;
            battleApp.model.state.longbowHit = nextState.longbowHit;
            battleApp.view.render(battleApp.model.getSnapshot());
        }
        return true;
    };
    function openSettingsPopup() {
        const overlay = document.getElementById('settings-overlay');
        if (!overlay) return;
        // clear any inline 'display' that may have been set when closing
        try { overlay.style.display = ''; } catch (e) {}
        overlay.classList.remove('hidden');
        bringElementToFront(overlay);
        // populate character summary inside the popup
        try {
            const summary = document.getElementById('settings-character-summary');
            if (summary && character) {
                const st = character.getState();
                const map = {
                    str: '力量 (STR)',
                    dex: '敏捷 (DEX)',
                    con: '體質 (CON)',
                    int: '智力 (INT)',
                    wis: '感知 (WIS)',
                    cha: '魅力 (CHA)'
                };
                let abilitiesHtml = '';
                if (st.abilities) {
                    for (const k of ['str','dex','con','int','wis','cha']) {
                        const score = st.abilities[k];
                        const mod = character.abilityModifier?.(score) ?? Math.floor((score-10)/2);
                        const sign = mod >= 0 ? '+'+mod : mod;
                        const formula = character.abilityFormula?.(score) ?? `${score} → ${sign}`;
                        abilitiesHtml += `<div style="margin-bottom:6px;"><strong>${map[k]}:</strong> ${score} (<span style="color:var(--secondary);">${sign}</span>) <div style="font-size:0.85rem; color:var(--text-muted);">${formula}</div></div>`;
                    }
                }
                    renderSettingsSummary();
            }
            renderCharacterSetupForm();
        } catch (e) { /* ignore */ }
    }

        function renderSettingsSummary() {
            const summary = document.getElementById('settings-character-summary');
            if (!summary || !character) return;
            const st = character.getState();
            const map = {
                str: '力量 (STR)',
                dex: '敏捷 (DEX)',
                con: '體質 (CON)',
                int: '智力 (INT)',
                wis: '感知 (WIS)',
                cha: '魅力 (CHA)'
            };
            const bonuses = (st.background && st.background.bonuses) ? st.background.bonuses : {};
            let abilitiesHtml = '';
            for (const k of ['str','dex','con','int','wis','cha']) {
                const base = character._baseAbilities?.[k] ?? st.abilities?.[k] ?? 0;
                const bonus = Number(bonuses?.[k] || 0);
                const total = Number(st.abilities?.[k] ?? base) ;
                const displayTotal = total;
                const mod = character.abilityModifier?.(displayTotal) ?? Math.floor((displayTotal-10)/2);
                const sign = mod >= 0 ? '+'+mod : mod;
                const bonusHtml = bonus ? `<span style="color:var(--success); margin-left:6px;">+${bonus}</span>` : '';
                const formula = character.abilityFormula?.(displayTotal) ?? `${displayTotal} → ${sign}`;
                abilitiesHtml += `<div style="margin-bottom:6px;"><strong>${map[k]}:</strong> ${displayTotal} ${bonusHtml} (<span style="color:var(--secondary);">${sign}</span>) <div style="font-size:0.85rem; color:var(--text-muted);">${formula}</div></div>`;
            }
            const bgLine = st.background && st.background.name ? `<div style="margin-bottom:8px;"><strong>背景：</strong>${st.background.name} ${st.background.bonuses ? JSON.stringify(st.background.bonuses) : ''}</div>` : '';
            summary.innerHTML = `姓名: ${st.name || '--'}<br>等級: ${st.level ?? '--'}<br>生命: ${st.currentHp}/${st.maxHp}<br>AC: ${st.ac}<br>長弓命中: ${st.longbowHit >= 0 ? '+'+st.longbowHit : st.longbowHit}` + (bgLine ? `<br>${bgLine}<hr style="border:none;border-top:1px solid rgba(255,255,255,0.04);margin:8px 0;">` : '<hr style="border:none;border-top:1px solid rgba(255,255,255,0.04);margin:8px 0;">') + abilitiesHtml;
            // set selector to current background if present
            try {
                const sel = document.getElementById('settings-background-select');
                if (sel) {
                    const bgName = st.background && st.background.name ? String(st.background.name) : '';
                    let matched = false;
                    if (bgName) {
                        const lowered = bgName.toLowerCase();
                        for (const opt of Array.from(sel.options)) {
                            const val = (opt.value || '').toString().toLowerCase();
                            const txt = (opt.textContent || '').toString().toLowerCase();
                            if (val && val === lowered) { sel.value = opt.value; matched = true; break; }
                            if (txt && txt.includes(lowered)) { sel.value = opt.value; matched = true; break; }
                            if (lowered.includes(val) && val.length > 0) { sel.value = opt.value; matched = true; break; }
                        }
                    }
                    if (!matched) sel.value = '';
                }
            } catch (e) { }
        }

    function closeSettingsPopup(event) {
        const overlay = document.getElementById('settings-overlay');
        if (event && event.target !== overlay) {
            // ignore clicks that are not the backdrop
            return;
        }
        if (!overlay) return;
        overlay.classList.add('hidden');
        try { overlay.style.display = 'none'; } catch (e) {}
    }

    function renderDerivedStatsText() {
        if (!character) return;
        const st = character.getState();
        const longbowEl = document.getElementById('summary-longbow-hit');
        const acEl = document.getElementById('summary-ac');
        const maxHpEl = document.getElementById('summary-max-hp');
        const hpMaxLabelEl = document.getElementById('hp-max-label');
        const maxHpDisplayEl = document.getElementById('max-hp-display');
        const acDisplayEl = document.getElementById('stat-ac');
        if (longbowEl) longbowEl.textContent = `${st.longbowHit >= 0 ? '+' : ''}${st.longbowHit ?? '--'}`;
        if (acEl) acEl.textContent = st.ac ?? '--';
        if (maxHpEl) maxHpEl.textContent = st.maxHp ?? '--';
        if (hpMaxLabelEl) hpMaxLabelEl.textContent = st.maxHp ?? '--';
        if (maxHpDisplayEl) maxHpDisplayEl.textContent = st.maxHp ?? '--';
        if (acDisplayEl) acDisplayEl.textContent = st.ac ?? '--';
    }

    function renderCharPanelSummary() {
        const container = document.getElementById('char-panel-stats');
        if (!container || !character) return;
        const st = character.getState();
        const abilities = st.abilities || {};
        const name = st.name || '--';
        const level = st.level ?? '--';
        const currHp = st.currentHp ?? '--';
        const maxHp = st.maxHp ?? '--';
        const ac = st.ac ?? '--';
        const longbow = (st.longbowHit >= 0) ? `+${st.longbowHit}` : (st.longbowHit ?? '--');
        const abMap = { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' };

        // compute formulas for tooltips
        const conScore = Number(st.abilities?.con ?? character._baseAbilities?.con ?? 10);
        const conMod = character.abilityModifier?.(conScore) ?? Math.floor((conScore - 10) / 2);
        const hpFormula = `${10} + (${conMod}) + ${Math.max(0, level - 1)} * (${6} + ${conMod}) = ${maxHp}`;
        const dexScore = Number(st.abilities?.dex ?? character._baseAbilities?.dex ?? 10);
        const dexMod = character.abilityModifier?.(dexScore) ?? Math.floor((dexScore - 10) / 2);
        const acFormula = `14 + (${dexMod}) + 2 = ${ac}`;
        const prof = character.getProficiencyBonus?.(level) ?? character.getProficiencyBonus(level);
        const longbowFormula = `${prof} (熟練) + (${dexMod}) + 5 = ${longbow}`;

        let html = '';
        html += `<div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:8px;">
            <div style="font-weight:700; font-size:1rem; color:var(--text-main);">${name} <span style="font-weight:500; color:var(--text-muted); font-size:0.9rem;">(Lv ${level})</span></div>
            <div style="text-align:right; font-size:0.9rem; color:var(--text-muted);">
                HP: <strong class="keyword" data-tooltip="${hpFormula}" style="color:var(--success);">${currHp}/${maxHp}</strong>
                <div style="margin-top:4px;">AC: <strong class="keyword" data-tooltip="${acFormula}" style="color:var(--primary);">${ac}</strong> · 長弓: <strong class="keyword" data-tooltip="${longbowFormula}" style="color:var(--secondary);">${longbow}</strong></div>
            </div>
        </div>`;

        html += `<div style="display:flex; gap:8px; flex-wrap:wrap;">`;
        for (const k of ['str','dex','con','int','wis','cha']) {
            const sc = Number(abilities[k] ?? 0);
            const mod = character.abilityModifier?.(sc) ?? Math.floor((sc-10)/2);
            const sign = (mod >= 0) ? `+${mod}` : `${mod}`;
            const formulaText = (typeof character.abilityFormula === 'function') ? character.abilityFormula(sc) : `${sc} → ${sign}`;
            html += `<div class="keyword" data-tooltip="${formulaText}" style="background:var(--bg-card); border:1px solid var(--border-color); padding:6px 8px; border-radius:8px; min-width:72px; text-align:center; font-weight:700;">
                <div style="font-size:0.85rem; color:var(--text-muted);">${abMap[k]}</div>
                <div style="font-size:1rem; margin-top:4px;">${sc} <span style="color:var(--secondary); font-weight:600;">${sign}</span></div>
            </div>`;
        }
        html += `</div>`;

        container.innerHTML = html;
        try { initializeKeywordTooltips(); } catch (e) { /* ignore */ }
        // update individual stat elements if present
        try {
            const statLong = document.getElementById('stat-longbow'); if (statLong) statLong.textContent = (st.longbowHit >= 0 ? '+'+st.longbowHit : st.longbowHit);
            const statAc = document.getElementById('stat-ac'); if (statAc) statAc.textContent = String(st.ac);
            const currHp = document.getElementById('curr-hp'); if (currHp) currHp.textContent = String(st.currentHp);
        } catch (e) {}
    }

    renderDerivedStatsText();
    window.openSettingsPopup = openSettingsPopup;
    window.closeSettingsPopup = closeSettingsPopup;
    window.applyCharacterSetupFromForm = applyCharacterSetupFromForm;
    window.resetCharacterSetupForm = resetCharacterSetupForm;
    window.renderSettingsSummary = renderSettingsSummary;
    window.renderCharacterSetupForm = renderCharacterSetupForm;
    // background helpers
    window.applyBackground = (name, bonuses) => character.applyBackground?.(name, bonuses);
    window.fetchBackgroundBonuses = async (name) => character.fetchBackgroundBonusesFromSite ? await character.fetchBackgroundBonusesFromSite(name) : null;
    window.applyBackgroundByName = async (name) => {
        if (!character) return null;
        if (character.applyBackgroundByName) return await character.applyBackgroundByName(name);
        return null;
    };
    // setup import dropzone (drag & drop support)
    try {
        const dz = document.getElementById('import-dropzone');
        const fileInput = document.getElementById('settings-char-import-file');
        if (dz) {
            dz.addEventListener('dragover', (ev) => { ev.preventDefault(); dz.classList.add('drag-over'); });
            dz.addEventListener('dragleave', () => { dz.classList.remove('drag-over'); });
            dz.addEventListener('drop', (ev) => {
                ev.preventDefault(); dz.classList.remove('drag-over');
                const file = ev.dataTransfer?.files?.[0];
                if (file) {
                    importCharacterFile(file).then(() => {
                        const overlay = document.getElementById('settings-overlay');
                        if (overlay) { overlay.classList.add('hidden'); overlay.style.display='none'; }
                    }).catch(err => alert('匯入失敗：' + (err.message || err)));
                }
            });
        }
        if (fileInput) {
            fileInput.addEventListener('change', (ev) => {
                const f = ev.target.files?.[0];
                if (f) {
                    // keep file, user presses 匯入 to trigger
                }
            });
        }
    } catch (e) { /* ignore */ }
    // keep battle view in sync when character changes
    character.onChange((state) => {
        if (battleApp && battleApp.model && battleApp.view) {
            battleApp.model.state.maxHp = state.maxHp;
            battleApp.model.state.currentHp = state.currentHp;
            battleApp.model.state.ac = state.ac;
            battleApp.model.state.longbowHit = state.longbowHit;
            battleApp.view.render(battleApp.model.getSnapshot());
        }
        // if the settings popup is open, re-render the summary so background/abilities update live
        try {
            const overlay = document.getElementById('settings-overlay');
            if (overlay && !overlay.classList.contains('hidden')) {
                renderSettingsSummary();
                renderCharacterSetupForm();
            }
        } catch (e) {}
        try { renderDerivedStatsText(); } catch (e) {}
        try { renderCharPanelSummary(); } catch (e) {}
    });
    exposeManualHelpers();
    document.addEventListener('click', handleTrackedButtonClick);
    window.renderSettingsSummary = renderSettingsSummary;
    window.renderCharacterSetupForm = renderCharacterSetupForm;
    window.applyCharacterSetupFromForm = applyCharacterSetupFromForm;
    window.resetCharacterSetupForm = resetCharacterSetupForm;
    initializeManualButtons();
    initializeKeywordTooltips();
    initializePopupInteractionHandlers();
    // initial render for char panel
    try { renderCharPanelSummary(); } catch (e) {}
});
