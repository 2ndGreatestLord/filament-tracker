/** Asks the browser not to evict the database under storage pressure, where supported. */
export function requestPersistentStorage(): void {
  void navigator.storage?.persist?.().catch(() => undefined);
}
