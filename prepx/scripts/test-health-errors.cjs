const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

function load(file, overrides = {}) {
  const filename = path.resolve(file);
  const m = new Module(filename, module);
  m.filename = filename;
  m.paths = module.paths;
  m.require = name => {
    if (Object.hasOwn(overrides, name)) return overrides[name];
    if (name === 'server-only') return {};
    if (name.startsWith('@/') || name.startsWith('.')) {
      const target = name.startsWith('@/') ? path.resolve('src', name.slice(2)) : path.resolve(path.dirname(filename), name);
      return load(fs.existsSync(target + '.tsx') ? target + '.tsx' : target + '.ts', overrides);
    }
    return require(name);
  };
  m._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, filename);
  return m.exports;
}

async function main() {
  const saved = process.env;
  const log = console.error;
  const logs = [];
  console.error = (...args) => logs.push(args);
  const good = { NODE_ENV: 'production', NEXT_PUBLIC_SUPABASE_URL: 'https://private-project.supabase.co',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'private-publishable', SUPABASE_SECRET_KEY: 'private-secret',
    RATE_LIMIT_HASH_SECRET: 's'.repeat(32), UPSTASH_REDIS_REST_URL: 'https://private-redis.upstash.io',
    UPSTASH_REDIS_REST_TOKEN: 'private-token' };
  try {
    const route = load('src/app/api/health/route.ts');
    for (const [env, status] of [[{ NODE_ENV: 'development' }, 200], [good, 200], [{ NODE_ENV: 'production' }, 503], [{ VERCEL: '1' }, 503],
      ...Object.keys(good).filter(k => k !== 'NODE_ENV').map(k => [{ ...good, [k]: '' }, 503]),
      [{ ...good, RESULT_SEARCH_RATE_LIMIT_PROVIDER: 'memory' }, 503], [{ ...good, RESULT_SEARCH_RATE_LIMIT: 'bad' }, 503]]) {
      process.env = env;
      const response = await route.GET(new Request('http://localhost/api/health', { headers: { 'x-private': 'secret-header' } }));
      assert.equal(response.status, status);
      assert.match(response.headers.get('content-type'), /application\/json/);
      assert.equal(response.headers.get('cache-control'), 'no-store, no-cache, must-revalidate');
      assert.equal(response.headers.get('pragma'), 'no-cache');
      assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
      assert.equal(response.headers.get('access-control-allow-origin'), null);
      const body = await response.json();
      assert.deepEqual(Object.keys(body).sort(), ['service', 'status', 'timestamp']);
      assert.equal(body.service, 'prepx');
      assert.equal(body.status, status === 200 ? 'ok' : 'unavailable');
      assert.equal(new Date(body.timestamp).toISOString(), body.timestamp);
      assert(!JSON.stringify(body).includes('private'));
    }
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']) {
      const response = await route[method]();
      assert.equal(response.status, 405);
      assert.equal(response.headers.get('allow'), 'GET');
      assert.match(response.headers.get('cache-control'), /no-store/);
      assert.equal((await response.json()).error, 'METHOD_NOT_ALLOWED');
    }
    const failing = load('src/app/api/health/route.ts', {
      '@/lib/rate-limit/config': { readRateLimitConfig() { throw new Error('PRIVATE PROVIDER STACK credentials'); } },
    });
    process.env = good;
    assert.equal((await failing.GET(new Request('http://localhost/api/health'))).status, 503);
    assert(!JSON.stringify(logs).includes('PRIVATE'));
  } finally { process.env = saved; console.error = log; }

  const error = Object.assign(new Error('PRIVATE record NIC 200312345678'), { stack: 'PRIVATE STACK SQL', digest: 'PRIVATE DIGEST' });
  for (const file of ['src/app/error.tsx', 'src/app/(public)/error.tsx', 'src/app/admin/error.tsx', 'src/app/admin/(protected)/error.tsx', 'src/app/global-error.tsx']) {
    let count = 0;
    const Page = load(file).default;
    const element = React.createElement(Page, { error, reset: () => count++ });
    const markup = renderToStaticMarkup(element);
    assert(markup.includes('Something went wrong'));
    assert(markup.includes('Try again'));
    assert(markup.includes('Return home'));
    assert(markup.includes('href="/"'));
    assert(markup.includes('noindex'));
    assert(!markup.includes('PRIVATE') && !markup.includes('200312345678'));
    if (file.includes('/admin/')) assert(markup.includes('href="/admin"'));
    // Resolve function components and invoke the actual native button handler.
    function click(node) {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) return node.forEach(click);
      if (typeof node.type === 'function') return click(node.type(node.props));
      if (node.type === 'button' && node.props.children === 'Try again') node.props.onClick();
      else if (node.type === 'button' && node.props.onClick) node.props.onClick();
      else click(node.props?.children);
    }
    click(element);
    assert.equal(count, 1);
    assert(markup.includes('focus-visible:') || file.includes('global-error'));
  }
  const NotFound = load('src/app/not-found.tsx');
  const html = renderToStaticMarkup(React.createElement(NotFound.default));
  assert(html.includes('Page not found') && html.includes('Search results') && html.includes('Return home'));
  assert.equal(NotFound.metadata.robots.index, false);
  for (const [route, title] of [['not-found', 'Result Not Found'], ['not-published', 'Results Not Yet Published']]) {
    const Page = load(`src/app/(public)/results/${route}/page.tsx`).default;
    const markup = renderToStaticMarkup(React.createElement(Page));
    assert(markup.includes(title) && !markup.includes('Page not found'));
  }
  console.log('PASS: health configuration/status/privacy/headers/methods, all error boundaries, reset callbacks, navigation, noindex and distinct result states.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
