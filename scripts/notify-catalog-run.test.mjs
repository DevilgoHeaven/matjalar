import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildDiscordPayload,
  summarizeChanges,
} from './notify-catalog-run.mjs';

test('summarizeChanges groups camelCase and snake_case change rows', () => {
  assert.deepEqual(
    summarizeChanges([
      { targetType: 'menu', changeType: 'created' },
      { targetType: 'menu', changeType: 'created' },
      { target_type: 'option_item', change_type: 'updated' },
    ]),
    {
      'menu:created': 2,
      'option_item:updated': 1,
    }
  );
});

test('buildDiscordPayload marks nonzero crawl exit as failure', () => {
  const payload = buildDiscordPayload({
    catalogPayload: {
      sourceName: 'subway_official_catalog',
      status: 'failed',
      fetchedCount: 3,
      changes: [
        {
          targetType: 'menu',
          externalId: 'subway-menuList-sandwich',
          changeType: 'selector_error',
          afterData: { reason: 'selector returned too few rows' },
        },
      ],
    },
    crawlExitCode: 2,
    ingestExitCode: 0,
    runUrl: 'https://github.com/example/repo/actions/runs/1',
  });

  assert.equal(payload.username, 'matjalar catalog bot');
  assert.equal(payload.embeds[0].title, '맛잘알 catalog crawler failed');
  assert.equal(payload.embeds[0].color, 0xdc2626);
  assert.match(payload.embeds[0].description, /crawl_exit: 2/);
  assert.match(payload.embeds[0].fields[0].value, /menu:selector_error: 1/);
  assert.match(payload.embeds[0].fields[1].value, /selector returned too few rows/);
});

test('buildDiscordPayload marks clean ingest as success', () => {
  const payload = buildDiscordPayload({
    catalogPayload: {
      sourceName: 'subway_official_catalog',
      status: 'success',
      fetchedCount: 58,
      changes: [{ targetType: 'option_item', changeType: 'updated' }],
    },
    crawlExitCode: 0,
    ingestExitCode: 0,
    runUrl: '',
  });

  assert.equal(payload.embeds[0].title, '맛잘알 catalog crawler completed');
  assert.equal(payload.embeds[0].color, 0x16a34a);
  assert.match(payload.embeds[0].description, /changes: 1/);
});
