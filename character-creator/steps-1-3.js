// character-creator/steps-1-3.js - step 1 (race/class/background), step 2 (abilities), step 3 (skills/languages)
// Extracted from character-creator.html; loaded there in page order.

    // ───────────────────────────────────────────────────────────
    // Setup selects / chips
    // ───────────────────────────────────────────────────────────
    function fillSelect(el, map, selectedKey) {
        el.innerHTML = '';
        Object.keys(map).forEach(k => {
            const opt = document.createElement('option');
            opt.value = k;
            opt.textContent = map[k].name;
            if (k === selectedKey) opt.selected = true;
            el.appendChild(opt);
        });
    }

    let s3SavesSet = [], s3SkillsSet = [], s3LangsSet = ['Common'];

    // ───────────────────────────────────────────────────────────
    // Step 1 behavior
    // ───────────────────────────────────────────────────────────
    function applyRace() {
        const key = document.getElementById('s1-race').value;
        const r = RACES[key] || RACES[''];
        document.getElementById('s1-race-hint').textContent = r.notes;
        // apply racial bonuses: reset abilities that were from previous race? We add bonuses to current scores.
        draft.race = key;
        // remove previous race bonuses by subtracting old draft race bonuses
        if (draft._prevRaceBonuses) {
            Object.keys(draft._prevRaceBonuses).forEach(k => {
                draft.abilities[k] = clampAbility((draft.abilities[k] || 10) - draft._prevRaceBonuses[k]);
            });
        }
        Object.keys(r.bonuses).forEach(k => {
            draft.abilities[k] = clampAbility((draft.abilities[k] || 10) + r.bonuses[k]);
        });
        draft._prevRaceBonuses = { ...r.bonuses };
        syncAbilitiesToInputs();
        // languages
        s3LangsSet = Array.from(new Set([...r.langs, 'Common']));
        rebuildStep3();
        // speed (if not manually touched)
        if (!draft._speedTouched) draft.speed = r.speed;
        document.getElementById('s6-speed').value = draft.speed;
        syncDictionaryHighlights();
    }

    function refreshSubclassOptions() {
        const sel = document.getElementById('s1-subclass');
        const custom = document.getElementById('s1-subclass-custom');
        const c = CLASSES[draft.class] || CLASSES[''];
        sel.innerHTML = '';
        const blank = new Option('— None —', '', false, false);
        sel.appendChild(blank);
        (c.subclasses || []).forEach(name => sel.appendChild(new Option(name, name, false, false)));
        const customOpt = new Option('Other…', '__custom__', false, false);
        sel.appendChild(customOpt);
        sel.value = '';
        custom.value = '';
        custom.style.display = 'none';
        draft.subclass = '';
    }

    function onSubclassChanged() {
        const sel = document.getElementById('s1-subclass');
        const custom = document.getElementById('s1-subclass-custom');
        if (sel.value === '__custom__') {
            custom.style.display = '';
            custom.focus();
            draft.subclass = custom.value.trim();
        } else {
            custom.style.display = 'none';
            draft.subclass = sel.value;
        }
        syncDictionaryHighlights();
    }

    function applyClass() {
        const key = document.getElementById('s1-class').value;
        const c = CLASSES[key] || CLASSES[''];
        document.getElementById('s1-class-hint').textContent = c.notes;
        draft.class = key;
        refreshSubclassOptions();
        document.getElementById('s6-hitdie').value = c.hitDie;
        // default saving throws
        s3SavesSet = c.saves.slice();
        rebuildStep3();
        // show spellcasting section based on whether the class can cast
        const sc = document.getElementById('s5-spellcaster');
        if (sc.checked !== !!c.spellAbility) { sc.checked = !!c.spellAbility; spellcasterChanged(); }
        if (c.spellAbility) {
            document.getElementById('s5-spell-ability').value = c.spellAbility;
            refreshStep5();
            autoSpellSlots();
        }
        refreshCombatSuggestions();
        syncDictionaryHighlights();
    }

    function levelChanged() {
        const lvl = Math.max(1, Math.min(20, Number(document.getElementById('s1-level').value) || 1));
        draft.level = lvl;
        document.getElementById('s1-pb').textContent = formatMod(PROF_BONUS(lvl));
        refreshCombatSuggestions();
        if (draft.spellcaster) renderSpellList();
        syncDictionaryHighlights();
    }

    function applyBackground() {
        const key = document.getElementById('s1-background').value;
        draft.background = key;
        document.getElementById('s1-bg-hint').textContent = key && BACKGROUNDS[key] ? BACKGROUNDS[key].notes : '';
        syncDictionaryHighlights();
    }

    // ───────────────────────────────────────────────────────────
    // Step 2 behavior
    // ───────────────────────────────────────────────────────────
    function clampAbility(v) { return Math.max(1, Math.min(30, v)); }

    let _pbWarnTimer = null;
    function pbWarn(msg) {
        const w = document.getElementById('pb-warn');
        if (!w) return;
        w.textContent = msg;
        w.classList.add('on');
        clearTimeout(_pbWarnTimer);
        _pbWarnTimer = setTimeout(() => { w.textContent = ''; w.classList.remove('on'); }, 3500);
    }

    function onAbilityInput(key) {
        const el = document.getElementById('a-' + key);
        let v = Number(el.value);
        if (!Number.isFinite(v)) v = 10;
        let rejected = null;
        // Point Buy enforces score range + budget on real edits; programmatic
        // syncs (race bonuses) may legitimately end above 15.
        if (!draft._syncing && draft.method === 'pointbuy') {
            v = Math.floor(v);
            if (v < 8 || v > 15) {
                rejected = 'Point Buy scores are 8–15.';
            } else {
                const prev = draft.abilities[key];
                const used = pointBuyUsed();
                const delta = (POINT_BUY_COSTS[v] ?? 0) - (POINT_BUY_COSTS[prev] ?? 0);
                if (used + delta > POINT_BUY_POOL) {
                    rejected = 'Needs ' + delta + ' pts — only ' + Math.max(0, POINT_BUY_POOL - used) + ' left.';
                }
            }
        } else {
            v = Math.max(1, Math.min(30, Math.floor(v)));
        }
        if (rejected) {
            v = draft.abilities[key];
            el.value = v;
            pbWarn(rejected);
        } else {
            draft.abilities[key] = v;
            el.value = v;
        }
        const modEl = document.getElementById('m-' + key);
        if (modEl) {
            modEl.textContent = formatMod(abilityMod(v));
            modEl.classList.toggle('neg', abilityMod(v) < 0);
        }
        updateAbilityMeter();
        if (draft.method === 'pointbuy') updatePointBuyInfo();
        else if (draft.method === 'standard') renderMethodActions();
    }

    function syncAbilitiesToInputs() {
        draft._syncing = true;
        ABILITY_KEYS.forEach(k => {
            const el = document.getElementById('a-' + k);
            el.value = draft.abilities[k];
            el.dispatchEvent(new Event('input'));
        });
        draft._syncing = false;
        // also update roll/trend labels
        renderMethodActions();
        refreshCombatSuggestions();
        refreshStep5();
    }

    function setMethod(m) {
        if (m === draft.method) { document.querySelectorAll('.method-tab').forEach(t => t.classList.toggle('active', t.dataset.m === m)); return; }
        draft.method = m;
        document.querySelectorAll('.method-tab').forEach(t => t.classList.toggle('active', t.dataset.m === m));
        // reset generation state: scores back to a clean baseline, then reapply racial bonuses
        ABILITY_KEYS.forEach(k => { draft.abilities[k] = 10; });
        if (draft._prevRaceBonuses) {
            Object.keys(draft._prevRaceBonuses).forEach(k => { draft.abilities[k] = clampAbility(draft.abilities[k] + draft._prevRaceBonuses[k]); });
        }
        renderMethodActions();
        renderAbilityGrid();
        if (m === 'standard') applyStandardArray();
        if (m === 'pointbuy') updatePointBuyInfo();
        syncDictionaryHighlights();
    }

    function applyStandardArray() {
        const arr = [15, 14, 13, 12, 10, 8];
        ABILITY_KEYS.forEach((k, i) => { draft.abilities[k] = arr[i]; });
        if (draft._prevRaceBonuses) {
            Object.keys(draft._prevRaceBonuses).forEach(k => { draft.abilities[k] = clampAbility(draft.abilities[k] + draft._prevRaceBonuses[k]); });
        }
        syncAbilitiesToInputs();
    }

    function rollAbilities() {
        const rollOne = () => {
            const dice = [1, 1, 1, 1].map(() => 1 + Math.floor(Math.random() * 6)).sort((a, b) => a - b);
            return dice.slice(1).reduce((a, b) => a + b, 0);
        };
        const arr = [0, 1, 2, 3, 4, 5].map(rollOne).sort((a, b) => b - a);
        ABILITY_KEYS.forEach((k, i) => { draft.abilities[k] = arr[i]; });
        syncAbilitiesToInputs();
    }

    const POINT_BUY_COSTS = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };
    function renderPointBuy() {
        const bar = document.getElementById('method-bar');
        bar.innerHTML = '';
        const meter = document.createElement('div');
        meter.className = 'pb-meter';
        const track = document.createElement('div');
        track.className = 'pb-track';
        const fill = document.createElement('div');
        fill.className = 'pb-fill'; fill.id = 'pb-fill';
        track.appendChild(fill);
        const label = document.createElement('span');
        label.className = 'pb-label'; label.id = 'pb-label';
        meter.appendChild(track); meter.appendChild(label);
        bar.appendChild(meter);
        const warn = document.createElement('span');
        warn.className = 'pb-warn'; warn.id = 'pb-warn';
        bar.appendChild(warn);
        const note = document.createElement('span');
        note.className = 'method-note';
        note.textContent = 'Use the − / + buttons on each card. Scores 8–15, costs shown below each score.';
        bar.appendChild(note);
        renderPointBuySteppers();
        updatePointBuyInfo();
    }

    function updatePointBuyInfo() {
        const used = pointBuyUsed();
        const rem = Math.max(0, POINT_BUY_POOL - used);
        const label = document.getElementById('pb-label');
        if (label) label.textContent = used + ' / ' + POINT_BUY_POOL + ' pts · ' + rem + ' left';
        const fill = document.getElementById('pb-fill');
        if (fill) {
            const frac = Math.min(1, used / POINT_BUY_POOL);
            fill.style.width = Math.round(frac * 100) + '%';
            fill.style.background = frac >= 1 ? '#ef4444' : frac > 0.75 ? '#f59e0b' : '#22c55e';
        }
        renderPointBuySteppers();
    }

    function renderMethodActions() {
        const bar = document.getElementById('method-bar');
        bar.innerHTML = '';
        const actions = document.createElement('div');
        actions.className = 'actions';
        if (draft.method === 'standard') {
            const poolWrap = document.createElement('div');
            poolWrap.className = 'ab-pool';
            const copy = [15, 14, 13, 12, 10, 8];
            ABILITY_KEYS.forEach(x => {
                const v = draft.abilities[x];
                const i = copy.indexOf(v);
                if (i > -1) copy.splice(i, 1);
            });
            copy.forEach(v => {
                const c = document.createElement('span');
                c.className = 'ab-poolchip'; c.textContent = String(v);
                c.title = 'Not yet assigned — click a card to place it';
                poolWrap.appendChild(c);
            });
            actions.appendChild(poolWrap);
            bar.appendChild(actions);
            const note = document.createElement('span');
            note.className = 'method-note';
            note.textContent = copy.length ? 'Click an ability card to assign the next value, or type directly.' : 'All array values assigned — edit any card; switch methods to reset scores.';
            bar.appendChild(note);
        } else if (draft.method === 'roll') {
            const b = document.createElement('button');
            b.className = 'btn btn-secondary-ghost'; b.style.flex = '0'; b.style.padding = '6px 12px'; b.textContent = '🎲 Roll 4d6 drop lowest';
            b.onclick = rollAbilities;
            actions.appendChild(b);
            bar.appendChild(actions);
            const note = document.createElement('span');
            note.className = 'method-note';
            note.textContent = 'Roll six times, drop the lowest die each time. Result sorted high → low. Roll again any time.';
            bar.appendChild(note);
        } else if (draft.method === 'pointbuy') {
            renderPointBuy();
        } else {
            const note = document.createElement('span');
            note.className = 'method-note';
            note.textContent = 'Type any scores from 1–30. Modifiers, totals, and derived stats update live.';
            bar.appendChild(note);
        }
    }

    // ───────────────────────────────────────────────────────────
    // Step 3
    // ───────────────────────────────────────────────────────────
    function rebuildStep3() {
        document.getElementById('s3-saves').innerHTML = '';
        ABILITY_KEYS.forEach(k => {
            const isOn = s3SavesSet.includes(k);
            const chip = document.createElement('label');
            chip.className = 'chip' + (isOn ? ' on' : '');
            const box = document.createElement('input');
            box.type = 'checkbox'; box.checked = isOn;
            box.onchange = () => {
                if (box.checked) s3SavesSet.push(k); else s3SavesSet = s3SavesSet.filter(x => x !== k);
                chip.classList.toggle('on', box.checked);
                draft.savingThrows = s3SavesSet.slice();
                syncDictionaryHighlights();
            };
            chip.appendChild(box);
            chip.appendChild(document.createTextNode(k.toUpperCase()));
            document.getElementById('s3-saves').appendChild(chip);
        });

        const skillsEl = document.getElementById('s3-skills');
        skillsEl.innerHTML = '';
        const abilNames = { str: 'Strength', dex: 'Dexterity', con: 'Constitution', int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma' };
        const skillGroups = {};
        Object.keys(SKILL_ABILITIES).forEach(sk => {
            const ab = SKILL_ABILITIES[sk];
            (skillGroups[ab] = skillGroups[ab] || []).push(sk);
        });
        ABILITY_KEYS.forEach(ab => {
            const list = skillGroups[ab];
            if (!list || !list.length) return;
            const group = document.createElement('div');
            group.className = 'cc-skill-group';
            const title = document.createElement('div');
            title.className = 'cc-skill-group-title';
            const abName = abilNames[ab] || ab.toUpperCase();
            const mod = formatMod(abilityMod(draft.abilities[ab]));
            title.innerHTML = '<b>' + ab.toUpperCase() + '</b><span>' + escHtml(abName) + '</span><em>' + mod + '</em>';
            const rows = document.createElement('div');
            rows.className = 'chip-row';
            list.forEach(sk => {
                const isOn = s3SkillsSet.includes(sk);
                const chip = document.createElement('label');
                chip.className = 'chip' + (isOn ? ' on' : '');
                const box = document.createElement('input');
                box.type = 'checkbox'; box.checked = isOn;
                box.onchange = () => {
                    if (box.checked) s3SkillsSet.push(sk); else s3SkillsSet = s3SkillsSet.filter(x => x !== sk);
                    chip.classList.toggle('on', box.checked);
                    draft.skills = s3SkillsSet.slice();
                    syncDictionaryHighlights();
                };
                chip.appendChild(box);
                chip.appendChild(document.createTextNode(skillLabel(sk)));
                rows.appendChild(chip);
            });
            group.appendChild(title);
            group.appendChild(rows);
            skillsEl.appendChild(group);
        });

        document.getElementById('s3-languages').innerHTML = '';
        LANGUAGES.forEach(lang => {
            const isOn = s3LangsSet.includes(lang);
            const chip = document.createElement('label');
            chip.className = 'chip' + (isOn ? ' on' : '');
            const box = document.createElement('input');
            box.type = 'checkbox'; box.checked = isOn;
            box.onchange = () => {
                if (box.checked) s3LangsSet.push(lang); else s3LangsSet = s3LangsSet.filter(x => x !== lang);
                chip.classList.toggle('on', box.checked);
                draft.languages = s3LangsSet.slice();
                syncDictionaryHighlights();
            };
            chip.appendChild(box);
            chip.appendChild(document.createTextNode(lang));
            document.getElementById('s3-languages').appendChild(chip);
        });
    }

