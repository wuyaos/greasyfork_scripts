// Offline compatibility cases based on the supplied V3.0.8 response samples.
// No live requests: the API integration case replaces GM_xmlhttpRequest entirely.
import assert from 'node:assert/strict';
import test from 'node:test';
import { readMoviePilotResponse } from '../src/scripts/moviepilot-name-test/response.js';

const context = {
  meta_info: { season_episode: '', resource_effect: null },
  media_info: { title: '密探', type: '电影', category: '外语电影', year: '2025', tmdb_id: 1220564, vote_average: 7.1 }
};
const envelope = data => ({ success: true, message: '', data });

test('V2 context and V3 envelope expose the same business fields', () => {
  assert.equal(readMoviePilotResponse(context), context);
  assert.equal(readMoviePilotResponse(envelope(context)), context);
  assert.equal(readMoviePilotResponse(envelope(context)).meta_info.resource_effect, null);
  assert.equal(readMoviePilotResponse(envelope(context)).media_info.year, '2025');
});

test('raw Token remains compatible; wrapped Token is also supported', () => {
  const token = { access_token: 'fixture-token', token_type: 'bearer' };
  assert.equal(readMoviePilotResponse(token), token);
  assert.equal(readMoviePilotResponse(envelope(token)), token);
});

test('client arrays, empty arrays, and successful null payloads survive unwrapping', () => {
  for (const data of [[{ name: 'fixture-client' }], [], null]) {
    assert.equal(readMoviePilotResponse(envelope(data)), data);
  }
  assert.deepEqual(readMoviePilotResponse([{ name: 'fixture-client' }]), [{ name: 'fixture-client' }]);
});

test('success=true does not turn an unrecognized Context into recognized media', () => {
  const empty = { meta_info: null, media_info: null, torrent_info: null };
  assert.equal(readMoviePilotResponse(envelope(empty)), empty);
  assert.equal(readMoviePilotResponse(envelope(empty)).media_info, null);
});

test('HTTP 200 business failure and HTTP errors retain message and status', () => {
  for (const status of [200, 404]) {
    assert.throws(() => readMoviePilotResponse({ success: false, message: 'Not Found', data: null }, status),
      error => error.message === 'Not Found' && error.status === status);
  }
  assert.throws(() => readMoviePilotResponse({ detail: 'Unauthorized' }, 401),
    error => error.message === 'Unauthorized' && error.status === 401);
  assert.throws(() => readMoviePilotResponse(envelope(context), 500), /HTTP Error 500/);
});

test('business objects with a data field are not mistaken for an envelope', () => {
  const business = { data: { title: 'keep outer object' }, extra: 1 };
  assert.equal(readMoviePilotResponse(business), business);
  const inner = { success: true, data: { title: 'only one layer' } };
  assert.equal(readMoviePilotResponse(envelope(inner)), inner);
  assert.deepEqual(readMoviePilotResponse({ success: true }), { success: true });
});

test('MoviePilot API callers unwrap V3 without changing external API contracts or request payloads', async () => {
  const globals = ['GM_info', 'GM_log', 'GM_xmlhttpRequest', 'window', 'navigator'];
  const saved = new Map(globals.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  let API, CONFIG, previousConfig, previousToken;
  const requests = [];
  let reply = context;
  try {
    globalThis.GM_info = { script: { name: 'Offline MoviePilot fixture' } };
    globalThis.GM_log = () => {};
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { userAgent: 'OfflineFixture' } });
    globalThis.window = { location: { origin: 'https://tracker.invalid', hostname: 'tracker.invalid', href: 'https://tracker.invalid/details.php?id=7' } };
    globalThis.GM_xmlhttpRequest = options => {
      requests.push(options);
      queueMicrotask(() => options.onload({ status: 200, response: reply }));
    };
    ({ API } = await import('../src/scripts/moviepilot-name-test/api.js'));
    ({ CONFIG } = await import('../src/scripts/moviepilot-name-test/settings.js'));
    previousConfig = CONFIG._values;
    previousToken = API._sessionToken;
    CONFIG._values = { url: 'https://moviepilot.invalid', authMode: 'password', user: 'fixture', pass: 'fixture', tmdbKey: 'fixture' };
    API._sessionToken = null;

    reply = { access_token: 'fixture-token' };
    assert.equal(await API.login(), 'fixture-token');
    assert.equal(requests.at(-1).url, 'https://moviepilot.invalid/api/v1/login/access-token');
    assert.equal(requests.at(-1).data, 'username=fixture&password=fixture');
    for (const body of [context, envelope(context)]) {
      reply = body;
      assert.equal(await API.recognize('Fixture 2025', ''), context);
      assert.equal(requests.at(-1).headers.Authorization, 'bearer fixture-token');
    }
    reply = envelope(context.media_info);
    assert.equal((await API.recognizeById(1220564, '电影')).tmdb_id, 1220564);
    reply = envelope({ id: 7, name: 'fixture-site' });
    assert.equal((await API.getSite()).id, 7);
    reply = envelope([{ name: 'fixture-client' }]);
    assert.deepEqual(await API.getClients(), [{ name: 'fixture-client' }]);

    const torrent = { name: 'fixture', downloadLink: 'https://tracker.invalid/download.php?id=7' };
    reply = { success: false, message: 'Rejected', data: null };
    await assert.rejects(API.download(context.media_info, { title: 'fixture' }), /Rejected/);
    await assert.rejects(API.downloadAdd(torrent), /Rejected/);
    reply = envelope({ success: false, message: 'Inner rejection' });
    await assert.rejects(API.downloadAdd(torrent), error => error.message === 'Inner rejection');
    reply = envelope(null);
    assert.equal(await API.downloadAdd(torrent), null);
    assert.equal(requests.at(-1).method, 'POST');
    assert.equal(JSON.parse(requests.at(-1).data).torrent_in.enclosure, torrent.downloadLink);

    CONFIG._values.authMode = 'apikey';
    CONFIG._values.apiKey = 'fixture-api-key';
    reply = envelope(context);
    assert.equal(await API.recognize('Fixture 2025', ''), context);
    assert.equal(requests.at(-1).headers['X-API-KEY'], 'fixture-api-key');
    assert.equal(requests.at(-1).headers.Authorization, undefined);

    // Even an envelope-shaped external response must retain its original contract.
    reply = { success: false, message: 'external', data: { id: 7 } };
    for (const url of ['https://api.themoviedb.org/3/search/multi', 'https://api.m-team.cc/api/torrent/detail']) {
      assert.equal(await API._request({ method: 'GET', url, absolute: true, responseType: 'json' }), reply);
    }
    reply = { results: [{ id: 7, title: 'fixture' }] };
    assert.deepEqual(await API.searchTmdb('fixture'), reply.results);
  } finally {
    if (CONFIG) CONFIG._values = previousConfig;
    if (API) API._sessionToken = previousToken;
    for (const [key, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
});
