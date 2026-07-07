export function roll(sides) {
    return Math.floor(Math.random() * sides) + 1;
}

export function parseActualNumber(id, defaultValue) {
    const element = document.getElementById(id);
    if (!element) return defaultValue;
    const value = parseInt(element.value, 10);
    return Number.isFinite(value) ? value : defaultValue;
}

export function bringElementToFront(el) {
    if (!el) return;
    if (!window.__popupTopZ) {
        window.__popupTopZ = 100;
    }
    window.__popupTopZ += 1;
    try {
        el.style.zIndex = window.__popupTopZ;
    } catch (e) {
        // ignore invalid style updates
    }
}

export function initializePopupInteractionHandlers() {
    document.addEventListener('mousedown', event => {
        let node = event.target;
        while (node && node !== document) {
            if (node.classList && (node.classList.contains('manual-popup') || node.classList.contains('floating-log-panel') || node.classList.contains('log-panel'))) {
                const overlay = node.closest('.manual-popup-overlay') || node;
                bringElementToFront(overlay);
                break;
            }
            node = node.parentNode;
        }
    }, { passive: true });

    document.addEventListener('touchstart', event => {
        let node = event.target;
        while (node && node !== document) {
            if (node.classList && (node.classList.contains('manual-popup') || node.classList.contains('floating-log-panel') || node.classList.contains('log-panel'))) {
                const overlay = node.closest('.manual-popup-overlay') || node;
                bringElementToFront(overlay);
                break;
            }
            node = node.parentNode;
        }
    }, { passive: true });
}
