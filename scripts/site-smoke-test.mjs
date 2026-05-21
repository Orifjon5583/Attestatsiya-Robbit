import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';

const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const port = Number(process.env.CDP_PORT || 9224);
const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:5174/';

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForJson(url, timeout = 10000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
    } catch {
    }
    await wait(200);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function waitForCondition(callback, timeout = 10000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await callback()) return true;
    await wait(200);
  }
  return false;
}

async function cdp(wsUrl) {
  const socket = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();

  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
    }
  });

  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });

  return {
    send(method, params = {}) {
      const messageId = ++id;
      socket.send(JSON.stringify({ id: messageId, method, params }));
      return new Promise((resolve, reject) => pending.set(messageId, { resolve, reject }));
    },
    close() {
      socket.close();
    },
  };
}

async function main() {
  const tempRoot = join(process.cwd(), '.tmp');
  await mkdir(tempRoot, { recursive: true });
  const userDataDir = await mkdtemp(join(tempRoot, 'chrome-cdp-'));
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--no-first-run',
    '--disable-background-networking',
    '--disable-crash-reporter',
    '--remote-debugging-address=127.0.0.1',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    baseUrl,
  ], { stdio: ['ignore', 'pipe', 'pipe'] });

  let client;
  const checks = [];
  let chromeExit;
  const chromeOutput = [];

  chrome.stdout.on('data', (chunk) => chromeOutput.push(chunk.toString()));
  chrome.stderr.on('data', (chunk) => chromeOutput.push(chunk.toString()));
  chrome.on('exit', (code, signal) => {
    chromeExit = { code, signal };
  });

  function check(name, ok, detail = '') {
    checks.push({ name, ok, detail });
    const mark = ok ? 'PASS' : 'FAIL';
    console.log(`${mark} ${name}${detail ? ` - ${detail}` : ''}`);
  }

  try {
    if (chrome.pid === undefined) {
      throw new Error(`Chrome did not start. Checked path: ${chromePath}`);
    }
    try {
      await waitForJson(`http://127.0.0.1:${port}/json/version`);
    } catch (error) {
      const detail = chromeExit
        ? ` Chrome exited with code ${chromeExit.code ?? 'unknown'}${chromeExit.signal ? ` and signal ${chromeExit.signal}` : ''}.`
        : '';
      const output = chromeOutput.join('').trim();
      throw new Error(`${error.message}.${detail}${output ? `\nChrome output:\n${output}` : ''}`);
    }
    const targets = await waitForJson(`http://127.0.0.1:${port}/json/list`);
    const pageTarget = targets.find((target) => target.type === 'page');
    if (!pageTarget) throw new Error('No page target found in Chrome');
    client = await cdp(pageTarget.webSocketDebuggerUrl);
    await client.send('Page.enable');
    await client.send('Runtime.enable');

    async function evaluate(expression) {
      const result = await client.send('Runtime.evaluate', {
        expression,
        awaitPromise: true,
        returnByValue: true,
      });
      if (result.exceptionDetails) {
        const details = result.exceptionDetails.exception?.description || result.exceptionDetails.text || 'Runtime evaluation failed';
        throw new Error(details);
      }
      return result.result.value;
    }

    async function text() {
      return evaluate('document.body?.innerText || ""');
    }

    async function clickByText(label) {
      const escaped = JSON.stringify(label);
      const target = await evaluate(`
        (() => {
          const nodes = [...document.querySelectorAll('button, label, a')]
            .filter((node) => {
              const style = getComputedStyle(node);
              return node.innerText && style.display !== 'none' && style.visibility !== 'hidden';
            });
          const target = nodes.find((node) => node.innerText.trim() === ${escaped})
            || nodes.find((node) => node.innerText.includes(${escaped}));
          if (!target) return null;
          const rect = target.getBoundingClientRect();
          return {
            text: target.innerText.trim(),
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
          };
        })()
      `);
      if (!target) return false;
      if (process.env.DEBUG_CLICKS) {
        console.log(`CLICK ${label}: ${target.text} at ${target.x},${target.y}`);
      }
      const dispatched = await evaluate(`
        (() => {
          const nodes = [...document.querySelectorAll('button, label, a')]
            .filter((node) => {
              const style = getComputedStyle(node);
              return node.innerText && style.display !== 'none' && style.visibility !== 'hidden';
            });
          const target = nodes.find((node) => node.innerText.trim() === ${escaped})
            || nodes.find((node) => node.innerText.includes(${escaped}));
          if (!target) return false;
          return target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
        })()
      `);
      await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: target.x, y: target.y });
      await client.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: target.x, y: target.y, button: 'left', clickCount: 1 });
      await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: target.x, y: target.y, button: 'left', clickCount: 1 });
      await wait(650);
      return dispatched;
    }

    async function clickNav(label) {
      const escaped = JSON.stringify(label);
      const clicked = await evaluate(`
        (() => {
          const nodes = [...document.querySelectorAll('.sidebar nav button, .logout')]
            .filter((node) => {
              const style = getComputedStyle(node);
              return node.innerText && style.display !== 'none' && style.visibility !== 'hidden';
            });
          const target = nodes.find((node) => node.innerText.trim() === ${escaped})
            || nodes.find((node) => node.innerText.includes(${escaped}));
          if (!target) return false;
          target.click();
          return true;
        })()
      `);
      await wait(650);
      return clicked;
    }

    async function clickButtonExact(label) {
      const escaped = JSON.stringify(label);
      const clicked = await evaluate(`
        (() => {
          const target = [...document.querySelectorAll('button')]
            .find((node) => node.innerText.trim() === ${escaped});
          if (!target) return false;
          target.click();
          return true;
        })()
      `);
      await wait(650);
      return clicked;
    }

    async function clickAnyText(labels) {
      for (const label of labels) {
        if (await clickByText(label)) return true;
      }
      return false;
    }

    await client.send('Page.navigate', { url: baseUrl });
    check('home renders', await waitForCondition(async () => (await text()).includes('Kelajagingizni biz bilan yarating')));

    check('open login from home', await clickByText('Kirish'));
    check('login page renders', (await text()).includes('Tizimga kirish'));

    check('student login', await clickByText('Kirish'));
    let body = await text();
    check('student dashboard renders', body.includes('Dashboard') && body.includes("Mening o'quvlarim"));

    check('courses navigation', await clickByText("Mening o'quvlarim"));
    body = await text();
    check('courses page renders', body.includes("Mening o'quvlarim") && body.includes('Boshlash'));

    check('directions navigation', await clickByText("Yo'nalishlar"));
    body = await text();
    check('directions page renders', body.includes("O'zingizga qiziq yo'nalishni tanlang"));

    check('open course', await clickByText('Python Dasturlash'));
    body = await text();
    check('course page renders', body.includes('Boshlash') && body.includes('Variables'));

    check('open theory', await clickByText('Boshlash'));
    body = await text();
    check('theory page renders', body.includes("O'zgaruvchi nima?"));

    check('open practice', await clickByText('Keyingi: Amaliyot'));
    body = await text();
    check('practice page renders', body.includes('Yechimni tekshirish'));

    check('check practice', await clickByText('Yechimni tekshirish'));
    body = await text();
    check('practice result shown', body.includes('Yechim qabul qilindi.'));

    check('open test tab', await clickByText('Test'));
    await evaluate("document.querySelector('.answers button')?.click()");
    await wait(100);
    check('advance test', await clickAnyText(['Yakunlash', 'Keyingi savol']));
    body = await text();
    check('final task renders', body.includes('Yakuniy topshiriq'));

    check('submit final task', await clickByText('Topshirish'));
    body = await text();
    check('exam renders', body.includes('Yakuniy imtihon'));

    await evaluate("document.querySelector('.answers button:nth-child(2)')?.click()");
    await wait(100);
    check('finish exam', await clickAnyText(['Yakunlash', 'Keyingi savol']));
    body = await text();
    check('result renders', body.includes('Tabriklaymiz!'));

    check('open certificate', await clickByText("Sertifikatni ko'rish"));
    body = await text();
    check('certificate renders', body.includes('SERTIFIKAT') && body.includes('Yuklab olish'));

    check('logout returns login', await clickNav('Chiqish'));
    body = await text();
    check('login after logout renders', body.includes('Tizimga kirish'));

    check('admin login click', await clickButtonExact('Admin sifatida kirish'));
    check('admin login', await waitForCondition(async () => (await text()).includes('Admin panel')));
    body = await text();
    check('admin dashboard renders', body.includes('Admin panel') && body.includes('Boshqaruv paneli') && body.includes('Ish tartibi'));

    check('admin directions page', await clickNav("Yo'nalish qo'shish"));
    body = await text();
    check('admin directions renders', body.includes("Yo'nalish qo'shish") && body.includes('Platformaga yangi'));

    check('admin questions page', await clickNav('Test va nazoratlar'));
    body = await text();
    check('admin questions renders', body.includes('Test va nazoratlar') && body.includes('Admin sharti'));

    check('admin access page', await clickNav('Ruxsatlar'));
    body = await text();
    check('admin access renders', body.includes('Ruxsatlarni boshqarish') && body.includes('Ochiq mavzu'));

    check('admin topic page', await clickNav("Mavzu qo'shish"));
    body = await text();
    check('admin topic renders', body.includes("Yangi mavzu qo'shish") && body.includes('Saqlash'));

    check('admin lesson page', await clickNav("Dars qo'shish"));
    body = await text();
    check('admin lesson renders', body.includes("Nazariy dars qo'shish") && body.includes('Video URL'));
  } finally {
    client?.close();
    if (!chrome.killed) chrome.kill();
    await wait(800);
    await rm(userDataDir, { recursive: true, force: true }).catch(() => {});
  }

  const failed = checks.filter((item) => !item.ok);
  if (failed.length) {
    console.error(`\n${failed.length} smoke checks failed.`);
    process.exit(1);
  }
  console.log(`\n${checks.length} smoke checks passed.`);
}

main().catch((error) => {
  console.error(error);
  if (error.message.includes('/json/version')) {
    console.error('Chrome debugging endpoint did not become available. Set CHROME_PATH if Chrome is installed in a custom location.');
  }
  process.exit(1);
});
