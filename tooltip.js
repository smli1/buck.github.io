export function initializeKeywordTooltips() {
    const tooltip = document.getElementById('tooltip-popup');
    let touchTimer = null;
    let activeTooltipTarget = null;

    const showTooltip = (target, text) => {
        if (!tooltip || !text) return;
        if (activeTooltipTarget && activeTooltipTarget !== target) {
            activeTooltipTarget.classList.remove('active-tooltip');
        }
        activeTooltipTarget = target;
        target.classList.add('active-tooltip');

        tooltip.innerText = text;
        tooltip.setAttribute('aria-hidden', 'false');
        tooltip.classList.add('visible');

        const rect = target.getBoundingClientRect();
        const popupRect = tooltip.getBoundingClientRect();
        const offset = 10;
        let left = rect.left + rect.width / 2 - popupRect.width / 2;
        let top = rect.bottom + offset;

        if (left < 8) left = 8;
        if (left + popupRect.width > window.innerWidth - 8) {
            left = window.innerWidth - popupRect.width - 8;
        }
        if (top + popupRect.height > window.innerHeight - 8) {
            top = rect.top - popupRect.height - offset;
            tooltip.style.setProperty('--arrow-bottom', 'auto');
        }
        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
    };

    const hideTooltip = () => {
        if (!tooltip) return;
        tooltip.classList.remove('visible');
        tooltip.setAttribute('aria-hidden', 'true');
        if (activeTooltipTarget) {
            activeTooltipTarget.classList.remove('active-tooltip');
            activeTooltipTarget = null;
        }
    };

    const scheduleTooltip = (target, text) => {
        clearTimeout(touchTimer);
        touchTimer = setTimeout(() => showTooltip(target, text), 350);
    };

    document.querySelectorAll('.keyword').forEach(el => {
        if (el.dataset.tooltipBound === 'true') return;

        const resolveTooltipText = () => {
            const key = el.dataset.tooltipKey;
            if (key && window.character?.getTooltipText) {
                const dynamicText = window.character.getTooltipText(key);
                if (dynamicText) {
                    el.dataset.tooltip = dynamicText;
                    return dynamicText;
                }
            }
            return el.dataset.tooltip || '';
        };

        const initialText = resolveTooltipText();
        if (!initialText) return;

        el.addEventListener('mouseenter', () => {
            clearTimeout(touchTimer);
            showTooltip(el, resolveTooltipText());
        });
        el.addEventListener('mouseleave', () => {
            clearTimeout(touchTimer);
            hideTooltip();
        });
        el.addEventListener('touchstart', event => {
            event.preventDefault();
            clearTimeout(touchTimer);
            scheduleTooltip(el, resolveTooltipText());
        }, { passive: false });
        el.addEventListener('touchend', () => {
            clearTimeout(touchTimer);
            hideTooltip();
        });
        el.addEventListener('touchcancel', () => {
            clearTimeout(touchTimer);
            hideTooltip();
        });

        el.dataset.tooltipBound = 'true';
    });

    document.addEventListener('scroll', hideTooltip, true);
    document.addEventListener('touchstart', event => {
        if (!event.target.closest('.keyword')) {
            hideTooltip();
        }
    });
}
