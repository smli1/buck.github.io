import { BattleModel } from './battle-model.js';
import { BattleView } from './battle-view.js';
import { BattleViewModel } from './battle-viewmodel.js';

export function createBattleApp(initialState = {}) {
    const battleModel = new BattleModel({ currentHp: initialState.currentHp ?? 76, maxHp: initialState.maxHp ?? 76, ac: initialState.ac ?? 18, longbowHit: initialState.longbowHit ?? 11 });
    const battleView = new BattleView();
    const battleViewModel = new BattleViewModel(battleModel, battleView);
    battleViewModel.initialize();
    return battleViewModel;
}

export { BattleModel, BattleView, BattleViewModel };
