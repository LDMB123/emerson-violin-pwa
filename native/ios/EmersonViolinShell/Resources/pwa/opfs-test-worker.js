self.onmessage = async (event) => {
  const data = event.data || {};
  if (data.type !== 'OPFS_SYNC_TEST') return;

  const start = performance.now();
  try {
    if (!self.navigator?.storage?.getDirectory) {
      throw new Error('OPFS not available');
    }

    const root = await self.navigator.storage.getDirectory();
    const dir = await root.getDirectoryHandle('diagnostics', { create: true });
    const file = await dir.getFileHandle('opfs-sync-test.bin', { create: true });
    const accessHandle = await file.createSyncAccessHandle();

    const payload = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    accessHandle.write(payload, { at: 0 });
    accessHandle.flush();

    const readback = new Uint8Array(payload.length);
    accessHandle.read(readback, { at: 0 });
    accessHandle.close();

    let ok = true;
    for (let i = 0; i < payload.length; i += 1) {
      if (payload[i] !== readback[i]) {
        ok = false;
        break;
      }
    }

    await dir.removeEntry('opfs-sync-test.bin').catch(() => {});

    self.postMessage({
      type: 'OPFS_SYNC_TEST_RESULT',
      ok,
      ms: performance.now() - start,
      bytes: payload.length,
    });
  } catch (err) {
    self.postMessage({
      type: 'OPFS_SYNC_TEST_RESULT',
      ok: false,
      error: String(err?.message || err),
    });
  }
};
