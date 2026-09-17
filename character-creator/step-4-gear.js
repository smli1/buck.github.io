// character-creator/step-4-gear.js - step 4 - armor, weapons, items and the gear reference
// Extracted from character-creator.html; loaded there in page order.

    // ───────────────────────────────────────────────────────────
    // Step 4
    // ───────────────────────────────────────────────────────────
    function fillArmorSelect() {
        const sel = document.getElementById('s4-armor');
        sel.innerHTML = '';
        Object.keys(ARMORS).forEach(k => {
            const opt = document.createElement('option');
            opt.value = k; opt.textContent = ARMORS[k].name;
            sel.appendChild(opt);
        });
    }

    function armorChanged() {
        const key = document.getElementById('s4-armor').value;
        const a = ARMORS[key];
        draft.armor = key;
        const dexMod = abilityMod(draft.abilities.dex);
        let hint = '';
        if (a && a.shield) {
            hint = 'A shield adds +2 to AC while equipped.';
        } else if (key === '') {
            const unarmed = [];
            if (draft.class === 'monk') unarmed.push('Monk: 10 + DEX + WIS');
            if (draft.class === 'barbarian') unarmed.push('Barbarian: 10 + DEX + CON');
            if (draft.race === 'tortle') unarmed.push('Tortle natural shell: 17 (no DEX)');
            hint = `No Armor: AC 10 + DEX${unarmed.length ? ' · ' + unarmed.join(' / ') : ''}.`;
        } else if (a) {
            hint = `AC ${a.ac} + DEX${a.dexCap !== null ? ' (max ' + a.dexCap + ')' : ''}.`;
        }
        document.getElementById('s4-armor-hint').textContent = hint;
        refreshCombatSuggestions();
        syncDictionaryHighlights();
    }

    function fillWeaponsChips() {
        const c = document.getElementById('s4-weapons');
        c.innerHTML = '';
        WEAPONS.forEach(w => {
            const isOn = draft.weapons.includes(w.id);
            const chip = document.createElement('label');
            chip.className = 'chip' + (isOn ? ' on' : '');
            const box = document.createElement('input');
            box.type = 'checkbox'; box.checked = isOn;
            box.onchange = () => {
                if (box.checked) draft.weapons.push(w.id); else draft.weapons = draft.weapons.filter(x => x !== w.id);
                chip.classList.toggle('on', box.checked);
                weaponsToAttacks();
                refreshStep5();
                syncDictionaryHighlights();
            };
            chip.appendChild(box);
            chip.appendChild(document.createTextNode(w.name));
            c.appendChild(chip);
        });
    }

    function renderItems() {
        const list = document.getElementById('s4-items');
        list.innerHTML = '';
        draft.items.forEach((it, i) => {
            const row = document.createElement('div');
            row.className = 'cc-row';
            row.innerHTML = `<input value="${escAttr(it.name)}" placeholder="Item name" data-i="${i}" data-k="name">
                <input class="cc-sm" type="number" min="0" value="${it.qty || 1}" placeholder="Qty" data-i="${i}" data-k="qty">
                <button class="btn btn-delete" type="button" style="flex:0; padding:4px 10px;" onclick="removeRow('s4-items', ${i}, 'item')">✕</button>`;
            list.appendChild(row);
        });
        list.addEventListener('input', e => {
            const el = e.target;
            const i = Number(el.dataset.i);
            const k = el.dataset.k;
            if (!draft.items[i]) return;
            draft.items[i][k] = k === 'qty' ? Number(el.value) || 1 : el.value;
        });
    }

    function addItemRow() { draft.items.push({ name: '', qty: 1 }); renderItems(); }

    // Gear reference picker
    const GEAR_MASTER = [
        { name: 'Backpack', cat: 'Adventuring Gear', cost: 2, wt: 5 },
        { name: 'Bedroll', cat: 'Adventuring Gear', cost: 1, wt: 7 },
        { name: 'Blanket', cat: 'Adventuring Gear', cost: 0.5, wt: 3 },
        { name: 'Block and tackle', cat: 'Adventuring Gear', cost: 1, wt: 5 },
        { name: 'Caltrops', cat: 'Adventuring Gear', cost: 1, wt: 2 },
        { name: 'Candle', cat: 'Adventuring Gear', cost: 0.01, wt: 0 },
        { name: 'Chain (10 ft)', cat: 'Adventuring Gear', cost: 5, wt: 10 },
        { name: 'Climber\u2019s kit', cat: 'Gear Kits', cost: 25, wt: 12 },
        { name: 'Crowbar', cat: 'Adventuring Gear', cost: 2, wt: 5 },
        { name: 'Fishing tackle', cat: 'Adventuring Gear', cost: 1, wt: 4 },
        { name: 'Grappling hook', cat: 'Adventuring Gear', cost: 2, wt: 4 },
        { name: 'Hammer', cat: 'Adventuring Gear', cost: 1, wt: 3 },
        { name: 'Hempen rope (50 ft)', cat: 'Adventuring Gear', cost: 1, wt: 10 },
        { name: 'Silk rope (50 ft)', cat: 'Adventuring Gear', cost: 10, wt: 5 },
        { name: 'Lantern, bullseye', cat: 'Light', cost: 10, wt: 2 },
        { name: 'Lantern, hooded', cat: 'Light', cost: 5, wt: 2 },
        { name: 'Torch', cat: 'Light', cost: 0.01, wt: 1 },
        { name: 'Lock', cat: 'Adventuring Gear', cost: 10, wt: 1 },
        { name: 'Magnifying glass', cat: 'Adventuring Gear', cost: 100, wt: 0 },
        { name: 'Manacles', cat: 'Adventuring Gear', cost: 2, wt: 6 },
        { name: 'Mirror, steel', cat: 'Adventuring Gear', cost: 5, wt: 0.5 },
        { name: 'Piton', cat: 'Adventuring Gear', cost: 0.05, wt: 0.25 },
        { name: 'Pole (10 ft)', cat: 'Adventuring Gear', cost: 0.05, wt: 7 },
        { name: 'Pot, iron', cat: 'Adventuring Gear', cost: 2, wt: 10 },
        { name: 'Ram, portable', cat: 'Adventuring Gear', cost: 4, wt: 35 },
        { name: 'Ball bearings (bag of 1,000)', cat: 'Adventuring Gear', cost: 1, wt: 2 },
        { name: 'Iron spikes (10)', cat: 'Adventuring Gear', cost: 1, wt: 5 },
        { name: 'Oil (flask)', cat: 'Adventuring Gear', cost: 0.1, wt: 1 },
        { name: 'Rations (1 day)', cat: 'Food & Drink', cost: 0.5, wt: 2 },
        { name: 'Signal whistle', cat: 'Adventuring Gear', cost: 0.05, wt: 0 },
        { name: 'Soap', cat: 'Adventuring Gear', cost: 0.02, wt: 0 },
        { name: 'Spade', cat: 'Adventuring Gear', cost: 2, wt: 5 },
        { name: 'Spyglass', cat: 'Adventuring Gear', cost: 1000, wt: 1 },
        { name: 'Tent, two-person', cat: 'Adventuring Gear', cost: 2, wt: 20 },
        { name: 'Tinderbox', cat: 'Adventuring Gear', cost: 0.5, wt: 1 },
        { name: 'Waterskin', cat: 'Adventuring Gear', cost: 0.2, wt: 5 },
        { name: 'Whetstone', cat: 'Adventuring Gear', cost: 0.01, wt: 1 },
        { name: 'Barrel', cat: 'Container', cost: 2, wt: 70 },
        { name: 'Bucket', cat: 'Container', cost: 0.05, wt: 2 },
        { name: 'Chest', cat: 'Container', cost: 5, wt: 25 },
        { name: 'Flask', cat: 'Container', cost: 0.02, wt: 1 },
        { name: 'Jug', cat: 'Container', cost: 0.02, wt: 4 },
        { name: 'Pouch', cat: 'Container', cost: 0.5, wt: 1 },
        { name: 'Sack', cat: 'Container', cost: 0.01, wt: 0.5 },
        { name: 'Vial', cat: 'Container', cost: 1, wt: 0 },
        { name: 'Component pouch', cat: 'Container', cost: 25, wt: 2 },
        { name: 'Abacus', cat: 'Tools', cost: 2, wt: 2 },
        { name: 'Alchemist\u2019s supplies', cat: 'Tools', cost: 50, wt: 8 },
        { name: 'Brewer\u2019s supplies', cat: 'Tools', cost: 20, wt: 9 },
        { name: 'Carpenter\u2019s tools', cat: 'Tools', cost: 8, wt: 6 },
        { name: 'Cartographer\u2019s tools', cat: 'Tools', cost: 15, wt: 6 },
        { name: 'Cobbler\u2019s tools', cat: 'Tools', cost: 5, wt: 5 },
        { name: 'Cook\u2019s utensils', cat: 'Tools', cost: 1, wt: 8 },
        { name: 'Smith\u2019s tools', cat: 'Tools', cost: 20, wt: 8 },
        { name: 'Tinker\u2019s tools', cat: 'Tools', cost: 50, wt: 10 },
        { name: 'Thieves\u2019 tools', cat: 'Tools', cost: 25, wt: 1 },
        { name: 'Gaming set', cat: 'Tools', cost: 1, wt: 0 },
        { name: 'Musical instrument', cat: 'Tools', cost: 5, wt: 2 },
        { name: 'Navigator\u2019s tools', cat: 'Tools', cost: 25, wt: 2 },
        { name: 'Herbalism kit', cat: 'Gear Kits', cost: 5, wt: 3 },
        { name: 'Healer\u2019s kit', cat: 'Gear Kits', cost: 5, wt: 3 },
        { name: 'Disguise kit', cat: 'Gear Kits', cost: 25, wt: 3 },
        { name: 'Forgery kit', cat: 'Gear Kits', cost: 15, wt: 5 },
        { name: 'Poisoner\u2019s kit', cat: 'Gear Kits', cost: 50, wt: 2 },
        { name: 'Hunting trap', cat: 'Adventuring Gear', cost: 5, wt: 25 },
        { name: 'Holy symbol (amulet)', cat: 'Adventuring Gear', cost: 5, wt: 1 },
        { name: 'Adventurer\u2019s pack', cat: 'Packs', cost: 12, wt: 0 },
        { name: 'Diplomat\u2019s pack', cat: 'Packs', cost: 39, wt: 0 },
        { name: 'Dungeoneer\u2019s pack', cat: 'Packs', cost: 12, wt: 0 },
        { name: 'Entertainer\u2019s pack', cat: 'Packs', cost: 40, wt: 0 },
        { name: 'Explorer\u2019s pack', cat: 'Packs', cost: 10, wt: 0 },
        { name: 'Scholar\u2019s pack', cat: 'Packs', cost: 40, wt: 0 },
        { name: 'Common clothes', cat: 'Clothing', cost: 0.5, wt: 3 },
        { name: 'Costume', cat: 'Clothing', cost: 5, wt: 4 },
        { name: 'Fine clothes', cat: 'Clothing', cost: 15, wt: 6 },
        { name: 'Robes', cat: 'Clothing', cost: 1, wt: 4 },
        { name: 'Traveler\u2019s clothes', cat: 'Clothing', cost: 2, wt: 4 },
        { name: 'Ale (gallon)', cat: 'Food & Drink', cost: 0.2, wt: 8 },
        { name: 'Bread (loaf)', cat: 'Food & Drink', cost: 0.02, wt: 0.5 },
        { name: 'Cheese (wedge)', cat: 'Food & Drink', cost: 0.1, wt: 0.5 },
        { name: 'Wine (bottle)', cat: 'Food & Drink', cost: 2, wt: 1.5 },
        { name: 'Arrows (20)', cat: 'Ammunition', cost: 1, wt: 1 },
        { name: 'Crossbow bolts (20)', cat: 'Ammunition', cost: 1, wt: 1.5 },
        { name: 'Sling stones', cat: 'Ammunition', cost: 0, wt: 0 },
        { name: 'Quiver', cat: 'Ammunition', cost: 1, wt: 1 },
        { name: 'Donkey / Mule', cat: 'Mounts', cost: 8, wt: 0 },
        { name: 'Horse (riding)', cat: 'Mounts', cost: 75, wt: 0 },
        { name: 'Pony', cat: 'Mounts', cost: 30, wt: 0 },
        { name: 'Bit and bridle', cat: 'Mounts', cost: 2, wt: 1 },
        { name: 'Saddle, riding', cat: 'Mounts', cost: 10, wt: 25 },
        { name: 'Feed (per day)', cat: 'Mounts', cost: 0.05, wt: 10 }
    ];

    function fmtGearCost(gp) {
        if (gp >= 1) return (gp % 1 === 0 ? gp : gp.toFixed(1)) + ' gp';
        const sp = Math.round(gp * 10);
        if (sp >= 1) return sp + ' sp';
        return Math.round(gp * 100) + ' cp';
    }

    function renderGearPicker() {
        const sel = document.getElementById('s4-gear-cat');
        if (!sel) return;
        const cats = Array.from(new Set(GEAR_MASTER.map(g => g.cat))).sort();
        sel.innerHTML = '<option value="">All categories</option>' +
            cats.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
        renderGearList();
    }

    function gearFilter() { renderGearList(); }

    function renderGearList() {
        const box = document.getElementById('gear-results');
        if (!box) return;
        const q = (document.getElementById('s4-item-filter').value || '').trim().toLowerCase();
        const cat = document.getElementById('s4-gear-cat').value;
        const hits = GEAR_MASTER.filter(g => (!cat || g.cat === cat) && (!q || g.name.toLowerCase().includes(q)));
        box.innerHTML = '';
        if (!hits.length) {
            box.innerHTML = '<div class="gear-empty">No matching gear.</div>';
            return;
        }
        hits.forEach(g => {
            const inInv = draft.items.filter(it => it.name === g.name).reduce((s, it) => s + (it.qty || 1), 0);
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'gear-item';
            b.innerHTML = `
                <span class="gi-info">
                    <span class="gi-name">${esc(g.name)}</span>
                    <span class="gi-meta">${fmtGearCost(g.cost)} · ${g.wt === 0 ? '\u2014' : g.wt + ' lb'}</span>
                </span>
                <span class="gi-right">${inInv ? `<span class="gi-added">\u00d7${inInv}</span>` : ''}</span>`;
            b.onclick = () => addGearItem(g.name);
            box.appendChild(b);
        });
    }

    function addGearItem(name) {
        const hit = draft.items.find(it => it.name === name);
        if (hit) hit.qty = (hit.qty || 1) + 1;
        else draft.items.push({ name: name, qty: 1 });
        renderItems();
        renderGearList();
    }

