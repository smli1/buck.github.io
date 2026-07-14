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
import { initializePopupInteractionHandlers } from './utils.js';
import { initializeCharacterSettings } from './character-settings.js';
import { createFiveEDataStore, exposeFiveEDataStoreToWindow } from './fivee-data.js';
import { createPopupManager } from './popup-manager.js';

let character = null;

function resolveDataUrl(filename) {
    return new URL(`./data/${filename}`, import.meta.url);
}

async function loadDefaultCharacterFromDataFile() {
    try {
        const res = await fetch(resolveDataUrl('character.player-1.json'), { cache: 'no-store' });
        if (res && res.ok) {
            const obj = await res.json();
            return obj && typeof obj === 'object' ? new Character(obj) : null;
        }
    } catch (e) {
        // ignore fetch errors and fall back to local storage / default constructor
    }
    return null;
}

function togglePageFlip(force) {
    const shell = document.getElementById('page-flip-shell');
    if (!shell) return false;
    const next = typeof force === 'boolean' ? force : !shell.classList.contains('is-flipped');
    shell.classList.toggle('is-flipped', next);

    const frontFace = shell.querySelector('.front-face');
    const backFace = shell.querySelector('.back-face');
    if (frontFace && backFace) {
        frontFace.classList.toggle('is-active', !next);
        backFace.classList.toggle('is-active', next);
    }

    document.querySelectorAll('[data-page-toggle]').forEach((button) => {
        button.textContent = next ? '⚔️ Battle' : '🎭 Role-Playing';
    });
    return next;
}

function attachPageFlipTouchHandlers() {
    const shell = document.getElementById('page-flip-shell');
    if (!shell) return;

    let startX = 0;
    let startY = 0;
    let isTouchSwipe = false;
    let hasHorizontalIntent = false;
    const threshold = 70;

    shell.addEventListener('touchstart', (event) => {
        // ignore page-flip when a popup (log) is being dragged
        if (window.__isDraggingPopup) return;
        // also ignore if the touch started inside the floating log panel
        try {
            const t = event.target;
            if (t && t.closest && t.closest('#floating-log-panel')) return;
        } catch (e) { /* ignore */ }
        const touch = event.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
        isTouchSwipe = true;
        hasHorizontalIntent = false;
    }, { passive: true });

    shell.addEventListener('touchmove', (event) => {
        if (window.__isDraggingPopup) return;
        if (!isTouchSwipe) return;
        const touch = event.touches[0];
        const deltaX = touch.clientX - startX;
        const deltaY = touch.clientY - startY;

        if (Math.abs(deltaY) > Math.abs(deltaX)) {
            isTouchSwipe = false;
            hasHorizontalIntent = false;
            return;
        }

        if (Math.abs(deltaX) > 12) {
            hasHorizontalIntent = true;
        }
    }, { passive: true });

    shell.addEventListener('touchend', (event) => {
        if (window.__isDraggingPopup) { isTouchSwipe = false; hasHorizontalIntent = false; return; }
        if (!isTouchSwipe || !hasHorizontalIntent) {
            isTouchSwipe = false;
            hasHorizontalIntent = false;
            return;
        }

        const touch = event.changedTouches[0];
        const deltaX = touch.clientX - startX;
        const deltaY = touch.clientY - startY;
        const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY);

        if (isHorizontalSwipe && Math.abs(deltaX) > threshold) {
            togglePageFlip(deltaX < 0);
        }

        isTouchSwipe = false;
        hasHorizontalIntent = false;
    }, { passive: true });

    shell.addEventListener('touchcancel', () => {
        isTouchSwipe = false;
        hasHorizontalIntent = false;
    }, { passive: true });
}

function attachPageScrollHandlers() {
    const scrollTargets = document.querySelectorAll('.sidebar, .content-area, .roleplay-page');

    scrollTargets.forEach((target) => {
        let touchStartY = 0;
        let touchStartX = 0;

        target.addEventListener('wheel', (event) => {
            const canScroll = target.scrollHeight > target.clientHeight;
            if (!canScroll || Math.abs(event.deltaY) === 0) return;

            const atTop = target.scrollTop <= 0;
            const atBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 1;
            if ((event.deltaY > 0 && !atBottom) || (event.deltaY < 0 && !atTop)) {
                event.preventDefault();
                target.scrollTop = Math.max(0, Math.min(target.scrollHeight - target.clientHeight, target.scrollTop + event.deltaY));
            }
        }, { passive: false });

        target.addEventListener('touchstart', (event) => {
            const touch = event.touches[0];
            touchStartY = touch.clientY;
            touchStartX = touch.clientX;
        }, { passive: true });

        target.addEventListener('touchmove', (event) => {
            const touch = event.touches[0];
            const deltaY = touch.clientY - touchStartY;
            const deltaX = touch.clientX - touchStartX;
            const canScroll = target.scrollHeight > target.clientHeight;

            if (!canScroll || Math.abs(deltaY) <= 2 || Math.abs(deltaY) < Math.abs(deltaX)) {
                return;
            }

            const atTop = target.scrollTop <= 0;
            const atBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 1;
            if ((deltaY > 0 && !atTop) || (deltaY < 0 && !atBottom)) {
                event.preventDefault();
                target.scrollTop -= deltaY;
                touchStartY = touch.clientY;
            }
        }, { passive: false });
    });
}

function syncBattleAppFromCharacter(battleApp, activeCharacter) {
    if (!battleApp?.model || !battleApp?.view || !activeCharacter) return;
    const nextState = activeCharacter.getState();
    battleApp.model.state.maxHp = nextState.maxHp;
    battleApp.model.state.currentHp = nextState.currentHp;
    battleApp.model.state.ac = nextState.ac;
    battleApp.model.state.longbowHit = nextState.longbowHit;
    battleApp.view.render(battleApp.model.getSnapshot());
}

function exposeBattleHelpers(viewModel) {
    window.modHP = (amt) => {
        const activeCharacter = window.character ?? null;
        if (activeCharacter?.adjustHp) {
            const before = Number(activeCharacter.getState?.().currentHp ?? activeCharacter.data?.currentHp ?? 0);
            const result = activeCharacter.adjustHp(amt);
            const after = Number(result?.after ?? activeCharacter.getState?.().currentHp ?? activeCharacter.data?.currentHp ?? before);
            const changeText = amt > 0 ? `+${amt}` : `${amt}`;
            const tone = amt >= 0 ? 'var(--success)' : 'var(--primary)';
            viewModel?.log?.(`<span style='color:${tone}'>[HP 變更] ${changeText} → ${before} → ${after}</span>`);
            syncBattleAppFromCharacter(viewModel, activeCharacter);
            return result;
        }
        return viewModel?.modHP?.(amt);
    };
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

async function renderFiveECharacterDetails() {
    const resultsEl = document.getElementById('fivee-generated-details');
    const generateButton = document.getElementById('fivee-generate-btn');
    if (!resultsEl) return;

    const activeCharacter = window.character;
    if (!activeCharacter) {
        resultsEl.innerHTML = '<div style="font-size:0.9rem; color:#fda4af;">角色尚未初始化</div>';
        return;
    }

    if (generateButton) generateButton.disabled = true;
    resultsEl.innerHTML = '<div style="font-size:0.9rem; color:var(--text-muted);">正在從 5e 資料生成角色內容…</div>';

    try {
        const store = window.fiveEDataStore;
        if (!store?.buildCharacter5eInsights) {
            resultsEl.innerHTML = '<div style="font-size:0.9rem; color:#fda4af;">5e 資料介面尚未載入</div>';
            return;
        }

        const insights = await store.buildCharacter5eInsights(activeCharacter);
        const backgroundName = insights.background?.name || insights.backgroundName || '—';
        const className = insights.classEntry?.name || insights.className || '—';
        const backgroundSkillsHtml = (insights.backgroundSkills || []).slice(0, 4).map((name) => `<span style="display:inline-block; padding:4px 8px; border-radius:999px; background:rgba(255,255,255,0.06); margin:2px; font-size:0.8rem;">${name}</span>`).join('');
        const backgroundToolsHtml = (insights.backgroundTools || []).slice(0, 4).map((name) => `<span style="display:inline-block; padding:4px 8px; border-radius:999px; background:rgba(255,255,255,0.06); margin:2px; font-size:0.8rem;">${name}</span>`).join('');
        const featHtml = (insights.featSummaries || []).map((name) => `<li style="margin:4px 0;">${name}</li>`).join('');
        const styleHtml = (insights.battleStyles || []).map((name) => `<li style="margin:4px 0;">${name}</li>`).join('');
        const featureHtml = (insights.classFeatures || []).map((name) => `<li style="margin:4px 0;">${name}</li>`).join('');
        const resourceHtml = (insights.resources || []).map((item) => `<div style="display:flex; justify-content:space-between; gap:8px; font-size:0.85rem; color:var(--text-muted);"><span>${item.label}</span><strong style="color:var(--text-main);">${item.value}</strong></div>`).join('');

        resultsEl.innerHTML = `
            <div style="display:grid; gap:10px;">
                <div style="padding:8px; border:1px solid var(--border-color); border-radius:8px; background:rgba(255,255,255,0.03);">
                    <div style="font-weight:700; color:var(--secondary); margin-bottom:6px;">背景</div>
                    <div style="font-weight:600; color:var(--text-main);">${backgroundName}</div>
                    <div style="margin-top:6px;">${backgroundSkillsHtml ? `<div style="margin-bottom:6px;"><strong>技能：</strong>${backgroundSkillsHtml}</div>` : ''}${backgroundToolsHtml ? `<div><strong>工具：</strong>${backgroundToolsHtml}</div>` : ''}</div>
                </div>
                <div style="padding:8px; border:1px solid var(--border-color); border-radius:8px; background:rgba(255,255,255,0.03);">
                    <div style="font-weight:700; color:var(--secondary); margin-bottom:6px;">職業</div>
                    <div style="font-weight:600; color:var(--text-main);">${className}</div>
                    <ul style="margin:6px 0 0 16px; padding:0; color:var(--text-muted); font-size:0.85rem;">${featureHtml || '<li>無可顯示的職業特性</li>'}</ul>
                </div>
                <div style="padding:8px; border:1px solid var(--border-color); border-radius:8px; background:rgba(255,255,255,0.03);">
                    <div style="font-weight:700; color:var(--secondary); margin-bottom:6px;">專長</div>
                    <ul style="margin:6px 0 0 16px; padding:0; color:var(--text-muted); font-size:0.85rem;">${featHtml || '<li>目前尚未設定專長</li>'}</ul>
                </div>
                <div style="padding:8px; border:1px solid var(--border-color); border-radius:8px; background:rgba(255,255,255,0.03);">
                    <div style="font-weight:700; color:var(--secondary); margin-bottom:6px;">戰鬥風格 / 特性</div>
                    <ul style="margin:6px 0 0 16px; padding:0; color:var(--text-muted); font-size:0.85rem;">${styleHtml || '<li>目前沒有可顯示的戰鬥風格</li>'}</ul>
                </div>
                <div style="padding:8px; border:1px solid var(--border-color); border-radius:8px; background:rgba(255,255,255,0.03);">
                    <div style="font-weight:700; color:var(--secondary); margin-bottom:6px;">資源</div>
                    <div style="display:grid; gap:6px;">${resourceHtml}</div>
                </div>
            </div>`;
    } catch (error) {
        resultsEl.innerHTML = `<div style="font-size:0.9rem; color:#fda4af;">生成失敗：${String(error?.message || error)}</div>`;
    } finally {
        if (generateButton) generateButton.disabled = false;
    }
}

function initializeFiveEDataLookup() {
    const generateButton = document.getElementById('fivee-generate-btn');
    if (!generateButton) return;

    generateButton.addEventListener('click', () => renderFiveECharacterDetails());
    renderFiveECharacterDetails();
}

window.addEventListener('DOMContentLoaded', () => {
    (async () => {
        // Prefer the bundled default character file first so the panel loads a known initial state.
        // This also works on GitHub Pages because the URLs are resolved relative to the app module location.
        let saved = await loadDefaultCharacterFromDataFile();

        window.DB = { feats: null, styles: null, skills: null, equipment: null };
        const fiveEDataStore = createFiveEDataStore();
        exposeFiveEDataStoreToWindow(fiveEDataStore);
        window.lookupFiveEData = async (collection, query, limit = 8) => {
            const store = window.fiveEDataStore;
            if (!store) return [];
            const name = String(collection || '').trim() || 'backgrounds';
            const term = String(query || '').trim();
            if (term) {
                const results = await store.search(name, term);
                return Array.isArray(results) ? results.slice(0, limit) : [];
            }
            const results = await store.getCollection(name);
            return Array.isArray(results) ? results.slice(0, limit) : [];
        };
        try {
            const [featsRes, stylesRes, equipRes] = await Promise.allSettled([
                fetch(resolveDataUrl('feats.json'), { cache: 'no-store' }),
                fetch(resolveDataUrl('style.json'), { cache: 'no-store' }),
                fetch(resolveDataUrl('equipment.json'), { cache: 'no-store' })
            ]);
            const db = { feats: null, styles: null, skills: null, equipment: null };
            if (featsRes.status === 'fulfilled' && featsRes.value.ok) db.feats = await featsRes.value.json();
            if (stylesRes.status === 'fulfilled' && stylesRes.value.ok) {
                db.styles = await stylesRes.value.json();
                db.skills = db.styles;
            }
            if (equipRes.status === 'fulfilled' && equipRes.value.ok) db.equipment = await equipRes.value.json();
            window.DB = db;
            if (character && typeof character._syncDerivedStats === 'function') {
                character._syncDerivedStats();
            }
        } catch (e) {
            window.DB = { feats: null, styles: null, skills: null, equipment: null };
        }

        if (!saved) saved = Character.load?.() ?? null;
        character = saved ?? new Character();
        if (character && typeof character._syncDerivedStats === 'function') {
            character._syncDerivedStats();
        }
    const battleApp = createBattleApp(character.getState());
    exposeBattleHelpers(battleApp);

    window.character = character;
    window.togglePageFlip = togglePageFlip;
    window.setCharacter = (key, value) => character.set(key, value);
    const logCharacterAction = (message) => window.appendLog?.(`<span style="color:var(--secondary)">[角色] ${message}</span>`);
    window.saveCharacter = () => {
        const saved = character.save();
        logCharacterAction(saved ? '已儲存角色資料' : '儲存角色資料失敗');
        return saved;
    };
    window.exportCharacterToFile = (filename) => {
        const exported = character.exportToFile?.(filename);
        logCharacterAction(exported ? '已匯出角色檔案' : '匯出角色檔案失敗');
        return exported;
    };
    window.importCharacterFile = async (fileOrFileList) => {
        const file = fileOrFileList?.files ? fileOrFileList.files[0] : (fileOrFileList?.[0] || fileOrFileList);
        if (!file) {
            logCharacterAction('匯入失敗：未提供檔案');
            return Promise.reject(new Error('No file provided'));
        }
        await character.loadFromFile(file);
        syncBattleAppFromCharacter(battleApp, character);
        try { settingsController?.renderTrackerResourcesFromCharacter?.(); } catch (e) { /* ignore */ }
        try { settingsController?.setInventoryFormState?.(); } catch (e) { /* ignore */ }
        logCharacterAction(`已載入角色檔案：${file.name || '未命名角色'}`);
        return true;
    };

    window.__popupManager = createPopupManager();
    const settingsController = initializeCharacterSettings({
        getCharacter: () => character,
        getBattleApp: () => battleApp,
        importCharacterFile: (file) => window.importCharacterFile(file),
        appendLog: (html) => window.appendLog?.(html)
    });

    window.openSettingsPopup = settingsController.openSettingsPopup;
    window.closeSettingsPopup = settingsController.closeSettingsPopup;
    window.openInventoryPopup = settingsController.openInventoryPopup;
    window.closeInventoryPopup = settingsController.closeInventoryPopup;
    window.saveInventoryFromForm = settingsController.saveInventoryFromForm;
    window.addInventoryItem = settingsController.addInventoryItem;
    window.handleInventoryListClick = settingsController.handleInventoryListClick;
    window.setInventoryFormState = settingsController.setInventoryFormState;
    window.renderInventoryList = settingsController.renderInventoryList;
    window.toggleInventoryDeleteMode = settingsController.toggleInventoryDeleteMode;

    settingsController.setInventoryFormState();

    window.switchSettingsTab = (tab) => {
        const buttons = document.querySelectorAll('.settings-tab-btn');
        const panels = document.querySelectorAll('.settings-tab-panel');
        const targetPanelId = `settings-${tab === 'character' ? 'character' : 'import'}-tab`;
        const shell = document.getElementById('settings-tab-shell');
        const targetPanel = document.getElementById(targetPanelId);
        const currentHeight = shell?.offsetHeight || 0;
        buttons.forEach((btn) => btn.classList.toggle('active', btn.dataset.tab === tab));
        panels.forEach((panel) => panel.classList.toggle('active', panel.id === targetPanelId));
        if (shell && targetPanel) {
            shell.style.height = `${currentHeight}px`;
            requestAnimationFrame(() => {
                shell.style.height = `${targetPanel.scrollHeight}px`;
            });
        }
    };
    window.applyCharacterSetupFromForm = settingsController.applyCharacterSetupFromForm;
    window.resetCharacterSetupForm = settingsController.resetCharacterSetupForm;
    window.renderSettingsSummary = settingsController.renderSettingsSummary;
    window.renderCharacterSetupForm = settingsController.renderCharacterSetupForm;
    window.markResourceTracker = settingsController.markResourceTracker;

    window.applyBackground = (name, bonuses) => character.applyBackground?.(name, bonuses);
    window.fetchBackgroundBonuses = async (name) => character.fetchBackgroundBonusesFromSite ? await character.fetchBackgroundBonusesFromSite(name) : null;
    window.applyBackgroundByName = async (name) => {
        if (!character) return null;
        if (character.applyBackgroundByName) return await character.applyBackgroundByName(name);
        return null;
    };

    settingsController.attachImportDropzone();
    settingsController.bindCharacterChange();
    attachPageFlipTouchHandlers();
    attachPageScrollHandlers();
    exposeManualHelpers();
    initializeFiveEDataLookup();
    document.addEventListener('click', (event) => {
        settingsController.handleTrackedButtonClick(event);
        settingsController.handleTrackerRestButtonClick(event);
        if (event.target.closest('#inventory-list')) {
            settingsController.handleInventoryListClick(event);
        }
    });
    document.addEventListener('change', (event) => {
        settingsController.handleTrackerCheckboxChange(event);
        if (event.target.closest('#inventory-list')) {
            settingsController.handleInventoryListChange(event);
        }
    });

    initializeManualButtons();
    initializeKeywordTooltips();
    initializePopupInteractionHandlers();

    settingsController.renderDerivedStatsText();
    settingsController.renderCharPanelSummary();
    settingsController.renderCharacterSetupForm();
        })();
});
