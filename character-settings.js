import { initializeKeywordTooltips } from './tooltip.js';
import { bringElementToFront } from './utils.js';

const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

export function initializeCharacterSettings({
    getCharacter,
    getBattleApp,
    importCharacterFile,
    appendLog
}) {
    function getActiveCharacter() {
        return getCharacter?.() ?? window.character ?? null;
    }

    function renderCharacterSetupForm() {
        const activeCharacter = getActiveCharacter();
        if (!activeCharacter) return;
        const st = activeCharacter.getState();
        const nameEl = document.getElementById('settings-char-name');
        const levelEl = document.getElementById('settings-char-level');
        if (nameEl) nameEl.value = st.name || '';
        if (levelEl) levelEl.value = st.level ?? 1;
        for (const key of ABILITY_KEYS) {
            const el = document.getElementById(`settings-ability-${key}`);
            if (el) {
                const value = Number(st.abilities?.[key] ?? activeCharacter._baseAbilities?.[key] ?? 10);
                el.value = Number.isFinite(value) ? value : 10;
            }
        }
    }

    function applyCharacterSetupFromForm() {
        const activeCharacter = getActiveCharacter();
        if (!activeCharacter) return false;
        const nameEl = document.getElementById('settings-char-name');
        const levelEl = document.getElementById('settings-char-level');
        const abilityValues = {};
        for (const key of ABILITY_KEYS) {
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
        const group = document.querySelector(`.checkbox-group[data-resource-group="${resourceKey}"]`);
        if (group) {
            const boxes = Array.from(group.querySelectorAll('input[type="checkbox"]'));
            const target = boxes.find((box) => !box.checked);
            if (!target) return false;
            target.checked = true;
            return true;
        }
        const single = document.querySelector(`input[type="checkbox"][data-resource-group="${resourceKey}"]`);
        if (single && !single.checked) {
            single.checked = true;
            return true;
        }
        return false;
    }

    function restoreTrackerResource(resourceKey, mode = 'short') {
        const row = document.querySelector(`.tracker-row[data-resource="${resourceKey}"]`) || document.querySelector(`.tracker-row input[data-resource-group="${resourceKey}"]`)?.closest('.tracker-row');
        if (!row) return false;
        const boxes = Array.from(row.querySelectorAll('input[type="checkbox"]'));
        if (!boxes.length) return false;
        if (mode === 'long' && resourceKey === 'lucky') {
            return false;
        }
        const shouldRestoreAll = mode === 'long';
        const shouldResetActionSurgeOnly = mode === 'short' && resourceKey === 'action-surge';
        let changed = false;
        boxes.forEach((box) => {
            if (shouldRestoreAll || shouldResetActionSurgeOnly) {
                if (box.checked) {
                    box.checked = false;
                    changed = true;
                }
            }
        });
        if (!changed) return false;
        const label = getTrackerLabel(resourceKey, row);
        const state = getTrackerState(resourceKey, row);
        const suffix = state ? `（剩餘 ${state.remaining} 點）` : '';
        const actionLabel = mode === 'long' ? '已長休恢復' : '已短休恢復';
        appendLog?.(`<span style="color:var(--secondary)">[資源] ${actionLabel}：${label}${suffix}</span>`);
        return true;
    }

    function restoreAllTrackerResources(mode = 'short') {
        const rows = Array.from(document.querySelectorAll('.tracker-row'));
        let changed = false;
        rows.forEach((row) => {
            const resourceKey = row.dataset.resource || row.querySelector('input[data-resource-group]')?.dataset.resourceGroup || null;
            if (!resourceKey) return;
            if (restoreTrackerResource(resourceKey, mode)) {
                changed = true;
            }
        });
        return changed;
    }

    function getTrackerLabel(resourceKey, row) {
        const labelMap = {
            secondwind: '回氣',
            'action-surge': '動作如潮',
            unyielding: '不屈重投',
            lucky: '幸運點',
            'heroic-inspiration': '英雄激勵'
        };
        if (resourceKey && labelMap[resourceKey]) return labelMap[resourceKey];
        if (row) {
            const text = (row.textContent || '').replace(/\s+/g, ' ').trim();
            if (text.includes('回氣')) return '回氣';
            if (text.includes('動作如潮')) return '動作如潮';
            if (text.includes('不屈重投')) return '不屈重投';
            if (text.includes('Lucky')) return '幸運點';
            if (text.includes('英雄激勵')) return '英雄激勵';
        }
        return resourceKey || '資源';
    }

    function getTrackerState(resourceKey, row) {
        const targetRow = row || document.querySelector(`.tracker-row[data-resource="${resourceKey}"]`) || document.querySelector(`.tracker-row input[data-resource-group="${resourceKey}"]`)?.closest('.tracker-row');
        if (!targetRow) return null;
        const boxes = Array.from(targetRow.querySelectorAll('input[type="checkbox"]'));
        if (!boxes.length) return null;
        const checked = boxes.filter((box) => box.checked).length;
        const total = boxes.length;
        return { total, checked, remaining: Math.max(0, total - checked) };
    }

    function handleTrackedButtonClick(event) {
        const button = event.target.closest('button[data-track-resource]');
        if (!button) return;
        const resourceKey = button.dataset.trackResource;
        if (!resourceKey) return;
        const marked = markResourceTracker(resourceKey);
        if (marked) {
            const label = getTrackerLabel(resourceKey);
            const state = getTrackerState(resourceKey);
            const suffix = state ? `（剩餘 ${state.remaining} 點）` : '';
            appendLog?.(`<span style="color:var(--secondary)">[資源] 已記錄：${label}${suffix}</span>`);
        }
    }

    function handleTrackerRestButtonClick(event) {
        const button = event.target.closest('button[data-rest-resource], button[data-rest-mode]');
        if (!button) return;
        const resourceKey = button.dataset.restResource || null;
        const mode = button.dataset.restMode || 'short';
        const actionLabel = mode === 'long' ? '已長休' : '已短休';
        const targetLabel = mode === 'short'
            ? (resourceKey ? getTrackerLabel(resourceKey) : '動作如潮')
            : (resourceKey ? getTrackerLabel(resourceKey) : '所有可恢復資源');
        appendLog?.(`<span style="color:var(--secondary)">[資源] ${actionLabel}：${targetLabel}</span>`);
        if (mode === 'short') {
            restoreTrackerResource(resourceKey || 'action-surge', mode);
        } else if (resourceKey) {
            restoreTrackerResource(resourceKey, mode);
        } else {
            restoreAllTrackerResources(mode);
        }
    }

    function handleTrackerCheckboxChange(event) {
        const checkbox = event.target.closest ? event.target.closest('input[type="checkbox"]') : event.target;
        if (!checkbox) return;
        const row = checkbox.closest('.tracker-row');
        if (!row) return;
        const resourceKey = row.dataset.resource || checkbox.dataset.resourceGroup || null;
        const label = getTrackerLabel(resourceKey, row);
        const state = getTrackerState(resourceKey, row);
        const action = checkbox.checked ? '已記錄' : '已取消';
        const suffix = state ? `（剩餘 ${state.remaining} 點）` : '';
        appendLog?.(`<span style="color:var(--secondary)">[資源] ${action}：${label}${suffix}</span>`);
    }

    function openSettingsPopup() {
        const overlay = document.getElementById('settings-overlay');
        if (!overlay) return;
        try { overlay.style.display = ''; } catch (e) {}
        overlay.classList.remove('hidden');
        bringElementToFront(overlay);
        try {
            const summary = document.getElementById('settings-character-summary');
            if (summary && getActiveCharacter()) {
                const st = getActiveCharacter().getState();
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
                    for (const k of ABILITY_KEYS) {
                        const score = st.abilities[k];
                        const mod = getActiveCharacter().abilityModifier?.(score) ?? Math.floor((score - 10) / 2);
                        const sign = mod >= 0 ? '+' + mod : mod;
                        const formula = getActiveCharacter().abilityFormula?.(score) ?? `${score} → ${sign}`;
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
        const activeCharacter = getActiveCharacter();
        if (!summary || !activeCharacter) return;
        const st = activeCharacter.getState();
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
        for (const k of ABILITY_KEYS) {
            const base = activeCharacter._baseAbilities?.[k] ?? st.abilities?.[k] ?? 0;
            const bonus = Number(bonuses?.[k] || 0);
            const total = Number(st.abilities?.[k] ?? base);
            const mod = activeCharacter.abilityModifier?.(total) ?? Math.floor((total - 10) / 2);
            const sign = mod >= 0 ? '+' + mod : mod;
            const bonusHtml = bonus ? `<span style="color:var(--success); margin-left:6px;">+${bonus}</span>` : '';
            const formula = activeCharacter.abilityFormula?.(total) ?? `${total} → ${sign}`;
            abilitiesHtml += `<div style="margin-bottom:6px;"><strong>${map[k]}:</strong> ${total} ${bonusHtml} (<span style="color:var(--secondary);">${sign}</span>) <div style="font-size:0.85rem; color:var(--text-muted);">${formula}</div></div>`;
        }
        const bgLine = st.background && st.background.name ? `<div style="margin-bottom:8px;"><strong>背景：</strong>${st.background.name} ${st.background.bonuses ? JSON.stringify(st.background.bonuses) : ''}</div>` : '';
        summary.innerHTML = `姓名: ${st.name || '--'}<br>等級: ${st.level ?? '--'}<br>生命: ${st.currentHp}/${st.maxHp}<br>AC: ${st.ac}<br>長弓命中: ${st.longbowHit >= 0 ? '+' + st.longbowHit : st.longbowHit}` + (bgLine ? `<br>${bgLine}<hr style="border:none;border-top:1px solid rgba(255,255,255,0.04);margin:8px 0;">` : '<hr style="border:none;border-top:1px solid rgba(255,255,255,0.04);margin:8px 0;">') + abilitiesHtml;
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
            return;
        }
        if (!overlay) return;
        overlay.classList.add('hidden');
        try { overlay.style.display = 'none'; } catch (e) {}
    }

    function refreshDynamicTooltips() {
        const activeCharacter = getActiveCharacter();
        if (!activeCharacter) return;
        document.querySelectorAll('.keyword[data-tooltip-key]').forEach((el) => {
            const key = el.dataset.tooltipKey;
            const text = activeCharacter.getTooltipText?.(key) || el.dataset.tooltip;
            if (text) {
                el.dataset.tooltip = text;
            }
        });
    }

    function renderDerivedStatsText() {
        const activeCharacter = getActiveCharacter();
        if (!activeCharacter) return;
        const st = activeCharacter.getState();
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
        const activeCharacter = getActiveCharacter();
        if (!container || !activeCharacter) return;
        const st = activeCharacter.getState();
        const abilities = st.abilities || {};
        const name = st.name || '--';
        const level = st.level ?? '--';
        const currHp = st.currentHp ?? '--';
        const maxHp = st.maxHp ?? '--';
        const ac = st.ac ?? '--';
        const longbow = (st.longbowHit >= 0) ? `+${st.longbowHit}` : (st.longbowHit ?? '--');
        const abMap = { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' };

        const conScore = Number(st.abilities?.con ?? activeCharacter._baseAbilities?.con ?? 10);
        const conMod = activeCharacter.abilityModifier?.(conScore) ?? Math.floor((conScore - 10) / 2);
        const hpFormula = `10（基礎 HP） + ${conMod}（CON 調整值） + ${Math.max(0, level - 1)} × (6（每級戰士生命骰） + ${conMod}（CON 調整值）) = ${maxHp}（最大 HP）`;
        const dexScore = Number(st.abilities?.dex ?? activeCharacter._baseAbilities?.dex ?? 10);
        const dexMod = activeCharacter.abilityModifier?.(dexScore) ?? Math.floor((dexScore - 10) / 2);
        const acFormula = `12（基礎 AC） + ${dexMod}（DEX 調整值） + 1（護甲加成） = ${ac}（最終 AC）`;
        const prof = activeCharacter.getProficiencyBonus?.(level) ?? activeCharacter.getProficiencyBonus(level);
        const longbowBreakdown = activeCharacter.getLongbowHitBreakdown?.() ?? {
            dexMod,
            proficiencyBonus: prof,
            styleBonus: 2,
            total: Number(st.longbowHit ?? 0)
        };
        const longbowFormula = `${longbowBreakdown.dexMod >= 0 ? '+' + longbowBreakdown.dexMod : longbowBreakdown.dexMod}（敏捷調整值） + ${longbowBreakdown.proficiencyBonus >= 0 ? '+' + longbowBreakdown.proficiencyBonus : longbowBreakdown.proficiencyBonus}（熟練加值） + ${longbowBreakdown.styleBonus >= 0 ? '+' + longbowBreakdown.styleBonus : longbowBreakdown.styleBonus}（箭術風格） = ${longbowBreakdown.total >= 0 ? '+' + longbowBreakdown.total : longbowBreakdown.total}（長弓命中）`;

        let html = '';
        html += `<div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:8px;">
            <div style="font-weight:700; font-size:1rem; color:var(--text-main);">${name} <span style="font-weight:500; color:var(--text-muted); font-size:0.9rem;">(Lv ${level})</span></div>
            <div style="text-align:right; font-size:0.9rem; color:var(--text-muted);">
                HP: <strong class="keyword" data-tooltip="${hpFormula}" style="color:var(--success);">${currHp}/${maxHp}</strong>
                <div style="margin-top:4px;">AC: <strong class="keyword" data-tooltip="${acFormula}" style="color:var(--primary);">${ac}</strong> · 長弓: <strong class="keyword" data-tooltip="${longbowFormula}" style="color:var(--secondary);">${longbow}</strong></div>
            </div>
        </div>`;

        html += `<div style="display:flex; gap:8px; flex-wrap:wrap;">`;
        for (const k of ABILITY_KEYS) {
            const sc = Number(abilities[k] ?? 0);
            const mod = activeCharacter.abilityModifier?.(sc) ?? Math.floor((sc - 10) / 2);
            const sign = (mod >= 0) ? `+${mod}` : `${mod}`;
            const formulaText = (typeof activeCharacter.abilityFormula === 'function') ? activeCharacter.abilityFormula(sc) : `${sc} → ${sign}`;
            html += `<div class="keyword" data-tooltip="${formulaText}" style="background:var(--bg-card); border:1px solid var(--border-color); padding:6px 8px; border-radius:8px; min-width:72px; text-align:center; font-weight:700;">
                <div style="font-size:0.85rem; color:var(--text-muted);">${abMap[k]}</div>
                <div style="font-size:1rem; margin-top:4px;">${sc} <span style="color:var(--secondary); font-weight:600;">${sign}</span></div>
            </div>`;
        }
        html += `</div>`;

        container.innerHTML = html;
        try { initializeKeywordTooltips(); } catch (e) { /* ignore */ }
        try {
            const statLong = document.getElementById('stat-longbow'); if (statLong) statLong.textContent = (st.longbowHit >= 0 ? '+' + st.longbowHit : st.longbowHit);
            const statAc = document.getElementById('stat-ac'); if (statAc) statAc.textContent = String(st.ac);
            const currHpEl = document.getElementById('curr-hp'); if (currHpEl) currHpEl.textContent = String(st.currentHp);
        } catch (e) {}
    }

    function attachImportDropzone() {
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
                            if (overlay) { overlay.classList.add('hidden'); overlay.style.display = 'none'; }
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
    }

    function bindCharacterChange() {
        const activeCharacter = getActiveCharacter();
        if (!activeCharacter?.onChange) return;
        activeCharacter.onChange((state) => {
            const battleApp = getBattleApp?.();
            if (battleApp && battleApp.model && battleApp.view) {
                battleApp.model.state.maxHp = state.maxHp;
                battleApp.model.state.currentHp = state.currentHp;
                battleApp.model.state.ac = state.ac;
                battleApp.model.state.longbowHit = state.longbowHit;
                battleApp.view.render(battleApp.model.getSnapshot());
            }
            try {
                const overlay = document.getElementById('settings-overlay');
                if (overlay && !overlay.classList.contains('hidden')) {
                    renderSettingsSummary();
                    renderCharacterSetupForm();
                }
            } catch (e) {}
            try { refreshDynamicTooltips(); } catch (e) {}
            try { renderDerivedStatsText(); } catch (e) {}
            try { renderCharPanelSummary(); } catch (e) {}
        });
    }

    return {
        renderCharacterSetupForm,
        applyCharacterSetupFromForm,
        refreshDynamicTooltips,
        resetCharacterSetupForm,
        markResourceTracker,
        restoreTrackerResource,
        restoreAllTrackerResources,
        handleTrackedButtonClick,
        handleTrackerRestButtonClick,
        handleTrackerCheckboxChange,
        openSettingsPopup,
        renderSettingsSummary,
        closeSettingsPopup,
        renderDerivedStatsText,
        renderCharPanelSummary,
        attachImportDropzone,
        bindCharacterChange
    };
}
