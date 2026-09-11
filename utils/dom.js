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
