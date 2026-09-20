const SESSION_KEY = 'lucid-supabase-session';
const expiredMessage = 'Your session has expired. Please sign in again, then retry publishing.';

export async function responseJson(response) {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(body?.message || body?.error_description || body?.msg || body?.error || 'Something went wrong.');
    error.status = response.status;
    throw error;
  }
  return body;
}

export function createSessionClient({ url, key, storage, fetcher = fetch, now = Date.now, onExpired = () => {} }) {
  let refreshing = null;
  const getSession = () => {
    try { return JSON.parse(storage.getItem(SESSION_KEY)); } catch { return null; }
  };
  const signOut = () => storage.removeItem(SESSION_KEY);
  const changedAccount = () => Object.assign(new Error('The signed-in account changed. Please retry.'), { status: 401 });
  const expiry = (session) => {
    if (session?.expires_at) return session.expires_at;
    try {
      // Older saved sessions did not store expires_at separately.
      const payload = session.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(payload)).exp || 0;
    } catch { return 0; }
  };
  const save = (data) => {
    const session = { access_token: data.access_token, refresh_token: data.refresh_token, user: data.user,
      expires_at: data.expires_at || Math.floor(now() / 1000) + (data.expires_in || 3600) };
    storage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  };
  const expired = () => {
    signOut();
    onExpired();
    const error = new Error(expiredMessage);
    error.status = 401;
    return error;
  };
  async function signIn(email, password) {
    return save(await fetcher(`${url}/auth/v1/token?grant_type=password`, {
      method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }).then(responseJson));
  }
  async function refresh(session) {
    if (refreshing) return refreshing;
    if (!session?.refresh_token) throw expired();
    refreshing = (async () => {
      const response = await fetcher(`${url}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: session.refresh_token }),
      });
      // Never restore a session if the user signed out or changed accounts meanwhile.
      if (getSession()?.refresh_token !== session.refresh_token) {
        throw changedAccount();
      }
      if (response.status === 400 || response.status === 401 || response.status === 403) throw expired();
      const data = await responseJson(response);
      if (getSession()?.refresh_token !== session.refresh_token) throw changedAccount();
      return save(data);
    })();
    try { return await refreshing; } finally { refreshing = null; }
  }
  async function request(target, options = {}) {
    let session = getSession();
    if (!session?.access_token) throw expired();
    if (expiry(session) <= now() / 1000 + 60) session = await refresh(session);
    const send = (current) => fetcher(target, { ...options,
      headers: { ...options.headers, apikey: key, Authorization: `Bearer ${current.access_token}` },
    });
    let response = await send(session);
    if (!response.ok) {
      const body = await response.clone().json().catch(() => null);
      const message = body?.message || body?.error_description || body?.error || '';
      if (response.status === 401 || /(?:jwt|token).*expired|exp.*claim.*timestamp|jwt.*invalid/i.test(message)) {
        const current = getSession();
        if (!current) throw expired();
        if (current.user?.id !== session.user?.id) throw changedAccount();
        session = current.access_token !== session.access_token ? current : await refresh(current);
        response = await send(session); // One retry only, and only for a rejected auth request.
      }
    }
    return response;
  }
  return { getSession, signIn, signOut, request };
}
