import { roll, bringElementToFront, parseActualNumber } from './utils.js';

function getCharacterCombatBreakdown() {
    const character = window.character;
    if (!character?.getManualCombatBreakdown) return null;
    return character.getManualCombatBreakdown();
}

function getManualCombatBonus(kind) {
    const breakdown = getCharacterCombatBreakdown();
    if (!breakdown) return null;
    switch (kind) {
        case 'rangedHit':
            return breakdown.rangedHitBonus + breakdown.featRangedHitBonus;
        case 'rangedDamage':
            return breakdown.rangedDamageBonus + breakdown.featRangedDamageBonus;
        case 'meleeHit':
            return breakdown.meleeHitBonus + breakdown.featMeleeHitBonus;
        case 'meleeDamage':
            return breakdown.meleeDamageBonus + breakdown.featMeleeDamageBonus;
        case 'secondWind':
            return 9;
        default:
            return null;
    }
}

function formatManualBonus(value) {
    return Number.isFinite(value) ? (value >= 0 ? `+${value}` : `${value}`) : '—';
}

const manualValues = {};
const manualMissFlags = {};
let currentManualField = null;
let manualScenario = 'ranged';

function isManualMiss(id) {
    return manualMissFlags[id] === true;
}

function getManualNumber(id, min, max) {
    const value = parseInt(manualValues[id], 10);
    return Number.isFinite(value) && value >= min && value <= max ? value : null;
}

function getManualHitValue(id) {
    if (isManualMiss(id)) return 'miss';
    return getManualNumber(id, 1, 20);
}

function getManualDamageValue(id, max) {
    if (isManualMiss(id)) return 0;
    return getManualNumber(id, 1, max);
}

function resolveManualHit(primary, adv) {
    if (primary === 'miss' && adv === 'miss') return 'miss';
    if (primary === 'miss') return adv;
    if (adv === 'miss') return primary;
    if (primary == null) return adv;
    if (adv == null) return primary;
    return Math.max(primary, adv);
}

function isManualMeleeCrit(index, advOn) {
    const h = getManualHitValue(`manual-melee-h${index}`);
    const hAdv = getManualHitValue(`manual-melee-h${index}-adv`);
    let final = null;
    if (advOn) {
        if (h != null && hAdv != null) final = Math.max(h, hAdv);
        else if (h != null) final = h;
        else if (hAdv != null) final = hAdv;
    } else {
        final = h != null ? h : null;
    }
    return typeof final === 'number' && final >= 19;
}

function isManualRangedCrit(advOn) {
    const d20 = getManualHitValue('manual-ranged-d20');
    const d20_2 = advOn ? getManualHitValue('manual-ranged-d20-adv-2') : null;
    const final = resolveManualHit(d20, d20_2);
    return typeof final === 'number' && final >= 19;
}

function isRangedOathBowField(field) {
    return Boolean(field && /^manual-ranged-oath-3d6-\d+$/.test(field.id));
}

function isRangedCrit6d6Field(field) {
    return Boolean(field && /^manual-ranged-crit-6d6-\d+$/.test(field.id));
}

function getRangedCritFormulaText(field, advOn) {
    if (!field || manualScenario !== 'ranged') return null;
    const critActive = isManualRangedCrit(advOn);
    if (!critActive) return null;
    const damageBonus = getManualCombatBonus('rangedDamage') ?? 0;
    if (isRangedOathBowField(field)) return `2d8 + 6d6 + ${damageBonus}`;
    if (field.id === 'manual-ranged-d8') return `2d${field.dataset.dice || '8'} + ${damageBonus}`;
    return null;
}

function isRangedCritFormulaField(field, advOn) {
    return Boolean(getRangedCritFormulaText(field, advOn));
}

function setManualMiss(id) {
    manualMissFlags[id] = true;
    const label = document.getElementById(`label-${id}`);
    if (!label) return;
    const field = document.getElementById(id);
    if (field && field.dataset.fieldType === 'damage') {
        label.innerText = '0(未命中)';
    } else {
        const value = getManualNumber(id, 1, 20);
        label.innerText = value != null ? `${value}(未命中)` : 'X(未命中)';
    }
}

function clearManualMiss(id) {
    if (!manualMissFlags[id]) return;
    delete manualMissFlags[id];
    const label = document.getElementById(`label-${id}`);
    if (!label) return;
    const field = document.getElementById(id);
    const maxValue = field?.dataset.fieldType === 'damage'
        ? parseInt(field.dataset.dice || '0', 10)
        : 20;
    const value = getManualNumber(id, 1, maxValue);
    label.innerText = value != null ? value : '未選';
}

function clearRelatedMissForField(field) {
    if (!field) return;
    const id = field.id;
    if (field.dataset.fieldType === 'hit') {
        if (id === 'manual-ranged-d20' || id === 'manual-ranged-d20-adv-2') {
            clearManualMiss('manual-ranged-d8');
        }
        const meleeIndex = id.match(/^manual-melee-h(\d+)/)?.[1];
        if (meleeIndex) {
            clearManualMiss(`manual-melee-d${meleeIndex}`);
        }
    } else if (field.dataset.fieldType === 'damage') {
        if (id === 'manual-ranged-d8') {
            clearManualMiss('manual-ranged-d20');
            clearManualMiss('manual-ranged-d20-adv-2');
        }
        if (id.startsWith('manual-melee-d')) {
            const idx = id.slice(-1);
            clearManualMiss(`manual-melee-h${idx}`);
            clearManualMiss(`manual-melee-h${idx}-adv`);
        }
    }
}

function setRelatedMissForField(field) {
    if (!field) return;
    const id = field.id;
    const advOn = document.getElementById('manual-advantage-popup')?.checked;
    if (field.dataset.fieldType === 'damage') {
        setManualMiss(id);
        if (id === 'manual-ranged-d8') {
            setManualMiss('manual-ranged-d20');
            setManualMiss('manual-ranged-d20-adv-2');
            ['manual-ranged-oath-3d6-1', 'manual-ranged-oath-3d6-2', 'manual-ranged-oath-3d6-3'].forEach(setManualMiss);
        }
        if (id.startsWith('manual-melee-d')) {
            const idx = id.slice(-1);
            setManualMiss(`manual-melee-h${idx}`);
            setManualMiss(`manual-melee-h${idx}-adv`);
        }
    } else if (field.dataset.fieldType === 'hit') {
        setManualMiss(id);
        const meleeIndex = id.match(/^manual-melee-h(\d+)/)?.[1];
        if (meleeIndex) {
            if (!advOn || (isManualMiss(`manual-melee-h${meleeIndex}`) && isManualMiss(`manual-melee-h${meleeIndex}-adv`))) {
                setManualMiss(`manual-melee-d${meleeIndex}`);
            }
        }
        if (id === 'manual-ranged-d20' || id === 'manual-ranged-d20-adv-2') {
            if (!advOn || (isManualMiss('manual-ranged-d20') && isManualMiss('manual-ranged-d20-adv-2'))) {
                setManualMiss('manual-ranged-d8');
                ['manual-ranged-oath-3d6-1', 'manual-ranged-oath-3d6-2', 'manual-ranged-oath-3d6-3'].forEach(setManualMiss);
            }
        }
    }
}

function getManualDiceList(prefix, count, sides) {
    const values = [];
    for (let i = 1; i <= count; i++) {
        const value = parseInt(manualValues[`${prefix}-${i}`], 10);
        if (!Number.isFinite(value) || value < 1 || value > sides) {
            return null;
        }
        values.push(value);
    }
    return values;
}

function getManualDiceSum(prefix, count, sides) {
    const list = getManualDiceList(prefix, count, sides);
    return list ? list.reduce((sum, n) => sum + n, 0) : null;
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
            btn.addEventListener('click', () => setManualDiceValue(i, btn));
            container.appendChild(btn);
        }
    };
    createGrid('dice-grid-d20', 1, 20);
    createGrid('dice-grid-d10', 1, 10);
    createGrid('dice-grid-d8', 1, 8);
    createGrid('dice-grid-d6', 1, 6);
    createGrid('dice-grid-d4', 1, 4);
}

export function openManualPopup(type) {
    const overlay = document.getElementById('manual-popup-overlay');
    if (!overlay) return;
    overlay.classList.remove('hidden');
    bringElementToFront(overlay);
    if (type) {
        setManualScenario(type);
    } else {
        setManualScenario(manualScenario);
    }
    const visibleField = document.querySelector('.manual-field:not([style*="display: none"])');
    if (visibleField) {
        selectManualField(visibleField.id);
    }
    updateManualMissButton();
}

export function closeManualPopup(event) {
    if (event && event.target !== document.getElementById('manual-popup-overlay')) {
        return;
    }
    document.getElementById('manual-popup-overlay')?.classList.add('hidden');
    if (currentManualField) {
        currentManualField.classList.remove('manual-selected');
        currentManualField = null;
    }
}

export function clearManualPopup() {
    Object.keys(manualValues).forEach(key => delete manualValues[key]);
    Object.keys(manualMissFlags).forEach(key => delete manualMissFlags[key]);
    document.querySelectorAll('[id^="label-manual-"]').forEach(el => {
        el.innerText = '未選';
    });
    if (currentManualField) {
        currentManualField.classList.remove('manual-selected');
        currentManualField = null;
    }
    document.getElementById('manual-field-help').innerText = '請先點擊一個骰子欄位，然後在下方直接選擇數值。';
    document.getElementById('manual-selected-field').innerText = '無';
    document.getElementById('manual-selected-value').innerText = '未選';
    updateManualFieldsVisibility();
    updateManualMissButton();
}

export function calculateManualScenario() {
    let output = '';
    const scenario = manualScenario;
    const advOn = document.getElementById('manual-advantage-popup')?.checked;

    if (scenario === 'secondwind') {
        const d10 = getManualNumber('manual-secondwind-d10', 1, 10);
        if (!d10) {
            alert('請選擇回氣 d10。');
            return;
        }
        const baseBonus = getManualCombatBonus('secondWind') ?? 9;
        const total = d10 + baseBonus;
        output = `<b>🩸 【回氣】手動計算</b><br>` +
                 `• 公式：1d10 + ${baseBonus}<br>` +
                 `• 恢復骰: d10(${d10}) + ${baseBonus} = <b>${total}</b><br>`;
        try {
                const marked = window.markResourceTracker?.('secondwind');
                if (marked) {
                    window.appendLog?.(`<span class="text-secondary">[資源] 已記錄：回氣</span>`);
            }
        } catch (e) { /* ignore */ }
    } else if (scenario === 'ranged') {
        const d20 = getManualHitValue('manual-ranged-d20');
        const d20_2 = advOn ? getManualHitValue('manual-ranged-d20-adv-2') : null;
        const d8Value = getManualNumber('manual-ranged-d8', 1, 8);
        const d8 = getManualDamageValue('manual-ranged-d8', 8);
        const isDamageMiss = isManualMiss('manual-ranged-d8');
        
        if (advOn) {
            if (d20 === null && d20_2 === null && !isDamageMiss) {
                alert('請選擇遠程 d20 和遠程傷害 d8。');
                return;
            }
            const final = resolveManualHit(d20, d20_2);
            if (final === 'miss' || isDamageMiss) {
                output = `<b>❌ 手動遠程未命中</b><br>• 傷害：<b>0</b><br>`;
                window.log(output);
                return;
            }
            const oathDice = getManualDiceList('manual-ranged-oath-3d6', 3, 6);
            const usesOathBow = Array.isArray(oathDice);
            const totalOath = usesOathBow ? oathDice.reduce((sum, n) => sum + n, 0) : 0;
            const hitBonus = getManualCombatBonus('rangedHit') ?? 0;
            const damageBonus = getManualCombatBonus('rangedDamage') ?? 0;
            const isCrit = final >= 19;
            output = `<b>🎯 優勢長弓手動計算</b><br>` +
                     `• 命中 (取高): [${d20 === 'miss' ? 'X' : d20}, ${d20_2 === 'miss' ? 'X' : d20_2}] = <b>${final}</b> ${formatManualBonus(hitBonus)} = <b>${final + hitBonus}</b><br>`;
            if (isCrit) {
                const critD8 = getManualDiceList('manual-ranged-crit-d8', 2, 8);
                if (!critD8) {
                    alert('請輸入暴擊傷害骰 (2 顆 d8)。');
                    return;
                }
                const totalCritD8 = critD8.reduce((sum, n) => sum + n, 0);
                if (usesOathBow) {
                    const critDice = getManualDiceList('manual-ranged-crit-6d6', 6, 6);
                    if (!critDice) {
                        alert('請輸入所有誓約暴擊傷害骰 (6 顆 d6)。');
                        return;
                    }
                    const totalCritDice = critDice.reduce((sum, n) => sum + n, 0);
                    const totalCritDamage = totalCritD8 + totalCritDice + damageBonus;
                    output += `• 暴擊：所有傷害骰翻倍。<br>` +
                              `• 傷害：2d8(${critD8.join(',')}) + 6d6(${critDice.join(',')}) + ${damageBonus} = <b>${totalCritDamage}</b><br>`;
                } else {
                    output += `• 暴擊：所有傷害骰翻倍。<br>` +
                              `• 傷害：2d8(${critD8.join(',')}) + ${damageBonus} = <b>${totalCritD8 + damageBonus}</b><br>`;
                }
            } else {
                if (d8Value == null) {
                    alert('請選擇遠程 d20 和遠程傷害 d8。');
                    return;
                }
                if (usesOathBow) {
                    output += `• 公式：1d8 + 3d6 + ${damageBonus}<br>` +
                              `• 傷害：d8(${d8}) + 3d6(${oathDice.join(',')}) + ${damageBonus} = <b>${d8 + totalOath + damageBonus}</b><br>`;
                } else {
                    output += `• 公式：1d8 + ${damageBonus}<br>` +
                              `• 傷害：d8(${d8}) + ${damageBonus} = <b>${d8 + damageBonus}</b><br>`;
                }
            }
        } else {
            if (d20 === null && !isDamageMiss) {
                alert('請選擇遠程 d20 和遠程傷害 d8。');
                return;
            }
            if (d20 === 'miss' || isDamageMiss) {
                output = `<b>❌ 手動遠程未命中</b><br>• 傷害：<b>0</b><br>`;
                window.log(output);
                return;
            }
            const hitBonus = getManualCombatBonus('rangedHit') ?? 0;
            const damageBonus = getManualCombatBonus('rangedDamage') ?? 0;
            const hit = d20 + hitBonus;
            const isCrit = d20 >= 19;
            output = `<b>🏹 普通長弓手動計算</b><br>` +
                     `• 公式：1d8 + ${damageBonus}<br>` +
                     `• 命中：d20(${d20}) ${formatManualBonus(hitBonus)} = <b>${hit}</b><br>`;
            if (isCrit) {
                const critD8 = getManualDiceList('manual-ranged-crit-d8', 2, 8);
                if (!critD8) {
                    alert('請輸入暴擊傷害骰 (2 顆 d8)。');
                    return;
                }
                const totalCritD8 = critD8.reduce((sum, n) => sum + n, 0);
                output += `• 暴擊：所有傷害骰翻倍。<br>` +
                          `• 傷害：2d8(${critD8.join(',')}) + ${damageBonus} = <b>${totalCritD8 + damageBonus}</b><br>`;
            } else {
                if (d8Value == null) {
                    alert('請選擇遠程 d20 和遠程傷害 d8。');
                    return;
                }
                output += `• 傷害：d8(${d8}) + ${damageBonus} = <b>${d8 + damageBonus}</b><br>`;
            }
        }
    } else if (scenario === 'melee') {
        const h1 = getManualHitValue('manual-melee-h1');
        const h1Adv = getManualHitValue('manual-melee-h1-adv');
        const h2 = getManualHitValue('manual-melee-h2');
        const h2Adv = getManualHitValue('manual-melee-h2-adv');
        const h3 = getManualHitValue('manual-melee-h3');
        const h3Adv = getManualHitValue('manual-melee-h3-adv');
        const d1Value = getManualNumber('manual-melee-d1', 1, 6);
        const d2Value = getManualNumber('manual-melee-d2', 1, 6);
        const d3Value = getManualNumber('manual-melee-d3', 1, 4);
        const critD1Values = getManualDiceList('manual-melee-crit-d1', 2, 6);
        const critD2Values = getManualDiceList('manual-melee-crit-d2', 2, 6);
        const critD3Values = getManualDiceList('manual-melee-crit-d3', 2, 4);
        const d1 = getManualDamageValue('manual-melee-d1', 6);
        const d2 = getManualDamageValue('manual-melee-d2', 6);
        const d3 = getManualDamageValue('manual-melee-d3', 4);
        const anyHitInput = [h1, h1Adv, h2, h2Adv, h3, h3Adv].some(value => value === 'miss' || Number.isFinite(value));
        if (!anyHitInput) {
            alert('請選擇三個命中 d20 或標記部分攻擊未命中。');
            return;
        }
        const final1 = advOn ? resolveManualHit(h1, h1Adv) : h1;
        const final2 = advOn ? resolveManualHit(h2, h2Adv) : h2;
        const final3 = advOn ? resolveManualHit(h3, h3Adv) : h3;
        const isCrit1 = typeof final1 === 'number' && final1 >= 19;
        const isCrit2 = typeof final2 === 'number' && final2 >= 19;
        const isCrit3 = typeof final3 === 'number' && final3 >= 19;
        if (final1 !== 'miss' && !isCrit1 && d1Value == null) {
            alert('請選擇主手①的傷害骰，或標記該攻擊為未命中。');
            return;
        }
        if (final2 !== 'miss' && !isCrit2 && d2Value == null) {
            alert('請選擇主手②的傷害骰，或標記該攻擊為未命中。');
            return;
        }
        if (final3 !== 'miss' && !isCrit3 && d3Value == null) {
            alert('請選擇副手的傷害骰，或標記該攻擊為未命中。');
            return;
        }
        const hitBonus = getManualCombatBonus('meleeHit') ?? 0;
        const damageBonus = getManualCombatBonus('meleeDamage') ?? 0;
        const dmg1 = final1 === 'miss' ? 0 : (isCrit1 ? (critD1Values ? critD1Values.reduce((sum, n) => sum + n, 0) + damageBonus : 17) : d1 + damageBonus);
        const dmg2 = final2 === 'miss' ? 0 : (isCrit2 ? (critD2Values ? critD2Values.reduce((sum, n) => sum + n, 0) + damageBonus : 17) : d2 + damageBonus);
        const dmg3 = final3 === 'miss' ? 0 : (isCrit3 ? (critD3Values ? critD3Values.reduce((sum, n) => sum + n, 0) + damageBonus : 13) : d3 + damageBonus);
        output = `<b>⚔️ 近戰三刀手動計算</b><br>` +
                 `• 公式：1d6 + 1d6 + 1d4 + ${damageBonus + 10}<br>` +
                 `• 主手①：d20(${h1 === 'miss' ? 'X' : h1}${advOn ? `, ${h1Adv === 'miss' ? 'X' : h1Adv}` : ''}) 取高 = <b>${final1 === 'miss' ? '未命中' : final1}</b>${final1 === 'miss' ? '' : ` ${formatManualBonus(hitBonus)} = <b>${final1 + hitBonus}</b>`}${isCrit1 && final1 !== 'miss' ? ' <span class="crit-alert">[暴擊]</span>' : ''}<br>` +
                 `• 主手②：d20(${h2 === 'miss' ? 'X' : h2}${advOn ? `, ${h2Adv === 'miss' ? 'X' : h2Adv}` : ''}) 取高 = <b>${final2 === 'miss' ? '未命中' : final2}</b>${final2 === 'miss' ? '' : ` ${formatManualBonus(hitBonus)} = <b>${final2 + hitBonus}</b>`}${isCrit2 && final2 !== 'miss' ? ' <span class="crit-alert">[暴擊]</span>' : ''}<br>` +
                 `• 副手  ：d20(${h3 === 'miss' ? 'X' : h3}${advOn ? `, ${h3Adv === 'miss' ? 'X' : h3Adv}` : ''}) 取高 = <b>${final3 === 'miss' ? '未命中' : final3}</b>${final3 === 'miss' ? '' : ` ${formatManualBonus(hitBonus)} = <b>${final3 + hitBonus}</b>`}${isCrit3 && final3 !== 'miss' ? ' <span class="crit-alert">[暴擊]</span>' : ''}<br>` +
                 `• 傷害：主手① ${final1 === 'miss' ? '0(未命中)' : isCrit1 ? '2d6 + 5' : `1d6(${d1}) + ${damageBonus}`} = <b>${dmg1}</b><br>` +
                 `• 傷害：主手② ${final2 === 'miss' ? '0(未命中)' : isCrit2 ? '2d6 + 5' : `1d6(${d2}) + ${damageBonus}`} = <b>${dmg2}</b><br>` +
                 `• 傷害：副手 ${final3 === 'miss' ? '0(未命中)' : isCrit3 ? '2d4 + 5' : `1d4(${d3}) + ${damageBonus}`} = <b>${dmg3}</b><br>` +
                 `• 全部總傷：<b>${dmg1 + dmg2 + dmg3}</b><br>`;
    } else {
        alert('請先選擇場景。');
        return;
    }
    window.log(output);
}

export function recordManualMiss() {
    if (!currentManualField) {
        alert('請先選擇一個命中骰或傷害欄位，再記錄未命中。');
        return;
    }
    setRelatedMissForField(currentManualField);
    if (currentManualField.dataset.fieldType === 'damage') {
        document.getElementById('manual-selected-value').innerText = formatManualSelectedValue(currentManualField, null);
    } else {
        document.getElementById('manual-selected-value').innerText = formatManualSelectedValue(currentManualField, null);
    }
    const fieldName = currentManualField.querySelector('span')?.innerText || currentManualField.id;
    window.appendLog(`<b>❌ 手動未命中</b><br>• 已標記 ${fieldName} 為未命中<br>• 傷害：<b>0</b>`);
}

export function computeActualAttack(mode) {
    const inputOne = parseActualNumber('actual-d20', NaN);
    const inputTwo = parseActualNumber('actual-adv-d20-2', NaN);
    const hitBonus = getManualCombatBonus('rangedHit') ?? 0;
    if (mode === 'single') {
        if (!Number.isFinite(inputOne) || inputOne < 1 || inputOne > 20) {
            alert('請輸入有效的實際 d20 點數（1-20）。');
            return;
        }
        const isCrit = inputOne >= 19;
        const total = inputOne + hitBonus;
        window.appendLog(`<b>🎲 實際單發攻擊</b><br>• d20: ${inputOne} ${formatManualBonus(hitBonus)} = <b>${total}</b>` + (isCrit ? ` <span class="crit-alert">[ 暴擊！]</span>` : '') + `<br>• 結果: <b>${inputOne >= 10 ? '可能命中' : '可能未命中'}</b>`);
    } else if (mode === 'advantage') {
        if (!Number.isFinite(inputOne) || !Number.isFinite(inputTwo) || inputOne < 1 || inputOne > 20 || inputTwo < 1 || inputTwo > 20) {
            alert('請輸入兩個有效的實際優勢 d20 點數（1-20）。');
            return;
        }
        const best = Math.max(inputOne, inputTwo);
        const isCrit = best >= 19;
        const total = best + hitBonus;
        window.appendLog(`<b>🎲 實際優勢攻擊</b><br>• d20: [${inputOne}, ${inputTwo}] 取高 = <b>${best}</b> ${formatManualBonus(hitBonus)} = <b>${total}</b>` + (isCrit ? ` <span class="crit-alert">[ 暴擊！]</span>` : '') + `<br>• 結果: <b>${best >= 10 ? '可能命中' : '可能未命中'}</b>`);
    }
}

export function recordActualMiss() {
    const inputOne = parseActualNumber('actual-d20', NaN);
    const inputTwo = parseActualNumber('actual-adv-d20-2', NaN);
    if (Number.isFinite(inputOne) && inputOne >= 1 && inputOne <= 20 && Number.isFinite(inputTwo) && inputTwo >= 1 && inputTwo <= 20) {
        window.appendLog(`<b>❌ 實際未命中</b><br>• d20 單發: ${inputOne}<br>• 優勢: [${inputOne}, ${inputTwo}]`);
        return;
    }
    if (Number.isFinite(inputOne) && inputOne >= 1 && inputOne <= 20) {
        window.appendLog(`<b>❌ 實際未命中</b><br>• d20: ${inputOne}`);
        return;
    }
    alert('請先輸入實際 d20 點數，再點擊「記錄未命中」。');
}

export function computeActualDamage() {
    const values = document.getElementById('actual-damage-values').value.split(',').map(v => parseInt(v.trim(), 10)).filter(n => Number.isFinite(n) && n > 0);
    const bonus = parseActualNumber('actual-damage-bonus', 0);
    if (values.length === 0) {
        alert('請輸入至少一個實際傷害骰值。');
        return;
    }
    const total = values.reduce((sum, n) => sum + n, 0) + bonus;
    window.appendLog(`<b>💥 實際傷害計算</b><br>• 骰值: [${values.join(', ')}] + ${bonus} = <b>${total}</b> 結算傷害`);
}

export function rollSecondWind() {
    const die = getManualNumber('manual-secondwind-d10', 1, 10) ?? roll(10);
    const bonus = getManualCombatBonus('secondWind') ?? 9;
    const total = die + bonus;
    window.log(`<b>🩸 【回氣】補血結算</b><br>` +
        `• 恢復骰 (1d10): <b>${die}</b> | 固定加成: ${formatManualBonus(bonus)}<br>` +
        `👉 <b>總計恢復: <span style="color:var(--success)">${total}</span> 點生命值！</b> (附帶免借機位移 15 呎)`);
}

export function rollRanged(type) {
    const d20_1 = getManualNumber('manual-ranged-d20', 1, 20) ?? roll(20);
    const d20_2 = getManualNumber('manual-ranged-d20-adv-2', 1, 20) ?? roll(20);
    const manualD8 = getManualNumber('manual-ranged-d8', 1, 8);
    const advantageChecked = document.getElementById('manual-advantage')?.checked;
    const isAdvantage = type === 'oath' || (type === undefined && advantageChecked);

    if (!isAdvantage && type !== 'crit') {
        const hitBonus = getManualCombatBonus('rangedHit') ?? 0;
        const damageBonus = getManualCombatBonus('rangedDamage') ?? 0;
        const isCrit = d20_1 >= 19;
        const hitResult = d20_1 + hitBonus;
        const dmgDie = manualD8 ?? roll(8);
        let totalDmg = dmgDie + damageBonus;
        let output = `<b>🏹 長弓普通射擊 (單發)</b><br>` +
                     `• 命中檢定: d20(${d20_1}) ${formatManualBonus(hitBonus)} = <b>${hitResult}</b>` + (isCrit ? ` <span class="crit-alert">[ 暴擊！]</span>` : ``) + `<br>`;
        if (isCrit) {
            const dmgDie2 = roll(8);
            totalDmg = dmgDie + dmgDie2 + damageBonus;
            output += `• 傷害 (暴擊骰翻倍): 2d8(${dmgDie}+${dmgDie2}) + ${damageBonus} 👉 <b>物理傷害: <span style="color:var(--primary)">${totalDmg}</span> 點</b>`;
        } else {
            output += `• 傷害: d8(${dmgDie}) + ${damageBonus} 👉 <b>物理傷害: <b>${totalDmg}</b> 點</b>`;
        }
        window.log(output);
    } else if (isAdvantage && type !== 'crit') {
        const hitBonus = getManualCombatBonus('rangedHit') ?? 0;
        const damageBonus = getManualCombatBonus('rangedDamage') ?? 0;
        const finalD20 = Math.max(d20_1, d20_2);
        const isCrit = finalD20 >= 19;
        const hitResult = finalD20 + hitBonus;
        let output = `<b>🎯 誓約弓優勢射擊 (單發)</b><br>` +
                     `• 命中 (取高): [${d20_1}, ${d20_2}] 👉 <b>${finalD20}</b> ${formatManualBonus(hitBonus)} = <b>${hitResult}</b>` + (isCrit ? ` <span class="crit-alert">[ 暴擊！]</span>` : ``) + `<br>`;
        const d8 = manualD8 ?? roll(8);
        const oathDice = getManualDiceList('manual-ranged-oath-3d6', 3, 6) || [roll(6), roll(6), roll(6)];
        const totalOath = oathDice.reduce((a, b) => a + b, 0);
        if (isCrit) {
            const d8_2 = roll(8);
            const critDice = getManualDiceList('manual-ranged-crit-6d6', 6, 6) || [roll(6), roll(6), roll(6), roll(6), roll(6), roll(6)];
            const totalOathCrit = totalOath + critDice.reduce((a, b) => a + b, 0);
            const totalDamage = d8 + d8_2 + totalOathCrit + damageBonus;
            output += `• 傷害 (暴擊骰翻倍): 2d8(${d8}+${d8_2}) + 6d6 + ${damageBonus} 👉 <b class="crit-alert">暴擊總傷: ${totalDamage} 點穿刺！</b>`;
        } else {
            const totalDmg = d8 + totalOath + damageBonus;
            output += `• 傷害: d8(${d8}) + 誓約3d6(${totalOath}) + ${damageBonus} 👉 <b>總傷害: <span style="color:var(--warning)">${totalDmg}</span> 點穿刺！</b>`;
        }
        window.log(output);
    } else if (type === 'crit') {
        const maxD8 = 8;
        const maxD6 = 6;
        const damageBonus = getManualCombatBonus('rangedDamage') ?? 0;
        const totalDmg = maxD8 * 2 + maxD6 * 6 + damageBonus;
        window.log(`<b>🔥 誓約弓【絕對暴擊】傷害模擬</b><br>` +
            `• 長弓基礎骰 (2d8): ${maxD8 * 2} | 誓約追加骰 (6d6): ${maxD6 * 6} | 加成: ${formatManualBonus(damageBonus)}<br>` +
            `👉 <b class="crit-alert" style="font-size:1.1rem;">絕對暴擊總傷害: ${totalDmg} 點物理穿刺！</b>`);
    }
}

export function rollMeleeCombo() {
    const h1 = getManualNumber('manual-melee-h1', 1, 20) ?? roll(20);
    const h2 = getManualNumber('manual-melee-h2', 1, 20) ?? roll(20);
    const h3 = getManualNumber('manual-melee-h3', 1, 20) ?? roll(20);
    const manualD1 = getManualNumber('manual-melee-d1', 1, 999);
    const manualD2 = getManualNumber('manual-melee-d2', 1, 999);
    const manualD3 = getManualNumber('manual-melee-d3', 1, 999);
    const hitBonus = getManualCombatBonus('meleeHit') ?? 0;
    const damageBonus = getManualCombatBonus('meleeDamage') ?? 0;
    const d1 = manualD1 != null ? manualD1 + damageBonus : roll(6) + damageBonus;
    const d2 = manualD2 != null ? manualD2 + damageBonus : roll(6) + damageBonus;
    const d3 = manualD3 != null ? manualD3 + damageBonus : roll(4) + damageBonus;
    window.log(`<b>⚔️ 近戰雙刀流（三刀連砍結果）</b><br>` +
        `1️⃣ 主手短劍①: 命中 <b>${h1 + hitBonus}</b> | 傷害: <b>${d1}</b><br>` +
        `2️⃣ 主手短劍②: 命中 <b>${h2 + hitBonus}</b> | 傷害: <b>${d2}</b><br>` +
        `3️⃣ 副手匕首③: 命中 <b>${h3 + hitBonus}</b> | 傷害: <b>${d3}</b><br>` +
        `👉 <span style="color:var(--success)"><b>全中總傷估算：${d1 + d2 + d3} 點物理穿刺！</b></span>`);
}

function formatManualSelectedValue(field, value) {
    if (!field) return '未選';
    const hitBonus = field.id && field.id.startsWith('manual-ranged') ? getManualCombatBonus('rangedHit') : getManualCombatBonus('meleeHit');
    const damageBonus = field.id && field.id.startsWith('manual-ranged') ? getManualCombatBonus('rangedDamage') : getManualCombatBonus('meleeDamage');
    if (isManualMiss(field.id)) {
        if (field.dataset.fieldType === 'damage') {
            return '0(未命中)';
        }
        const hitValue = getManualNumber(field.id, 1, 20);
        if (hitValue != null) {
            const bonus = hitBonus ?? 0;
            return `d20(${hitValue}) ${formatManualBonus(bonus)} = ${hitValue + bonus} (未命中)`;
        }
        return 'X(未命中)';
    }
    if (field.dataset.fieldType === 'hit') {
        if (value == null) return '未選';
        const bonus = hitBonus ?? 0;
        const total = value + bonus;
        return `d20(${value}) ${formatManualBonus(bonus)} = ${total}`;
    }
    if (field.dataset.fieldType === 'damage') {
        const critBonus = field.dataset.critDouble === 'true' ? (damageBonus ?? 0) : (damageBonus ?? 0);
        if (field.dataset.critDouble === 'true') return `2d${field.dataset.dice} + ${critBonus}`;
        const rangedFormula = getRangedCritFormulaText(field, document.getElementById('manual-advantage-popup')?.checked);
        if (rangedFormula) return rangedFormula;
        if (value == null) return '未選';
        const sides = parseInt(field.dataset.dice, 10) || 0;
        const bonus = damageBonus ?? 0;
        const total = value + bonus;
        return `d${sides}(${value}) + ${bonus} = ${total}`;
    }
    return String(value);
}

export function selectManualField(id) {
    if (currentManualField) {
        currentManualField.classList.remove('manual-selected');
    }
    currentManualField = document.getElementById(id);
    if (currentManualField && currentManualField.disabled) {
        currentManualField = null;
    }
    if (currentManualField) {
        currentManualField.classList.add('manual-selected');
        document.getElementById('manual-field-help').innerText = `目前選擇：${currentManualField.querySelector('span').innerText}`;
        document.getElementById('manual-selected-field').innerText = currentManualField.querySelector('span').innerText;
        const savedValue = getManualNumber(currentManualField.id, 1, parseInt(currentManualField.dataset.dice, 10));
        document.getElementById('manual-selected-value').innerText = formatManualSelectedValue(currentManualField, savedValue);
    }
    updateDiceGridVisibility();
    updateManualMissButton();
}

export function setManualDiceValue(value, button) {
    if (!currentManualField || currentManualField.disabled) return;
    clearManualMiss(currentManualField.id);
    clearRelatedMissForField(currentManualField);
    manualValues[currentManualField.id] = value;
    const label = document.getElementById(`label-${currentManualField.id}`);
    if (label) {
        label.innerText = value;
    }
    document.getElementById('manual-selected-value').innerText = formatManualSelectedValue(currentManualField, value);
    if (button) {
        const grid = button.closest('.dice-picker-grid');
        if (grid) {
            grid.querySelectorAll('.dice-button').forEach(btn => btn.classList.remove('dice-selected'));
        }
        button.classList.add('dice-selected');
    }
    updateManualMissButton();
    if (currentManualField.dataset.fieldType === 'hit') {
        updateManualFieldsVisibility();
    }
}

function updateDiceGridVisibility() {
    const grids = ['dice-grid-d20', 'dice-grid-d10', 'dice-grid-d8', 'dice-grid-d6', 'dice-grid-d4'];
    grids.forEach(gridId => {
        const grid = document.getElementById(gridId);
        if (!grid) return;
        grid.style.display = 'none';
        grid.querySelectorAll('.dice-button').forEach(btn => btn.classList.remove('dice-selected'));
    });
    if (!currentManualField || currentManualField.disabled) return;
    if (currentManualField.dataset.fieldType === 'damage' && (currentManualField.dataset.critDouble === 'true' || isRangedCritFormulaField(currentManualField, document.getElementById('manual-advantage-popup')?.checked))) {
        const damageBonus = getManualCombatBonus(currentManualField.id.startsWith('manual-ranged') ? 'rangedDamage' : 'meleeDamage') ?? 0;
        document.getElementById('manual-selected-value').innerText = '2d' + currentManualField.dataset.dice + ' + ' + damageBonus;
    }
    const diceType = currentManualField.dataset.dice;
    const grid = document.getElementById(`dice-grid-d${diceType}`);
    if (grid) {
        grid.style.display = 'grid';
        const savedValue = getManualNumber(currentManualField.id, 1, parseInt(currentManualField.dataset.dice, 10));
        if (savedValue != null) {
            const buttons = grid.querySelectorAll('.dice-button');
            buttons.forEach(btn => {
                if (btn.innerText === String(savedValue)) {
                    btn.classList.add('dice-selected');
                }
            });
        }
    }
}

function updateManualMissButton() {
    const action = document.getElementById('manual-miss-action');
    const note = document.getElementById('manual-miss-note');
    if (!action || !note) return;
    const currentIsHitOrDamage = currentManualField?.dataset.fieldType === 'hit' || currentManualField?.dataset.fieldType === 'damage';
    const anyHitValue = Array.from(document.querySelectorAll('.manual-field[data-field-type="hit"]'))
        .some(field => getManualNumber(field.id, 1, parseInt(field.dataset.dice, 10)) !== null || isManualMiss(field.id));
    if (currentIsHitOrDamage || anyHitValue) {
        action.style.display = 'flex';
        note.innerText = currentIsHitOrDamage ? '當前選擇命中或傷害欄，可直接記錄未命中。' : '已有命中骰輸入，可直接記錄未命中。';
    } else {
        action.style.display = 'none';
    }
}

function evaluateCritsUI() {
    const advOn = document.getElementById('manual-advantage-popup')?.checked;
    if (manualScenario === 'melee') {
        for (let i = 1; i <= 3; i++) {
            const hId = `manual-melee-h${i}`;
            const hAdvId = `manual-melee-h${i}-adv`;
            const dId = `manual-melee-d${i}`;
            const h = getManualHitValue(hId);
            const hAdv = getManualHitValue(hAdvId);
            let final = null;
            if (advOn) {
                if (h != null && hAdv != null) final = Math.max(h, hAdv);
                else if (h != null) final = h;
                else if (hAdv != null) final = hAdv;
            } else {
                final = h != null ? h : null;
            }
            const dmgField = document.getElementById(dId);
            const dmgLabel = document.getElementById(`label-${dId}`);
            if (!dmgField || !dmgLabel) continue;
            if (final != null && final >= 19) {
                dmgField.dataset.critDouble = 'true';
                const sides = parseInt(dmgField.dataset.dice, 10) || 0;
                const damageBonus = getManualCombatBonus(dmgField.id.startsWith('manual-ranged') ? 'rangedDamage' : 'meleeDamage') ?? 0;
                dmgLabel.innerText = `2d${sides} + ${damageBonus}`;
            } else {
                if (dmgField.dataset.critDouble) delete dmgField.dataset.critDouble;
                if (isManualMiss(dId)) {
                    dmgLabel.innerText = '0(未命中)';
                } else {
                    const v = getManualNumber(dId, 1, parseInt(dmgField.dataset.dice, 10));
                    dmgLabel.innerText = v != null ? v : '未選';
                }
            }
        }
    }
    if (manualScenario === 'ranged') {
        const critActive = isManualRangedCrit(advOn);
        const rangedCritFields = Array.from(document.querySelectorAll('.manual-field[data-scenarios~="ranged"][data-field-type="damage"]'));
        rangedCritFields.forEach(field => {
            const label = document.getElementById(`label-${field.id}`);
            if (!label) return;
            const formulaText = getRangedCritFormulaText(field, advOn);
            if (formulaText) {
                label.innerText = formulaText;
                return;
            }
            if (field.dataset.requireCrit === 'true') {
                const value = getManualNumber(field.id, 1, parseInt(field.dataset.dice, 10));
                if (value != null) {
                    label.innerText = value;
                } else if (!critActive || !field.style.display || field.style.display === 'none') {
                    label.innerText = '未選';
                }
            }
        });
    }
    if (currentManualField && currentManualField.dataset.fieldType === 'damage') {
        if (currentManualField.dataset.critDouble === 'true') {
            const damageBonus = getManualCombatBonus(currentManualField.id.startsWith('manual-ranged') ? 'rangedDamage' : 'meleeDamage') ?? 0;
            document.getElementById('manual-selected-value').innerText = '2d' + currentManualField.dataset.dice + ' + ' + damageBonus;
        } else if (isRangedCritFormulaField(currentManualField, advOn)) {
            document.getElementById('manual-selected-value').innerText = getRangedCritFormulaText(currentManualField, advOn);
        } else if (isManualMiss(currentManualField.id)) {
            document.getElementById('manual-selected-value').innerText = '0(未命中)';
        }
    }
    updateDiceGridVisibility();
}

export function updateManualFieldsVisibility() {
    const advOn = document.getElementById('manual-advantage-popup')?.checked;
    const critOn = document.getElementById('manual-crit-popup')?.checked;
    const critTargets = {
        ranged: false,
        1: false,
        2: false,
        3: false
    };
    if (manualScenario === 'melee') {
        critTargets[1] = isManualMeleeCrit(1, advOn);
        critTargets[2] = isManualMeleeCrit(2, advOn);
        critTargets[3] = isManualMeleeCrit(3, advOn);
    }
    if (manualScenario === 'ranged') {
        critTargets.ranged = isManualRangedCrit(advOn);
    }
    const hitCritActive = Array.from(document.querySelectorAll('.manual-field[data-field-type="hit"]')).filter(field => {
        const scenarios = (field.dataset.scenarios || '').split(' ');
        return scenarios.includes(manualScenario);
    }).some(field => {
        const value = getManualHitValue(field.id);
        return typeof value === 'number' && value >= 19;
    });

    document.querySelectorAll('.manual-field').forEach(field => {
        const scenarios = (field.dataset.scenarios || '').split(' ');
        const requireAdv = field.dataset.requireAdv === 'true';
        const requireCrit = field.dataset.requireCrit === 'true';
        const critTarget = field.dataset.critTarget;
        const visible = scenarios.includes(manualScenario)
            && (!requireAdv || advOn)
            && (!requireCrit || critOn || (critTarget ? critTargets[critTarget] : hitCritActive));
        field.style.display = visible ? 'flex' : 'none';
        const critLocked = field.dataset.fieldType === 'damage' && !requireCrit && isManualDamageCritLocked(field);
        field.disabled = critLocked;
        field.classList.toggle('manual-field-disabled', critLocked);
    });

    if (currentManualField) {
        const fieldScenarios = (currentManualField.dataset.scenarios || '').split(' ');
        const requireAdv = currentManualField.dataset.requireAdv === 'true';
        const requireCrit = currentManualField.dataset.requireCrit === 'true';
        const critTarget = currentManualField.dataset.critTarget;
        const stillVisible = fieldScenarios.includes(manualScenario)
            && (!requireAdv || document.getElementById('manual-advantage-popup')?.checked)
            && (!requireCrit || document.getElementById('manual-crit-popup')?.checked || (critTarget ? critTargets[critTarget] : hitCritActive));
        if (!stillVisible || currentManualField.disabled) {
            currentManualField.classList.remove('manual-selected');
            currentManualField = null;
            document.getElementById('manual-selected-field').innerText = '無';
            document.getElementById('manual-selected-value').innerText = '未選';
        }
    }
    updateDiceGridVisibility();
    updateManualMissButton();
    evaluateCritsUI();
}

function isManualDamageCritLocked(field) {
    if (!field || field.dataset.fieldType !== 'damage' || field.dataset.requireCrit === 'true') return false;
    const advOn = document.getElementById('manual-advantage-popup')?.checked;
    const critOn = document.getElementById('manual-crit-popup')?.checked;
    if (manualScenario === 'ranged') {
        if (isRangedOathBowField(field)) {
            return Boolean(critOn || isManualRangedCrit(advOn));
        }
        return Boolean(critOn || isManualRangedCrit(advOn));
    }
    if (manualScenario === 'melee') {
        const group = field.dataset.attackGroup;
        if (!group) return false;
        const critTargets = {
            ranged: false,
            1: isManualMeleeCrit(1, advOn),
            2: isManualMeleeCrit(2, advOn),
            3: isManualMeleeCrit(3, advOn)
        };
        return Boolean(critOn || critTargets[group]);
    }
    return false;
}

export function setManualScenario(type) {
    if (type === 'advantage') {
        manualScenario = 'ranged';
        const advPopup = document.getElementById('manual-advantage-popup');
        if (advPopup) advPopup.checked = true;
        const critPopup = document.getElementById('manual-crit-popup');
        if (critPopup) critPopup.checked = false;
    } else if (type === 'crit') {
        manualScenario = 'ranged';
        const critPopup = document.getElementById('manual-crit-popup');
        if (critPopup) critPopup.checked = true;
        const advPopup = document.getElementById('manual-advantage-popup');
        if (advPopup) advPopup.checked = false;
    } else {
        manualScenario = type;
    }
    document.getElementById('manual-scenario-label').innerText = {
        secondwind: '回氣',
        ranged: '遠程',
        melee: '近戰'
    }[manualScenario] || '遠程';
    updateManualScenarioButtons();
    document.getElementById('manual-field-help').innerText = '請先點擊一個骰子欄位，然後在下方直接選擇數值。暴擊欄位會在 19-20 命中時自動顯示。';
    updateManualFieldsVisibility();
}

function updateManualScenarioButtons() {
    ['secondwind', 'ranged', 'melee'].forEach(mode => {
        const btn = document.getElementById(`manual-scenario-${mode}`);
        if (btn) {
            btn.classList.toggle('active', manualScenario === mode);
        }
    });
}
