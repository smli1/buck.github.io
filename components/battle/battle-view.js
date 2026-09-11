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
