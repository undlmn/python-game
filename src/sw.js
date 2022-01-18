self.addEventListener("fetch", (event) =>
  event.respondWith(
    new Promise(async (resolve) => {
      const cachedResponse = await caches.match(event.request);
      const timer =
        cachedResponse && setTimeout(() => resolve(cachedResponse), 400);
      try {
        const response = await fetch(event.request);
        const responseClone = response.clone();
        caches
          .open("v1")
          .then((cache) => cache.put(event.request, responseClone));
        resolve(response);
      } catch {
        resolve(cachedResponse);
      } finally {
        clearTimeout(timer);
      }
    })
  )
);
