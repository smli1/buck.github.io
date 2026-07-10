export class Character {
    constructor(data = {}) {
        this.data = {
            id: data.id ?? 'player-1',
            name: data.name ?? '巴克',
            level: Number.isFinite(data.level) ? data.level : 9,
            maxHp: Number.isFinite(data.maxHp) ? data.maxHp : null,
            // allow saving/loading of static values as overrides (persisted in JSON)
            maxHpOverride: Number.isFinite(data.maxHpOverride) ? Number(data.maxHpOverride) : null,
            currentHp: Number.isFinite(data.currentHp) ? data.currentHp : null,
            ac: Number.isFinite(data.ac) ? data.ac : null,
            acOverride: Number.isFinite(data.acOverride) ? Number(data.acOverride) : null,
            longbowHit: Number.isFinite(data.longbowHit) ? data.longbowHit : null,
            longbowHitOverride: Number.isFinite(data.longbowHitOverride) ? Number(data.longbowHitOverride) : null,
            // style skills: 'defense' (adds to AC) and 'archery' (adds to longbow hit)
            styles: data.styles ?? { defense: Boolean(data?.styles?.defense), archery: Boolean(data?.styles?.archery) },
            // equipped armor (object): { name: 'Leather', ac: 11, dexCap: null }
            // - `ac` is the armor's base AC (before dex)
            // - `dexCap` when numeric limits how much dex mod is applied (use 0 to block dex)
            armor: data.armor ?? null,
            resources: data.resources ?? {},
            abilities: data.abilities ?? {
                str: Number.isFinite(data?.abilities?.str) ? data.abilities.str : null,
                dex: Number.isFinite(data?.abilities?.dex) ? data.abilities.dex : null,
                con: Number.isFinite(data?.abilities?.con) ? data.abilities.con : null,
                int: Number.isFinite(data?.abilities?.int) ? data.abilities.int : null,
                wis: Number.isFinite(data?.abilities?.wis) ? data.abilities.wis : null,
                cha: Number.isFinite(data?.abilities?.cha) ? data.abilities.cha : null
            },
            background: data.background ?? { name: '士兵', bonuses: Character?.BACKGROUND_BONUSES?.['士兵'] ?? { dex: 2 } },
            notes: data.notes ?? '',
            // feats can be strings or objects { name, bonuses }
            feats: (Array.isArray(data.feats) ? data.feats.slice() : (data.feats ? [data.feats] : [])).map(f => {
                if (!f) return null;
                if (typeof f === 'string') return { name: f, bonuses: {} };
                // shallow clone and ensure bonuses object
                return { name: String(f.name || f.label || ''), bonuses: Object.assign({}, f.bonuses || f.bonus || {}) };
            }).filter(Boolean)
        };
        this.listeners = new Set();
        // keep an immutable copy of base abilities to allow applying/removing background bonuses
        this._baseAbilities = { ...this.data.abilities };
        this._syncDerivedStats();
        // if a default background was provided, apply its bonuses
        if (this.data.background && this.data.background.name) {
            try { this.applyBackground(this.data.background.name, this.data.background.bonuses || {}); } catch (e) { /* ignore */ }
        }
    }

    getProficiencyBonus(level = this.data.level) {
        const lvl = Math.max(1, Number(level) || 1);
        return Math.ceil(lvl / 4) + 1;
    }

    getStyleBonus(styleName, attribute, fallback = 0) {
        if (!styleName || !attribute) return fallback;
        const active = Boolean(this.data?.styles?.[styleName]);
        if (!active) return fallback;
        try {
            const dbStyle = window?.DB?.styles?.[styleName];
            if (dbStyle && dbStyle.bonuses && Object.prototype.hasOwnProperty.call(dbStyle.bonuses, attribute)) {
                const bonus = Number(dbStyle.bonuses[attribute]);
                return Number.isFinite(bonus) ? bonus : fallback;
            }
        } catch (e) {
            // ignore and use fallback
        }
        return fallback;
    }

    getDerivedMaxHp() {
        const conScore = Number(this.data?.abilities?.con ?? 10);
        const conMod = this.abilityModifier(conScore);
        const level = Math.max(1, Number(this.data.level) || 1);
        return 10 + conMod + Math.max(0, level - 1) * (6 + conMod);
    }

    getDerivedAC() {
        const dexScore = Number(this.data?.abilities?.dex ?? 10);
        const dexMod = this.abilityModifier(dexScore);
        const styleBonus = this.getStyleBonus('defense', 'ac', 1);
        // If armor is equipped and has a numeric `ac`, use its rules
        const armor = this.data?.armor;
        if (armor && Number.isFinite(Number(armor.ac))) {
            const baseAC = Number(armor.ac);
            // dexCap: null/undefined => full dex, 0 => no dex, number => cap
            let appliedDex = dexMod;
            if (armor.hasOwnProperty('dexCap') && armor.dexCap !== null && armor.dexCap !== undefined) {
                const cap = Number(armor.dexCap);
                if (Number.isFinite(cap)) {
                    appliedDex = Math.min(dexMod, cap);
                }
            }
            return baseAC + appliedDex + styleBonus;
        }
        // default (no armor): base 12 + dex
        return 12 + dexMod + styleBonus;
    }

    getLongbowHitBreakdown() {
        const dexScore = Number(this.data?.abilities?.dex ?? 10);
        const dexMod = this.abilityModifier(dexScore);
        const proficiencyBonus = this.getProficiencyBonus(this.data.level);
        const styleBonus = this.getStyleBonus('archery', 'longbowHit', 2);
        return {
            dexMod,
            proficiencyBonus,
            styleBonus,
            total: proficiencyBonus + dexMod + styleBonus
        };
    }

    getManualCombatBreakdown() {
        const state = this.getState();
        const abilities = state?.abilities || {};
        const strScore = Number(abilities.str ?? 10);
        const dexScore = Number(abilities.dex ?? 10);
        const strengthModifier = this.abilityModifier(strScore);
        const dexterityModifier = this.abilityModifier(dexScore);
        const proficiencyBonus = this.getProficiencyBonus(state.level);
        const rangedStyleBonus = this.getStyleBonus('archery', 'longbowHit', 2);
        const defenseStyleBonus = this.getStyleBonus('defense', 'ac', 1);
        const featRangedDamageBonus = Number(state?.featBonuses?.rangeddamage ?? 0);
        const featMeleeDamageBonus = Number(state?.featBonuses?.meleedamage ?? 0);
        const featRangedHitBonus = Number(state?.featBonuses?.rangedhit ?? 0);
        const featMeleeHitBonus = Number(state?.featBonuses?.meleehit ?? 0);


        return {
            strengthModifier,
            dexterityModifier,
            proficiencyBonus,
            rangedHitBonus: proficiencyBonus + dexterityModifier + rangedStyleBonus,
            meleeHitBonus: proficiencyBonus + strengthModifier,
            meleeDamageBonus: strengthModifier,
            rangedDamageBonus: dexterityModifier,
            defenseStyleBonus,
            rangedStyleBonus,
            featRangedDamageBonus,
            featMeleeDamageBonus,
            featRangedHitBonus,
            featMeleeHitBonus
        };
    }

    getLabelValueMap() {
        const state = this.getState();
        const abilities = state.abilities || {};
        const dexScore = Number(abilities.dex ?? 10);
        const conScore = Number(abilities.con ?? 10);
        const dexMod = this.abilityModifier(dexScore);
        const conMod = this.abilityModifier(conScore);
        const proficiencyBonus = this.getProficiencyBonus(state.level);
        const hpBase = 10;
        const hpDiceBonus = 6 + conMod;
        const hpLevels = Math.max(0, Number(state.level) - 1);

        return {
            name: { label: '角色名稱', value: state.name },
            level: { label: '等級', value: state.level },
            str: { label: 'STR', value: Number(abilities.str ?? 10) },
            dex: { label: 'DEX', value: dexScore },
            dexMod: { label: '敏捷調整值', value: dexMod },
            con: { label: 'CON', value: conScore },
            conMod: { label: 'CON 調整值', value: conMod },
            int: { label: 'INT', value: Number(abilities.int ?? 10) },
            wis: { label: 'WIS', value: Number(abilities.wis ?? 10) },
            cha: { label: 'CHA', value: Number(abilities.cha ?? 10) },
            proficiencyBonus: { label: '熟練加值', value: proficiencyBonus },
            styleBonus: { label: '箭術風格', value: this.getStyleBonus('archery', 'longbowHit', 2) },
            featBonuses: { label: '特性加值', value: this.data.featBonuses },
            currentHp: { label: '當前生命值', value: state.currentHp },
            maxHp: { label: '最大生命值', value: state.maxHp },
            ac: { label: 'AC', value: state.ac },
            longbowHit: { label: '長弓命中', value: state.longbowHit },
            hpBase: { label: '基礎 HP', value: hpBase },
            hpDiceBonus: { label: '每級戰士生命骰', value: hpDiceBonus },
            hpLevels: { label: '戰士等級', value: hpLevels },
            acBase: { label: '護甲基礎值', value: 12 },
            acStyleBonus: { label: '防禦風格', value: this.getStyleBonus('defense', 'ac', 1) }
        };
    }

    formatSignedValue(value) {
        const numeric = Number(value);
        if (Number.isFinite(numeric)) {
            return numeric >= 0 ? `+${numeric}` : `${numeric}`;
        }
        return String(value ?? '--');
    }

    getTooltipText(key) {
        const values = this.getLabelValueMap();
        const level = Number(this.data.level ?? 1);
        const conMod = values.conMod.value;
        const hpLevels = Math.max(0, level - 1);
        switch (key) {
            case 'hp':
                return `最大生命值：${this.formatSignedValue(values.hpBase.value)}（基礎 HP） + ${this.formatSignedValue(conMod)}（${values.conMod.label}） + ${hpLevels} × (${values.hpDiceBonus.value}（每級戰士生命骰） + ${this.formatSignedValue(conMod)}（${values.conMod.label}）) = ${this.formatSignedValue(values.maxHp.value)}（最大 HP）`;
            case 'ac':
                return `護甲值：${values.acBase.value}（護甲基礎值） + ${this.formatSignedValue(values.dexMod.value)}（${values.dexMod.label}） + ${values.acStyleBonus.value}（${values.acStyleBonus.label}） = ${this.formatSignedValue(values.ac.value)}（最終 AC）`;
            case 'longbow':
                return `總命中加值 = ${this.formatSignedValue(values.dexMod.value)}（${values.dexMod.label}） + ${this.formatSignedValue(values.proficiencyBonus.value)}（${values.proficiencyBonus.label}） + ${this.formatSignedValue(values.styleBonus.value)}（${values.styleBonus.label}） = ${this.formatSignedValue(values.longbowHit.value)}（長弓命中）`;
            default:
                return null;
        }
    }

    getDerivedLongbowHit() {
        return this.getLongbowHitBreakdown().total;
    }

    _syncDerivedStats() {
        const level = Math.max(1, Number(this.data.level) || 1);
        this.data.level = level;
        const derivedMaxHp = this.getDerivedMaxHp();
        const derivedAC = this.getDerivedAC();
        const derivedLongbow = this.getDerivedLongbowHit();
        // respect explicit overrides when provided (finite numbers)
        this.data.maxHp = Number.isFinite(this.data.maxHpOverride) ? Number(this.data.maxHpOverride) : derivedMaxHp;
        this.data.ac = Number.isFinite(this.data.acOverride) ? Number(this.data.acOverride) : derivedAC;
        this.data.longbowHit = Number.isFinite(this.data.longbowHitOverride) ? Number(this.data.longbowHitOverride) : derivedLongbow;
        if (!Number.isFinite(this.data.currentHp)) this.data.currentHp = this.data.maxHp;
        this.data.currentHp = Math.max(0, Math.min(this.data.maxHp, Number(this.data.currentHp) || 0));
    }

    // Aggregate all feat-provided ability bonuses into a single bonuses object
    _getLevelBasedFeatBonuses() {
        // feat damage bonuses are stored in the feats array as { name, level, bonuses: { str, dex, con, int, wis, cha,  longbowHit, meleeHit, meleeDamage, rangedDamage } }
        const feats = Array.isArray(this.data.feats) ? this.data.feats : [];
        // console.log('Level-based feat bonuses:', feats);
        return feats;
    }

    _aggregateFeatBonuses() {
        const total = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0, longbowhit: 0, meleehit: 0, meleedamage: 0, rangeddamage: 0 };
        const progressionBonuses = this._getLevelBasedFeatBonuses();
        for (const [k, v] of Object.entries(progressionBonuses)) {
            const key = String(k).toLowerCase();
            // console.log(`Processing feat bonus: ${key} = ${v.bonus}`);
            // console.log('Feat bonus value:', v);
            for (const [k2, v2] of Object.entries(v.bonuses || {})) {
                const key2 = String(k2).toLowerCase();
                // console.log(`Processing feat bonus: ${v.name} = ${key2} ${v2}`);
                if (key2 in total) total[key2] += Number(v2) || 0;
            }
        }

        // console.log('Aggregated feat bonuses:', total);
        // if (!Array.isArray(this.data.feats)) return this._pruneBonusObject(total);
        // for (const f of this.data.feats) {
        //     if (!f || !f.bonuses) continue;
        //     for (const [k, v] of Object.entries(f.bonuses)) {
        //         const key = String(k).toLowerCase();
        //         if (key in total) total[key] += Number(v) || 0;
        //     }
        // }
        return this._pruneBonusObject(total);
    }

    _pruneBonusObject(bonuses = {}) {
        const out = {};
        for (const [k, v] of Object.entries(bonuses || {})) {
            if (Number(v) || 0) out[k] = Number(v) || 0;
        }
        return out;
    }

    // Rebuild effective abilities from base + background + feat bonuses
    _rebuildAbilities() {
        // start from base
        this.data.abilities = { ...this._baseAbilities };
        // apply background bonuses if present
        const bg = this.data.background && this.data.background.bonuses ? this.data.background.bonuses : {};
        for (const k of Object.keys(bg)) {
            if (k in this.data.abilities) this.data.abilities[k] = Number(this.data.abilities[k] || 0) + Number(bg[k] || 0);
        }
        // apply feat bonuses
        
        const fb = this._aggregateFeatBonuses();
        this.data.featBonuses = fb;
        // console.log('Applying feat bonuses:', fb);
        for (const k of Object.keys(fb)) {
            if (k in this.data.abilities) this.data.abilities[k] = Number(this.data.abilities[k] || 0) + Number(fb[k] || 0);
        }
        this._syncDerivedStats();
        this._emitChange();
    }

    getState() {
        return { ...this.data };
    }

    set(key, value) {
        if (!(key in this.data) && !['ac','maxHp','longbowHit'].includes(key)) return false;
        // allow setting static override values for ac/maxHp/longbowHit via `set` (persisted on save)
        if (['maxHp', 'ac', 'longbowHit'].includes(key)) {
            const overrideKey = `${key}Override`;
            this.data[overrideKey] = Number.isFinite(Number(value)) ? Number(value) : null;
            this._syncDerivedStats();
            this._emitChange();
            return true;
        }
        if (key === 'currentHp') {
            this.data.currentHp = Math.max(0, Math.min(this.data.maxHp, Number(value) || 0));
            this._emitChange();
            return true;
        }
        if (key === 'level') {
            this.data.level = Math.max(1, Number(value) || 1);
            this._rebuildAbilities();
            return true;
        }
        this.data[key] = value;
        this._syncDerivedStats();
        this._emitChange();
        return true;
    }

    setBaseAbility(ability, value) {
        const key = String(ability || '').toLowerCase();
        if (!(key in this._baseAbilities)) return false;
        const nextValue = Math.max(1, Math.min(30, Number(value) || 1));
        if (this._baseAbilities[key] === nextValue) {
            return true;
        }
        this._baseAbilities[key] = nextValue;
        this._rebuildAbilities();
        return true;
    }

    setBaseAbilities(abilities = {}) {
        let changed = false;
        for (const [key, value] of Object.entries(abilities || {})) {
            const normalizedKey = String(key || '').toLowerCase();
            if (!(normalizedKey in this._baseAbilities)) continue;
            const nextValue = Math.max(1, Math.min(30, Number(value) || 1));
            if (this._baseAbilities[normalizedKey] !== nextValue) {
                this._baseAbilities[normalizedKey] = nextValue;
                changed = true;
            }
        }
        if (changed) {
            this._rebuildAbilities();
        }
        return changed;
    }

    // Enable or disable a named style skill (e.g., 'defense', 'archery')
    setStyle(styleName, enabled) {
        if (!styleName) return false;
        const key = String(styleName).toLowerCase();
        this.data.styles = this.data.styles || { defense: false, archery: false };
        const prev = Boolean(this.data.styles[key]);
        const next = Boolean(enabled);
        if (prev === next) return true;
        this.data.styles[key] = next;
        // recompute derived stats (AC and longbow hit)
        this._syncDerivedStats();
        this._emitChange();
        return true;
    }

    // Equip or remove armor. `armor` should be an object like { name: 'Chain', ac: 16, dexCap: 0 }
    setArmor(armor) {
        if (!armor) {
            this.data.armor = null;
            this._syncDerivedStats();
            this._emitChange();
            return true;
        }
        // shallow clone accepted armor object
        this.data.armor = Object.assign({}, armor);
        this._syncDerivedStats();
        this._emitChange();
        return true;
    }

    adjustHp(delta) {
        const before = this.data.currentHp;
        this.data.currentHp = Math.max(0, Math.min(this.data.maxHp, this.data.currentHp + delta));
        this._emitChange();
        return { before, after: this.data.currentHp };
    }

    setHp(value) {
        this.data.currentHp = Math.max(0, Math.min(this.data.maxHp, Number(value) || 0));
        this._emitChange();
    }

    setMaxHp(value) {
        this._syncDerivedStats();
        this._emitChange();
        return this.data.maxHp;
    }

    toJSON() {
        return {
            id: this.data.id,
            name: this.data.name,
            level: this.data.level,
            currentHp: this.data.currentHp,
            // persist current static values so exported JSON reflects what's shown
            maxHp: this.data.maxHp,
            maxHpOverride: this.data.maxHpOverride,
            ac: this.data.ac,
            acOverride: this.data.acOverride,
            longbowHit: this.data.longbowHit,
            longbowHitOverride: this.data.longbowHitOverride,
            armor: this.data.armor,
            styles: this.data.styles,
            resources: this.data.resources,
            abilities: { ...this._baseAbilities },
            background: this.data.background,
            notes: this.data.notes,
            feats: (this.data.feats || []).map(f => f ? ({ name: f.name, bonuses: { ...(f.bonuses || {}) } }) : null).filter(Boolean)
        };
    }

    abilityModifier(score) {
        const s = Number(score) || 0;
        return Math.floor((s - 10) / 2);
    }

    abilityFormula(score) {
        const s = Number(score) || 0;
        const mod = this.abilityModifier(s);
        const sign = mod >= 0 ? `+${mod}` : `${mod}`;
        return `${s}（屬性值） → ${sign}（調整值） （計算：floor((${s} - 10) / 2) = ${sign}）`;
    }

    getAbilitiesSummary() {
        const ab = this.data.abilities || {};
        return {
            str: { score: ab.str, mod: this.abilityModifier(ab.str) },
            dex: { score: ab.dex, mod: this.abilityModifier(ab.dex) },
            con: { score: ab.con, mod: this.abilityModifier(ab.con) },
            int: { score: ab.int, mod: this.abilityModifier(ab.int) },
            wis: { score: ab.wis, mod: this.abilityModifier(ab.wis) },
            cha: { score: ab.cha, mod: this.abilityModifier(ab.cha) }
        };
    }

    // Reset abilities to the stored base values (before any background bonuses applied)
    resetAbilitiesToBase() {
        this.data.abilities = { ...this._baseAbilities };
        this._syncDerivedStats();
        this._emitChange();
    }

    // Apply a background by name with an optional bonuses object like { str: 1, dex: -1 }
    applyBackground(name, bonuses = {}) {
        this.data.background = { name: name || null, bonuses: bonuses || {} };
        // rebuild effective abilities including feat bonuses
        this._rebuildAbilities();
        return this.data.background;
    }

    // Feat management (專長)
    addFeat(name) {
        if (!name) return false;
        this.data.feats = this.data.feats || [];
        // accept either string or object { name, bonuses }
        const featObj = (typeof name === 'string') ? { name: name, bonuses: {} } : { name: String(name.name || name.label || ''), bonuses: Object.assign({}, name.bonuses || name.bonus || {}) };
        if (!featObj.name) return false;
        const exists = this.data.feats.find(f => String(f.name).toLowerCase() === String(featObj.name).toLowerCase());
        if (!exists) {
            this.data.feats.push(featObj);
            this._rebuildAbilities();
            return true;
        }
        return false;
    }

    removeFeat(name) {
        if (!name || !this.data.feats) return false;
        const target = String(name);
        const idx = this.data.feats.findIndex(f => String(f.name || f).toLowerCase() === target.toLowerCase());
        if (idx !== -1) {
            this.data.feats.splice(idx, 1);
            this._rebuildAbilities();
            return true;
        }
        return false;
    }

    hasFeat(name) {
        if (!name || !this.data.feats) return false;
        const target = String(name).toLowerCase();
        return this.data.feats.some(f => String(f.name || f).toLowerCase() === target);
    }

    // Best-effort: fetch background page from 5e.kiwee.top and attempt to extract ability bonuses for `name`.
    // Returns a bonuses object (e.g. { str: 1 }) or null if not found.
    async fetchBackgroundBonusesFromSite(name) {
        if (!name) return null;
        try {
            const url = 'https://5e.tools/backgrounds.html';
            const res = await fetch(url);
            if (!res.ok) return null;
            const text = await res.text();
            const clean = text.replace(/\s+/g, ' ');
            const lower = clean.toLowerCase();
            const target = String(name).toLowerCase();
            let pos = 0;
            while (true) {
                const idx = lower.indexOf(target, pos);
                if (idx === -1) break;
                // take a window around the match to search for bonus patterns
                const windowStart = Math.max(0, idx - 300);
                const windowEnd = Math.min(clean.length, idx + 300);
                const txt = clean.slice(windowStart, windowEnd);
                // regex patterns for bonuses like +1 STR or 力量 +1
                const patterns = [ /([+-]?\d+)\s*(STR|DEX|CON|INT|WIS|CHA)/ig, /(力量|敏捷|體質|智力|感知|魅力)\s*([+-]?\d+)/g, /([+-]?\d+)\s*(力量|敏捷|體質|智力|感知|魅力)/g ];
                const mapZh = { '力量': 'str', '敏捷': 'dex', '體質': 'con', '智力': 'int', '感知': 'wis', '魅力': 'cha' };
                const bonuses = {};
                for (const pat of patterns) {
                    let m;
                    while ((m = pat.exec(txt)) !== null) {
                        if (!m) break;
                        // normalize
                        if (m[2]) {
                            let key = m[2].toUpperCase();
                            if (mapZh[m[2]]) key = mapZh[m[2]];
                            const val = Number(m[1]);
                            if (!Number.isNaN(val)) {
                                const k = (typeof key === 'string' && key.length <= 4) ? key.toLowerCase() : key;
                                // map english abbreviations
                                const canonical = { str: 'str', dex: 'dex', con: 'con', int: 'int', wis: 'wis', cha: 'cha' }[k] || mapZh[m[2]] || k;
                                if (canonical) bonuses[canonical] = (bonuses[canonical] || 0) + val;
                            }
                        }
                    }
                }
                if (Object.keys(bonuses).length) return bonuses;
                pos = idx + target.length;
            }
        } catch (e) {
            // ignore network/parse errors
        }
        return null;
    }

    // Local mapping for common backgrounds (fallback / offline). Keys accept English and Chinese.
    static BACKGROUND_BONUSES = {
        'soldier': { dex: 2 },
        '士兵': { dex: 2 }
    };

    // Populate `BACKGROUND_BONUSES` by scraping the backgrounds page for entries whose source includes the given tag (default "PHB'24").
    // This is best-effort: it extracts nearby ability bonus patterns and maps them to a normalized background name.
    static async populateBackgroundBonusesFromSite(sourceTag = "PHB'24") {
        try {
            const url = 'https://5e.kiwee.top/backgrounds.html';
            const res = await fetch(url);
            if (!res.ok) return false;
            const text = await res.text();
            // work on textContent to avoid HTML structure differences across mirrors
            const clean = text.replace(/\r|\n/g, ' ');
            const idxs = [];
            const searchTag = sourceTag.replace(/'/g, "'");
            let pos = 0;
            while (true) {
                const i = clean.indexOf(searchTag, pos);
                if (i === -1) break;
                idxs.push(i);
                pos = i + searchTag.length;
            }
            const patterns = [ /([+-]?\d+)\s*(STR|DEX|CON|INT|WIS|CHA)/ig, /(力量|敏捷|體質|智力|感知|魅力)\s*([+-]?\d+)/g, /([+-]?\d+)\s*(力量|敏捷|體質|智力|感知|魅力)/g ];
            const mapZh = { '力量': 'str', '敏捷': 'dex', '體質': 'con', '智力': 'int', '感知': 'wis', '魅力': 'cha' };
            for (const i of idxs) {
                const seg = clean.slice(Math.max(0, i - 400), i + 40);
                // attempt to find a background name in the preceding text (rough heuristic)
                const nameMatch = seg.match(/([A-Za-z\u4e00-\u9fff\s'()\-]{2,60})\s*(?:來源|Source|來源:|來源：|\|)/);
                const nameRaw = nameMatch ? nameMatch[1].trim() : null;
                if (!nameRaw) continue;
                const nameKey = String(nameRaw).trim().toLowerCase();
                // parse bonuses inside the segment
                const bonuses = {};
                for (const pat of patterns) {
                    let m;
                    while ((m = pat.exec(seg)) !== null) {
                        if (!m) break;
                        // English pattern: m[1]=val m[2]=abbr OR Chinese pattern: (word,val) etc.
                        if (m[2]) {
                            let k = m[2];
                            if (mapZh[k]) k = mapZh[k];
                            const val = Number(m[1]);
                            if (!Number.isNaN(val)) {
                                const canonical = (typeof k === 'string') ? String(k).toLowerCase() : k;
                                const mapped = { str: 'str', dex: 'dex', con: 'con', int: 'int', wis: 'wis', cha: 'cha' }[canonical] || mapZh[m[2]] || canonical;
                                if (mapped) bonuses[mapped] = (bonuses[mapped] || 0) + val;
                            }
                        }
                    }
                }
                if (Object.keys(bonuses).length) {
                    Character.BACKGROUND_BONUSES[nameKey] = bonuses;
                    // also store the original raw name variant
                    Character.BACKGROUND_BONUSES[nameRaw] = bonuses;
                }
            }
            return true;
        } catch (e) {
            return false;
        }
    }

    // Apply background by name using local mapping first, otherwise try to fetch from site.
    async applyBackgroundByName(name) {
        if (!name) return null;
        const key = String(name).trim().toLowerCase();
        let local = Character.BACKGROUND_BONUSES[key] || Character.BACKGROUND_BONUSES[name];
        if (local) return this.applyBackground(name, local);
        // try to populate mapping from site for PHB'24 then re-check
        try {
            await Character.populateBackgroundBonusesFromSite("PHB'24");
            local = Character.BACKGROUND_BONUSES[key] || Character.BACKGROUND_BONUSES[name];
            if (local) return this.applyBackground(name, local);
        } catch (e) { /* ignore */ }
        // fallback to single-entry fetch
        try {
            const remote = await this.fetchBackgroundBonusesFromSite(name);
            if (remote) return this.applyBackground(name, remote);
        } catch (e) { /* ignore */ }
        return null;
    }

    save(key = `character.${this.data.id}`) {
        try {
            localStorage.setItem(key, JSON.stringify(this.toJSON()));
            return true;
        } catch (e) {
            return false;
        }
    }

    exportToFile(filename) {
        const name = filename || `character_${this.data.id}_${new Date().toISOString().slice(0,10)}.json`;
        const content = JSON.stringify(this.toJSON(), null, 2);
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return true;
    }

    loadFromFile(file) {
        return new Promise((resolve, reject) => {
            if (!file) return reject(new Error('No file provided')); 
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const obj = JSON.parse(String(reader.result));
                    this.data = {
                        id: obj.id ?? this.data.id,
                        name: obj.name ?? this.data.name,
                        level: Number.isFinite(obj.level) ? obj.level : this.data.level,
                        // store overrides when provided so static values are preserved
                        maxHp: Number.isFinite(obj.maxHp) ? Number(obj.maxHp) : null,
                        maxHpOverride: Number.isFinite(obj.maxHpOverride) ? Number(obj.maxHpOverride) : null,
                        currentHp: Number.isFinite(obj.currentHp) ? obj.currentHp : this.data.currentHp,
                        ac: Number.isFinite(obj.ac) ? Number(obj.ac) : null,
                        acOverride: Number.isFinite(obj.acOverride) ? Number(obj.acOverride) : null,
                        styles: obj.styles ?? this.data.styles,
                        armor: obj.armor ?? this.data.armor,
                        longbowHit: Number.isFinite(obj.longbowHit) ? Number(obj.longbowHit) : null,
                        longbowHitOverride: Number.isFinite(obj.longbowHitOverride) ? Number(obj.longbowHitOverride) : null,
                        resources: obj.resources ?? this.data.resources,
                        notes: obj.notes ?? this.data.notes,
                        feats: Array.isArray(obj.feats) ? obj.feats.slice() : (obj.feats ? [obj.feats] : (this.data.feats || [])),
                        abilities: obj.abilities ?? this.data.abilities,
                        background: obj.background ?? this.data.background
                    };
                    // reset base abilities to the provided abilities (assumed to be base scores)
                    this._baseAbilities = { ...this.data.abilities };
                    // rebuild effective abilities applying background and feat bonuses
                    this._rebuildAbilities();
                    resolve(true);
                } catch (e) {
                    reject(e);
                }
            };
            reader.onerror = () => reject(reader.error);
            reader.readAsText(file);
        });
    }

    static load(key = `character.player-1`) {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return null;
            const obj = JSON.parse(raw);
            return new Character(obj);
        } catch (e) {
            return null;
        }
    }

    onChange(fn) {
        this.listeners.add(fn);
        return () => this.listeners.delete(fn);
    }

    _emitChange() {
        const snapshot = this.getState();
        this.listeners.forEach(fn => {
            try { fn(snapshot); } catch (e) { /* ignore */ }
        });
    }
}
