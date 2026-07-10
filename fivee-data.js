export class FiveEDataStore {
    constructor({ basePath = '/5e_data', fetchJson = null } = {}) {
        this.basePath = basePath.replace(/\/$/, '');
        this.fetchJson = fetchJson || this._defaultFetchJson.bind(this);
        this.cache = new Map();
    }

    async _defaultFetchJson(path) {
        if (typeof fetch !== 'function') return null;
        const res = await fetch(path, { cache: 'no-store' });
        if (!res || !res.ok) return null;
        return res.json();
    }

    _normalizeCollectionName(name) {
        return String(name || '').trim().toLowerCase();
    }

    _getCollectionPath(collectionName) {
        return `${this.basePath}/${collectionName}.json`;
    }

    _slugify(value) {
        return String(value || '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
    }

    _matchesEntryName(entry, target) {
        const name = String(target || '').trim().toLowerCase();
        if (!name) return false;
        const candidates = [entry?.name, entry?.title, entry?.fullName, entry?.displayName, entry?.id];
        return candidates.some((value) => String(value || '').trim().toLowerCase() === name || String(value || '').trim().toLowerCase().includes(name));
    }

    _suggestClassName(abilities = {}) {
        const scores = {
            fighter: Number(abilities.str || 0) + Number(abilities.con || 0),
            rogue: Number(abilities.dex || 0) + Number(abilities.int || 0),
            ranger: Number(abilities.dex || 0) + Number(abilities.wis || 0),
            wizard: Number(abilities.int || 0) + Number(abilities.wis || 0),
            bard: Number(abilities.cha || 0) + Number(abilities.dex || 0),
            cleric: Number(abilities.wis || 0) + Number(abilities.cha || 0),
            paladin: Number(abilities.str || 0) + Number(abilities.cha || 0)
        };
        const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0]?.[0] || 'fighter';
        return best.charAt(0).toUpperCase() + best.slice(1);
    }

    async getCollection(collectionName) {
        const key = this._normalizeCollectionName(collectionName);
        if (this.cache.has(key)) return this.cache.get(key);
        const data = await this.fetchJson(this._getCollectionPath(key));
        let list = [];
        if (Array.isArray(data)) list = data;
        else if (data && Array.isArray(data.items)) list = data.items;
        else if (data && typeof data === 'object') {
            const firstArrayValue = Object.values(data).find(Array.isArray);
            list = firstArrayValue || [];
        }
        this.cache.set(key, list);
        return list;
    }

    async getById(collectionName, id) {
        const items = await this.getCollection(collectionName);
        const target = String(id || '').trim();
        if (!target) return null;
        return items.find((item) => String(item?.id || item?.name || '').toLowerCase() === target.toLowerCase()) || null;
    }

    async getByName(collectionName, name) {
        const items = await this.getCollection(collectionName);
        const target = String(name || '').trim().toLowerCase();
        if (!target) return null;
        return items.find((item) => {
            const candidates = [item?.name, item?.title, item?.fullName, item?.displayName, item?.id];
            return candidates.some((value) => String(value || '').trim().toLowerCase() === target || String(value || '').trim().toLowerCase().includes(target));
        }) || null;
    }

    async search(collectionName, query) {
        const items = await this.getCollection(collectionName);
        const target = String(query || '').trim().toLowerCase();
        if (!target) return items.slice(0, 20);
        return items.filter((item) => {
            const haystack = [item?.name, item?.title, item?.fullName, item?.displayName, item?.id, item?.source, item?.type]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
            return haystack.includes(target);
        }).slice(0, 20);
    }

    async buildCharacter5eInsights(characterLike, options = {}) {
        const state = characterLike?.getState?.() ?? characterLike ?? {};
        const abilities = state?.abilities || {};
        const backgroundName = state?.background?.name || state?.background || options.defaultBackground || 'Soldier';
        const className = state?.className || state?.class || this._suggestClassName(abilities);
        const classSlug = this._slugify(className) || 'fighter';

        const [backgroundEntries, classEntries, featEntries] = await Promise.all([
            this.getCollection('backgrounds'),
            this.getCollection(`class/class-${classSlug}`),
            this.getCollection('feats')
        ]);

        const background = backgroundEntries.find((entry) => this._matchesEntryName(entry, backgroundName)) || backgroundEntries.find((entry) => this._matchesEntryName(entry, 'Soldier')) || backgroundEntries[0] || null;
        const classEntry = classEntries.find((entry) => this._matchesEntryName(entry, className)) || classEntries[0] || null;

        const backgroundSkills = (background?.skillProficiencies || []).flatMap((item) => Object.keys(item || {}).filter((key) => item[key] === true));
        const backgroundTools = (background?.toolProficiencies || []).flatMap((item) => Object.keys(item || {}).filter((key) => item[key] === true));
        const backgroundFeats = (background?.feats || []).flatMap((item) => Object.keys(item || {}).filter((key) => item[key] === true));

        const currentFeats = Array.isArray(state?.feats) ? state.feats : [];
        const featSummaries = currentFeats
            .map((feat) => (typeof feat === 'string' ? feat : feat?.name))
            .filter(Boolean)
            .concat(backgroundFeats)
            .slice(0, 6);

        const battleStyles = (classEntry?.optionalfeatureProgression || [])
            .filter((item) => item?.name && /style/i.test(item.name))
            .map((item) => item.name);

        const classFeatures = (classEntry?.optionalfeatureProgression || [])
            .filter((item) => item?.name)
            .slice(0, 4)
            .map((item) => item.name);

        const resources = [
            { label: 'Hit Die', value: classEntry?.hd?.faces ? `d${classEntry.hd.faces}` : 'd8' },
            { label: 'Current tracker resources', value: Object.keys(state?.resources || {}).length ? Object.keys(state.resources).join(', ') : 'No tracked resources yet' }
        ];

        return {
            backgroundName,
            className,
            background,
            classEntry,
            featSummaries,
            battleStyles,
            classFeatures,
            resources,
            backgroundSkills,
            backgroundTools
        };
    }

    async getMeta(collectionName) {
        const items = await this.getCollection(collectionName);
        return {
            collection: collectionName,
            count: items.length,
            sample: items.slice(0, 5)
        };
    }
}

export function createFiveEDataStore(options = {}) {
    return new FiveEDataStore(options);
}

export function exposeFiveEDataStoreToWindow(store) {
    if (typeof window !== 'undefined') {
        window.FiveEDataStore = FiveEDataStore;
        window.fiveEDataStore = store;
    }
}
