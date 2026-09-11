import { createInventoryController } from './inventory-controller.js';
import { createInventoryUI } from './inventory-ui.js';

export function initializeInventoryController(config) {
    const controller = createInventoryController(config);
    const ui = createInventoryUI({ ...config, controller });
    return {
        ...ui,
        // Also expose controller methods if needed
        normalizeInventoryItems: controller.normalizeInventoryItems,
        getInventoryFromCharacter: controller.getInventoryFromCharacter
    };
}

export { createInventoryController, createInventoryUI };
