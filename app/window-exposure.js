import { createBattleApp } from '../components/battle/index.js';
import { 
    initializeManualButtons,
    openManualPopup,
    closeManualPopup,
    clearManualPopup,
    calculateManualScenario,
    recordManualMiss,
    computeActualAttack,
    recordActualMiss,
    computeActualDamage,
    rollSecondWind,
    rollRanged,
    rollMeleeCombo,
    setManualScenario,
    selectManualField,
    setManualDiceValue,
    updateManualFieldsVisibility
} from '../components/manual/index.js';

export function exposeBattleHelpers(viewModel) {
    window.modHP = (amt) => {
        const activeCharacter = window.character ?? null;
        if (activeCharacter?.adjustHp) {
            const before = Number(activeCharacter.getState?.().currentHp ?? activeCharacter.data?.currentHp ?? 0);
            const result = activeCharacter.adjustHp(amt);
            const after = Number(result?.after ?? activeCharacter.getState?.().currentHp ?? activeCharacter.data?.currentHp ?? before);
            const changeText = amt > 0 ? `+${amt}` : `${amt}`;
            const tone = amt >= 0 ? 'var(--success)' : 'var(--primary)';
            viewModel?.log?.(`<span style='color:${tone}'>[HP 變更] ${changeText} → ${before} → ${after}</span>`);
            syncBattleAppFromCharacter(viewModel, activeCharacter);
            return result;
        }
        return viewModel?.modHP?.(amt);
    };
    window.copyText = (txt) => viewModel.copyText(txt);
    window.appendLog = (html) => viewModel.appendLog(html);
    window.log = (msg) => viewModel.log(msg);
    window.clearLog = () => viewModel.clearLog();
    window.exportLog = () => viewModel.exportLog();
    window.toggleLogMinimize = (event) => viewModel.toggleLogMinimize(event);
    window.startLogDrag = (event) => viewModel.startLogDrag(event);
    window.stopLogDrag = () => viewModel.stopLogDrag();
    window.dragLog = (event) => viewModel.dragLog(event);
    window.battleApp = viewModel;
}

export function exposeManualHelpers() {
    window.initializeManualButtons = initializeManualButtons;
    window.openManualPopup = openManualPopup;
    window.closeManualPopup = closeManualPopup;
    window.clearManualPopup = clearManualPopup;
    window.calculateManualScenario = calculateManualScenario;
    window.recordManualMiss = recordManualMiss;
    window.computeActualAttack = computeActualAttack;
    window.recordActualMiss = recordActualMiss;
    window.computeActualDamage = computeActualDamage;
    window.rollSecondWind = rollSecondWind;
    window.rollRanged = rollRanged;
    window.rollMeleeCombo = rollMeleeCombo;
    window.setManualScenario = setManualScenario;
    window.selectManualField = selectManualField;
    window.setManualDiceValue = setManualDiceValue;
    window.updateManualFieldsVisibility = updateManualFieldsVisibility;
}

function syncBattleAppFromCharacter(battleApp, activeCharacter) {
    if (!battleApp?.model || !battleApp?.view || !activeCharacter) return;
    const nextState = activeCharacter.getState();
    battleApp.model.state.maxHp = nextState.maxHp;
    battleApp.model.state.currentHp = nextState.currentHp;
    battleApp.model.state.ac = nextState.ac;
    battleApp.model.state.longbowHit = nextState.longbowHit;
    battleApp.view.render(battleApp.model.getSnapshot());
}
