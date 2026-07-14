export function createPopupManager() {
    const activePopup = { overlay: null, id: null };

    function setActivePopup(overlay, popupId) {
        if (!overlay) return;
        const existing = activePopup.overlay;
        if (existing && existing !== overlay) {
            try {
                existing.classList.add('hidden');
                existing.style.opacity = '0';
                existing.style.visibility = 'hidden';
                existing.style.display = 'none';
            } catch (e) { /* ignore */ }
        }
        activePopup.overlay = overlay;
        activePopup.id = popupId;
        overlay.style.display = 'flex';
        overlay.style.visibility = 'visible';
        overlay.classList.remove('hidden');
        overlay.style.opacity = '1';
        overlay.style.zIndex = String(160 + (popupId === 'inventory' ? 1 : 0));
        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            overlay.style.visibility = 'visible';
        });
    }

    function closeActivePopup(overlay, popupId = null) {
        if (!overlay) {
            const current = activePopup.overlay;
            if (current) {
                current.classList.add('hidden');
                current.style.opacity = '0';
                current.style.visibility = 'hidden';
                current.style.display = 'none';
            }
            activePopup.overlay = null;
            activePopup.id = null;
            return;
        }
        if (popupId && activePopup.id && activePopup.id !== popupId) return;
        overlay.classList.add('hidden');
        overlay.style.opacity = '0';
        overlay.style.visibility = 'hidden';
        overlay.style.display = 'none';
        if (activePopup.overlay === overlay) {
            activePopup.overlay = null;
            activePopup.id = null;
        }
    }

    function getActivePopup() {
        return activePopup;
    }

    return {
        setActivePopup,
        closeActivePopup,
        getActivePopup
    };
}
