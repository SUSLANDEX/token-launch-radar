import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { crc32, inflateSync } from 'node:zlib';
import { buildDossier } from '../vendor/makefun-board.ts';

const out = process.env.RADAR_TEST_OUTPUT;

test('dashboard artifacts fit caps and reproduce the official dossier bytes', { skip: !out }, () => {
  const dir = out!;
  const files = readdirSync(join(dir, 'dashboard'));
  assert.deepEqual(files.sort(), ['app.css', 'app.js', 'index.html']);
  const [css, js, html] = files.map((file) => readFileSync(join(dir, 'dashboard', file), 'utf8'));
  assert.ok(Buffer.byteLength(css + js + html) < 64_000);
  assert.doesNotMatch(css + js + html, /https?:\/\//i);
  assert.ok(statSync(join(dir, 'board.json')).size <= 8 * 1024 * 1024);

  const shots = readdirSync(join(dir, 'screenshots'));
  assert.deepEqual(shots.sort(), ['1-board.png', '2-detail.png', '3-filtered.png']);
  for (const name of shots) {
    const png = readFileSync(join(dir, 'screenshots', name));
    assert.ok(png.length >= 307_200 && png.length <= 350_000, name);
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    const width = png.readUInt32BE(16);
    const height = png.readUInt32BE(20);
    assert.ok(Math.min(width, height) >= 800 && Math.max(width, height) <= 1440, name);
    let offset = 8;
    let last = '';
    const imageData: Buffer[] = [];
    while (offset < png.length) {
      const payloadSize = png.readUInt32BE(offset);
      const end = offset + 12 + payloadSize;
      assert.ok(end <= png.length);
      const chunk = png.subarray(offset + 4, end - 4);
      assert.equal(crc32(chunk), png.readUInt32BE(end - 4));
      last = chunk.toString('ascii', 0, 4);
      if (last === 'IDAT') imageData.push(chunk.subarray(4));
      offset = end;
    }
    assert.equal(last, 'IEND');
    assert.ok(inflateSync(Buffer.concat(imageData)).length > width * height);
  }

  const dossier = readFileSync(join(dir, 'dossier.json'));
  assert.ok(dossier.length <= 1.5 * 1024 * 1024);
  assert.deepEqual(dossier, Buffer.from(buildDossier(dir, { text_max_bytes: 65_536 })));
  assert.doesNotMatch(JSON.parse(dossier.toString()).text, /\[Cut at /);
});
