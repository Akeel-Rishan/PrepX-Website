// Optional browser smoke test using installed Edge and Node's native CDP WebSocket.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3014';
let stage = 'launch';
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const deadline = setTimeout(() => { console.error('FAIL: browser smoke check timed out.'); process.exit(1); }, 60000);
(async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'prepx-errors-'));
  const edge = spawn(process.env.EDGE_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'],
    { windowsHide: true, stdio: 'ignore' });
  let socket;
  try {
    const portFile = path.join(profile, 'DevToolsActivePort');
    for (let i = 0; !fs.existsSync(portFile) && i < 100; i++) await pause(100);
    const port = fs.readFileSync(portFile, 'utf8').split('\n')[0];
    const tab = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
    socket = new WebSocket(tab.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    let id = 0;
    const pending = new Map();
    socket.onclose = () => { for (const { reject } of pending.values()) reject(new Error('Browser connection closed')); };
    socket.onmessage = event => {
      const value = JSON.parse(event.data);
      if (pending.has(value.id)) { const { resolve, reject } = pending.get(value.id); pending.delete(value.id); value.error ? reject(new Error(value.error.message)) : resolve(value.result); }
    };
    function send(method, params = {}) { return new Promise((resolve, reject) => { pending.set(++id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); }); }
    async function evaluate(expression) {
      const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) throw new Error('Browser evaluation failed');
      return result.result.value;
    }
    async function waitFor(expression) {
      for (let i = 0; i < 150; i++) { if (await evaluate(expression)) return; await pause(100); }
      throw new Error('Browser condition timed out');
    }
    await send('Page.enable');
    stage = '404 navigation';
    await send('Page.navigate', { url: base + '/phase-14-missing-page' });
    await waitFor('document.querySelector("h1")?.textContent === "Page not found"');
    assert(await evaluate('!!Array.from(document.links).find(a => a.textContent.includes("Return home"))'));
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    assert(await evaluate('document.documentElement.scrollWidth <= innerWidth'));
    await evaluate('Array.from(document.links).find(a => a.textContent.includes("Return home")).click()');
    stage = 'return home';
    await waitFor('location.pathname === "/" && !!document.querySelector("#result-search-heading")');
    // Inject only into the browser's existing React boundary state; no source or routes are changed.
    stage = 'hydration';
    await waitFor('!!Object.keys(document.querySelector("#result-search-heading")).find(k => k.startsWith("__reactFiber"))');
    const injected = await evaluate(`(() => {
      const el = document.querySelector('#result-search-heading');
      let fiber = el[Object.keys(el).find(k => k.startsWith('__reactFiber'))];
      while (fiber) {
        const instance = fiber.stateNode;
        if (instance?.state && Object.hasOwn(instance.state, 'error') && typeof instance.reset === 'function') {
          instance.setState({ error: Object.assign(new Error('PRIVATE_SENTINEL'), { digest: 'PRIVATE_DIGEST' }) });
          return true;
        }
        fiber = fiber.return;
      }
      return false;
    })()`);
    assert(injected);
    stage = 'boundary rendering';
    await waitFor('document.querySelector("h1")?.textContent === "Something went wrong"');
    assert(await evaluate('!document.body.innerText.includes("PRIVATE_")'));
    assert(await evaluate('document.documentElement.scrollWidth <= innerWidth'));
    await send('Page.bringToFront');
    await evaluate('Array.from(document.querySelectorAll("button")).find(b => b.textContent === "Try again").focus()');
    assert(await evaluate('document.activeElement.textContent === "Try again"'));
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', text: '\r', windowsVirtualKeyCode: 13 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
    stage = 'keyboard retry';
    await waitFor('!!document.querySelector("#result-search-heading")');
    console.log('PASS: Edge mobile 404, home navigation, simulated public boundary, private-error exclusion and keyboard retry recovery.');
  } finally {
    socket?.close();
    edge.kill();
    await pause(1000);
    // Only remove the unique temporary profile created above.
    assert.equal(path.dirname(path.resolve(profile)), path.resolve(os.tmpdir()));
    assert(path.basename(profile).startsWith('prepx-errors-'));
    fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
})().catch(error => { console.error('FAIL: browser error smoke check at ' + stage + ' (' + error.message + ').'); process.exitCode = 1; }).finally(() => clearTimeout(deadline));
