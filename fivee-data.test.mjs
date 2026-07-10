import test from 'node:test';
import assert from 'node:assert/strict';
import { FiveEDataStore } from './fivee-data.js';

const sampleData = {
  '/5e_data/backgrounds.json': [
    { id: 'bg-acolyte', name: 'Acolyte' },
    { id: 'bg-soldier', name: 'Soldier' }
  ],
  '/5e_data/races.json': [
    { id: 'race-human', name: 'Human' }
  ]
};

test('loads and searches collections from the bundled data store', async () => {
  const store = new FiveEDataStore({
    basePath: '/5e_data',
    fetchJson: async (path) => sampleData[path]
  });

  const backgrounds = await store.getCollection('backgrounds');
  assert.equal(backgrounds.length, 2);

  const byName = await store.getByName('backgrounds', 'Soldier');
  assert.equal(byName?.id, 'bg-soldier');

  const byId = await store.getById('backgrounds', 'bg-acolyte');
  assert.equal(byId?.name, 'Acolyte');

  const searchResults = await store.search('backgrounds', 'aco');
  assert.equal(searchResults[0]?.name, 'Acolyte');
});
