import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildDashboardSql } from '../supabase/verification/build-dashboard-sql.mjs';

const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, '..');
const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const R = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const PROJECT = 'https://cinelink-verification.invalid';
const validReview = { tmdbId: 42, rating: 4, content: 'Synthetic review', isSpoiler: false };

// Execute the actual TS modules with transport/Auth dependencies replaced.
// The VM has no environment credentials, and any unexpected fetch fails closed.
function load(relative, mocks = {}) {
  const filename = path.join(root, relative);
  const sandboxModule = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const localRequire = (id) => {
    if (Object.hasOwn(mocks, id)) return mocks[id];
    if (id === 'server-only') return {};
    if (id.startsWith('@/')) {
      const base = `src/${id.slice(2)}`;
      return load(fs.existsSync(path.join(root, `${base}.ts`)) ? `${base}.ts` : `${base}.tsx`, mocks);
    }
    return require(id);
  };
  vm.runInNewContext(code, { module: sandboxModule, exports: sandboxModule.exports, require: localRequire, URL, Request,
    process: { env: { NEXT_PUBLIC_SUPABASE_URL: PROJECT } },
    console: { error() {}, log() {} },
    fetch() { throw new Error('Unexpected network access'); },
  }, { filename });
  return sandboxModule.exports;
}

function client({ user = { id: A }, result = () => ({ data: { id: R }, error: null }) } = {}) {
  const calls = [];
  return {
    calls,
    auth: { async getUser() { return { data: { user }, error: null }; } },
    from(table) {
      const call = { table, filters: [] }; calls.push(call);
      const q = {
        select(columns) { call.columns = columns; return q; },
        insert(payload) { call.operation = 'insert'; call.payload = payload; return q; },
        update(payload) { call.operation = 'update'; call.payload = payload; return q; },
        delete() { call.operation = 'delete'; return q; },
        eq(column, value) { call.filters.push([column, value]); return q; },
        ilike(column, value) { call.filters.push([column, value]); return q; },
        limit() { return q; },
        async maybeSingle() { return result(call); },
        then(resolve, reject) { return Promise.resolve(result(call)).then(resolve, reject); },
      };
      return q;
    },
  };
}
function actions(file, db, extra = {}) {
  return load(file, {
    '@/lib/supabase/server': { supabaseServer: async () => db },
    '@/lib/movies/ensure-movie-record': { ensureMovieRecord: async () => {} },
    'next/cache': { revalidatePath() {} },
    'next/navigation': { redirect(url) { throw new Error(`REDIRECT:${url}`); } },
    ...extra,
  });
}

test('redirects reject authority tricks, protocol-relative URLs, controls and backslashes', () => {
  const { safeRedirectPath } = load('src/lib/security/urls.ts');
  for (const input of ['@attacker.invalid', '//attacker.invalid', '/a/..//attacker.invalid', '/a/%2e%2e//attacker.invalid', '/\\attacker.invalid', '/%5cattacker.invalid', '/%2f%2fattacker.invalid', '/%0d%0aevil', 'https://attacker.invalid', 'javascript:alert(1)', '/%', null]) {
    assert.equal(safeRedirectPath(input, PROJECT), '/home');
  }
  assert.equal(safeRedirectPath('/profile/me?tab=reviews#latest', PROJECT), '/profile/me?tab=reviews#latest');
});
test('avatars require this project, a supported image path, and the caller-owned prefix on writes', () => {
  const { safeAvatarUrl } = load('src/lib/security/urls.ts');
  const good = `${PROJECT}/storage/v1/object/public/avatars/${A}/sample.png`;
  assert.equal(safeAvatarUrl(good, PROJECT, A), good);
  for (const bad of [good.replace(PROJECT, 'https://attacker.invalid'), good.replace(A, B), good + '?track=1', good.replace('.png', '.svg'), 'data:image/png;base64,x', good.replace('/sample.png', '/%2e%2e/sample.png')]) {
    assert.equal(safeAvatarUrl(bad, PROJECT, A), null);
  }
});
test('review runtime validation rejects malformed types, overflow, invalid ratings and overlong content', () => {
  const { validateReview, isTmdbId } = load('src/lib/security/validation.ts');
  for (const input of [null, [], { ...validReview, content: 12 }, { ...validReview, isSpoiler: 'false' }, { ...validReview, rating: 1.5 }, { ...validReview, tmdbId: 2147483648 }, { ...validReview, content: 'x'.repeat(1001) }]) {
    assert.throws(() => validateReview(input));
  }
  assert.equal(isTmdbId(2147483647), true);
  assert.equal(validateReview({ ...validReview, content: ' text ' }).content, 'text');
});
for (const [file, invoke] of [
  ['src/actions/profile.ts', m => m.updateProfile({ username: 'name', bio: '' })],
  ['src/actions/follows.ts', m => m.followUser(B)],
  ['src/actions/follows.ts', m => m.unfollowUser(B)],
  ['src/actions/reviews.ts', m => m.createReview(validReview)],
  ['src/actions/reviews.ts', m => m.updateReview({ ...validReview, reviewId: R })],
  ['src/actions/reviews.ts', m => m.deleteReview(R, 42)],
  ['src/actions/wishlists.ts', m => m.addToWishlist(42)],
  ['src/actions/wishlists.ts', m => m.removeFromWishlist(42)],
]) {
  test(`anonymous write denied before DB access: ${file} ${invoke.toString()}`, async () => {
    const db = client({ user: null });
    await assert.rejects(invoke(actions(file, db)), /ログイン/);
    assert.equal(db.calls.length, 0);
  });
}
test('profile writes derive identity from the session and only update editable columns', async () => {
  const db = client();
  await actions('src/actions/profile.ts', db).updateProfile({ id: B, username: ' name ', bio: ' bio ' });
  assert.equal(JSON.stringify(db.calls[0].filters), JSON.stringify([['id', A]]));
  assert.equal(JSON.stringify(db.calls[0].payload), JSON.stringify({ username: 'name', bio: 'bio' }));
  assert.equal(db.calls[0].columns, 'id');
});
test('profile rejects foreign avatar URLs, malformed payloads and missing rows', async () => {
  const db = client(); const m = actions('src/actions/profile.ts', db);
  await assert.rejects(m.updateProfile({ username: 'name', bio: '', avatarUrl: `${PROJECT}/storage/v1/object/public/avatars/${B}/other.png` }), /URL/);
  await assert.rejects(m.updateProfile(null), /不正/);
  await assert.rejects(m.updateProfile({ username: 'x'.repeat(81), bio: '' }), /80文字/);
  assert.equal(db.calls.length, 0);
  await assert.rejects(actions('src/actions/profile.ts', client({ result: () => ({ data: null, error: null }) })).updateProfile({ username: 'name', bio: '' }), /見つからない/);
});
test('self-follow is rejected even with an uppercase UUID; forged follower input is ignored', async () => {
  const db = client(); const m = actions('src/actions/follows.ts', db);
  assert.equal((await m.followUser(A.toUpperCase())).success, false);
  assert.equal(db.calls.length, 0);
  assert.equal((await m.followUser(B, B)).success, true);
  assert.equal(db.calls[0].payload.follower_id, A);
});
for (const operation of ['updateReview', 'deleteReview']) {
  test(`${operation} constrains review id, caller and movie and rejects zero affected rows`, async () => {
    for (const exists of [true, false]) {
      const db = client({ result: () => ({ data: exists ? { id: R } : null, error: null }) });
      const m = actions('src/actions/reviews.ts', db);
      const promise = operation === 'updateReview' ? m.updateReview({ ...validReview, reviewId: R }) : m.deleteReview(R, 42);
      await assert.rejects(promise, exists ? /REDIRECT:\/movie\/42/ : /できませんでした/);
      assert.equal(JSON.stringify(db.calls[0].filters), JSON.stringify([['id', R], ['user_id', A], ['tmdb_id', 42]]));
      assert.equal(db.calls[0].columns, 'id');
    }
  });
}
test('forged review types are rejected before reads or privileged movie writes', async () => {
  const db = client(); let ensured = false;
  const m = actions('src/actions/reviews.ts', db, { '@/lib/movies/ensure-movie-record': { ensureMovieRecord() { ensured = true; } } });
  await assert.rejects(m.createReview({ ...validReview, isSpoiler: 'true' }), /不正/);
  assert.equal(ensured, false); assert.equal(db.calls.length, 0);
});
test('wishlist owner comes from the session; removal rejects invalid movie IDs', async () => {
  const db = client(); const m = actions('src/actions/wishlists.ts', db);
  await m.addToWishlist(42);
  assert.equal(db.calls[0].payload.user_id, A);
  await assert.rejects(m.removeFromWishlist(2147483648), /不正/);
  assert.equal(db.calls.length, 1);
});
test('trusted movie helper authenticates, verifies TMDB identity, and writes only the three movie fields', async () => {
  const writes = []; let detailCalls = 0;
  const mocks = {
    '@/lib/tmdb/api': { async getMovieDetail(id) { detailCalls++; return { id, title: 'Synthetic', posterPath: '/example.jpg' }; } },
    '@/lib/supabase/admin': { createSupabaseAdminClient() { return { from(table) { return { async upsert(row, options) { writes.push({ table, row, options }); return { error: null }; } }; } }; } },
  };
  const { ensureMovieRecord } = load('src/lib/movies/ensure-movie-record.ts', mocks);
  await assert.rejects(ensureMovieRecord(client({ user: null }), 42), /ログイン/);
  await ensureMovieRecord(client(), 42); // existing row
  assert.equal(detailCalls, 0);
  await ensureMovieRecord(client({ result: () => ({ data: null, error: null }) }), 42);
  assert.equal(writes.length, 1); assert.equal(writes[0].table, 'movies');
  assert.equal(Object.keys(writes[0].row).sort().join(','), 'poster_path,title,tmdb_id');
  assert.equal(writes[0].options.ignoreDuplicates, true);
  const mismatch = load('src/lib/movies/ensure-movie-record.ts', { ...mocks, '@/lib/tmdb/api': { async getMovieDetail() { return { id: 99, title: 'Wrong' }; } } });
  await assert.rejects(mismatch.ensureMovieRecord(client({ result: () => ({ data: null, error: null }) }), 42), /検証/);
  assert.equal(writes.length, 1);
});
test('search rejects invalid and oversized inputs before TMDB transport', async () => {
  let called = 0;
  const { getMoviesAction } = load('src/actions/movies.ts', { '@/lib/tmdb/api': { searchMovies() { called++; return []; } } });
  await getMoviesAction({}); await getMoviesAction('x'.repeat(201));
  assert.equal(called, 0);
});
test('auth callback keeps a successful code exchange on the same origin', async () => {
  const { GET } = load('src/app/auth/callback/route.ts', {
    'next/server': { NextResponse: { redirect(url) { return new URL(url).href; } } },
    '@/lib/supabase/server': { supabaseServer: async () => ({ auth: { exchangeCodeForSession: async () => ({ error: null }) } }) },
  });
  assert.equal(await GET(new Request(`${PROJECT}/auth/callback?code=synthetic&next=${encodeURIComponent('@attacker.invalid')}`)), `${PROJECT}/home`);
});
test('stored review and username HTML is escaped by the actual renderer', () => {
  const ReviewItem = load('src/components/review/ReviewItem.tsx', { 'next/link': ({ children, ...props }) => React.createElement('a', props, children) }).default;
  const html = renderToStaticMarkup(React.createElement(ReviewItem, { tmdbId: 42, review: {
    ...validReview, id: R, userId: A, createdAt: '2026-01-01T00:00:00Z',
    content: '<img src=x onerror=alert(1)>', profiles: { username: '<script>alert(1)</script>' },
  } }));
  assert.ok(!html.includes('<script>') && !html.includes('<img src=x'));
  assert.ok(html.includes('&lt;script&gt;') && html.includes('&lt;img'));
});
test('Dashboard wrapper contains the exact canonical body, one transaction, and an optional failure before commit', () => {
  const body = fs.readFileSync(path.join(root, 'supabase/migrations/20261027120000_cinelink_rls_and_minimal_grants.sql'), 'utf8');
  for (const mode of ['rehearsal', 'apply']) {
    const sql = buildDashboardSql(body, mode);
    assert.ok(sql.includes(body.trim()));
    assert.equal((sql.match(/^BEGIN;/gm) ?? []).length, 1);
    assert.equal((sql.match(/^COMMIT;/gm) ?? []).length, 1);
    assert.equal(sql.includes('INTENTIONAL_ROLLBACK_REHEARSAL'), mode === 'rehearsal');
    assert.ok(sql.endsWith('COMMIT;\n'));
  }
});
