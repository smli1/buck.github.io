// components/combat/manual-dice.js
// Generic manual-dice calculator for the battle panel. Works for any stored
// attack (hit d20 + optional advantage, one field per damage die, crit doubles).
import { roll } from '../../utils/dice.js';
import { formatMod, esc } from './combat-data.js';

const manualValues = {};
const manualMissFlags = {};
let currentManualField = null;
let currentAttackIndex = -1;

function getPanelAttacks() {
    return Array.isArray(window.__panelAttacks) ? window.__panelAttacks : [];
}

function getAttack(i) {
    return getPanelAttacks()[Number(i)] || null;
}

function isAdvOn() {
    const el = document.getElementById('manual-advantage-popup');
    return Boolean(el && el.checked);
}

function hitId(i) { return 'mh-' + i; }
function hitAdvId(i) { return 'mh-' + i + '-adv'; }
function dieId(i, t, n) { return 'md-' + i + '-' + t + '-' + n; }

function isMiss(id) {
    return manualMissFlags[id] === true;
}

function getNumber(id, max) {
    const v = parseInt(manualValues[id], 10);
    return Number.isFinite(v) && v >= 1 && v <= max ? v : null;
}

function getHit(id) {
    return isMiss(id) ? 'miss' : getNumber(id, 20);
}

function setManualMiss(id) {
    manualMissFlags[id] = true;
    const label = document.getElementById('label-' + id);
    if (label) {
        const field = document.getElementById(id);
        if (field && field.dataset.fieldType === 'damage') label.innerText = '0(未命中)';
        else label.innerText = 'X(未命中)';
    }
}

function clearManualMiss(id) {
    if (!manualMissFlags[id]) return;
    delete manualMissFlags[id];
    const label = document.getElementById('label-' + id);
    if (!label) return;
    const field = document.getElementById(id);
    const max = field && field.dataset.fieldType === 'damage' ? parseInt(field.dataset.dice, 10) : 20;
    const v = getNumber(id, max);
    label.innerText = v != null ? String(v) : '未選';
}

function renderManualChips() {
    const container = document.getElementById('manual-attack-chips');
    if (!container) return;
    const attacks = getPanelAttacks();
    container.innerHTML = attacks.map((a, i) => `
        <button type="button" class="btn btn-roll manual-scenario-button${i === currentAttackIndex ? ' active' : ''}" onclick="selectManualAttack(${i})">
            ⚔️ ${esc(a.name)}
        </button>`).join('') || '<div class="manual-popup-note">No attacks available.</div>';
}

function labelForDie(n, sides, i, t) {
    return `傷害 d${sides} ${n > 1 ? '#' + n : ''}`;
}

function renderManualFields() {
    const hitBox = document.getElementById('manual-fields-hit');
    const dmgBox = document.getElementById('manual-fields-damage');
    const formulaEl = document.getElementById('manual-damage-formula');
    const a = getAttack(currentAttackIndex);
    if (!hitBox || !dmgBox) return;
    if (!a) {
        hitBox.innerHTML = dmgBox.innerHTML = '';
        return;
    }
    const adv = isAdvOn();
    const crit = a.crit || 20;

    hitBox.innerHTML = `
        <button type="button" class="manual-field" id="${hitId(currentAttackIndex)}" data-field-type="hit" data-dice="20" onclick="selectManualField('${hitId(currentAttackIndex)}')">
            <span>命中 d20 + ${formatMod(a.attackBonus)}</span><strong id="label-${hitId(currentAttackIndex)}">未選</strong>
        </button>
        ${adv ? `
        <button type="button" class="manual-field" id="${hitAdvId(currentAttackIndex)}" data-field-type="hit" data-dice="20" onclick="selectManualField('${hitAdvId(currentAttackIndex)}')">
            <span>優勢 第2顆 d20</span><strong id="label-${hitAdvId(currentAttackIndex)}">未選</strong>
        </button>` : ''}`;

    const parsed = a.dmgParse || { dice: [], flat: 0 };
    let dmgHtml = '';
    parsed.dice.forEach((token, t) => {
        for (let n = 1; n <= token.count; n++) {
            const id = dieId(currentAttackIndex, t, n);
            dmgHtml += `
                <button type="button" class="manual-field" id="${id}" data-field-type="damage" data-attack="${currentAttackIndex}" data-dice="${token.sides}" onclick="selectManualField('${id}')">
                    <span>${esc(labelForDie(n, token.sides, currentAttackIndex, t))}</span><strong id="label-${id}">未選</strong>
                </button>`;
        }
    });
    if (!parsed.dice.length) dmgHtml = '<div class="manual-popup-note">No damage dice in this attack.</div>';
    dmgBox.innerHTML = dmgHtml + (parsed.flat ? '' : '');

    if (formulaEl) {
        formulaEl.innerHTML = `傷害：<b>${esc(a.damage)}</b> ${crit < 20 ? `<span class="crit-alert">（d20 ${crit}-20 暴擊，傷害骰翻倍）</span>` : '（暴擊時傷害骰翻倍）'}`;
    }

    // restore stored values into labels
    const restore = (id, max) => {
        const label = document.getElementById('label-' + id);
        if (!label) return;
        if (isMiss(id)) { setManualMiss(id); return; }
        const v = getNumber(id, max);
        label.innerText = v != null ? String(v) : '未選';
    };
    restore(hitId(currentAttackIndex), 20);
    if (adv) restore(hitAdvId(currentAttackIndex), 20);
    parsed.dice.forEach((token, t) => {
        for (let n = 1; n <= token.count; n++) restore(dieId(currentAttackIndex, t, n), token.sides);
    });

    if (currentManualField) {
        currentManualField.classList.remove('manual-selected');
        currentManualField = null;
    }
    document.getElementById('manual-selected-field').innerText = '無';
    document.getElementById('manual-selected-value').innerText = '未選';
    updateMissButton();
    const firstHit = document.getElementById(hitId(currentAttackIndex));
    if (firstHit) selectManualField(firstHit.id);
}

export function selectManualAttack(i) {
    currentAttackIndex = Number(i);
    Object.keys(manualValues).forEach(k => delete manualValues[k]);
    Object.keys(manualMissFlags).forEach(k => delete manualMissFlags[k]);
    renderManualChips();
    renderManualFields();
}

function updateMissButton() {
    const action = document.getElementById('manual-miss-action');
    const note = document.getElementById('manual-miss-note');
    if (!action) return;
    const hasHitValue = document.querySelector('#manual-fields-hit .manual-field')
        ? Array.from(document.querySelectorAll('#manual-fields-hit .manual-field'))
            .some(f => getNumber(f.id, 20) != null || isMiss(f.id))
        : false;
    if (currentManualField || hasHitValue) {
        action.style.display = 'flex';
        if (note) note.innerText = currentManualField ? '當前選擇命中或傷害欄，可直接記錄未命中。' : '已有命中骰輸入，可直接記錄未命中。';
    } else {
        action.style.display = 'none';
    }
}

function updateGridVisibility() {
    const grids = ['dice-grid-d20', 'dice-grid-d10', 'dice-grid-d8', 'dice-grid-d6', 'dice-grid-d4'];
    grids.forEach(id => {
        const grid = document.getElementById(id);
        if (!grid) return;
        grid.style.display = 'none';
        grid.querySelectorAll('.dice-button').forEach(b => b.classList.remove('dice-selected'));
    });
    if (!currentManualField || !currentManualField.dataset) return;
    const sides = currentManualField.dataset.dice;
    const grid = document.getElementById('dice-grid-d' + sides);
    if (!grid) return;
    grid.style.display = 'grid';
    const saved = getNumber(currentManualField.id, sides);
    if (saved != null) {
        grid.querySelectorAll('.dice-button').forEach(b => {
            if (b.innerText === String(saved)) b.classList.add('dice-selected');
        });
    }
}

function formatSelected(field, value) {
    if (!field) return '未選';
    const a = getAttack(currentAttackIndex);
    const hitBonus = a ? a.attackBonus : 0;
    if (field.dataset.fieldType === 'hit') {
        if (isMiss(field.id)) return 'X(未命中)';
        if (value == null) return '未選';
        return `d20(${value}) ${formatMod(hitBonus)} = ${value + hitBonus}`;
    }
    if (field.dataset.fieldType === 'damage') {
        if (isMiss(field.id)) return '0(未命中)';
        if (value == null) return '未選';
        return `d${field.dataset.dice}(${value}) = ${value}`;
    }
    return String(value == null ? '未選' : value);
}

export function selectManualField(id) {
    if (currentManualField) {
        currentManualField.classList.remove('manual-selected');
    }
    currentManualField = document.getElementById(id);
    if (currentManualField) {
        currentManualField.classList.add('manual-selected');
        document.getElementById('manual-field-help').innerText = '目前選擇：' + (currentManualField.querySelector('span')?.innerText || id);
        document.getElementById('manual-selected-field').innerText = currentManualField.querySelector('span')?.innerText || id;
        const sides = parseInt(currentManualField.dataset.dice, 10);
        const saved = getNumber(id, sides);
        document.getElementById('manual-selected-value').innerText = formatSelected(currentManualField, saved);
    }
    updateGridVisibility();
    updateMissButton();
}

export function setManualDiceValue(value) {
    if (!currentManualField) return;
    clearManualMiss(currentManualField.id);
    manualValues[currentManualField.id] = value;
    const label = document.getElementById('label-' + currentManualField.id);
    if (label) label.innerText = String(value);
    document.getElementById('manual-selected-value').innerText = formatSelected(currentManualField, value);
    updateGridVisibility();
    updateMissButton();
}

export function initializeManualButtons() {
    const createGrid = (containerId, start, end) => {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';
        for (let i = start; i <= end; i++) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'dice-button';
            btn.innerText = i;
            btn.addEventListener('click', () => setManualDiceValue(i));
            container.appendChild(btn);
        }
    };
    createGrid('dice-grid-d20', 1, 20);
    createGrid('dice-grid-d10', 1, 10);
    createGrid('dice-grid-d8', 1, 8);
    createGrid('dice-grid-d6', 1, 6);
    createGrid('dice-grid-d4', 1, 4);
}

export function openManualPopup(attackIndex) {
    const overlay = document.getElementById('manual-popup-overlay');
    if (!overlay) return;
    if (typeof attackIndex === 'number' && attackIndex >= 0) {
        selectManualAttack(attackIndex);
    } else if (currentAttackIndex < 0) {
        selectManualAttack(0);
    } else {
        renderManualChips();
        renderManualFields();
    }
    overlay.style.display = 'flex';
    overlay.classList.remove('hidden');
    overlay.style.opacity = '0';
    const popup = overlay.querySelector('.manual-popup');
    if (popup) {
        popup.style.opacity = '0';
        popup.style.transform = 'translateY(10px)';
    }
    requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        if (popup) {
            popup.style.opacity = '1';
            popup.style.transform = 'translateY(0)';
        }
    });
    try { window.bringElementToFront(overlay); } catch (e) { /* optional */ }
}

export function closeManualPopup(event) {
    if (event && event.target !== document.getElementById('manual-popup-overlay')) return;
    const overlay = document.getElementById('manual-popup-overlay');
    if (!overlay) return;
    overlay.classList.add('hidden');
    overlay.style.opacity = '0';
    const popup = overlay.querySelector('.manual-popup');
    if (popup) {
        popup.style.opacity = '0';
        popup.style.transform = 'translateY(10px)';
    }
    window.setTimeout(() => {
        if (overlay.classList.contains('hidden')) overlay.style.display = 'none';
    }, 220);
    if (currentManualField) {
        currentManualField.classList.remove('manual-selected');
        currentManualField = null;
    }
}

export function clearManualPopup() {
    Object.keys(manualValues).forEach(k => delete manualValues[k]);
    Object.keys(manualMissFlags).forEach(k => delete manualMissFlags[k]);
    renderManualFields();
}

export function toggleManualAdvantage() {
    renderManualFields();
}

export function recordManualMiss() {
    if (!currentManualField) {
        const a = getAttack(currentAttackIndex);
        if (!a) { alert('請選擇攻擊或骰子欄位。'); return; }
        setManualMiss(hitId(currentAttackIndex));
        renderManualFields();
        window.appendLog && window.appendLog(`<b>❌ 手動未命中</b><br>• ${esc(a.name)} 命中骰已標記為未命中<br>• 傷害：<b>0</b>`);
        return;
    }
    const id = currentManualField.id;
    if (currentManualField.dataset.fieldType === 'hit') {
        setManualMiss(id);
        document.getElementById('manual-selected-value').innerText = 'X(未命中)';
        window.appendLog && window.appendLog('<b>❌ 手動未命中</b><br>• 已標記該命中骰為未命中<br>• 傷害：<b>0</b>');
    } else {
        setManualMiss(hitId(currentAttackIndex));
        setManualMiss(id);
        document.getElementById('manual-selected-value').innerText = '0(未命中)';
        window.appendLog && window.appendLog('<b>❌ 手動未命中</b><br>• 已標記該攻擊為未命中<br>• 傷害：<b>0</b>');
    }
    updateMissButton();
}

export function calculateManual() {
    const a = getAttack(currentAttackIndex);
    if (!a) { alert('請先選擇一個攻擊。'); return; }
    const adv = isAdvOn();
    const final = resolveHit(adv);
    if (!final.anyInput) { alert('請輸入 d20 命中骰。'); return; }
    if (final.miss) {
        window.log(`<b>❌ 手動計算 · ${esc(a.name)}</b><br>• 命中：<span class="crit-alert">未命中</span><br>• 傷害：<b>0</b>`);
        return;
    }
    const hitTotal = final.final + a.attackBonus;
    const isCrit = final.final >= (a.crit || 20);
    const parsed = a.dmgParse || { dice: [], flat: 0 };

    let dmgParts = [];
    let totalDmg = parsed.flat;
    parsed.dice.forEach((token, t) => {
        const rolled = [];
        for (let n = 1; n <= token.count; n++) {
            const id = dieId(currentAttackIndex, t, n);
            const v = getNumber(id, token.sides);
            if (v == null) { alert('請輸入所有傷害骰 (' + esc(a.damage) + ')。'); return; }
            rolled.push(v);
        }
        const dieSum = rolled.reduce((s, r) => s + r, 0) * (isCrit ? 2 : 1);
        dmgParts.push(`${token.count}d${token.sides}(${rolled.join(',')})${isCrit ? '×2' : ''}`);
        totalDmg += dieSum;
    });

    const advText = adv ? `[${final.primary === null ? 'X' : final.primary}${final.primary !== null && final.secondary !== null ? ', ' : ' '}${final.secondary === null ? 'X' : final.secondary}] 取高 ` : '';
    window.log(`<b>⚔️ 手動計算 · ${esc(a.name)}</b><br>` +
        `• 命中：${advText}d20 → <b>${final.final}</b> ${formatMod(a.attackBonus)} = <b>${hitTotal}</b>${isCrit ? ' <span class="crit-alert">[暴擊！]</span>' : ''}<br>` +
        `• 傷害公式：${esc(a.damage)}${isCrit ? '（翻倍）' : ''}<br>` +
        `• 傷害：${dmgParts.join(' + ') || '—'}${parsed.flat ? ' + ' + parsed.flat : ''} = <b>${totalDmg}</b>`);
}

function resolveHit(adv) {
    const primary = getHit(hitId(currentAttackIndex));
    const secondary = adv ? getHit(hitAdvId(currentAttackIndex)) : null;
    const anyInput = primary != null || secondary != null || isMiss(hitId(currentAttackIndex)) || (adv && isMiss(hitAdvId(currentAttackIndex)));
    if (primary === 'miss' && secondary === 'miss') return { anyInput, miss: true };
    const values = [primary, secondary].filter(v => typeof v === 'number');
    if (values.length === 0) return { anyInput, miss: false, final: null, primary, secondary };
    return { anyInput, miss: false, final: Math.max.apply(null, values), primary, secondary };
}

export function quickRollAttack(i) {
    const attacks = getPanelAttacks();
    const a = attacks[Number(i)];
    if (!a) { alert('找不到該攻擊。'); return; }
    const adv = isAdvOn();
    const d1 = roll(20);
    const d2 = adv ? roll(20) : null;
    const final = adv ? Math.max(d1, d2) : d1;
    const hitTotal = final + a.attackBonus;
    const isCrit = final >= (a.crit || 20);
    const parsed = a.dmgParse || { dice: [], flat: 0 };
    let parts = [];
    let totalDmg = parsed.flat;
    parsed.dice.forEach(token => {
        const vals = [];
        const rolls = token.count * (isCrit ? 2 : 1);
        for (let n = 0; n < rolls; n++) {
            const v = roll(token.sides);
            vals.push(v);
            totalDmg += v;
        }
        parts.push(`${token.count}d${token.sides}(${vals.join(',')})`);
    });
    window.log(`<b>🎲 自動擲骰 · ${esc(a.name)}</b><br>` +
        `• 命中：d20(${adv ? `${d1}, ${d2}` : d1}) → <b>${final}</b> ${formatMod(a.attackBonus)} = <b>${hitTotal}</b>${isCrit ? ' <span class="crit-alert">[暴擊！]</span>' : ''}<br>` +
        `• 傷害：${parts.join(' + ') || '—'}${parsed.flat ? ' + ' + parsed.flat : ''} = <b style="color:var(--primary)">${totalDmg}</b>`);
}