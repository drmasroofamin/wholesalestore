/** Keep mutable development chunks out of the offline production cache. */
export async function configureOfflineCatalogue(production: boolean): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  if (production) {
    await navigator.serviceWorker.register('/sw.js');
    return;
  }
  const isOurs = (url?: string) => !!url && new URL(url).pathname === '/sw.js';
  const controlled = isOurs(navigator.serviceWorker.controller?.scriptURL);
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    registrations
      .filter((registration) =>
        [registration.active, registration.waiting, registration.installing].some((worker) =>
          isOurs(worker?.scriptURL),
        ),
      )
      .map((registration) => registration.unregister()),
  );
  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((key) => key.startsWith('grain-good-')).map((key) => caches.delete(key)),
    );
  }
  // Unregistering only releases the current controller on the next navigation.
  if (controlled) window.location.reload();
}
