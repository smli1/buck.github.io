// components/combat/combat-data.js
// Shared, class-agnostic helpers: resolve the active character's full JSON,
// parse damage expressions, and compute attack / skill modifiers.

export const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

export const SKILL_ABILITIES = {
    acrobatics: 'dex', 'animal-handling': 'wis', arcana: 'int', athletics: 'str',
    deception: 'cha', history: 'int', insight: 'wis', intimidation: 'cha',
    investigation: 'int', medicine: 'wis', nature: 'int', perception: 'wis',
    performance: 'cha', persuasion: 'cha', religion: 'int',
    'sleight-of-hand': 'dex', stealth: 'dex', survival: 'wis'
};

export function abilityMod(score) {
    return Math.floor(((Number(score) || 10) - 10) / 2);
}

export function formatMod(v) {
    v = Number(v);
    return v >= 0 ? '+' + v : String(v);
}

export function profBonusFor(ch) {
    const explicit = Number(ch && ch.proficiencyBonus);
    if (Number.isFinite(explicit) && explicit > 0) return explicit;
    const level = Math.max(1, Number(ch && ch.level) || 1);
    return Math.ceil(level / 4) + 1;
}

export function esc(s) {
    const d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
}

export function escAttr(s) {
    return esc(s).replace(/"/g, '&quot;');
}

export function critThreshold(ch) {
    const explicit = Number(ch && ch.critThreshold);
    if (Number.isFinite(explicit) && explicit >= 2 && explicit <= 20) return explicit;
    const className = String((ch && (ch.className || ch.class)) || '').toLowerCase();
    const subclass = String((ch && ch.subclass) || '').toLowerCase();
    const featureNames = (Array.isArray(ch && ch.features) ? ch.features.map(f => (f && f.name) || '') : [])
        .concat(String(ch && ch.notes) || '')
        .map(s => s.toLowerCase());
    const improvedCritical = className === 'fighter'
        || subclass.includes('champion')
        || featureNames.some(n => n.includes('improved critical') || n.includes('champion'));
    return improvedCritical ? 19 : 20;
}

// Parse an expression like "1d8 + 3d6 + 5" or "2d6" into tokens.
export function parseDamageExpression(expr) {
    const out = { dice: [], flat: 0 };
    if (!expr) return out;
    const parts = String(expr).split(/([+-])/).map(p => p.trim()).filter(Boolean);
    let sign = 1;
    for (const part of parts) {
        if (part === '+') { sign = 1; continue; }
        if (part === '-') { sign = -1; continue; }
        const die = part.match(/^(\d*)d(\d+)$/i);
        if (die) {
            const count = Number(die[1] || 1);
            const sides = Number(die[2]);
            out.dice.push({ sign, count, sides });
        } else if (/^\d+$/.test(part)) {
            out.flat += sign * Number(part);
        }
    }
    return out;
}

// Build a display expression for an attack's damage, adding the ability
// modifier (and any extra) only when the stored string has no flat bonus yet.
export function resolveDamageExpression(attack, ch) {
    const attackObj = attack && typeof attack === 'object' ? attack : {};
    const raw = String(attackObj.damage || '').trim();
    const parsed = parseDamageExpression(raw);
    const abi = ch && (ch.abilityScores || ch.abilities) || {};
    const mod = abilityMod(abi[attackObj.ability || 'str']);
    let expr = raw;
    let hasFlat = parsed.dice.length > 0 && Math.abs(parsed.flat) > 0 || /[+-]\s*\d+$/.test(raw.replace(/\bd\d+\b/gi, ''));
    const extra = Number(attackObj.extra) || 0;
    if (!hasFlat && (mod !== 0 || extra !== 0)) {
        const total = mod + extra;
        expr = (expr ? expr + ' ' : '') + (total >= 0 ? '+ ' : '- ') + Math.abs(total);
    }
    return expr;
}

// Normalized attack rows for the panel. Falls back to combat stats when the
// stored character has no `attacks` array (e.g. legacy 巴克).
export function buildPanelAttacks(ch) {
    const list = Array.isArray(ch && ch.attacks) ? ch.attacks : [];
    const abi = ch && (ch.abilityScores || ch.abilities) || {};
    const pb = profBonusFor(ch);

    const normalize = (raw, index) => {
        const a = raw && typeof raw === 'object' ? raw : { name: String(raw || '') };
        const ability = a.ability || 'str';
        const storedBonus = Number(a.attackBonus);
        const attackBonus = Number.isFinite(storedBonus) && storedBonus !== 0
            ? storedBonus
            : pb + abilityMod(abi[ability]);
        return {
            name: a.name || 'Attack',
            ability,
            range: a.range || '',
            extra: Number(a.extra) || 0,
            attackBonus,
            damage: resolveDamageExpression(a, ch),
            damageParse: parseDamageExpression(resolveDamageExpression(a, ch)),
            attackBonusFormula: `${formatMod(pb)} 熟練 + ${formatMod(abilityMod(abi[ability]))} (${ability.toUpperCase()})`
        };
    };

    if (list.length) return list.map((a, i) => normalize(a, i));

    const fallback = [];
    const rangedHit = Number(ch && ch.longbowHit);
    const dexMod = abilityMod(abi.dex);
    if (Number.isFinite(rangedHit) && rangedHit !== 0) {
        fallback.push({ name: 'Ranged (Longbow)', ability: 'dex', range: '150/600 ft', extra: 0, attackBonus: rangedHit, _rawDamage: '1d8' });
    } else if (abi.dex !== undefined) {
        fallback.push({ name: 'Ranged', ability: 'dex', range: '150/600 ft', extra: 0, attackBonus: pb + dexMod, _rawDamage: '1d8' });
    }
    if (abi.str !== undefined) {
        fallback.push({ name: 'Melee', ability: 'str', range: 'Melee 5 ft', extra: 0, attackBonus: pb + abilityMod(abi.str), _rawDamage: '1d6' });
    }
    return fallback.map((a, i) => normalize({ ...a, damage: a._rawDamage }, i));
}

// ── Active character resolution ─────────────────────────────
// Full JSON preferred (wizard data with attacks/features/spells), then the
// per-character data file, then the legacy in-app Character state.
const OVERLAY_KEY = 'rpg_characters_v2';

function getOverlayCharacter(id) {
    try {
        const raw = localStorage.getItem(OVERLAY_KEY);
        const obj = raw ? JSON.parse(raw) : null;
        if (obj && id && obj[id]) return obj[id];
        return null;
    } catch (e) { return null; }
}

export function getActiveCharacterId() {
    const explicit = localStorage.getItem('active_character_id');
    if (explicit) return explicit;
    try { return (window.character && window.character.data && window.character.data.id) || 'player-1'; } catch (e) { return 'player-1'; }
}

export function parseRpNotes(id) {
    try { return localStorage.getItem('rpg_rp_notes_' + String(id || 'player-1')) || ''; } catch (e) { return ''; }
}

export function saveRpNotes(id, text) {
    try { localStorage.setItem('rpg_rp_notes_' + String(id || 'player-1'), String(text || '')); } catch (e) { /* ignore */ }
}

export async function resolveActiveCharacterData() {
    const id = getActiveCharacterId();

    const overlay = getOverlayCharacter(id);
    if (overlay) return { id, source: 'overlay', data: overlay };

    try {
        const res = await fetch(new URL('../../data/characters/' + encodeURIComponent(id) + '.json', import.meta.url), { cache: 'no-store' });
        if (res && res.ok) {
            const data = await res.json();
            if (data && typeof data === 'object') return { id, source: 'file', data };
        }
    } catch (e) { /* fall through */ }

    try {
        const legacy = await fetch(new URL('../../data/character.player-1.json', import.meta.url), { cache: 'no-store' });
        if (legacy && legacy.ok) {
            const data = await legacy.json();
            if (data && typeof data === 'object') return { id: data.id || id, source: 'legacy', data };
        }
    } catch (e) { /* fall through */ }

    try {
        const state = window.character && typeof window.character.getState === 'function' ? window.character.getState() : null;
        if (state) return { id, source: 'state', data: state };
    } catch (e) { /* ignore */ }

    return { id, source: 'none', data: null };
}

export function skillModifier(ch, skill) {
    const abi = ch && (ch.abilityScores || ch.abilities) || {};
    const ability = SKILL_ABILITIES[skill] || 'int';
    const trained = Array.isArray(ch && ch.skills) && ch.skills.includes(skill);
    const pb = profBonusFor(ch);
    return abilityMod(abi[ability]) + (trained ? pb : 0);
}

export function saveModifier(ch, key) {
    const abi = ch && (ch.abilityScores || ch.abilities) || {};
    const trained = Array.isArray(ch && ch.savingThrows) && ch.savingThrows.includes(key);
    const pb = profBonusFor(ch);
    return abilityMod(abi[key]) + (trained ? pb : 0);
}