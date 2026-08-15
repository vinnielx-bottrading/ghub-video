// VidFlow API bridge
// Keeps existing frontend code compatible while allowing the Express backend
// to serve the frontend from the same domain in production.
(function () {
  const originalFetch = window.fetch.bind(window);
  const legacyApi = 'https://vidflow-backend.onrender.com/api';

  window.fetch = function (input, init) {
    try {
      const url = typeof input === 'string' ? input : input.url;
      if (url && url.indexOf(legacyApi) === 0) {
        const target = url.slice(legacyApi.length) || '/';
        const sameOriginUrl = `${window.location.origin}/api${target}`;
        if (typeof input === 'string') return originalFetch(sameOriginUrl, init);
        return originalFetch(new Request(sameOriginUrl, input), init);
      }
    } catch (error) {
      console.warn('VidFlow API bridge warning:', error);
    }
    return originalFetch(input, init);
  };
})();
