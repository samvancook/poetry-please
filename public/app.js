// Keep constants in one place
const CONSTANTS = {
  API_BASE: '/api'
};

async function getIdTokenOrNull() {
  const user = firebase.auth().currentUser;
  return user ? await user.getIdToken(false) : null;
}

async function api(path, { method = 'POST', body } = {}) {
  const url = `${CONSTANTS.API_BASE}/${path.replace(/^/+/, '')}`;
  let token = await getIdTokenOrNull();

  const doFetch = async (tkn) => fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(tkn ? { 'Authorization': `Bearer ${tkn}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include'
  });

  let res = await doFetch(token);
  if (res.status === 401) {
    const user = firebase.auth().currentUser;
    if (user) {
      token = await user.getIdToken(true);
      res = await doFetch(token);
    }
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${method} ${url} failed: ${res.status} ${text}`);
  }
  return res.headers.get('content-type')?.includes('application/json') ? res.json() : res.text();
}

// Minimal auth UI toggling
firebase.auth().onAuthStateChanged(async (user) => {
  document.getElementById('login-screen').style.display  = user ? 'none' : 'block';
  document.getElementById('poetry-screen').style.display = user ? 'block' : 'none';
  if (!user) {
    try { await firebase.auth().signInAnonymously(); } catch (e) { console.error(e); }
  }
});

// Example bindings (replace with your existing handlers)
document.getElementById('login-google').addEventListener('click', async () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  await firebase.auth().signInWithPopup(provider);
});

async function load() {
  try {
    const data = await api('fetchData', { body: { limit: 20 } });
    // TODO: render your gallery from data
    console.log('data', data);
  } catch (e) { console.error(e); }
}

window.addEventListener('load', load);

