export class BattleModel {
    constructor(initialState = {}) {
        this.state = {
            maxHp: initialState.maxHp ?? 76,
            currentHp: initialState.currentHp ?? 76,
            ac: initialState.ac ?? 18,
            longbowHit: initialState.longbowHit ?? 11,
            battleLog: initialState.battleLog ?? [],
            isLogMinimized: false,
            logPanelPosition: {
                left: '24px',
                top: '24px',
                right: 'auto',
                bottom: 'auto'
            }
        };
    }

    getSnapshot() {
        return {
            ...this.state,
            battleLog: [...this.state.battleLog]
        };
    }

    adjustHp(delta) {
        this.state.currentHp = Math.max(0, Math.min(this.state.maxHp, this.state.currentHp + delta));
    }

    recordEvent(entry) {
        this.state.battleLog.push(entry);
    }

    clearEvents() {
        this.state.battleLog = [];
    }

    toggleLogMinimized() {
        this.state.isLogMinimized = !this.state.isLogMinimized;
    }

    setLogPanelPosition(left, top) {
        this.state.logPanelPosition = { left, top, right: 'auto', bottom: 'auto' };
    }

    getLogText() {
        return this.state.battleLog.map(entry => entry.text).join('\r\n');
    }
}

export class BattleView {
    constructor() {
        this.hpNode = document.getElementById('curr-hp');
        this.logBox = document.getElementById('log-box');
        this.logPanel = document.getElementById('floating-log-panel');
        this.header = document.getElementById('log-panel-header');
        this.statLongbow = document.getElementById('stat-longbow');
        this.statAC = document.getElementById('stat-ac');
        this.statHP = document.getElementById('stat-hp');
    }

    render(state) {
        if (this.hpNode) {
            this.hpNode.innerText = state.currentHp;
        }
        if (this.statHP) this.statHP.innerText = `${state.currentHp} / ${state.maxHp}`;
        if (this.statAC) this.statAC.innerText = String(state.ac);
        if (this.statLongbow) {
            const sign = state.longbowHit >= 0 ? '+' : '';
            this.statLongbow.innerText = `${sign}${state.longbowHit}`;
        }
        if (this.logBox) {
            if (state.battleLog.length === 0) {
                this.logBox.innerHTML = '日誌已清空。';
            } else {
                this.logBox.innerHTML = state.battleLog.map(entry => entry.html).join('<br>');
            }
            this.logBox.scrollTop = this.logBox.scrollHeight;
        }
        if (this.logPanel) {
            this.logPanel.classList.toggle('minimized', Boolean(state.isLogMinimized));
            const position = state.logPanelPosition || {};
            this.logPanel.style.left = position.left ?? '24px';
            this.logPanel.style.top = position.top ?? '24px';
            this.logPanel.style.right = position.right ?? 'auto';
            this.logPanel.style.bottom = position.bottom ?? 'auto';
        }
    }
}

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

export function createBattleApp(initialState = {}) {
    const battleModel = new BattleModel({ currentHp: initialState.currentHp ?? 76, maxHp: initialState.maxHp ?? 76, ac: initialState.ac ?? 18, longbowHit: initialState.longbowHit ?? 11 });
    const battleView = new BattleView();
    const battleViewModel = new BattleViewModel(battleModel, battleView);
    battleViewModel.initialize();
    return battleViewModel;
}
