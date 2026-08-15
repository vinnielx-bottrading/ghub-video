// VidFlow API bridge
(function () {
  // app.js expects this select even though the current homepage does not render
  // the optional upload form. Create a harmless hidden control so initialization
  // can continue without a null-reference error.
  if (!document.getElementById('videoCategorySelect')) {
    const select = document.createElement('select');
    select.id = 'videoCategorySelect';
    select.hidden = true;
    document.body.appendChild(select);
  }

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
