import { initializeApp } from './initialization.js';

window.addEventListener('DOMContentLoaded', () => {
    (async () => {
        try {
            await initializeApp();
        } catch (error) {
            console.error('Failed to initialize application:', error);
        }
    })();
});
