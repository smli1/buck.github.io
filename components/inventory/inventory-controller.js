export function createInventoryController({
    getCharacter,
    appendLog
}) {
    function getActiveCharacter() {
        return getCharacter?.() ?? window.character ?? null;
    }

    function normalizeInventoryItems(items) {
        if (Array.isArray(items)) {
            return items
                .filter(Boolean)
                .map((item) => {
                    if (typeof item === 'string') return { name: item, quantity: 1, description: '' };
                    const name = String(item?.name || item?.label || '').trim();
                    const quantity = Number.isFinite(Number(item?.quantity)) ? Number(item.quantity) : 1;
                    const description = String(item?.description || item?.desc || '').trim();
                    return { name, quantity: Math.max(0, quantity), description };
                })
                .filter((item) => item.name);
        }
        if (typeof items === 'string') {
            return items
                .split(/\n|,|;/)
                .map((entry) => entry.trim())
                .filter(Boolean)
                .map((name) => ({ name, quantity: 1, description: '' }));
        }
        return [];
    }

    function getInventoryFromCharacter() {
        const activeCharacter = getActiveCharacter();
        if (!activeCharacter) return { gold: 0, items: [], notes: '' };
        const state = activeCharacter.getState?.() || {};
        const inventory = state.inventory || {};
        return {
            gold: Number(state.gold ?? inventory.gold ?? 0) || 0,
            items: normalizeInventoryItems(Array.isArray(inventory.items) ? inventory.items : []),
            notes: inventory.notes || ''
        };
    }

    function getQuickAccessIndices() {
        const activeCharacter = getActiveCharacter();
        if (!activeCharacter) return [];
        const inventory = activeCharacter.getState?.().inventory || {};
        if (!Array.isArray(inventory.quickAccessIndices)) return [];
        return inventory.quickAccessIndices
            .map((value) => Number(value))
            .filter((value) => Number.isFinite(value) && value >= 0)
            .filter((value, index, self) => self.indexOf(value) === index);
    }

    function setQuickAccessIndices(indices = []) {
        const activeCharacter = getActiveCharacter();
        if (!activeCharacter) return false;
        const state = activeCharacter.getState?.() || {};
        const inventory = state.inventory || {};
        const currentItems = normalizeInventoryItems(Array.isArray(inventory.items) ? inventory.items : []);
        const normalized = indices
            .map((value) => Number(value))
            .filter((value) => Number.isFinite(value) && value >= 0 && value < currentItems.length)
            .filter((value, index, self) => self.indexOf(value) === index);
        const nextInventory = {
            ...(inventory || {}),
            items: currentItems.map((item) => ({
                name: item.name,
                quantity: Number(item.quantity) || 0,
                description: item.description || ''
            })),
            quickAccessIndices: normalized
        };
        activeCharacter.set?.('inventory', nextInventory);
        return true;
    }

    function toggleInventoryQuickAccess(index, enabled) {
        const indices = getQuickAccessIndices();
        const nextIndices = enabled
            ? [...new Set([...indices, index])] 
            : indices.filter((value) => value !== index);
        setQuickAccessIndices(nextIndices);
    }

    function applyInventoryItemChange(index, delta, mode = 'set', actionLabel = null) {
        const items = normalizeInventoryItems(getInventoryFromCharacter().items);
        const item = items[index];
        if (!item) return false;
        const beforeQuantity = Number(item.quantity || 0);
        if (mode === 'set') {
            item.quantity = Math.max(0, Number(delta) || 0);
        } else if (mode === 'delta') {
            item.quantity = Math.max(0, Number(item.quantity || 0) + Number(delta));
        }
        const afterQuantity = Number(item.quantity || 0);
        const actionType = Number(afterQuantity - beforeQuantity) > 0 ? 'buy' : (Number(afterQuantity - beforeQuantity) < 0 ? 'use' : 'edit');
        const label = item.name || '物品';
        saveInventoryToCharacter(items);
        const logLabel = actionLabel ?? (actionType === 'buy' ? '購買' : actionType === 'use' ? '使用' : '更新');
        appendLog?.(`<span style="color:var(--secondary)">[背包] ${logLabel}：${label}（數量 ${afterQuantity}）</span>`);
        return true;
    }

    function saveInventoryToCharacter(items = null) {
        const activeCharacter = getActiveCharacter();
        if (!activeCharacter) return false;
        const goldInput = document.getElementById('inventory-gold-input');
        const notesInput = document.getElementById('inventory-notes-input');
        const parsedGold = Number(goldInput?.value ?? 0);
        const normalizedItems = normalizeInventoryItems(items ?? getInventoryFromCharacter().items);
        const nextInventory = {
            ...(activeCharacter.getState?.().inventory || {}),
            gold: Number.isFinite(parsedGold) ? parsedGold : 0,
            items: normalizedItems.map((item) => ({
                name: item.name,
                quantity: Number(item.quantity) || 0,
                description: item.description || ''
            })),
            notes: notesInput?.value?.trim() || ''
        };
        activeCharacter.set?.('inventory', nextInventory);
        activeCharacter.set?.('gold', nextInventory.gold);
        return true;
    }

    function addInventoryItem() {
        const items = normalizeInventoryItems(getInventoryFromCharacter().items);
        items.push({ name: '新物品', quantity: 1, description: '' });
        saveInventoryToCharacter(items);
        return true;
    }

    function commitInventoryItemEdit(index, inputElement, exitEditMode = true) {
        const activeCharacter = getActiveCharacter();
        if (!activeCharacter) return false;
        const state = activeCharacter.getState?.() || {};
        const inventory = state.inventory || {};
        const items = normalizeInventoryItems(Array.isArray(inventory.items) ? inventory.items : []);
        const item = items[index];
        if (!item) return false;
        const row = inputElement?.closest?.('.inventory-item-row') || document.querySelector(`#inventory-list .inventory-item-row[data-index="${index}"]`);
        if (!row) return false;
        const nameInput = row.querySelector('input.inventory-item-name-input');
        const descInput = row.querySelector('input.inventory-item-desc-input');
        const nextName = String(nameInput?.value || item.name || '').trim() || '新物品';
        const nextDescription = String(descInput?.value || '').trim();
        const previousName = item.name || '';
        const previousDescription = item.description || '';
        if (nextName !== previousName || nextDescription !== previousDescription) {
            item.name = nextName;
            item.description = nextDescription;
            const nextInventory = {
                ...(inventory || {}),
                items: items.map((entry) => ({
                    name: entry.name,
                    quantity: Number(entry.quantity) || 0,
                    description: entry.description || ''
                }))
            };
            activeCharacter.set?.('inventory', nextInventory);
            activeCharacter.set?.('gold', Number(state.gold ?? inventory.gold ?? 0) || 0);
            appendLog?.(`<span style="color:var(--secondary)">[背包] 更新：${nextName}</span>`);
        }
        return true;
    }

    return {
        normalizeInventoryItems,
        getInventoryFromCharacter,
        getQuickAccessIndices,
        setQuickAccessIndices,
        toggleInventoryQuickAccess,
        applyInventoryItemChange,
        saveInventoryToCharacter,
        addInventoryItem,
        commitInventoryItemEdit
    };
}
