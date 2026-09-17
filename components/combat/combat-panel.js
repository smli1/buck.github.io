// components/combat/combat-panel.js
// Renders the generic battle panel (front face) and roleplay panel (back face)
// from the active character's full JSON. Any class works: hit bonuses, damage
// dice and skill modifiers are computed, not hardcoded.
import {
    resolveActiveCharacterData, buildPanelAttacks, critThreshold, parseDamageExpression,
    abilityMod, profBonusFor, formatMod, esc, skillModifier, saveModifier,
    SKILL_ABILITIES, parseRpNotes, saveRpNotes
} from './combat-data.js';

function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

function setHtml(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
}

function setDisplay(id, display) {
    const el = document.getElementById(id);
    if (el) el.style.display = display;
}

function skillLabel(skill) {
    return skill.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function resourceLabel(key) {
    return key.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function renderBattle(ch, attacks, crit) {
    const name = ch.name || 'Unnamed';
    const className = [ch.race, ch.class, ch.subclass ? '— ' + ch.subclass : ''].filter(Boolean).join(' ');
    const classLine = `${className} · Lv ${ch.level || 1}`;

    setHtml('bp-title', `⚔️ ${esc(name)} — 戰鬥面板`);
    setHtml('bp-subtitle', esc(classLine));

    const abi = ch.abilityScores || ch.abilities || {};
    const pb = profBonusFor(ch);
    const dexMod = abilityMod(abi.dex);
    const speed = (ch.speed && (ch.speed.walk || ch.speed.speed)) || 30;
    setText('stat-ac', ch.ac != null ? String(ch.ac) : '—');
    setText('stat-hp', `${ch.currentHp != null ? ch.currentHp : '—'} / ${ch.maxHp != null ? ch.maxHp : '—'}`);
    setText('panel-prof', formatMod(pb));
    setText('panel-init', formatMod(dexMod));
    setText('panel-speed', String(speed));
    setText('panel-crit', crit < 20 ? `d20 ${crit}-20` : `d20 20`);

    const panelFeatures = Array.isArray(ch.features) ? ch.features.filter(f => f && f.name) : [];
    const panelFeats = Array.isArray(ch.feats) ? ch.feats.filter(f => f && (typeof f === 'string' || f.name)) : [];
    setHtml('panel-features',
        panelFeatures.map(f => `<li><strong>${esc(f.name)}</strong>${f.description ? ' — ' + esc(f.description) : ''}</li>`).join('')
        + (panelFeats.length ? `<li><span class="rp-chip">專長</span> ${panelFeats.map(f => esc(typeof f === 'string' ? f : f.name)).join('、')}</li>` : '')
        || '<li class="manual-popup-note">尚未記錄職業特性或專長。</li>');

    if (!attacks.length) {
        setHtml('attack-actions', '<div class="card"><div class="manual-popup-note">No attacks defined. Add weapons in the character wizard.</div></div>');
    } else {
        setHtml('attack-actions', attacks.map((a, i) => `
            <div class="card attack-card">
                <div class="step-header">
                    <span class="step-title">⚔️ ${esc(a.name)}</span>
                    ${a.range ? `<span class="step-badge">${esc(a.range)}</span>` : ''}
                </div>
                <div class="action-desc">
                    命中 <b class="hit-mod">${formatMod(a.attackBonus)}</b>
                    <span style="color:var(--text-muted); font-size:0.85rem;">（${esc(a.attackBonusFormula)}）</span>
                    · 傷害 <b>${esc(a.damage)}</b>
                    · 暴擊 <b style="color:var(--primary);">d20 ${crit < 20 ? crit + '-20' : '20'}</b>
                </div>
                <div class="btn-group">
                    <button class="btn btn-phrase" onclick="copyText('我用【${esc(a.name)}】發動攻擊！命中 d20 ${formatMod(a.attackBonus)}、傷害 ${esc(a.damage)}。')">📋 複製台詞報給 DM</button>
                    <button class="btn btn-roll" style="background:#475569;" onclick="openManualPopup(${i})">🛠 手動骰輸入</button>
                    <button class="btn btn-roll" style="background:#16a34a;" onclick="quickRollAttack(${i})">🎲 自動擲骰</button>
                </div>
            </div>`).join(''));
    }

    const sc = ch.spellcasting;
    if (sc && (sc.spellAttack != null || sc.saveDC != null || (Array.isArray(sc.spells) && sc.spells.length))) {
        const spells = Array.isArray(sc.spells) ? sc.spells : [];
        setHtml('spellcasting-card', `
            <div class="card">
                <div class="step-header">
                    <span class="step-title">✨ 施法 (${esc(String(sc.ability || 'int').toUpperCase())})</span>
                    <span class="step-badge">${sc.slots ? esc(sc.slots) : ''}</span>
                </div>
                <div class="action-desc">
                    法術攻擊 <b>${formatMod(Number(sc.spellAttack) || 0)}</b>
                    · 法術豁免 DC <b>${sc.saveDC != null ? esc(String(sc.saveDC)) : '—'}</b>
                </div>
                ${spells.length ? `<div class="cs-slot-meta" style="margin-top:6px;">${spells.slice(0, 24).map(sp => `<span class="cs-tag class">${esc(typeof sp === 'string' ? sp : (sp.name || ''))}</span>`).join('')}</div>` : ''}
                <div class="btn-group" style="margin-top:8px;">
                    <button class="btn btn-phrase" onclick="copyText('我施法：${esc(sc.spellAttack != null ? '法術攻擊 d20 ' + formatMod(Number(sc.spellAttack)) : '法術豁免 DC ' + sc.saveDC)}。')">📋 複製施法台詞</button>
                </div>
            </div>`);
        setDisplay('spellcasting-card', '');
    } else {
        setDisplay('spellcasting-card', 'none');
    }

    // Resource trackers: one row per stored resource key.
    const resources = (ch.resources && typeof ch.resources === 'object') ? ch.resources : {};
    const keys = Object.keys(resources).filter(k => Array.isArray(resources[k]));
    if (keys.length) {
        setHtml('panel-resources', keys.map(key => {
            const values = resources[key];
            return `
            <div class="tracker-row" data-resource="${esc(key)}">
                <span>🔋 ${esc(resourceLabel(key))}</span>
                <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
                    <div class="checkbox-group" data-resource-group="${esc(key)}">
                        ${values.map((v, j) => `<input type="checkbox" class="tracker-checkbox"${v ? ' checked' : ''} />`).join('')}
                    </div>
                </div>
            </div>`;
        }).join(''));
    } else {
        setHtml('panel-resources', '<div class="manual-popup-note">沒有追蹤資源。可在角色卡/設定中記錄資源。短休/長休按鈕仍可用。</div>');
    }
}

function renderRoleplay(ch, id) {
    const name = ch.name || 'Unnamed';
    const abi = ch.abilityScores || ch.abilities || {};
    const pb = profBonusFor(ch);
    setHtml('rp-title', `🎭 ${esc(name)} — 角色扮演 / 技能 / 調查`);

    // Skills (trained ones, computed modifiers)
    const skills = Array.isArray(ch.skills) ? ch.skills : [];
    if (skills.length) {
        setHtml('rp-skills', skills.map(sk => {
            const ability = SKILL_ABILITIES[sk] || 'int';
            const mod = skillModifier(ch, sk);
            return `
            <div class="rp-skill-row">
                <span class="rp-skill-name">${esc(skillLabel(sk))}</span>
                <span class="rp-skill-ability">${esc(ability.toUpperCase())} ${formatMod(abilityMod(abi[ability]))}</span>
                <span class="rp-chip rp-chip-trained">${formatMod(mod)}</span>
            </div>`;
        }).join(''));
    } else {
        setHtml('rp-skills', '<div class="manual-popup-note">尚未選擇任何技能熟練。可在角色卡或完成 Wizard 技能步驟後顯示。</div>');
    }

    // Saving throws
    const saves = Array.isArray(ch.savingThrows) ? ch.savingThrows : [];
    setHtml('rp-saves', saves.length
        ? saves.map(k => `<span class="cc-chip">${esc(k.toUpperCase())} ${formatMod(saveModifier(ch, k))}</span>`).join('')
        : '<div class="manual-popup-note">尚未設定豁免熟練。</div>');

    // Features + feats
    const features = Array.isArray(ch.features) ? ch.features.filter(f => f && f.name) : [];
    const feats = Array.isArray(ch.feats) ? ch.feats.filter(f => f && (typeof f === 'string' || f.name)) : [];
    if (features.length || feats.length) {
        setHtml('rp-features', `
            ${features.map(f => `<li><strong>${esc(f.name)}</strong>${f.description ? ' — ' + esc(f.description) : ''}</li>`).join('')}
            ${feats.map(f => `<li><strong>${esc(typeof f === 'string' ? f : f.name)}</strong> <span class="rp-chip">專長</span></li>`).join('')}`);
    } else {
        setHtml('rp-features', '<li class="manual-popup-note">尚未記錄職業特性或專長。</li>');
    }

    // Personality / background / traits
    const traits = ch.traits || {};
    const background = typeof ch.background === 'string' ? ch.background : (ch.background ? ch.background.name : '—');
    setHtml('rp-traits', `
        <div class="rp-trait-block"><b>身份</b><br>${esc(background)} ${ch.alignment ? '· ' + esc(ch.alignment) : ''}</div>
        ${traits.personality ? `<div class="rp-trait-block"><b>性格</b><br>${esc(traits.personality)}</div>` : ''}
        ${traits.ideals ? `<div class="rp-trait-block"><b>信念</b><br>${esc(traits.ideals)}</div>` : ''}
        ${traits.bonds ? `<div class="rp-trait-block"><b>羈絆</b><br>${esc(traits.bonds)}</div>` : ''}
        ${traits.flaws ? `<div class="rp-trait-block"><b>缺陷</b><br>${esc(traits.flaws)}</div>` : ''}
        ${ch.appearance ? `<div class="rp-trait-block"><b>外貌</b><br>${esc(ch.appearance)}</div>` : ''}
        ${Array.isArray(ch.languages) && ch.languages.length ? `<div class="rp-trait-block"><b>語言</b><br>${esc(ch.languages.join(', '))}</div>` : ''}
        ${ch.proficiencyBonus != null ? `<div class="rp-trait-block"><b>熟練加值</b><br>${formatMod(pb)}</div>` : ''}`);

    // Investigation notes (persisted per character)
    const notesEl = document.getElementById('rp-notes');
    if (notesEl) {
        if (notesEl.value !== parseRpNotes(id)) {
            notesEl.value = parseRpNotes(id);
        }
        if (!notesEl.dataset.bound || notesEl.dataset.bound !== id) {
            notesEl.dataset.bound = id;
            notesEl.oninput = () => saveRpNotes(id, notesEl.value);
        }
    }
}

export async function renderCombatPanels() {
    const resolved = await resolveActiveCharacterData();
    const ch = resolved && resolved.data ? resolved.data : {};
    const crit = critThreshold(ch);
    const attacks = buildPanelAttacks(ch);

    window.__panelCharacter = ch;
    window.__panelAttacks = attacks.map(a => ({
        name: a.name,
        attackBonus: a.attackBonus,
        damage: a.damage,
        dmgParse: parseDamageExpression(a.damage),
        crit,
        range: a.range
    }));

    renderBattle(ch, attacks, crit);
    renderRoleplay(ch, resolved ? resolved.id : 'player-1');
    return true;
}

export { resolveActiveCharacterData, buildPanelAttacks, critThreshold };