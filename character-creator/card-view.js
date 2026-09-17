// character-creator/card-view.js - stateless character-card renderer (used by character-card.html)
// Renders a full character card from a stored character JSON (rpg_characters_v2 / data folder).

const SKILL_ABILITIES_CARD = {
    acrobatics: 'dex', 'animal-handling': 'wis', arcana: 'int', athletics: 'str',
    deception: 'cha', history: 'int', insight: 'wis', intimidation: 'cha',
    investigation: 'int', medicine: 'wis', nature: 'int', perception: 'wis',
    performance: 'cha', persuasion: 'cha', religion: 'int',
    'sleight-of-hand': 'dex', stealth: 'dex', survival: 'wis'
};

window.CardView = {
    esc(s) {
        const d = document.createElement('div');
        d.textContent = s == null ? '' : String(s);
        return d.innerHTML;
    },
    escAttr(s) {
        return this.esc(s).replace(/"/g, '&quot;');
    },
    abilityMod(s) {
        return Math.floor(((Number(s) || 10) - 10) / 2);
    },
    formatMod(v) {
        v = Number(v);
        return v >= 0 ? '+' + v : String(v);
    },
    classHitDieValue(ch) {
        const die = (ch.hitDice && ch.hitDice.die) || 'd10';
        return Number(String(die).replace('d', ''));
    },

    renderInto(el, ch) {
        if (!el) return;
        el.innerHTML = this.render(ch);
    },

    render(ch) {
        const esc = this.esc.bind(this);
        const abilityMod = this.abilityMod.bind(this);
        const formatMod = this.formatMod.bind(this);
        const mod = (s) => formatMod(abilityMod(s));

        const abi = ch.abilityScores || ch.abilities || {};
        const keys = ['str', 'dex', 'con', 'int', 'wis', 'cha'].filter(k => abi[k] !== undefined);
        if (!keys.length) keys.push('str');
        const pb = Number(ch.proficiencyBonus) || Math.ceil((Number(ch.level) || 1) / 4) + 1;
        const bgName = typeof ch.background === 'string' ? ch.background : (ch.background ? ch.background.name : '');
        const armorName = ch.armor && typeof ch.armor === 'object' ? ch.armor.name : (ch.armor || 'No Armor');
        const speed = (ch.speed && ch.speed.walk) || 30;
        const skills = Array.isArray(ch.skills) ? ch.skills : [];
        const skillRows = skills.map(sk => ({ sk, abi: SKILL_ABILITIES_CARD[sk] || 'int' }));
        const traits = ch.traits || {};
        const features = Array.isArray(ch.features) ? ch.features : [];
        const attacks = Array.isArray(ch.attacks) ? ch.attacks : [];
        const items = (ch.inventory && Array.isArray(ch.inventory.items)) ? ch.inventory.items : [];
        const spellcasting = ch.spellcasting || null;

        const levelName = (l) => {
            if (l === 0) return 'Cantrip';
            const n = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'][Number(l) - 1];
            return (n || l) + ' Level';
        };

        let s = '';
        s += `<div class="cc-card-sheet">`;
        s += `<div class="cc-sheet-header">
            <div>
                <h2>${esc(ch.name || 'Unnamed')}</h2>
                <div class="cc-sheet-sub">${esc(ch.systemName || ch.system || 'Custom')} · ${esc(ch.race || '')} ${esc(ch.class || '')}${ch.subclass ? ' — ' + esc(ch.subclass) : ''} · Lv ${ch.level || 1}</div>
                <div class="cc-sheet-sub">${esc(bgName)}${ch.alignment ? ' · ' + esc(ch.alignment) : ''}</div>
            </div>
            <div class="cc-tag-row" style="flex-direction:column; align-items:flex-end; gap:4px;">
                <span class="cs-tag class">Proficiency ${formatMod(pb)}</span>
                <span class="cs-tag race">Init ${mod(abi.dex)}</span>
                <span class="cs-tag background">HP ${ch.currentHp ?? ch.maxHp ?? '—'}/${ch.maxHp ?? '—'} · AC ${ch.ac ?? '—'}</span>
            </div>
        </div>`;

        s += `<div class="cc-sheet-body">`;
        s += `<div class="cc-sheet-grid cols-2">
            <div class="cc-block">
                <h4>Ability Scores</h4>
                <div class="grid-6">
                    ${keys.map(k => `
                        <div class="cc-ability-big">
                            <div class="label">${esc(k.toUpperCase())}</div>
                            <div class="score">${abi[k]}</div>
                            <div class="mod">${mod(abi[k])}</div>
                        </div>`).join('')}
                </div>
            </div>
            <div class="cc-block" style="display:grid; gap:8px;">
                <h4>Combat</h4>
                <div class="grid-3" style="text-align:center;">
                    <div><div class="cc-ability-big mod" style="font-size:1.2rem;">${ch.maxHp ?? '—'}</div><div class="cc-ability-big label">Max HP</div></div>
                    <div><div class="cc-ability-big mod" style="font-size:1.2rem;">${ch.ac ?? '—'}</div><div class="cc-ability-big label">AC</div></div>
                    <div><div class="cc-ability-big mod" style="font-size:1.2rem;">${speed}</div><div class="cc-ability-big label">Speed</div></div>
                </div>
                <div class="cc-note">Hit Dice: ${esc((ch.hitDice && ch.hitDice.die) || 'd10')} × ${ch.level || 1} · Armor: ${esc(armorName || 'No Armor')}</div>
                ${ch.maxHpOverride ? `<div class="cc-note">Max HP is a fixed value (overridden).</div>` : ''}
            </div>
        </div>`;

        // Saving throws & skills
        const saves = Array.isArray(ch.savingThrows) ? ch.savingThrows : [];
        s += `<div class="cc-sheet-grid cols-2">
            <div class="cc-block">
                <h4>Saving Throws & Skills</h4>
                <div class="cc-chips">
                    ${saves.map(k => `<span class="cc-chip">${esc(k.toUpperCase())} ${formatMod(pb + abilityMod(abi[k]))}</span>`).join('') || '<span class="cc-note">None selected</span>'}
                </div>
                <div style="height:8px;"></div>
                <div class="cc-chips">
                    ${Array.from(new Set(skillRows.map(r => r.abi))).map(k => `
                    <div class="cc-sk-row">
                        <b>${esc(k.toUpperCase())}</b>
                        ${skillRows.filter(r => r.abi === k).map(r => `<span class="cc-chip">${esc(r.sk)} ${formatMod(pb + abilityMod(abi[r.abi]))}</span>`).join('')}
                    </div>`).join('') || '<span class="cc-note">No skills selected</span>'}
                </div>
                <div style="height:8px;"></div>
                <div class="cc-note"><b>Languages:</b> ${(Array.isArray(ch.languages) && ch.languages.length ? ch.languages.join(', ') : '—')}</div>
                ${ch.otherProficiencies ? `<div class="cc-note"><b>Other:</b> ${esc(ch.otherProficiencies)}</div>` : ''}
            </div>
            <div class="cc-block">
                <h4>Attacks</h4>
                ${attacks.length ? attacks.map(a => `
                    <div style="padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.06); display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap;">
                        <strong>${esc(a.name) || 'Attack'}</strong>
                        <span class="cc-note">hit ${formatMod(Number(a.attackBonus) || (pb + abilityMod(abi[a.ability || 'str'])))} · dmg ${esc(a.damage)}${a.range ? ' · ' + esc(a.range) : ''}</span>
                    </div>`).join('') : '<div class="cc-note">No attacks defined.</div>'}
                ${spellcasting ? `
                    <div style="height:10px;"></div>
                    <h4>Spellcasting (${esc((spellcasting.ability || 'int').toUpperCase())})</h4>
                    <div class="cc-note">DC <b>${spellcasting.saveDC || '—'}</b> · Attack <b>${formatMod(Number(spellcasting.spellAttack) || 0)}</b> · Slots ${esc(spellcasting.slots || '—')}</div>
                    ${Array.isArray(spellcasting.spells) && spellcasting.spells.length ? `
                        <div class="cc-note">${spellcasting.spells.map(sp => esc(typeof sp === 'string' ? sp : (sp.name + (Number(sp.level) > 0 ? ' (' + levelName(sp.level) + ')' : ' (Cantrip)')))).join(' · ')}</div>
                    ` : ''}
                ` : ''}
            </div>
        </div>`;

        s += `<div class="cc-sheet-grid">
            <div class="cc-block">
                <h4>Features & Traits</h4>
                <ul style="margin:0; padding-left:18px;">
                    ${features.filter(f => f && f.name).map(f => `<li><strong>${esc(f.name)}</strong>${f.description ? ' — ' + esc(f.description) : ''}</li>`).join('') || '<li class="cc-note">No features recorded.</li>'}
                </ul>
            </div>
        </div>`;

        s += `<div class="cc-sheet-grid cols-2">
            <div class="cc-block"><h4>Personality</h4><div class="cc-note">${esc(traits.personality) || '—'}</div></div>
            <div class="cc-block"><h4>Ideals</h4><div class="cc-note">${esc(traits.ideals) || '—'}</div></div>
            <div class="cc-block"><h4>Bonds</h4><div class="cc-note">${esc(traits.bonds) || '—'}</div></div>
            <div class="cc-block"><h4>Flaws</h4><div class="cc-note">${esc(traits.flaws) || '—'}</div></div>
        </div>`;

        if (ch.notes) s += `<div class="cc-block"><h4>Notes</h4><div class="cc-note">${esc(ch.notes)}</div></div>`;
        if (ch.gold || items.length) {
            s += `<div class="cc-block"><h4>Equipment</h4><div class="cc-note">Gold: ${ch.gold} gp · ${items.filter(i => i && i.name).map(i => esc(i.name) + (Number(i.quantity) > 1 ? ' ×' + i.quantity : '')).join(', ') || 'No items'}</div></div>`;
        }
        if (ch.appearance) s += `<div class="cc-block"><h4>Appearance</h4><div class="cc-note">${esc(ch.appearance)}</div></div>`;

        s += `</div></div>`;
        return s;
    }
};