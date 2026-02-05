self.onmessage = async (event) => {
  const data = event.data || {};
  if (data.type !== 'DB_WORKER_INIT') return;

  const start = performance.now();
  try {
    if (!self.navigator?.storage?.getDirectory) {
      throw new Error('OPFS not available');
    }

    const root = await self.navigator.storage.getDirectory();
    const dir = await root.getDirectoryHandle('db', { create: true });
    const file = await dir.getFileHandle('emerson.db', { create: true });
    const accessHandle = await file.createSyncAccessHandle();

    const header = new Uint8Array([0x45, 0x4d, 0x52, 0x53, 0x4f, 0x4e, 0x01, 0x00]);
    accessHandle.write(header, { at: 0 });
    accessHandle.flush();

    const readback = new Uint8Array(header.length);
    accessHandle.read(readback, { at: 0 });
    accessHandle.close();

    let ok = true;
    for (let i = 0; i < header.length; i += 1) {
      if (header[i] !== readback[i]) {
        ok = false;
        break;
      }
    }

    const end = performance.now();
    self.postMessage({
      type: 'DB_WORKER_STATUS',
      ok,
      status: ok ? 'Ready' : 'Header mismatch',
      detail: ok ? 'DB file created via SyncAccessHandle' : 'DB file readback mismatch',
      bytes: header.length,
      ms: end - start,
    });
  } catch (err) {
    self.postMessage({
      type: 'DB_WORKER_STATUS',
      ok: false,
      status: 'Failed',
      detail: String(err?.message || err),
      bytes: 0,
      ms: performance.now() - start,
    });
  }
};
