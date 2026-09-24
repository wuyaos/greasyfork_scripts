// Offline lifecycle regression cases; fake streams never access a PT site.
import assert from 'node:assert/strict';
import test from 'node:test';
import { generateZipBlob } from '../src/scripts/pt-batch-download/zip.js';

function fixture() {
  const handlers = new Map();
  const stream = {
    paused: 0,
    resumed: 0,
    on(event, handler) { handlers.set(event, handler); return this; },
    resume() { this.resumed++; return this; },
    pause() { this.paused++; return this; },
    emit(event, ...args) { handlers.get(event)?.(...args); }
  };
  const zip = {
    generateInternalStream(options) {
      assert.deepEqual(options, { type: 'uint8array', compression: 'STORE' });
      return stream;
    },
    generateAsync() { throw new Error('Do not use the Blob accumulate path'); }
  };
  return { zip, stream };
}

test('completed byte stream becomes one local Blob with all bytes preserved', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { zip, stream } = fixture();
  const updates = [];
  const promise = generateZipBlob(zip, metadata => updates.push(metadata.percent));
  stream.emit('data', new Uint8Array([0x50, 0x4b, 0, 255]), { percent: 50 });
  stream.emit('data', new Uint8Array([128, 10]), { percent: 100 });
  stream.emit('end');
  const blob = await promise;
  assert.equal(blob.type, 'application/zip');
  assert.deepEqual([...new Uint8Array(await blob.arrayBuffer())], [0x50, 0x4b, 0, 255, 128, 10]);
  t.mock.timers.tick(30000);
  assert.equal(stream.paused, 0, 'completed generation must clear its deadline');
  assert.deepEqual(updates, [50, 100]);
});

test('a stream stuck at 0% rejects, pauses, and ignores late progress/end/error', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { zip, stream } = fixture();
  let updates = 0;
  const promise = generateZipBlob(zip, () => { updates++; });
  const rejection = assert.rejects(promise, /15 秒无进度/);
  t.mock.timers.tick(15000);
  await rejection;
  assert.equal(stream.paused, 1);
  stream.emit('data', new Uint8Array([1]), { percent: 100 });
  stream.emit('end');
  stream.emit('error', new Error('late failure'));
  assert.equal(updates, 0, 'late generation must not overwrite the fallback status');
  assert.equal(stream.paused, 1);
});

test('ongoing data renews the idle deadline even when displayed percentage stays at 0', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { zip, stream } = fixture();
  const promise = generateZipBlob(zip, () => {});
  t.mock.timers.tick(14000);
  stream.emit('data', new Uint8Array([1]), { percent: 0 });
  t.mock.timers.tick(14000);
  assert.equal(stream.paused, 0);
  stream.emit('data', new Uint8Array([2]), { percent: 100 });
  stream.emit('end');
  assert.equal((await promise).size, 2);
});

test('stream errors reject even if the public pause method itself fails', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { zip, stream } = fixture();
  stream.pause = () => { throw new Error('pause failure'); };
  const error = new Error('generation failure');
  const promise = generateZipBlob(zip, () => {});
  const rejection = assert.rejects(promise, received => received === error);
  stream.emit('error', error);
  await rejection;
});

test('synchronous setup errors and progress callback errors settle generation', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  await assert.rejects(generateZipBlob({ generateInternalStream() { throw new Error('setup failure'); } }, () => {}), /setup failure/);
  const { zip, stream } = fixture();
  const promise = generateZipBlob(zip, () => { throw new Error('callback failure'); });
  const rejection = assert.rejects(promise, /callback failure/);
  stream.emit('data', new Uint8Array([1]), { percent: 1 });
  await rejection;
  assert.equal(stream.paused, 1);
});
