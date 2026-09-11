import { bringElementToFront } from '../../ui/interactions.js';
import { 
    manualValues, 
    manualMissFlags, 
    getManualNumber, 
    setManualValue,
    getManualCombatBonus,
    formatManualBonus
} from './manual-calculator.js';

let currentManualField = null;
let manualScenario = 'ranged';

function isManualMiss(id) {
    return manualMissFlags[id] === true;
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
        if (overlay.classList.contains('hidden')) {
            overlay.style.display = 'none';
        }
    }, 220);
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
    if (!currentManualField) return;
    const id = currentManualField.id;
    setManualValue(id, value);
    
    const label = document.getElementById(`label-${id}`);
    if (label) {
        label.innerText = value;
    }
    
    clearRelatedMissForField(currentManualField);
    document.getElementById('manual-selected-value').innerText = formatManualSelectedValue(currentManualField, value);
    updateManualMissButton();
}

export function setManualScenario(scenario) {
    manualScenario = scenario;
    updateManualFieldsVisibility();
}

function updateManualFieldsVisibility() {
    // Hide all manual fields first
    document.querySelectorAll('.manual-field').forEach(field => {
        field.style.display = 'none';
    });
    
    // Show fields based on scenario
    if (manualScenario === 'ranged') {
        document.querySelectorAll('[id^="manual-ranged"]').forEach(field => {
            field.style.display = '';
        });
    } else if (manualScenario === 'melee') {
        document.querySelectorAll('[id^="manual-melee"]').forEach(field => {
            field.style.display = '';
        });
    } else if (manualScenario === 'secondwind') {
        document.getElementById('manual-secondwind-d10').style.display = '';
    }
}

function updateDiceGridVisibility() {
    // Show appropriate dice grid based on selected field
    if (!currentManualField) return;
    
    const diceSize = currentManualField.dataset.dice;
    document.querySelectorAll('.dice-grid-container').forEach(grid => {
        grid.style.display = 'none';
    });
    
    if (diceSize) {
        const grid = document.getElementById(`dice-grid-d${diceSize}`);
        if (grid) grid.style.display = 'flex';
    }
}

function updateManualMissButton() {
    const button = document.getElementById('manual-miss-btn');
    if (!button) return;
    
    if (currentManualField) {
        button.disabled = false;
        button.title = '記錄未命中';
    } else {
        button.disabled = true;
        button.title = '請先選擇一個欄位';
    }
}
