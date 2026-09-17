import { initializeKeywordTooltips } from '../../ui/tooltip.js';

const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

export function createCharacterSetup({ getCharacter }) {
    function getActiveCharacter() {
        return getCharacter?.() ?? window.character ?? null;
    }

    function renderCharacterSetupForm() {
        const activeCharacter = getActiveCharacter();
        if (!activeCharacter) return;
        const st = activeCharacter.getState();
        const nameEl = document.getElementById('settings-char-name');
        const levelEl = document.getElementById('settings-char-level');
        const dataSourceEl = document.getElementById('settings-data-source-select');
        if (nameEl) nameEl.value = st.name || '';
        if (levelEl) levelEl.value = st.level ?? 1;
        if (dataSourceEl) {
            const selectedSource = st.dataSource ?? st.source ?? '';
            dataSourceEl.value = selectedSource || '';
        }
        for (const key of ABILITY_KEYS) {
            const el = document.getElementById(`settings-ability-${key}`);
            if (el) {
                const value = Number(activeCharacter._baseAbilities?.[key] ?? st.abilities?.[key] ?? 10);
                el.value = Number.isFinite(value) ? value : 10;
            }
        }
    }

    function applyCharacterSetupFromForm() {
        const activeCharacter = getActiveCharacter();
        if (!activeCharacter) return false;
        const nameEl = document.getElementById('settings-char-name');
        const levelEl = document.getElementById('settings-char-level');
        const dataSourceEl = document.getElementById('settings-data-source-select');
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
        if (dataSourceEl) {
            activeCharacter.set?.('dataSource', dataSourceEl.value || null);
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
        const abMap = { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' };

        let html = '';
        html += `<div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:8px;">
            <div style="font-weight:700; font-size:1rem; color:var(--text-main);">${name} <span style="font-weight:500; color:var(--text-muted); font-size:0.9rem;">(Lv ${level})</span></div>
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
        initializeKeywordTooltips();
        try {
            const statLong = document.getElementById('stat-longbow'); if (statLong) statLong.textContent = (st.longbowHit >= 0 ? '+' + st.longbowHit : st.longbowHit);
            const statAc = document.getElementById('stat-ac'); if (statAc) statAc.textContent = String(st.ac);
            const currHpEl = document.getElementById('curr-hp'); if (currHpEl) currHpEl.textContent = String(st.currentHp);
        } catch (e) {}
    }

    return {
        renderCharacterSetupForm,
        applyCharacterSetupFromForm,
        resetCharacterSetupForm,
        renderSettingsSummary,
        renderDerivedStatsText,
        renderCharPanelSummary
    };
}
