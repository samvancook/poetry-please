(() => {
  const parameters = new URLSearchParams(window.location.search);
  const code = parameters.get('code');
  const error = parameters.get('error');

  // Remove the one-time code from the address bar before displaying it.
  window.history.replaceState(null, '', window.location.pathname);

  const status = document.getElementById('status');
  if (error) {
    status.textContent = 'TikTok did not authorize this connection. Return to the TikTok publisher setup and try again.';
    return;
  }
  if (!code) {
    status.textContent = 'No authorization code was provided. Open the TikTok account holder authorization link to begin.';
    return;
  }

  status.textContent = 'Authorization received.';
  document.getElementById('authorization-code').textContent = code;
  document.getElementById('result').hidden = false;
  document.getElementById('copy-code').addEventListener('click', async () => {
    const copyStatus = document.getElementById('copy-status');
    try {
      await navigator.clipboard.writeText(code);
      copyStatus.textContent = 'Copied. Paste this code only into Button Poetry’s publisher setup.';
    } catch {
      copyStatus.textContent = 'Copy failed. Select the code above and copy it manually.';
    }
  });
})();
