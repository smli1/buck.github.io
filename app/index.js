import { initializeApp } from './initialization.js';
import { initializeCharacterSelect } from './character-select.js';

window.addEventListener('DOMContentLoaded', () => {
    (async () => {
        try {
            await initializeApp();
        } catch (error) {
            console.error('Failed to initialize application:', error);
        }
        initializeCharacterSelect();
    })();
});
