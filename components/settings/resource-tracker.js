export function createResourceTracker({ getCharacter, appendLog }) {
    function getActiveCharacter() {
        return getCharacter?.() ?? window.character ?? null;
    }

    function getTrackerRowByResource(resourceKey) {
        return document.querySelector(`.tracker-row[data-resource="${resourceKey}"]`) || document.querySelector(`.tracker-row input[data-resource-group="${resourceKey}"]`)?.closest('.tracker-row');
    }

    function getTrackerResourceSnapshot(resourceKey, row = null) {
        const targetRow = row || getTrackerRowByResource(resourceKey);
        if (!targetRow) return null;
        const boxes = Array.from(targetRow.querySelectorAll('input[type="checkbox"]'));
        return boxes.map((box) => Boolean(box.checked));
    }

    function syncTrackerResourcesToCharacter() {
        const activeCharacter = getActiveCharacter();
        if (!activeCharacter) return false;
        const snapshot = {};
        const rows = Array.from(document.querySelectorAll('.tracker-row'));
        rows.forEach((row) => {
            const resourceKey = row.dataset.resource || row.querySelector('input[data-resource-group]')?.dataset.resourceGroup || null;
            if (!resourceKey) return;
            const values = getTrackerResourceSnapshot(resourceKey, row);
            if (values && values.length) snapshot[resourceKey] = values;
        });
        const prev = activeCharacter.getState?.().resources ?? {};
        if (JSON.stringify(prev) === JSON.stringify(snapshot)) return false;
        activeCharacter.set?.('resources', snapshot);
        return true;
    }

    function renderTrackerResourcesFromCharacter() {
        const activeCharacter = getActiveCharacter();
        if (!activeCharacter) return;
        const trackedResources = activeCharacter.getState?.().resources ?? {};
        const rows = Array.from(document.querySelectorAll('.tracker-row'));
        rows.forEach((row) => {
            const resourceKey = row.dataset.resource || row.querySelector('input[data-resource-group]')?.dataset.resourceGroup || null;
            if (!resourceKey) return;
            const values = Array.isArray(trackedResources[resourceKey]) ? trackedResources[resourceKey] : null;
            const boxes = Array.from(row.querySelectorAll('input[type="checkbox"]'));
            if (!boxes.length || !values || values.length !== boxes.length) {
                boxes.forEach((box) => { box.checked = false; });
                return;
            }
            boxes.forEach((box, index) => { box.checked = Boolean(values[index]); });
        });
    }

    function markResourceTracker(resourceKey) {
        const group = document.querySelector(`.checkbox-group[data-resource-group="${resourceKey}"]`);
        if (group) {
            const boxes = Array.from(group.querySelectorAll('input[type="checkbox"]'));
            const target = boxes.find((box) => !box.checked);
            if (!target) return false;
            target.checked = true;
            syncTrackerResourcesToCharacter();
            return true;
        }
        const row = getTrackerRowByResource(resourceKey);
        if (row) {
            const boxes = Array.from(row.querySelectorAll('input[type="checkbox"]'));
            const target = boxes.find((box) => !box.checked);
            if (!target) return false;
            target.checked = true;
            syncTrackerResourcesToCharacter();
            return true;
        }
        return false;
    }

    function restoreTrackerResource(resourceKey, mode = 'short') {
        const row = document.querySelector(`.tracker-row[data-resource="${resourceKey}"]`) || document.querySelector(`.tracker-row input[data-resource-group="${resourceKey}"]`)?.closest('.tracker-row');
        if (!row) return false;
        const boxes = Array.from(row.querySelectorAll('input[type="checkbox"]'));
        if (!boxes.length) return false;
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
        syncTrackerResourcesToCharacter();
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
        syncTrackerResourcesToCharacter();
        appendLog?.(`<span style="color:var(--secondary)">[資源] ${action}：${label}${suffix}</span>`);
    }

    return {
        syncTrackerResourcesToCharacter,
        renderTrackerResourcesFromCharacter,
        markResourceTracker,
        restoreTrackerResource,
        restoreAllTrackerResources,
        handleTrackedButtonClick,
        handleTrackerRestButtonClick,
        handleTrackerCheckboxChange
    };
}
