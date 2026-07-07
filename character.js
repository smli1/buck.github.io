export class Character {
    constructor(data = {}) {
        this.data = {
            id: data.id ?? 'player-1',
            name: data.name ?? '巴克',
            level: Number.isFinite(data.level) ? data.level : 9,
            maxHp: Number.isFinite(data.maxHp) ? data.maxHp : null,
            currentHp: Number.isFinite(data.currentHp) ? data.currentHp : null,
            ac: Number.isFinite(data.ac) ? data.ac : null,
            longbowHit: Number.isFinite(data.longbowHit) ? data.longbowHit : null,
            resources: data.resources ?? {},
            abilities: data.abilities ?? {
                str: Number.isFinite(data?.abilities?.str) ? data.abilities.str : 13,
                dex: Number.isFinite(data?.abilities?.dex) ? data.abilities.dex : 15,
                con: Number.isFinite(data?.abilities?.con) ? data.abilities.con : 14,
                int: Number.isFinite(data?.abilities?.int) ? data.abilities.int : 11,
                wis: Number.isFinite(data?.abilities?.wis) ? data.abilities.wis : 11,
                cha: Number.isFinite(data?.abilities?.cha) ? data.abilities.cha : 8
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

    getDerivedMaxHp() {
        const conScore = Number(this.data?.abilities?.con ?? 10);
        const conMod = this.abilityModifier(conScore);
        const level = Math.max(1, Number(this.data.level) || 1);
        return 10 + conMod + Math.max(0, level - 1) * (6 + conMod);
    }

    getDerivedAC() {
        const dexScore = Number(this.data?.abilities?.dex ?? 10);
        const dexMod = this.abilityModifier(dexScore);
        return 14 + dexMod + 2;
    }

    getDerivedLongbowHit() {
        const dexScore = Number(this.data?.abilities?.dex ?? 10);
        const dexMod = this.abilityModifier(dexScore);
        console.log('Derived Longbow Hit:', this.getProficiencyBonus(this.data.level), dexMod);
        return this.getProficiencyBonus(this.data.level) + dexMod + 5;
    }

    _syncDerivedStats() {
        const level = Math.max(1, Number(this.data.level) || 1);
        this.data.level = level;
        this.data.maxHp = this.getDerivedMaxHp();
        this.data.ac = this.getDerivedAC();
        this.data.longbowHit = this.getDerivedLongbowHit();
        if (!Number.isFinite(this.data.currentHp)) this.data.currentHp = this.data.maxHp;
        this.data.currentHp = Math.max(0, Math.min(this.data.maxHp, Number(this.data.currentHp) || 0));
    }

    // Aggregate all feat-provided ability bonuses into a single bonuses object
    _getLevelBasedFeatBonuses() {
        const total = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
        const level = Math.max(1, Number(this.data.level) || 1);
        const progressionFeats = [
            { minLevel: 4, bonuses: { dex: 1 } },
            { minLevel: 6, bonuses: { dex: 1 } },
            { minLevel: 8, bonuses: { dex: 1 } }
        ];
        for (const feat of progressionFeats) {
            if (level < feat.minLevel) continue;
            for (const [k, v] of Object.entries(feat.bonuses || {})) {
                const key = String(k).toLowerCase();
                if (key in total) total[key] += Number(v) || 0;
            }
        }
        const out = {};
        for (const k of Object.keys(total)) if (total[k]) out[k] = total[k];
        return out;
    }

    _aggregateFeatBonuses() {
        const total = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
        const progressionBonuses = this._getLevelBasedFeatBonuses();
        for (const [k, v] of Object.entries(progressionBonuses)) {
            const key = String(k).toLowerCase();
            if (key in total) total[key] += Number(v) || 0;
        }
        if (!Array.isArray(this.data.feats)) return this._pruneBonusObject(total);
        for (const f of this.data.feats) {
            if (!f || !f.bonuses) continue;
            for (const [k, v] of Object.entries(f.bonuses)) {
                const key = String(k).toLowerCase();
                if (key in total) total[key] += Number(v) || 0;
            }
        }
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
        if (!(key in this.data)) return false;
        if (['maxHp', 'ac', 'longbowHit'].includes(key)) return false;
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
        return `${s} → ${sign} （計算：floor((${s} - 10) / 2) = ${sign}）`;
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

    abilityModifier(score) {
        const s = Number(score) || 0;
        return Math.floor((s - 10) / 2);
    }

    abilityFormula(score) {
        const s = Number(score) || 0;
        const mod = this.abilityModifier(s);
        const sign = mod >= 0 ? `+${mod}` : `${mod}`;
        return `${s} → ${sign} （計算：floor((${s} - 10) / 2) = ${sign}）`;
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
                        maxHp: null,
                        currentHp: Number.isFinite(obj.currentHp) ? obj.currentHp : this.data.currentHp,
                        ac: null,
                        longbowHit: null,
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
