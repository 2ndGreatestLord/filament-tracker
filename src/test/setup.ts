import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import { Blob as NodeBlob } from 'node:buffer';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// jsdom's Blob can't pass through structuredClone, which fake-indexeddb uses to
// store values. Node's Blob can, and it behaves like the browser's real one.
globalThis.Blob = NodeBlob as unknown as typeof Blob;

afterEach(() => {
  cleanup();
});
