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
