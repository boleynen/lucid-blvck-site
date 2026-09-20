import test from 'node:test';
import assert from 'node:assert/strict';
import { createSessionClient } from './auth-session.js';

const old = { access_token: 'old', refresh_token: 'refresh-old', expires_at: 900, user: { id: 'admin' } };
const fresh = { access_token: 'new', refresh_token: 'refresh-new', expires_at: 5000, user: { id: 'admin' } };
function setup(fetcher, initial = old) {
  let saved = JSON.stringify(initial);
  let expired = 0;
  const client = createSessionClient({ url: 'https://example.test', key: 'public-key', now: () => 1000000,
    storage: { getItem: () => saved, setItem: (_, value) => { saved = value; }, removeItem: () => { saved = null; } },
    fetcher, onExpired: () => { expired++; } });
  return { client, expired: () => expired };
}

test('refreshes expired session before upload and stores rotated tokens', async () => {
  const calls = [];
  const { client } = setup(async (url, options) => {
    calls.push({ url, options });
    return url.includes('grant_type') ? Response.json(fresh) : Response.json({});
  });
  await client.request('/upload', { method: 'POST', body: 'photo', headers: { 'Content-Type': 'image/png' } });
  assert.equal(calls.length, 2);
  assert.match(calls[0].url, /grant_type=refresh_token/);
  assert.deepEqual(JSON.parse(calls[0].options.body), { refresh_token: 'refresh-old' });
  assert.equal(calls[1].options.headers.Authorization, 'Bearer new');
  assert.equal(calls[1].options.body, 'photo');
  assert.equal(calls[1].options.headers['Content-Type'], 'image/png');
  assert.deepEqual(client.getSession(), fresh);
});

test('legacy sessions use JWT expiry and concurrent requests share refresh', async () => {
  let refreshes = 0;
  const legacy = { ...old, expires_at: undefined, access_token: `header.${btoa(JSON.stringify({ exp: 900 }))}.signature` };
  const { client } = setup(async url => {
    if (url.includes('grant_type')) { refreshes++; return Response.json(fresh); }
    return Response.json({});
  }, legacy);
  await Promise.all([client.request('/upload'), client.request('/delete'), client.request('/insert')]);
  assert.equal(refreshes, 1);
});

test('retries exp claim failure once with a refreshed token', async () => {
  let requests = 0;
  const { client } = setup(async url => {
    if (url.includes('grant_type')) return Response.json(fresh);
    return ++requests === 1 ? Response.json({ message: '"exp" claim timestamp check failed' }, { status: 400 }) : Response.json({});
  }, { ...old, expires_at: 5000 });
  assert.equal((await client.request('/upload')).status, 200);
  assert.equal(requests, 2);
});

test('invalid refresh returns to login without making an upload', async () => {
  let calls = 0;
  const { client, expired } = setup(async () => { calls++; return Response.json({ error: 'Invalid refresh token' }, { status: 400 }); });
  await assert.rejects(client.request('/upload'), /sign in again/i);
  assert.equal(client.getSession(), null);
  assert.equal(expired(), 1);
  assert.equal(calls, 1);
});

test('network errors keep the stored session for a later retry', async () => {
  const { client, expired } = setup(async () => { throw Error('Offline'); });
  await assert.rejects(client.request('/upload'), /Offline/);
  assert.deepEqual(client.getSession(), old);
  assert.equal(expired(), 0);
});

test('refresh completing after sign out cannot restore the session', async () => {
  let release;
  const { client } = setup(() => new Promise(resolve => { release = resolve; }));
  const pending = client.request('/upload');
  client.signOut();
  release(Response.json(fresh));
  await assert.rejects(pending, /account changed/);
  assert.equal(client.getSession(), null);
});

test('permission failures are not retried and auth retry is bounded', async () => {
  let calls = 0;
  const { client } = setup(async () => { calls++; return Response.json({ message: 'Row-level security denied' }, { status: 403 }); }, fresh);
  assert.equal((await client.request('/insert')).status, 403);
  assert.equal(calls, 1);
  let attempts = 0;
  const other = setup(async url => url.includes('grant_type') ? Response.json(fresh) : (++attempts, Response.json({}, { status: 401 })), fresh);
  assert.equal((await other.client.request('/insert')).status, 401);
  assert.equal(attempts, 2);
});
