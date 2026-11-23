import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { boardIssue, buildRadar, dataScript, hasNoTokenRecord, impliedValue, MODEL, parseSnapshot } from '../lib/model.ts';
import type { SnapshotProtocol } from '../lib/model.ts';

const protocol: SnapshotProtocol = {
  slug: 'fixture', name: 'Fixture', category: 'Lending', chains: ['Base'], tvl_usd: 100_000_000,
  change_7d: 0, listed_at: '2024-01-01', symbol: null, gecko_id: null, mcap_usd: null,
};
const date = '2026-01-01';

test('valuation uses TVL, clipped momentum, and tracked maturity', () => {
  const base = impliedValue(protocol, date, MODEL);
  assert.equal(base.implied, 30_000_000);
  const spikes = impliedValue({ ...protocol, change_7d: 900 }, date, MODEL);
  assert.equal(spikes.growthPct, MODEL.growth_cap);
  assert.equal(spikes.implied, 36_300_000);
  const decline = impliedValue({ ...protocol, change_7d: -90, listed_at: date }, date, MODEL);
  assert.equal(decline.growthPct, MODEL.growth_floor);
  assert.equal(decline.implied, 18_060_000);
  const missing = impliedValue({ ...protocol, listed_at: null, change_7d: null }, date, MODEL);
  assert.equal(missing.age, null);
  assert.equal(missing.implied, 25_500_000);
  assert.equal(impliedValue({ ...protocol, slug: 'other', name: 'Different' }, date, MODEL).implied, base.implied);
});

test('either token identifier or a recorded market cap changes eligibility', () => {
  assert.equal(hasNoTokenRecord(protocol), true);
  for (const field of [{ symbol: 'T' }, { gecko_id: 'test' }, { mcap_usd: 0 }]) {
    assert.equal(hasNoTokenRecord({ ...protocol, ...field }), false);
  }
});

const input = process.env.RADAR_TEST_SNAPSHOT;
test('sealed snapshot generates a deterministic board and matching dashboard plans', { skip: !input }, () => {
  const snapshot = parseSnapshot(readFileSync(input!, 'utf8'));
  const { board, radar } = buildRadar(snapshot);
  assert.equal(boardIssue(board, snapshot), null);
  assert.deepEqual(buildRadar(snapshot).board, board);
  assert.equal(radar.rows.filter((row) => row.watchlist).length, snapshot.watchlist.length);
  assert.deepEqual(radar.rows.map((row) => row.farm_steps), board.map((row) => row.farm_steps));
  assert.deepEqual(radar.live.map((row) => row.slug).sort(),
    snapshot.protocols.filter((row) => !hasNoTokenRecord(row)).map((row) => row.slug).sort());
  assert.equal(board.some((row) => radar.live.some((record) => record.slug === row.slug)), false);
  assert.equal(radar.live.every((row) => row.farm_steps.length >= 3), true);
  assert.match(dataScript(radar), /^window\.RADAR=/);
  const duplicate = [board[0]!, { ...board[1]!, slug: board[0]!.slug }, ...board.slice(2)];
  assert.match(boardIssue(duplicate, snapshot)!, /duplicate/);
});
