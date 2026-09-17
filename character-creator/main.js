// character-creator/main.js - init() and app startup
// Extracted from character-creator.html; loaded there in page order.

    // ───────────────────────────────────────────────────────────
    // Init
    // ───────────────────────────────────────────────────────────
    function init() {
        renderSystemGrid();
        renderAbilityGrid();

        fillSelect(document.getElementById('s1-race'), RACES, '');
        fillSelect(document.getElementById('s1-class'), CLASSES, '');
        fillSelect(document.getElementById('s1-background'), BACKGROUNDS, '');
        document.getElementById('s1-race-hint').textContent = RACES[''].notes || '';
        document.getElementById('s1-class-hint').textContent = CLASSES[''].notes || '';
        refreshSubclassOptions();

        fillArmorSelect();
        fillWeaponsChips();
        renderItems();
        renderGearPicker();
        renderAttacks();
        renderFeatures();

        // auto begin with standard array applied
        applyStandardArray();
        draft.profBonus = PROF_BONUS(draft.level);
        refreshCombatSuggestions();
        rebuildStep3();
        document.getElementById('s1-pb').textContent = formatMod(PROF_BONUS(draft.level));
        updateProgress();
        renderStepDictionaries();
        attachDictInputs();
        syncDictionaryHighlights();

        // restore an in-progress draft (new-character flow)
        restoreDraft();

        // auto-save the draft on any interaction (debounced)
        document.addEventListener('input', scheduleAutosave, true);
        document.addEventListener('change', scheduleAutosave, true);
        document.addEventListener('click', scheduleAutosave, true);

        // edit mode (?edit=<id>) — preload an existing character after the UI is built
        initEditMode();
    }

    init();
