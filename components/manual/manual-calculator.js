import { roll } from '../../utils/dice.js';

const manualValues = {};
const manualMissFlags = {};

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

export function calculateManualScenario(scenario, advOn) {
    let output = '';

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
                 `• 傷手：副手 ${final3 === 'miss' ? '0(未命中)' : isCrit3 ? '2d4 + 5' : `1d4(${d3}) + ${damageBonus}`} = <b>${dmg3}</b><br>` +
                 `• 全部總傷：<b>${dmg1 + dmg2 + dmg3}</b><br>`;
    } else {
        alert('請先選擇場景。');
        return;
    }
    window.log(output);
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

export function setManualValue(id, value) {
    manualValues[id] = value;
}

export { manualValues, manualMissFlags, getManualNumber };
