// character-creator/step-5-spells.js - step 5 - spellcasting, spell list, slots and the area-of-effect grid
// Extracted from character-creator.html; loaded there in page order.

    // ───────────────────────────────────────────────────────────
    // Step 5
    // ───────────────────────────────────────────────────────────
    function attackBonus(abilityKey, prof = true, extra = 0) {
        let b = 0;
        if (prof) b += draft.profBonus;
        b += abilityMod(draft.abilities[abilityKey]);
        b += Number(extra) || 0;
        return b;
    }

    function spellMod() {
        const el = document.getElementById('s5-spell-ability');
        const key = el ? el.value : (draft.spellAbility || '');
        return abilityMod(draft.abilities[key] || 10);
    }

    function refreshStep5() {
        draft.profBonus = PROF_BONUS(draft.level);
        renderAttacks();
        // spell box fields
        if (draft.spellcaster) {
            autoSpellSlots();
            const dc = DC_BASE + draft.profBonus + spellMod();
            const atk = draft.profBonus + spellMod();
            document.getElementById('s5-spell-dc').value = dc;
            document.getElementById('s5-spell-atk').value = formatMod(atk);
        }
    }

    function abilityLabel(k) { return k.toUpperCase(); }

    function renderAttacks() {
        const list = document.getElementById('s5-attacks');
        list.innerHTML = '';
        draft.attacks.forEach((at, i) => {
            const row = document.createElement('div');
            row.className = 'cc-row';
            const bonus = draft.profBonus + abilityMod(draft.abilities[at.ability || 'str']) + (Number(at.extra) || 0);
            row.innerHTML = `
                <input value="${escAttr(at.name)}" placeholder="Attack" data-ai="${i}" data-k="name" style="flex:1.4;">
                <select data-ai="${i}" data-k="ability" title="Ability used">
                    ${ABILITY_KEYS.map(k => `<option value="${k}" ${at.ability === k ? 'selected' : ''}>${k.toUpperCase()}</option>`).join('')}
                </select>
                <input class="cc-sm" value="${escAttr(at.damage)}" placeholder="Damage" data-ai="${i}" data-k="damage" title="Damage dice e.g. 1d8+3">
                <input class="cc-sm" value="${escAttr(at.range)}" placeholder="Range" data-ai="${i}" data-k="range" title="Range">
                <span class="cc-hint" style="min-width:64px; text-align:center;">hit <b style="color:var(--secondary);">${formatMod(bonus)}</b></span>
                <button class="btn btn-delete" type="button" style="flex:0; padding:4px 10px;" onclick="${'removeRow(\'s5-attacks\', ' + i + ', \'attack\')'}">✕</button>`;
            list.appendChild(row);
        });
        list.querySelectorAll('input, select').forEach(el => {
            el.addEventListener('input', e => {
                const i = Number(el.dataset.ai);
                const k = el.dataset.k;
                if (!draft.attacks[i]) return;
                draft.attacks[i][k] = el.value;
                if (k === 'ability') { el.parentElement.querySelector('.cc-hint b').textContent = formatMod(draft.profBonus + abilityMod(draft.abilities[el.value]) + (Number(draft.attacks[i].extra) || 0)); }
            });
        });
        // re-render spell info
        if (draft.spellcaster) {
            document.getElementById('s5-spell-dc').value = DC_BASE + draft.profBonus + spellMod();
            document.getElementById('s5-spell-atk').value = formatMod(draft.profBonus + spellMod());
        }
    }

    function weaponsToAttacks() {
        draft.weapons.forEach(wid => {
            const w = WEAPONS.find(x => x.id === wid);
            if (!w) return;
            if (!draft.attacks.some(a => a.name.toLowerCase().includes(w.id.replace(/-/g, ' ').toLowerCase()))) {
                draft.attacks.push({
                    name: w.name.split(' (')[0],
                    ability: w.finesse || w.ranged ? 'dex' : 'str',
                    damage: w.die,
                    range: w.ranged ? 'Ranged' : 'Melee'
                });
            }
        });
    }

    function addAttackRow() { draft.attacks.push({ name: '', ability: 'str', damage: '', range: '', extra: 0 }); renderAttacks(); }

    function spellcasterChanged() {
        const box = document.getElementById('s5-spellcaster');
        draft.spellcaster = box.checked;
        document.getElementById('s5-spell-box').style.display = box.checked ? 'grid' : 'none';
        if (box.checked) { renderSpellList(); autoSpellSlots(); }
        refreshStep5();
        syncDictionaryHighlights();
    }

    function spellOptionsForLevel(level) {
        const sb = window.SPELLBOOK && SPELLBOOK.classes && SPELLBOOK.classes[draft.class];
        if (!sb || !sb.spells) return [];
        return sb.spells[String(level)] || [];
    }

    function maxSpellLevelForChar(lvl) {
        const sb = window.SPELLBOOK && SPELLBOOK.classes && SPELLBOOK.classes[draft.class];
        if (sb) {
            lvl = Math.max(1, Math.min(20, Number(lvl) || 1));
            if (sb.prog === 'pact' && sb.pact && sb.pact[lvl - 1]) {
                return Math.min(9, Number(sb.pact[lvl - 1][3]) || 0);
            }
            if (sb.slots && sb.slots[lvl - 1]) {
                const row = sb.slots[lvl - 1];
                let hi = 0;
                for (let i = 0; i < row.length; i++) if (row[i] > 0) hi = i + 1;
                return Math.min(9, hi);
            }
        }
        return Math.max(0, Math.min(9, Math.ceil((Number(lvl) || 1) / 2)));
    }

    function spellLevelLabel(l) {
        if (l === 0) return 'Cantrip';
        const n = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'][l - 1];
        return n + ' Level';
    }

    function autoSpellSlots() {
        const el = document.getElementById('s5-spell-slots');
        if (!el) return;
        if (draft._slotsTouched) return;
        const sb = window.SPELLBOOK && SPELLBOOK.classes && SPELLBOOK.classes[draft.class];
        if (!sb) return;
        const lvl = Math.max(1, Math.min(20, Number(draft.level) || 1));
        let text = '';
        if (sb.prog === 'pact' && sb.pact && sb.pact[lvl - 1]) {
            const p = sb.pact[lvl - 1];
            text = p[2] + ' (pact ' + spellLevelLabel(Number(p[3]) || 1) + ')';
        } else if (sb.slots && sb.slots[lvl - 1]) {
            const row = sb.slots[lvl - 1];
            const parts = [];
            for (let i = 0; i < 9; i++) if (row[i] > 0) parts.push(row[i]);
            text = parts.join(',');
        }
        el.value = text;
        draft.spellSlots = text;
    }

    function renderSpellList() {
        const list = document.getElementById('s5-spell-list');
        list.innerHTML = '';
        const max = maxSpellLevelForChar(draft.level);
        document.getElementById('s5-max-level').textContent = spellLevelLabel(max);
        draft.spells.forEach((sp, i) => {
            const opts = spellOptionsForLevel(Number(sp.level) || 0);
            const row = document.createElement('div');
            row.className = 'cc-row';
            row.innerHTML = `
                <select data-si="${i}" data-k="level" title="Spell level">
                    ${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(l =>
                        `<option value="${l}" ${(Number(sp.level) || 0) === l ? 'selected' : ''} ${l > max ? 'disabled' : ''}>${spellLevelLabel(l)}</option>`
                    ).join('')}
                </select>
                <input value="${escAttr(sp.name)}" placeholder="Spell name" list="s5-spell-opt-${i}" data-si="${i}" data-k="name" style="flex:1.6;">
                <datalist id="s5-spell-opt-${i}">
                    ${opts.map(n => `<option value="${escAttr(n)}">`).join('')}
                </datalist>
                ${opts.length ? `<span class="cc-hint" style="font-size:0.72rem;">${opts.length} spells</span>` : ''}
                <button class="btn btn-delete" type="button" style="flex:0; padding:4px 10px;" onclick="${'removeRow(\'s5-spell-list\', ' + i + ', \'spell\')'}">✕</button>`;
            list.appendChild(row);
        });
        list.querySelectorAll('select').forEach(el => {
            el.addEventListener('change', e => {
                const i = Number(el.dataset.si);
                if (!draft.spells[i]) return;
                draft.spells[i].level = Number(el.value);
                const dl = document.getElementById('s5-spell-opt-' + i);
                if (dl) {
                    const opts = spellOptionsForLevel(draft.spells[i].level);
                    dl.innerHTML = opts.map(n => `<option value="${escAttr(n)}">`).join('');
                    const hint = el.parentElement.querySelector('.cc-hint');
                    if (hint) hint.textContent = opts.length ? opts.length + ' spells' : '';
                }
            });
        });
        list.querySelectorAll('input').forEach(el => {
            el.addEventListener('input', e => {
                const i = Number(el.dataset.si);
                if (!draft.spells[i]) return;
                draft.spells[i].name = el.value;
                showSpellInfo(i);
            });
            el.addEventListener('focus', () => showSpellInfo(Number(el.dataset.si)));
        });
        autoSpellSlots();
    }

    function spellLookup(q) {
        if (!q) return null;
        const d = window.SPELLBOOK && SPELLBOOK.details;
        if (!d) return null;
        const ql = q.trim().toLowerCase();
        return d[ql] || null;
    }

    const SCHOOL_COLORS = {
        Evocation: '#f87171', Conjuration: '#2dd4bf', Transmutation: '#fb923c',
        Necromancy: '#a78bfa', Abjuration: '#60a5fa', Divination: '#cbd5e1',
        Enchantment: '#f472b6', Illusion: '#818cf8'
    };

    function spellProseHTML(text) {
        const raw = (text || '').replace(/\s+/g, ' ').trim();
        if (!raw) return '';
        const sentenceRe = /[^.!?]+[.!?]+(?:\s+)|[^.!?]+$/g;
        const sentences = (raw.match(sentenceRe) || [raw]).map(s => s.trim()).filter(Boolean);
        const chunks = [];
        let cur = [], curLen = 0;
        sentences.forEach(s => {
            if (curLen && (cur.length >= 3 || curLen + s.length > 260)) {
                chunks.push(cur.join(' '));
                cur = []; curLen = 0;
            }
            cur.push(s); curLen += s.length + 1;
        });
        if (cur.length) chunks.push(cur.join(' '));
        return '<div class="cc-stext">' + chunks.map(c => '<p>' + escHtml(c) + '</p>').join('') + '</div>';
    }

    function spellInfoHTML(q) {
        q = (q || '').trim();
        const d = spellLookup(q);
        const box = document.getElementById('s5-spell-info');
        if (!d) {
            box.hidden = false;
            box.innerHTML = '<div class="cc-empty">' + (q
                ? 'No PHB spell found for “' + escHtml(q) + '”.'
                : 'Type a spell name to see its effect, damage dice and area on the grid.') + '</div>';
            return;
        }
        const levelName = d.level === 0 ? 'Cantrip' : spellLevelLabel(d.level);
        const rangeLabel = d.range ? d.range.label : '?';
        const schoolColor = SCHOOL_COLORS[d.school] || '#94a3b8';

        const dmgParts = (d.dmg || []).slice();
        let dmgMain = '';
        if (dmgParts.length && d.dmgTypes && d.dmgTypes.length) {
            dmgMain = dmgParts[0] + ' ' + d.dmgTypes.join('/') + ' damage';
        } else if (dmgParts.length) {
            dmgMain = dmgParts[0] + ' damage';
        }
        const dmgBits = [];
        if (d.scaled) dmgBits.push('scales: ' + d.scaled.base + ' at slot ' + d.scaled.from + ', +' + d.scaled.per + '/slot');

        const stats = [];
        if (d.time) stats.push(['Casting', d.time]);
        stats.push(['Range', rangeLabel]);
        if (d.dur) stats.push(['Duration', d.dur]);
        if (d.comps) stats.push(['Components', d.comps]);
        if (d.save) stats.push(['Save', d.save]);
        if (d.atk) stats.push(['Attack', d.atk]);

        const hiBody = (d.higher || '').replace(/^\s*(at higher levels[.:]?\s*)/i, '');

        let gridSvg = '';
        try { gridSvg = spellGridSVG(d); } catch (err) { gridSvg = ''; }

        const textBlock =
            spellProseHTML(d.text) +
            (hiBody ? '<div class="cc-shigher"><b>At Higher Levels</b>' + escHtml(hiBody) + '</div>' : '');

        const buffs = d.buffs || [], debuffs = d.debuffs || [];
        const statusCorner = (buffs.length || debuffs.length)
            ? '<div class="cc-status">' +
              (buffs.length
                ? '<div class="cc-status-row cc-status-buff"><i>+</i>' + buffs.map(x => '<span>' + escHtml(x) + '</span>').join('') + '</div>'
                : '') +
              (debuffs.length
                ? '<div class="cc-status-row cc-status-debuff"><i>&minus;</i>' + debuffs.map(x => '<span>' + escHtml(x) + '</span>').join('') + '</div>'
                : '') +
              '</div>'
            : '';

        let html =
            '<div class="cc-shead">' +
                '<div class="cc-stitle">' +
                    '<h5>' + escHtml(d.name) + '</h5>' +
                    '<div class="cc-schips">' +
                        '<span class="cc-chip cc-chip-lv">' + escHtml(levelName) + '</span>' +
                        (d.conc ? '<span class="cc-chip cc-chip-conc">◎ Concentration</span>' : '') +
                        '<span class="cc-chip cc-chip-school" style="--sch:' + schoolColor + '">' + escHtml(d.school) + '</span>' +
                    '</div>' +
                '</div>' +
                statusCorner +
            '</div>' +
            (stats.length ? '<div class="cc-sstats">' + stats.map(s => '<span class="cc-stat"><i>' + escHtml(s[0]) + '</i><b>' + escHtml(s[1]) + '</b></span>').join('') + '</div>' : '') +
            (dmgMain ? '<div class="cc-sdmg"><span class="cc-dmgicon">⚡</span><div><b>' + escHtml(dmgMain) + '</b>' + (dmgBits.length ? '<small>' + escHtml(dmgBits.join(' · ')) + '</small>' : '') + '</div></div>' : '') +
            (gridSvg
                ? '<div class="cc-smain"><div>' + textBlock + '</div><div class="cc-sgrid">' + gridSvg + '</div></div>'
                : textBlock);
        box.hidden = false;
        box.innerHTML = html;
        if (gridSvg) {
            const svg = box.querySelector('.cc-sgrid svg');
            if (svg) { try { bindSpellGrid(svg, d); } catch (err) { /* keep static svg */ } }
        }
    }

    function escHtml(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    function showSpellInfo(i) {
        const sp = draft.spells[i];
        if (!sp) return;
        spellInfoHTML(sp.name);
    }

    let _gridSnap = false;

    function spellGridGeo(d) {
        const range = d.range || { label: '', ft: 0, type: 'point' };
        const area = d.area || null;
        const rawShape = (area ? area[0] : null) || (range.type !== 'point' ? range.type : null) || range.shape || null;
        const shape = rawShape === 'radius' ? 'sphere' : rawShape;
        const areaFt = (area ? area[1] : 0) || range.areaFt || range.ft || 0;
        const rft = range.ft || 0;
        let mode = 'none', maxCells = 0;
        if (rft && range.type === 'point') { mode = 'point'; maxCells = rft / 5; }
        else if (rft && (range.type === 'cube' || range.type === 'cone' || range.type === 'line')) { mode = 'directed'; maxCells = rft / 5; }
        else if (rft && range.type === 'touch') { mode = 'touch'; maxCells = 1; }
        else if (range.type === 'radius' && rft) { mode = 'none'; maxCells = rft / 5; }
        else if (range.type === 'point' && (range.label === 'Touch' || range.label === 'Self' || range.label === 'Sight')) {
            mode = range.label === 'Touch' ? 'touch' : 'none';
            maxCells = range.label === 'Touch' ? 1 : 0;
        }
        const cols = 19, rows = 11, W = cols * 22, H = rows * 22;
        const maxFeet = Math.max(maxCells * 5, 5);
        const cell = Math.min(22, Math.max(9, (W - 2 * 30) / Math.max(maxFeet / 5, 4)));
        const caster = { x: Math.max(22, Math.min(3 * cell, W * 0.16)), y: H * 0.5 };
        return { range, area, shape, areaFt, mode, maxCells, cell, W, H, cols, rows, caster };
    }

    function _shapeCenter(geo, t) {
        const { shape, cell, caster, mode } = geo;
        if (shape === 'cube' || shape === 'square') {
            if (mode === 'directed') {
                const L = Math.max(0.75, (geo.areaFt / 5) * cell);
                const dx = t.x - caster.x, dy = t.y - caster.y;
                const Ln = Math.sqrt(dx * dx + dy * dy) || 1;
                return { x: caster.x + (dx / Ln) * (L * 0.5), y: caster.y + (dy / Ln) * (L * 0.5) };
            }
            return t;
        }
        return t;
    }

    function _shapePoints(geo, t) {
        const { shape, areaFt, cell, caster } = geo;
        const L = Math.max(0.75, (areaFt / 5) * cell);
        const C = _shapeCenter(geo, t);
        if (shape === 'sphere' || shape === 'hemisphere' || shape === 'cylinder') {
            return { el: 'circle', cx: C.x, cy: C.y, r: L, fill: 'rgba(96,165,250,0.22)', stroke: 'rgba(147,197,253,0.9)' };
        }
        if (shape === 'cube' || shape === 'square') {
            return { el: 'rect', x: C.x - L * 0.5, y: C.y - L * 0.5, w: L, h: L, fill: 'rgba(250,204,21,0.22)', stroke: 'rgba(253,224,71,0.95)' };
        }
        if (shape === 'cone') {
            const dx = t.x - caster.x, dy = t.y - caster.y;
            const Ln = Math.sqrt(dx * dx + dy * dy) || 1;
            const ux = dx / Ln, uy = dy / Ln;
            if (Ln < cell * 0.5) Ln = cell * 0.5;
            const far = { x: caster.x + ux * L, y: caster.y + uy * L };
            const halfW = L * 0.5;
            const px = -uy, py = ux;
            return { el: 'polygon', pts: `${caster.x},${caster.y} ${(far.x + px * halfW).toFixed(1)},${(far.y + py * halfW).toFixed(1)} ${(far.x - px * halfW).toFixed(1)},${(far.y - py * halfW).toFixed(1)}`, fill: 'rgba(52,211,153,0.2)', stroke: 'rgba(110,231,183,0.95)' };
        }
        if (shape === 'line') {
            const dx = t.x - caster.x, dy = t.y - caster.y;
            const Ln = Math.sqrt(dx * dx + dy * dy) || 1;
            const ux = dx / Ln, uy = dy / Ln;
            const ex = caster.x + ux * L, ey = caster.y + uy * L;
            const px = -uy * cell * 0.5, py = ux * cell * 0.5;
            return { el: 'polygon', pts: `${caster.x + px},${caster.y + py} ${ex + px},${ey + py} ${ex - px},${ey - py} ${caster.x - px},${caster.y - py}`, fill: 'rgba(251,191,36,0.2)', stroke: 'rgba(252,211,77,0.95)' };
        }
        return null;
    }

    function _affectedCells(geo, t) {
        const { shape, areaFt, cell, caster, W, H } = geo;
        if (!shape || !areaFt) return [];
        const C = _shapeCenter(geo, t);
        const nx = Math.ceil(W / cell), ny = Math.ceil(H / cell);
        const cells = [];
        const L = Math.max(0.75, (areaFt / 5) * cell);
        if (shape === 'sphere' || shape === 'hemisphere' || shape === 'cylinder') {
            const r = areaFt * (cell / 5);
            const r2 = r * r;
            const c0 = Math.max(0, Math.floor((C.x - r) / cell));
            const c1 = Math.min(nx, Math.ceil((C.x + r) / cell));
            const r0 = Math.max(0, Math.floor((C.y - r) / cell));
            const r1 = Math.min(ny, Math.ceil((C.y + r) / cell));
            for (let c = c0; c <= c1; c++) for (let rr = r0; rr <= r1; rr++) {
                const cx = (c + 0.5) * cell - C.x, cy = (rr + 0.5) * cell - C.y;
                if (cx * cx + cy * cy <= r2) cells.push([c, rr]);
            }
        } else if (shape === 'cube' || shape === 'square') {
            const h = L * 0.5;
            const c0 = Math.max(0, Math.floor((C.x - h) / cell));
            const c1 = Math.min(nx, Math.ceil((C.x + h) / cell));
            const r0 = Math.max(0, Math.floor((C.y - h) / cell));
            const r1 = Math.min(ny, Math.ceil((C.y + h) / cell));
            for (let c = c0; c <= c1; c++) for (let rr = r0; rr <= r1; rr++) cells.push([c, rr]);
        } else if (shape === 'cone' || shape === 'line') {
            let dx = t.x - caster.x, dy = t.y - caster.y;
            const Ln = Math.sqrt(dx * dx + dy * dy) || 1;
            const ux = dx / Ln, uy = dy / Ln;
            for (let c = 0; c <= nx; c++) for (let rr = 0; rr <= ny; rr++) {
                const cx = (c + 0.5) * cell - caster.x, cy = (rr + 0.5) * cell - caster.y;
                const dot = cx * ux + cy * uy;
                const cross = cx * (-uy) + cy * ux;
                const pd = Math.abs(cross);
                if (shape === 'cone') {
                    if (dot >= 0 && dot <= L && pd <= dot * 0.5) cells.push([c, rr]);
                } else {
                    if (dot >= 0 && dot <= L && pd <= cell * 0.5) cells.push([c, rr]);
                }
            }
        }
        return cells;
    }

    function _cellsMarkup(geo, t) {
        const cells = _affectedCells(geo, t);
        if (!cells.length) return '';
        const { cell, shape } = geo;
        const col = shape === 'sphere' || shape === 'hemisphere' || shape === 'cylinder' ? 'rgba(96,165,250,0.34)'
            : shape === 'cone' ? 'rgba(52,211,153,0.32)'
            : 'rgba(250,204,21,0.34)';
        const ins = 0.6;
        return cells.map(([c, rr]) => `<rect x="${(c * cell + ins).toFixed(1)}" y="${(rr * cell + ins).toFixed(1)}" width="${(cell - ins).toFixed(1)}" height="${(cell - ins).toFixed(1)}" fill="${col}" stroke="rgba(255,255,255,0.28)" stroke-width="0.7"/>`).join('');
    }

    function _shapeMarkup(geo, t) {
        const p = _shapePoints(geo, t);
        if (!p) return '';
        const g = ` fill="${p.fill}" stroke="${p.stroke}" stroke-width="1.4"`;
        if (p.el === 'circle') return `<circle cx="${p.cx}" cy="${p.cy}" r="${p.r.toFixed(1)}"${g}/>`;
        if (p.el === 'rect') return `<rect x="${p.x.toFixed(1)}" y="${p.y.toFixed(1)}" width="${p.w.toFixed(1)}" height="${p.h.toFixed(1)}"${g}/>`;
        if (p.el === 'polygon') return `<polygon points="${p.pts}"${g}/>`;
        return '';
    }

    function _defaultTarget(geo) {
        const { caster, cell, maxCells, mode, W, H } = geo;
        if (mode === 'directed') {
            return { x: caster.x + maxCells * cell * 0.92, y: caster.y };
        }
        if (mode === 'point' || mode === 'touch') {
            const cells = Math.min(maxCells, (W - caster.x) / cell * 0.5);
            return { x: caster.x + cells * cell, y: H * 0.5 };
        }
        return { x: caster.x, y: caster.y };
    }

    function _clampTarget(geo, pt, snap) {
        const { caster, cell, maxCells, mode, W, H } = geo;
        let dx = pt.x - caster.x, dy = pt.y - caster.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxPx = maxCells * cell;
        if (mode === 'point' || mode === 'touch') {
            if (dist > maxPx) { dx = dx / dist * maxPx; dy = dy / dist * maxPx; }
            let x = Math.max(0, Math.min(W, caster.x + dx));
            let y = Math.max(0, Math.min(H, caster.y + dy));
            if (snap) { x = Math.round(x / cell) * cell; y = Math.round(y / cell) * cell; }
            return { x: x, y: y };
        }
        if (mode === 'directed') {
            if (dist < 1) return caster;
            let a = Math.atan2(dy, dx);
            if (snap) a = Math.round(a / (Math.PI / 4)) * (Math.PI / 4);
            const cos = Math.cos(a), sin = Math.sin(a);
            let r = maxPx;
            if (cos > 0) r = Math.min(r, (W - caster.x) / cos);
            else if (cos < 0) r = Math.min(r, -caster.x / cos);
            if (sin > 0) r = Math.min(r, (H - caster.y) / sin);
            else if (sin < 0) r = Math.min(r, -caster.y / sin);
            return { x: caster.x + cos * r, y: caster.y + sin * r };
        }
        return pt;
    }

    function spellGridSVG(d) {
        const geo = spellGridGeo(d);
        const { W, H, caster, cell, shape, areaFt, mode } = geo;
        const g = (fill, stroke, sw) => ` fill="${fill}" stroke="${stroke}" stroke-width="${sw || 1}"`;

        let s = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Interactive spell range grid">`;
        const nx = Math.ceil(W / cell), ny = Math.ceil(H / cell);
        for (let c = 0; c <= nx; c++) s += `<line x1="${(c * cell).toFixed(1)}" y1="0" x2="${(c * cell).toFixed(1)}" y2="${H}" stroke="#ffffff14" stroke-width="1"/>`;
        for (let r = 0; r <= ny; r++) s += `<line x1="0" y1="${(r * cell).toFixed(1)}" x2="${W}" y2="${(r * cell).toFixed(1)}" stroke="#ffffff14" stroke-width="1"/>`;
        // affected grid cells (populated on drag)
        s += `<g data-sg="cells"></g>`;

        // range ring
        if (mode !== 'none') {
            const R = geo.maxCells * cell;
            s += `<circle cx="${caster.x}" cy="${caster.y}" r="${R.toFixed(1)}" fill="rgba(255,255,255,0.03)" stroke="rgba(148,163,184,0.4)" stroke-width="1.2" stroke-dasharray="6 5"/>`;
        }
        // area shape (init at default target)
        const t0 = _defaultTarget(geo);
        s += `<g data-sg="shape">${_shapeMarkup(geo, t0)}</g>`;
        // dashed aim line
        s += `<line data-sg="line" x1="${caster.x}" y1="${caster.y}" x2="${t0.x}" y2="${t0.y}" stroke="rgba(255,255,255,0.45)" stroke-width="1.2" stroke-dasharray="5 4"/>`;
        // target marker
        s += `<circle data-sg="target" cx="${t0.x}" cy="${t0.y}" r="6" fill="#fbbf24" stroke="#fff" stroke-width="1.4"/>`;
        // caster
        s += `<circle data-sg="caster" cx="${caster.x}" cy="${caster.y}" r="${cell * 0.42}" fill="rgba(99,102,241,0.85)" stroke="#e0e7ff" stroke-width="1.5"/>`;
        s += `<text x="${caster.x}" y="${caster.y + 4}" font-size="11" text-anchor="middle" fill="#fff" font-weight="bold">C</text>`;
        // legend
        const rangeFt = geo.range.ft ? `Range ${geo.range.ft} ft` : (geo.range.label || '');
        const areaTxt = shape ? ` · ${areaFt} ft ${shape}` : '';
        const cap = String((rangeFt + areaTxt).replace(/[<>]/g, ch => ch === '<' ? '&lt;' : '&gt;'));
        s += `<text x="8" y="16" font-size="12" fill="#cbd5e1" font-family="sans-serif">${cap}</text>`;
        // snap toggle (top-right)
        const bx = W - 48, by = 6, bw = 28, bh = 20;
        const maskId = 'magmask' + Math.random().toString(36).slice(2);
        const snapFill = _gridSnap ? '#bfdbfe' : '#94a3b8';
        s += `<g data-sg="snapbtn" role="button" aria-pressed="${_gridSnap}" tabindex="0" title="Snap to grid (click to toggle)" style="cursor:pointer;">
            <rect data-sg="snapbg" x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="5" fill="${_gridSnap ? 'rgba(96,165,250,0.3)' : 'rgba(255,255,255,0.06)'}" stroke="${_gridSnap ? 'rgba(147,197,253,0.95)' : 'rgba(148,163,184,0.45)'}" stroke-width="1"/>
            <svg x="${bx + 2}" y="${by + 2}" width="${bw - 4}" height="${bh - 4}" viewBox="0 0 512 512" preserveAspectRatio="xMidYMid meet">
                <defs>
                    <mask id="${maskId}">
                        <rect width="512" height="512" fill="white"/>
                        <path d="M 196 360 A 130 130 0 0 1 456 360 L 456 495 L 196 495 Z" fill="black"/>
                    </mask>
                </defs>
                <g data-sg="snapgrid" mask="url(#${maskId})" fill="${snapFill}" opacity="${_gridSnap ? 1 : 0.55}">
                    <rect x="94" y="40" width="32" height="432" rx="16"/>
                    <rect x="224" y="40" width="32" height="432" rx="16"/>
                    <rect x="354" y="40" width="32" height="432" rx="16"/>
                    <rect x="40" y="94" width="432" height="32" rx="16"/>
                    <rect x="40" y="224" width="432" height="32" rx="16"/>
                    <rect x="40" y="354" width="432" height="32" rx="16"/>
                    <path d="M 216 370 A 110 110 0 0 1 436 370 L 436 430 L 376 430 L 376 390 A 50 50 0 0 0 276 390 L 276 430 L 216 430 Z"/>
                    <rect x="216" y="445" width="60" height="35"/>
                    <rect x="376" y="445" width="60" height="35"/>
                </g>
            </svg>
        </g>`;
        s += `<text x="8" y="${H - 24}" font-size="10" fill="#94a3b8" font-family="sans-serif" data-sg="legend">drag target · squares = 5 ft · snap ${_gridSnap ? 'on' : 'off'}</text>`;
        s += `<text data-sg="dist" x="8" y="${H - 8}" font-size="10" fill="#cbd5e1" font-family="sans-serif"></text>`;
        s += '</svg>';
        return s;
    }

    function _svgPoint(svg, evt) {
        try {
            const pt = svg.createSVGPoint();
            pt.x = evt.clientX; pt.y = evt.clientY;
            const ctm = svg.getScreenCTM();
            if (ctm) return pt.matrixTransform(ctm.inverse());
        } catch (err) { /* fall through */ }
        if (evt.offsetX != null && evt.offsetY != null) {
            const svgW = svg.viewBox.baseVal.width, svgH = svg.viewBox.baseVal.height;
            const cssW = svg.clientWidth || svgW, cssH = svg.clientHeight || svgH;
            return { x: evt.offsetX * (svgW / cssW), y: evt.offsetY * (svgH / cssH) };
        }
        return null;
    }

    function bindSpellGrid(svg, d) {
        const geo = spellGridGeo(d);
        let dragging = false;
        let t = _defaultTarget(geo);
        const shapeG = svg.querySelector('[data-sg="shape"]');
        const lineEl = svg.querySelector('[data-sg="line"]');
        const tgt = svg.querySelector('[data-sg="target"]');
        const dist = svg.querySelector('[data-sg="dist"]');
        const cellsG = svg.querySelector('[data-sg="cells"]');
        const btn = svg.querySelector('[data-sg="snapbtn"]');
        const bgEl = svg.querySelector('[data-sg="snapbg"]');
        const gridEl = svg.querySelector('[data-sg="snapgrid"]');
        const legend = svg.querySelector('[data-sg="legend"]');

        function redraw(nt) {
            t = nt;
            if (shapeG) shapeG.innerHTML = _shapeMarkup(geo, t);
            if (cellsG) cellsG.innerHTML = _cellsMarkup(geo, t);
            if (lineEl) { lineEl.setAttribute('x2', t.x); lineEl.setAttribute('y2', t.y); }
            if (tgt) { tgt.setAttribute('cx', t.x); tgt.setAttribute('cy', t.y); }
            if (dist) {
                const dft = Math.round(Math.sqrt((t.x - geo.caster.x) ** 2 + (t.y - geo.caster.y) ** 2) / geo.cell * 5);
                const limit = geo.range.ft || (geo.mode === 'touch' ? 5 : '—');
                dist.setAttribute('fill', dft > limit ? '#f87171' : '#cbd5e1');
                dist.textContent = `target ≈ ${dft} ft (max ${limit} ft)`;
            }
        }
        redraw(t);

        const move = e => {
            if (!dragging) return;
            e.preventDefault();
            const p = _svgPoint(svg, e);
            if (!p) return;
            const c = _clampTarget(geo, p, _gridSnap);
            redraw(c);
            svg.classList.add('dragging');
        };
        const snapBtnRender = snap => {
            if (btn) btn.setAttribute('aria-pressed', String(snap));
            if (bgEl) {
                bgEl.setAttribute('fill', snap ? 'rgba(96,165,250,0.3)' : 'rgba(255,255,255,0.06)');
                bgEl.setAttribute('stroke', snap ? 'rgba(147,197,253,0.95)' : 'rgba(148,163,184,0.45)');
            }
            if (gridEl) {
                gridEl.setAttribute('fill', snap ? '#bfdbfe' : '#94a3b8');
                gridEl.setAttribute('opacity', snap ? '1' : '0.55');
            }
            if (legend) legend.textContent = 'drag target · squares = 5 ft · snap ' + (snap ? 'on' : 'off');
        };
        if (btn) {
            btn.addEventListener('pointerdown', e => e.stopPropagation());
            const toggle = () => {
                _gridSnap = !_gridSnap;
                redraw(_clampTarget(geo, t, _gridSnap));
                snapBtnRender(_gridSnap);
            };
            btn.addEventListener('click', toggle);
            btn.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(); } });
        }
        svg.addEventListener('pointerdown', e => {
            if (geo.mode === 'none') return;
            dragging = true;
            try { svg.setPointerCapture(e.pointerId); } catch (err) { }
            move(e);
        });
        svg.addEventListener('pointermove', move);
        const up = e => { dragging = false; svg.classList.remove('dragging'); };
        svg.addEventListener('pointerup', up);
        svg.addEventListener('pointercancel', up);
    }

    function addSpellRow() {
        draft.spells.push({ level: 0, name: '' });
        renderSpellList();
    }

