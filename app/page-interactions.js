export function togglePageFlip(force) {
    const shell = document.getElementById('page-flip-shell');
    if (!shell) return false;
    const next = typeof force === 'boolean' ? force : !shell.classList.contains('is-flipped');
    shell.classList.toggle('is-flipped', next);

    const frontFace = shell.querySelector('.front-face');
    const backFace = shell.querySelector('.back-face');
    if (frontFace && backFace) {
        frontFace.classList.toggle('is-active', !next);
        backFace.classList.toggle('is-active', next);
    }

    document.querySelectorAll('[data-page-toggle]').forEach((button) => {
        button.textContent = next ? '⚔️ Battle' : '🎭 Role-Playing';
    });
    return next;
}

export function attachPageFlipTouchHandlers() {
    const shell = document.getElementById('page-flip-shell');
    if (!shell) return;

    let startX = 0;
    let startY = 0;
    let isTouchSwipe = false;
    let hasHorizontalIntent = false;
    const threshold = 70;

    shell.addEventListener('touchstart', (event) => {
        // ignore page-flip when a popup (log) is being dragged
        if (window.__isDraggingPopup) return;
        // also ignore if the touch started inside the floating log panel
        try {
            const t = event.target;
            if (t && t.closest && t.closest('#floating-log-panel')) return;
        } catch (e) { /* ignore */ }
        const touch = event.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
        isTouchSwipe = true;
        hasHorizontalIntent = false;
    }, { passive: true });

    shell.addEventListener('touchmove', (event) => {
        if (window.__isDraggingPopup) return;
        if (!isTouchSwipe) return;
        const touch = event.touches[0];
        const deltaX = touch.clientX - startX;
        const deltaY = touch.clientY - startY;

        if (Math.abs(deltaY) > Math.abs(deltaX)) {
            isTouchSwipe = false;
            hasHorizontalIntent = false;
            return;
        }

        if (Math.abs(deltaX) > 12) {
            hasHorizontalIntent = true;
        }
    }, { passive: true });

    shell.addEventListener('touchend', (event) => {
        if (window.__isDraggingPopup) { isTouchSwipe = false; hasHorizontalIntent = false; return; }
        if (!isTouchSwipe || !hasHorizontalIntent) {
            isTouchSwipe = false;
            hasHorizontalIntent = false;
            return;
        }

        const touch = event.changedTouches[0];
        const deltaX = touch.clientX - startX;
        const deltaY = touch.clientY - startY;
        const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY);

        if (isHorizontalSwipe && Math.abs(deltaX) > threshold) {
            togglePageFlip(deltaX < 0);
        }

        isTouchSwipe = false;
        hasHorizontalIntent = false;
    }, { passive: true });

    shell.addEventListener('touchcancel', () => {
        isTouchSwipe = false;
        hasHorizontalIntent = false;
    }, { passive: true });
}

export function attachPageScrollHandlers() {
    const scrollTargets = document.querySelectorAll('.sidebar, .content-area, .roleplay-page');

    scrollTargets.forEach((target) => {
        let touchStartY = 0;
        let touchStartX = 0;

        target.addEventListener('wheel', (event) => {
            const canScroll = target.scrollHeight > target.clientHeight;
            if (!canScroll || Math.abs(event.deltaY) === 0) return;

            const atTop = target.scrollTop <= 0;
            const atBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 1;
            if ((event.deltaY > 0 && !atBottom) || (event.deltaY < 0 && !atTop)) {
                event.preventDefault();
                target.scrollTop = Math.max(0, Math.min(target.scrollHeight - target.clientHeight, target.scrollTop + event.deltaY));
            }
        }, { passive: false });

        target.addEventListener('touchstart', (event) => {
            const touch = event.touches[0];
            touchStartY = touch.clientY;
            touchStartX = touch.clientX;
        }, { passive: true });

        target.addEventListener('touchmove', (event) => {
            const touch = event.touches[0];
            const deltaY = touch.clientY - touchStartY;
            const deltaX = touch.clientX - touchStartX;
            const canScroll = target.scrollHeight > target.clientHeight;

            if (!canScroll || Math.abs(deltaY) <= 2 || Math.abs(deltaY) < Math.abs(deltaX)) {
                return;
            }

            const atTop = target.scrollTop <= 0;
            const atBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 1;
            if ((deltaY > 0 && !atTop) || (deltaY < 0 && !atBottom)) {
                event.preventDefault();
                target.scrollTop -= deltaY;
                touchStartY = touch.clientY;
            }
        }, { passive: false });
    });
}
