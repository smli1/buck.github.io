import { Character } from '../core/character.js';

function resolveDataUrl(filename) {
    return new URL(`./data/${filename}`, import.meta.url);
}

export async function loadDefaultCharacterFromDataFile() {
    try {
        const res = await fetch(resolveDataUrl('character.player-1.json'), { cache: 'no-store' });
        if (res && res.ok) {
            const obj = await res.json();
            return obj && typeof obj === 'object' ? new Character(obj) : null;
        }
    } catch (e) {
        // ignore fetch errors and fall back to local storage / default constructor
    }
    return null;
}

export async function loadGameData() {
    const db = { feats: null, styles: null, skills: null, equipment: null };
    try {
        const [featsRes, stylesRes, equipRes] = await Promise.allSettled([
            fetch(resolveDataUrl('feats.json'), { cache: 'no-store' }),
            fetch(resolveDataUrl('style.json'), { cache: 'no-store' }),
            fetch(resolveDataUrl('equipment.json'), { cache: 'no-store' })
        ]);
        if (featsRes.status === 'fulfilled' && featsRes.value.ok) db.feats = await featsRes.value.json();
        if (stylesRes.status === 'fulfilled' && stylesRes.value.ok) {
            db.styles = await stylesRes.value.json();
            db.skills = db.styles;
        }
        if (equipRes.status === 'fulfilled' && equipRes.value.ok) db.equipment = await equipRes.value.json();
    } catch (e) {
        console.error('Failed to load game data:', e);
    }
    return db;
}
