import { Character } from '../core/character.js';
import { createBattleApp } from '../components/battle/index.js';
import { initializeManualButtons } from '../components/combat/manual-dice.js';
import { renderCombatPanels } from '../components/combat/combat-panel.js';
import { initializeCharacterSettings } from '../components/settings/index.js';
import { createFiveEDataStore, exposeFiveEDataStoreToWindow } from '../core/fivee-data.js';
import { createPopupManager } from '../ui/popup-manager.js';
import { initializeKeywordTooltips } from '../ui/tooltip.js';
import { initializePopupInteractionHandlers } from '../ui/interactions.js';
import { loadDefaultCharacterFromDataFile, loadGameData } from './data-loading.js';
import { exposeBattleHelpers, exposeManualHelpers } from './window-exposure.js';
import { togglePageFlip, attachPageFlipTouchHandlers, attachPageScrollHandlers } from './page-interactions.js';

export async function initializeApp() {
    let character = null;
    let battleApp = null;
    let settingsController = null;

    // Load default character from data file
    let saved = await loadDefaultCharacterFromDataFile();

    // Initialize 5e data store
    window.DB = { feats: null, styles: null, skills: null, equipment: null };
    const fiveEDataStore = createFiveEDataStore();
    exposeFiveEDataStoreToWindow(fiveEDataStore);
    
    // Setup 5e data lookup
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

    // Load game data
    const db = await loadGameData();
    window.DB = db;
    
    // Sync character stats if character exists
    if (character && typeof character._syncDerivedStats === 'function') {
        character._syncDerivedStats();
    }

    // Fallback to local storage if no saved character
    if (!saved) saved = Character.load?.() ?? null;
    character = saved ?? new Character();
    
    if (character && typeof character._syncDerivedStats === 'function') {
        character._syncDerivedStats();
    }

    // Create battle app
    battleApp = createBattleApp(character.getState());
    exposeBattleHelpers(battleApp);

    // Set up global character reference
    window.character = character;
    window.togglePageFlip = togglePageFlip;
    window.setCharacter = (key, value) => character.set(key, value);
    
    // Character action logging
    const logCharacterAction = (message) => window.appendLog?.(`<span style="color:var(--secondary)">[角色] ${message}</span>`);
    
    // Character save/export/import functions
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

    // Initialize popup manager
    window.__popupManager = createPopupManager();

    // Swap the active character (used by the merged character-select launch flow)
    window.switchCharacter = (payload) => {
        const next = new Character(payload);
        character = next;
        window.character = character;
        window.setCharacter = (key, value) => character.set(key, value);
        syncBattleAppFromCharacter(battleApp, character);
        try { settingsController?.renderCharacterSetupForm?.(); } catch (e) { /* ignore */ }
        try { settingsController?.renderSettingsSummary?.(); } catch (e) { /* ignore */ }
        try { settingsController?.renderDerivedStatsText?.(); } catch (e) { /* ignore */ }
        try { settingsController?.renderCharPanelSummary?.(); } catch (e) { /* ignore */ }
        try { settingsController?.renderTrackerResourcesFromCharacter?.(); } catch (e) { /* ignore */ }
        try { settingsController?.setInventoryFormState?.(); } catch (e) { /* ignore */ }
        try { settingsController?.renderInventoryList?.(); } catch (e) { /* ignore */ }
        try { settingsController?.refreshDynamicTooltips?.(); } catch (e) { /* ignore */ }
        renderCombatPanels().catch((err) => console.error('renderCombatPanels(switch) failed:', err));
        settingsController?.bindCharacterChange?.();
        logCharacterAction(`已切換角色：${character.data?.name || '未命名角色'}`);
        return true;
    };

    // Initialize character settings
    settingsController = initializeCharacterSettings({
        getCharacter: () => character,
        getBattleApp: () => battleApp,
        importCharacterFile: (file) => window.importCharacterFile(file),
        appendLog: (html) => window.appendLog?.(html)
    });

    // Expose settings functions to window
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

    // Set initial inventory state
    settingsController.setInventoryFormState();

    // Settings tab switching
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

    // Character setup functions
    window.applyCharacterSetupFromForm = settingsController.applyCharacterSetupFromForm;
    window.resetCharacterSetupForm = settingsController.resetCharacterSetupForm;
    window.renderSettingsSummary = settingsController.renderSettingsSummary;
    window.renderCharacterSetupForm = settingsController.renderCharacterSetupForm;
    window.markResourceTracker = settingsController.markResourceTracker;

    // Background functions
    window.applyBackground = (name, bonuses) => character.applyBackground?.(name, bonuses);
    window.fetchBackgroundBonuses = async (name) => character.fetchBackgroundBonusesFromSite ? await character.fetchBackgroundBonusesFromSite(name) : null;
    window.applyBackgroundByName = async (name) => {
        if (!character) return null;
        if (character.applyBackgroundByName) return await character.applyBackgroundByName(name);
        return null;
    };

    // Attach event handlers
    settingsController.attachImportDropzone();
    settingsController.bindCharacterChange();
    attachPageFlipTouchHandlers();
    attachPageScrollHandlers();
    exposeManualHelpers();

    // 5e character details rendering
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

    // Global click and change handlers
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

    // Initialize UI components
    initializeManualButtons();
    initializeKeywordTooltips();
    initializePopupInteractionHandlers();
    initializeFiveEDataLookup();

    // Render initial state
    settingsController.renderDerivedStatsText();
    settingsController.renderCharPanelSummary();
    settingsController.renderCharacterSetupForm();
    renderCombatPanels().catch((err) => console.error('renderCombatPanels(init) failed:', err));

    return { character, battleApp, settingsController };
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
