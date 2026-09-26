import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const buffer = readFileSync(new URL('../public/assets/models/makecho-garden.glb', import.meta.url));
const jsonLength = buffer.readUInt32LE(12);
const gltf = JSON.parse(buffer.subarray(20, 20 + jsonLength).toString());

test('shipped GLB is complete, self-contained and within the mobile download budget', () => {
  assert.equal(buffer.readUInt32LE(0), 0x46546c67);
  assert.equal(buffer.readUInt32LE(4), 2);
  assert.equal(buffer.readUInt32LE(8), buffer.length);
  assert.equal(buffer.readUInt32LE(16), 0x4e4f534a);
  assert.ok(buffer.length < 6 * 1024 * 1024);
  assert.ok(gltf.buffers.every((b: { uri?: string }) => !b.uri));
  assert.ok((gltf.images ?? []).every((i: { uri?: string }) => !i.uri));
  const binaryLength = buffer.readUInt32LE(20 + jsonLength);
  for (const view of gltf.bufferViews) {
    assert.equal(view.buffer, 0);
    assert.ok((view.byteOffset ?? 0) + view.byteLength <= binaryLength);
  }
});

test('animated pet rig is independent of the batchable environment', () => {
  const nodes = gltf.nodes as Array<{ name?: string; children?: number[]; mesh?: number }>;
  const index = (name: string) => { const i = nodes.findIndex(n => n.name === name); assert.ok(i >= 0, name); return i; };
  const descendants = (i: number): number[] => [i, ...(nodes[i].children ?? []).flatMap(descendants)];
  const environment = descendants(index('Garden_Environment'));
  const pet = descendants(index('Momo'));
  assert.ok(!environment.includes(index('Momo')));
  assert.ok(pet.includes(index('Wing_L')));
  assert.ok(pet.includes(index('Wing_R')));
  assert.ok(environment.filter(i => nodes[i].mesh !== undefined).length > 500);
  assert.ok(gltf.materials.some((m: { name?: string; alphaMode?: string }) => m.name === 'wing' && m.alphaMode === 'BLEND'));
});
