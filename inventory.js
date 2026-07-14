export function initializeInventoryController({
    getCharacter,
    appendLog,
    initializeKeywordTooltips,
    bringElementToFront
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

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
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

    function setInventoryFormState() {
        const activeCharacter = getActiveCharacter();
        if (!activeCharacter) return;
        const state = getInventoryFromCharacter();
        const goldInput = document.getElementById('inventory-gold-input');
        const notesInput = document.getElementById('inventory-notes-input');
        if (goldInput) goldInput.value = state.gold;
        if (notesInput) notesInput.value = state.notes || '';
        renderInventoryList(state.items);
    }

    function toggleInventoryDeleteMode(forceState = null) {
        const button = document.getElementById('inventory-delete-mode-btn');
        const list = document.getElementById('inventory-list');
        const currentState = document.body.dataset.inventoryDeleteMode === 'true';
        const nextState = forceState ?? !currentState;
        document.body.dataset.inventoryDeleteMode = nextState ? 'true' : 'false';
        if (button) {
            button.classList.toggle('active', nextState);
            button.title = nextState ? '退出刪除模式' : '刪除模式';
        }
        if (list) {
            list.querySelectorAll('.inventory-remove-btn').forEach((removeButton) => {
                removeButton.classList.toggle('is-visible', nextState);
                removeButton.style.display = nextState ? '' : 'none';
            });
        }
        if (typeof window !== 'undefined') {
            window.toggleInventoryDeleteMode = toggleInventoryDeleteMode;
        }
        return nextState;
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

    function attachQuickItemHoldHandlers() {
        const container = document.getElementById('quick-item-access-list');
        if (!container) return;

        container.querySelectorAll('.quick-item-access-button').forEach((button) => {
            let holdTimer = null;
            let hasTriggered = false;
            const index = Number(button.dataset.index ?? -1);

            const clearHold = () => {
                if (holdTimer) {
                    clearTimeout(holdTimer);
                    holdTimer = null;
                }
                button.classList.remove('is-holding');
            };

            const beginHold = (event) => {
                if (index < 0 || !button.closest) return;
                event.preventDefault();
                clearHold();
                hasTriggered = false;
                button.classList.add('is-holding');
                holdTimer = setTimeout(() => {
                    hasTriggered = true;
                    button.dataset.quickHoldTriggered = 'true';
                    applyInventoryItemChange(index, -1, 'delta', '快速使用');
                }, 1000);
            };

            button.addEventListener('mousedown', beginHold);
            button.addEventListener('touchstart', beginHold, { passive: false });
            button.addEventListener('mouseup', clearHold);
            button.addEventListener('mouseleave', clearHold);
            button.addEventListener('touchend', clearHold);
            button.addEventListener('touchcancel', clearHold);
            button.addEventListener('click', (event) => {
                if (hasTriggered || button.dataset.quickHoldTriggered === 'true') {
                    button.dataset.quickHoldTriggered = 'false';
                    event.preventDefault();
                    event.stopPropagation();
                    return;
                }
                event.preventDefault();
                event.stopPropagation();
            });
        });
    }

    function renderQuickItemAccessList() {
        const container = document.getElementById('quick-item-access-list');
        if (!container) return;
        const inventoryState = getInventoryFromCharacter();
        const quickIndices = getQuickAccessIndices();
        if (!quickIndices.length) {
            container.innerHTML = '<div class="settings-help">尚未設定快速物品，請在背包中勾選⚡。</div>';
            return;
        }
        container.innerHTML = quickIndices.map((index) => {
            const item = inventoryState.items[index] || { name: '物品', quantity: 0 };
            const displayName = escapeHtml(item.name || '物品');
            const displayQuantity = Number(item.quantity ?? 0);
            const descriptionAttr = item.description ? ` data-tooltip="${escapeHtml(item.description)}"` : '';
            return `
                <button type="button" class="quick-item-access-button keyword" data-action="quick-use" data-index="${index}" title="長按 1 秒使用 ${displayName}（剩餘 ${displayQuantity}）"${descriptionAttr}>
                    <span class="quick-item-access-number">${displayQuantity}</span>
                    <span class="quick-item-access-name">${displayName}</span>
                </button>
            `;
        }).join('');
        try { initializeKeywordTooltips?.(); } catch (e) { /* ignore */ }
        attachQuickItemHoldHandlers();
    }

    function toggleInventoryQuickAccess(index, enabled) {
        const indices = getQuickAccessIndices();
        const nextIndices = enabled
            ? [...new Set([...indices, index])] 
            : indices.filter((value) => value !== index);
        setQuickAccessIndices(nextIndices);
        renderQuickItemAccessList();
    }

    function renderInventoryList(items = []) {
        const list = document.getElementById('inventory-list');
        if (!list) return;
        const normalized = normalizeInventoryItems(items);
        const quickAccessIndices = getQuickAccessIndices();
        if (!normalized.length) {
            list.innerHTML = '<div class="settings-help">尚無物品。點擊「＋ 新增物品」開始建立清單。</div>';
            renderQuickItemAccessList();
            return;
        }
        list.innerHTML = normalized.map((item, index) => {
            const description = item.description ? ` data-tooltip="${(item.description || '').replace(/"/g, '&quot;')}"` : '';
            const isQuickAccess = quickAccessIndices.includes(index);
            return `
                <div class="inventory-item-row" data-index="${index}">
                    <div class="inventory-item-main">
                        <div class="inventory-item-name-pill">
                            <span class="keyword inventory-item-name" data-action="edit-item" data-index="${index}"${description}>${escapeHtml(item.name)}</span>
                            <button class="btn btn-icon inventory-desc-btn" type="button" data-action="edit-item" data-index="${index}" title="編輯物品">✏️</button>
                        </div>
                        <div class="inventory-item-controls">
                            <button class="btn btn-icon inventory-qty-btn" type="button" data-action="use" data-index="${index}" title="使用">−</button>
                            <input class="inventory-qty-input" type="number" min="0" step="1" value="${Math.max(0, Number(item.quantity) || 0)}" data-index="${index}" />
                            <button class="btn btn-icon inventory-qty-btn" type="button" data-action="buy" data-index="${index}" title="購買">＋</button>
                            <label class="inventory-quick-access-wrapper" title="快速存取">
                                <input class="inventory-quick-access-checkbox" type="checkbox" data-index="${index}" ${isQuickAccess ? 'checked' : ''} />
                                <span class="inventory-quick-access-icon">⚡</span>
                            </label>
                            <button class="btn btn-icon inventory-remove-btn" type="button" data-action="remove" data-index="${index}" title="移除">✕</button>
                        </div>
                    </div>
                    <div class="inventory-item-meta">
                        
                    </div>
                    <div class="inventory-item-description-row" style="display: none;">
                        <input class="inventory-item-desc-input" type="text" value="${escapeHtml(item.description || '')}" data-index="${index}" placeholder="描述（可留空）" />
                    </div>
                </div>
            `;
        }).join('');
        try { initializeKeywordTooltips?.(); } catch (e) { /* ignore */ }
        attachInventoryQuantityHandlers();
        toggleInventoryDeleteMode(document.body.dataset.inventoryDeleteMode === 'true');
        renderQuickItemAccessList();
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
        renderInventoryList(items);
        const logLabel = actionLabel ?? (actionType === 'buy' ? '購買' : actionType === 'use' ? '使用' : '更新');
        appendLog?.(`<span style="color:var(--secondary)">[背包] ${logLabel}：${label}（數量 ${afterQuantity}）</span>`);
        return true;
    }

    function setInventoryEditButtonState(row, isEditing) {
        if (!row) return;
        const button = row.querySelector('.inventory-desc-btn');
        if (!button) return;
        if (isEditing) {
            button.textContent = '✓';
            button.dataset.action = 'confirm-edit';
            button.title = '確認修改';
        } else {
            button.textContent = '✏️';
            button.dataset.action = 'edit-item';
            button.title = '編輯物品';
        }
    }

    function syncInventoryRowAfterEdit(row, item, index) {
        if (!row) return;
        const existingInput = row.querySelector('input.inventory-item-name-input');
        if (existingInput) {
            const label = document.createElement('span');
            label.className = 'keyword inventory-item-name';
            label.dataset.action = 'edit-item';
            label.dataset.index = String(index);
            label.textContent = item.name || '物品';
            if (item.description) {
                label.setAttribute('data-tooltip', String(item.description).replace(/"/g, '&quot;'));
            } else {
                label.removeAttribute('data-tooltip');
            }
            existingInput.replaceWith(label);
        } else {
            const label = row.querySelector('.inventory-item-name');
            if (label) {
                label.textContent = item.name || '物品';
                label.dataset.index = String(index);
                if (item.description) {
                    label.setAttribute('data-tooltip', String(item.description).replace(/"/g, '&quot;'));
                } else {
                    label.removeAttribute('data-tooltip');
                }
            }
        }
        const descriptionRow = row.querySelector('.inventory-item-description-row');
        if (descriptionRow) {
            descriptionRow.style.display = 'none';
        }
        const descInput = row.querySelector('.inventory-item-desc-input');
        if (descInput) {
            descInput.value = item.description || '';
        }
        row.dataset.editing = 'false';
        setInventoryEditButtonState(row, false);
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
        if (exitEditMode) {
            syncInventoryRowAfterEdit(row, {
                name: nextName,
                description: nextDescription,
                quantity: Number(item.quantity) || 0
            }, index);
        }
        return true;
    }

    function activateInventoryItemNameEdit(index, currentName = '') {
        const list = document.getElementById('inventory-list');
        if (!list) return false;
        const row = list.querySelector(`.inventory-item-row[data-index="${index}"]`);
        if (!row) return false;
        const existingInput = row.querySelector('input.inventory-item-name-input');
        if (existingInput) {
            existingInput.focus();
            existingInput.select?.();
            setInventoryEditButtonState(row, true);
            return true;
        }
        const nameLabel = row.querySelector('.inventory-item-name');
        if (!nameLabel) return false;
        const descriptionRow = row.querySelector('.inventory-item-description-row');
        if (descriptionRow) {
            descriptionRow.style.display = 'flex';
        }
        setInventoryEditButtonState(row, true);
        row.dataset.editing = 'true';
        const input = document.createElement('input');
        input.className = 'inventory-item-name-input';
        input.type = 'text';
        input.value = currentName;
        input.dataset.index = String(index);
        input.placeholder = '物品名稱';
        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                commitInventoryItemEdit(index, input, true);
            }
        });
        input.addEventListener('blur', () => {
            if (row.dataset.editing === 'true') {
                commitInventoryItemEdit(index, input, false);
            }
        });
        nameLabel.replaceWith(input);
        const descInput = row.querySelector('input.inventory-item-desc-input');
        if (descInput) {
            descInput.addEventListener('blur', () => {
                if (row.dataset.editing === 'true') {
                    commitInventoryItemEdit(index, descInput, false);
                }
            });
            descInput.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    descInput.blur();
                }
            });
        }
        input.focus();
        input.select?.();
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
        renderInventoryList(items);
        return true;
    }

    function handleInventoryListClick(event) {
        const button = event.target.closest('button[data-action]');
        if (button) {
            const index = Number(button.dataset.index ?? -1);
            const action = button.dataset.action;
            const items = normalizeInventoryItems(getInventoryFromCharacter().items);
            if (action === 'remove' && items[index]) {
                const removedItem = items[index];
                items.splice(index, 1);
                saveInventoryToCharacter(items);
                renderInventoryList(items);
                appendLog?.(`<span style="color:var(--secondary)">[背包] 移除：${removedItem.name || '物品'}</span>`);
                return;
            }
            if (action === 'use') {
                applyInventoryItemChange(index, -1, 'delta', '使用');
                return;
            }
            if (action === 'buy') {
                applyInventoryItemChange(index, 1, 'delta', '購買');
                return;
            }
            if (action === 'confirm-edit' && items[index]) {
                commitInventoryItemEdit(index, button, true);
                return;
            }
            if (action === 'edit-item' && items[index]) {
                activateInventoryItemNameEdit(index, items[index].name || '');
                return;
            }
            if (action === 'quick-use' && items[index]) {
                applyInventoryItemChange(index, -1, 'delta', '快速使用');
                return;
            }
        }
        const editableName = event.target.closest('.inventory-item-name');
        if (editableName) {
            const index = Number(editableName.dataset.index ?? -1);
            const items = normalizeInventoryItems(getInventoryFromCharacter().items);
            if (items[index]) {
                activateInventoryItemNameEdit(index, items[index].name || '');
            }
            return;
        }
        const input = event.target.closest('input.inventory-qty-input');
        if (input) {
            return;
        }
    }

    function handleInventoryListChange(event) {
        const qtyInput = event.target.closest('input.inventory-qty-input');
        if (qtyInput) {
            const index = Number(qtyInput.dataset.index ?? -1);
            applyInventoryItemChange(index, qtyInput.value, 'set');
            return;
        }
        const quickCheckbox = event.target.closest('input.inventory-quick-access-checkbox');
        if (quickCheckbox) {
            const index = Number(quickCheckbox.dataset.index ?? -1);
            toggleInventoryQuickAccess(index, quickCheckbox.checked);
        }
    }

    function attachInventoryQuantityHandlers() {
        const list = document.getElementById('inventory-list');
        if (!list) return;
        list.querySelectorAll('input.inventory-qty-input').forEach((input) => {
            input.addEventListener('blur', () => {
                const index = Number(input.dataset.index ?? -1);
                applyInventoryItemChange(index, input.value, 'set');
            });
            input.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    input.blur();
                }
            });
        });
    }

    function openInventoryPopup() {
        const overlay = document.getElementById('inventory-overlay');
        if (!overlay) return;
        window.__popupManager?.setActivePopup?.(overlay, 'inventory');
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
        const activeCharacter = getActiveCharacter();
        if (activeCharacter) {
            setInventoryFormState();
        }
        bringElementToFront?.(overlay);
    }

    function closeInventoryPopup(event) {
        const overlay = document.getElementById('inventory-overlay');
        if (event && event.target !== overlay) {
            return;
        }
        if (!overlay) return;
        window.__popupManager?.closeActivePopup?.(overlay, 'inventory');
        const popup = overlay.querySelector('.manual-popup');
        if (popup) {
            popup.style.opacity = '0';
            popup.style.transform = 'translateY(10px)';
        }
    }

    function saveInventoryFromForm() {
        return saveInventoryToCharacter();
    }

    return {
        normalizeInventoryItems,
        getInventoryFromCharacter,
        setInventoryFormState,
        renderInventoryList,
        toggleInventoryDeleteMode,
        applyInventoryItemChange,
        saveInventoryToCharacter,
        addInventoryItem,
        handleInventoryListClick,
        handleInventoryListChange,
        openInventoryPopup,
        closeInventoryPopup,
        saveInventoryFromForm
    };
}
