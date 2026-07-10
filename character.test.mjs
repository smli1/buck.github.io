import test from 'node:test';
import assert from 'node:assert/strict';
import { Character } from './character.js';

test('derives max hp from level and con modifier', () => {
  const character = new Character({
    level: 9,
    abilities: { str: 13, dex: 15, con: 10, int: 11, wis: 11, cha: 8 }
  });

  const state = character.getState();
  assert.equal(state.maxHp, 58);
});

test('derives combat stats from abilities and level', () => {
  const character = new Character({
    level: 9,
    abilities: { str: 13, dex: 8, con: 14, int: 11, wis: 11, cha: 8 }
  });

  const state = character.getState();
  assert.equal(state.ac, 15);
  assert.equal(state.longbowHit, 8);
});

test('exposes manual combat bonuses from the character model', () => {
  const character = new Character({
    level: 9,
    abilities: { str: 15, dex: 16, con: 14, int: 11, wis: 11, cha: 8 }
  });

  const breakdown = character.getManualCombatBreakdown();
  assert.equal(breakdown.proficiencyBonus, 3);
  assert.equal(breakdown.strengthModifier, 2);
  assert.equal(breakdown.dexterityModifier, 3);
  assert.equal(breakdown.rangedHitBonus, 8);
  assert.equal(breakdown.meleeHitBonus, 5);
  assert.equal(breakdown.meleeDamageBonus, 2);
});

test('only counts feat bonuses for feats available at the character level', () => {
  const character = new Character({
    level: 5,
    abilities: { str: 13, dex: 15, con: 14, int: 11, wis: 11, cha: 8 },
    feats: [
      { name: 'Feat A', level: 4, bonuses: { dex: 1 } },
      { name: 'Feat B', level: 10, bonuses: { str: 2 } },
      { name: 'Feat C', bonuses: { con: 1 } }
    ]
  });

  assert.deepEqual(character.getManualCombatBreakdown().featBonuses, { dex: 1, con: 1 });
});
