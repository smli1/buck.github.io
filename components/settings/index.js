import { createCharacterSetup } from './character-setup.js';
import { createResourceTracker } from './resource-tracker.js';
import { initializeKeywordTooltips } from '../../ui/tooltip.js';
import { bringElementToFront } from '../../ui/interactions.js';
import { createPopupManager } from '../../ui/popup-manager.js';
import { initializeInventoryController } from '../inventory/index.js';

export function initializeCharacterSettings({
    getCharacter,
    getBattleApp,
    importCharacterFile,
    appendLog
}) {
    const popupManager = createPopupManager();
    const characterSetup = createCharacterSetup({ getCharacter });
    const resourceTracker = createResourceTracker({ getCharacter, appendLog });
    const inventoryController = initializeInventoryController({
        getCharacter,
        appendLog,
        initializeKeywordTooltips,
        bringElementToFront
    });

    function openSettingsPopup() {
        const overlay = document.getElementById('settings-overlay');
        if (!overlay) return;
        popupManager.setActivePopup(overlay, 'settings');
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
        try {
            window.switchSettingsTab?.('character');
            characterSetup.renderSettingsSummary();
            characterSetup.renderCharacterSetupForm();
            resourceTracker.renderTrackerResourcesFromCharacter();
        } catch (e) { /* ignore */ }
    }

    function closeSettingsPopup(event) {
        const overlay = document.getElementById('settings-overlay');
        if (event && event.target !== overlay) {
            return;
        }
        if (!overlay) return;
        popupManager.closeActivePopup(overlay, 'settings');
        const popup = overlay.querySelector('.manual-popup');
        if (popup) {
            popup.style.opacity = '0';
            popup.style.transform = 'translateY(10px)';
        }
    }

    function refreshDynamicTooltips() {
        const activeCharacter = getCharacter?.() ?? window.character ?? null;
        if (!activeCharacter) return;
        document.querySelectorAll('.keyword[data-tooltip-key]').forEach((el) => {
            const key = el.dataset.tooltipKey;
            const text = activeCharacter.getTooltipText?.(key) || el.dataset.tooltip;
            if (text) {
                el.dataset.tooltip = text;
            }
        });
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
        const activeCharacter = getCharacter?.() ?? window.character ?? null;
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
                    characterSetup.renderSettingsSummary();
                    characterSetup.renderCharacterSetupForm();
                }
            } catch (e) {}
            try { resourceTracker.renderTrackerResourcesFromCharacter(); } catch (e) {}
            try { refreshDynamicTooltips(); } catch (e) {}
            try { characterSetup.renderDerivedStatsText(); } catch (e) {}
            try { characterSetup.renderCharPanelSummary(); } catch (e) {}
        });
    }

    return {
        ...characterSetup,
        ...resourceTracker,
        ...inventoryController,
        openSettingsPopup,
        closeSettingsPopup,
        refreshDynamicTooltips,
        attachImportDropzone,
        bindCharacterChange
    };
}
