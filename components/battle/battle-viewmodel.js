export class BattleViewModel {
    constructor(model, view) {
        this.model = model;
        this.view = view;
        this.dragState = { active: false, offsetX: 0, offsetY: 0 };
    }

    initialize() {
        this.view.render(this.model.getSnapshot());
        if (this.view.header) {
            this.view.header.addEventListener('mousedown', (event) => this.startLogDrag(event));
            this.view.header.addEventListener('touchstart', (event) => this.startLogDrag(event), { passive: false });
        }
        document.addEventListener('mousemove', (event) => this.dragLog(event));
        document.addEventListener('mouseup', () => this.stopLogDrag());
        document.addEventListener('touchmove', (event) => this.dragLog(event), { passive: false });
        document.addEventListener('touchend', () => this.stopLogDrag());
    }

    stripHtml(html) {
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    }

    modHP(amt) {
        const before = this.model.state.currentHp;
        this.model.adjustHp(amt);
        const after = this.model.state.currentHp;
        const changeText = amt > 0 ? `+${amt}` : `${amt}`;
        const tone = amt >= 0 ? 'var(--success)' : 'var(--primary)';
        this.log(`<span style='color:${tone}'>[HP 變更] ${changeText} → ${before} → ${after}</span>`);
        this.view.render(this.model.getSnapshot());
    }

    appendLog(html) {
        const text = this.stripHtml(html).replace(/\u00A0/g, ' ');
        this.model.recordEvent({ html, text });
        this.view.render(this.model.getSnapshot());
    }

    log(msg) {
        this.appendLog(msg);
    }

    copyText(txt) {
        navigator.clipboard.writeText(txt).then(() => {
            this.log("<span style='color:var(--secondary)'>[已複製台詞]</span> 「" + txt + "」");
        }).catch(() => {
            alert('複製失敗：' + txt);
        });
    }

    clearLog() {
        this.model.clearEvents();
        this.view.render(this.model.getSnapshot());
    }

    exportLog() {
        const entries = this.model.getSnapshot().battleLog;
        if (entries.length === 0) {
            alert('目前日誌為空，無法匯出。');
            return;
        }
        const text = entries.map(entry => entry.text).join('\r\n');
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `battle_log_${new Date().toISOString().slice(0,10)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    toggleLogMinimize(event) {
        event.stopPropagation();
        this.model.toggleLogMinimized(); 
        this.view.render(this.model.getSnapshot());
    }

    startLogDrag(event) {
        if (!this.view.logPanel) return;
        const target = event.target;
        if (target && (target.closest?.('.log-clear') || target.closest?.('.log-toggle'))) {
            return;
        }
        const touch = event.touches ? event.touches[0] : null;
        const clientX = touch ? touch.clientX : event.clientX;
        const clientY = touch ? touch.clientY : event.clientY;
        this.dragState.active = true;
        // signal global dragging state so other handlers (page flip) can ignore touches
        try { window.__isDraggingPopup = true; } catch (e) { /* ignore */ }
        this.dragState.offsetX = clientX - this.view.logPanel.offsetLeft;
        this.dragState.offsetY = clientY - this.view.logPanel.offsetTop;
        this.view.logPanel.classList.add('dragging');
        if (event.touches) {
            event.preventDefault();
        }
    }

    stopLogDrag() {
        if (!this.dragState.active) return;
        this.dragState.active = false;
        if (this.view.logPanel) {
            this.view.logPanel.classList.remove('dragging');
        }
        try { window.__isDraggingPopup = false; } catch (e) { /* ignore */ }
    }

    dragLog(event) {
        if (!this.dragState.active || !this.view.logPanel) return;
        const touch = event.touches ? event.touches[0] : null;
        const clientX = touch ? touch.clientX : event.clientX;
        const clientY = touch ? touch.clientY : event.clientY;
        let x = clientX - this.dragState.offsetX;
        let y = clientY - this.dragState.offsetY;
        const maxX = window.innerWidth - this.view.logPanel.offsetWidth;
        const maxY = window.innerHeight - this.view.logPanel.offsetHeight;
        x = Math.max(0, Math.min(maxX, x));
        y = Math.max(0, Math.min(maxY, y));
        this.model.setLogPanelPosition(`${x}px`, `${y}px`);
        this.view.render(this.model.getSnapshot());
        if (event.touches) {
            event.preventDefault();
        }
    }
}
