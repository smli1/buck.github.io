import { createInventoryController } from './inventory-controller.js';

export function createInventoryUI({
    getCharacter,
    appendLog,
    initializeKeywordTooltips,
    bringElementToFront
}) {
    const controller = createInventoryController({ getCharacter, appendLog });

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function setInventoryFormState() {
        const state = controller.getInventoryFromCharacter();
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
                    controller.applyInventoryItemChange(index, -1, 'delta', '快速使用');
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
        const inventoryState = controller.getInventoryFromCharacter();
        const quickIndices = controller.getQuickAccessIndices();
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

    function renderInventoryList(items = []) {
        const list = document.getElementById('inventory-list');
        if (!list) return;
        const normalized = controller.normalizeInventoryItems(items);
        const quickAccessIndices = controller.getQuickAccessIndices();
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
                controller.commitInventoryItemEdit(index, input, true);
                syncInventoryRowAfterEdit(row, {
                    name: input.value || currentName,
                    description: row.querySelector('.inventory-item-desc-input')?.value || '',
                    quantity: Number(row.querySelector('.inventory-qty-input')?.value || 0)
                }, index);
            }
        });
        input.addEventListener('blur', () => {
            if (row.dataset.editing === 'true') {
                controller.commitInventoryItemEdit(index, input, false);
                syncInventoryRowAfterEdit(row, {
                    name: input.value || currentName,
                    description: row.querySelector('.inventory-item-desc-input')?.value || '',
                    quantity: Number(row.querySelector('.inventory-qty-input')?.value || 0)
                }, index);
            }
        });
        nameLabel.replaceWith(input);
        const descInput = row.querySelector('.inventory-item-desc-input');
        if (descInput) {
            descInput.addEventListener('blur', () => {
                if (row.dataset.editing === 'true') {
                    controller.commitInventoryItemEdit(index, descInput, false);
                    syncInventoryRowAfterEdit(row, {
                        name: row.querySelector('.inventory-item-name-input')?.value || currentName,
                        description: descInput.value || '',
                        quantity: Number(row.querySelector('.inventory-qty-input')?.value || 0)
                    }, index);
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

    function attachInventoryQuantityHandlers() {
        const list = document.getElementById('inventory-list');
        if (!list) return;
        list.querySelectorAll('input.inventory-qty-input').forEach((input) => {
            input.addEventListener('blur', () => {
                const index = Number(input.dataset.index ?? -1);
                controller.applyInventoryItemChange(index, input.value, 'set');
                renderInventoryList(controller.getInventoryFromCharacter().items);
            });
            input.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    input.blur();
                }
            });
        });
    }

    function handleInventoryListClick(event) {
        const button = event.target.closest('button[data-action]');
        if (button) {
            const index = Number(button.dataset.index ?? -1);
            const action = button.dataset.action;
            const items = controller.normalizeInventoryItems(controller.getInventoryFromCharacter().items);
            if (action === 'remove' && items[index]) {
                const removedItem = items[index];
                items.splice(index, 1);
                controller.saveInventoryToCharacter(items);
                renderInventoryList(items);
                appendLog?.(`<span style="color:var(--secondary)">[背包] 移除：${removedItem.name || '物品'}</span>`);
                return;
            }
            if (action === 'use') {
                controller.applyInventoryItemChange(index, -1, 'delta', '使用');
                renderInventoryList(controller.getInventoryFromCharacter().items);
                return;
            }
            if (action === 'buy') {
                controller.applyInventoryItemChange(index, 1, 'delta', '購買');
                renderInventoryList(controller.getInventoryFromCharacter().items);
                return;
            }
            if (action === 'confirm-edit' && items[index]) {
                controller.commitInventoryItemEdit(index, button, true);
                syncInventoryRowAfterEdit(button.closest('.inventory-item-row'), items[index], index);
                return;
            }
            if (action === 'edit-item' && items[index]) {
                activateInventoryItemNameEdit(index, items[index].name || '');
                return;
            }
            if (action === 'quick-use' && items[index]) {
                controller.applyInventoryItemChange(index, -1, 'delta', '快速使用');
                renderQuickItemAccessList();
                return;
            }
        }
        const editableName = event.target.closest('.inventory-item-name');
        if (editableName) {
            const index = Number(editableName.dataset.index ?? -1);
            const items = controller.normalizeInventoryItems(controller.getInventoryFromCharacter().items);
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
            controller.applyInventoryItemChange(index, qtyInput.value, 'set');
            renderInventoryList(controller.getInventoryFromCharacter().items);
            return;
        }
        const quickCheckbox = event.target.closest('input.inventory-quick-access-checkbox');
        if (quickCheckbox) {
            const index = Number(quickCheckbox.dataset.index ?? -1);
            controller.toggleInventoryQuickAccess(index, quickCheckbox.checked);
            renderInventoryList(controller.getInventoryFromCharacter().items);
        }
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
        setInventoryFormState();
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
        return controller.saveInventoryToCharacter();
    }

    return {
        setInventoryFormState,
        renderInventoryList,
        toggleInventoryDeleteMode,
        handleInventoryListClick,
        handleInventoryListChange,
        openInventoryPopup,
        closeInventoryPopup,
        saveInventoryFromForm,
        addInventoryItem: () => {
            controller.addInventoryItem();
            renderInventoryList(controller.getInventoryFromCharacter().items);
        }
    };
}
