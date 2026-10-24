import assert from 'node:assert/strict';
import test from 'node:test';
import { parseGuideState, selectAdminGuide } from '../src/components/onboarding/guideState.ts';

test('malformed persisted guide data falls back to a usable initial state', () => {
  for (const value of [null, undefined, 'synthetic', 42, { seen: {} }]) {
    assert.deepEqual(parseGuideState(value), { seen: [], workbenchOpened: false });
  }
  assert.deepEqual(parseGuideState({ seen: ['unknown', 'install', 'install'], workbenchOpened: 'true' }), { seen: ['install'], workbenchOpened: false });
});

test('new installations and newly populated workbenches receive the right guide', () => {
  assert.equal(selectAdminGuide(0, parseGuideState(null)), 'install');
  assert.equal(selectAdminGuide(1, parseGuideState({ seen: ['install'] })), 'workbench');
  assert.equal(selectAdminGuide(1, parseGuideState({ workbenchOpened: true })), 'notifications');
});

test('completed guides do not restart during normal admin navigation', () => {
  const state = parseGuideState({ seen: ['install', 'workbench', 'notifications', 'markets'], workbenchOpened: true });
  assert.equal(selectAdminGuide(0, state), null);
  assert.equal(selectAdminGuide(5, state), null);
});
