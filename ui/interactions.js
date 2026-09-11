import { bringElementToFront } from '../utils/dom.js';

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

export { bringElementToFront };
