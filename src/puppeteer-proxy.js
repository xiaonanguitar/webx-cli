const fs = require("fs");
const { join } = require("path");
const { fetch } = require("undici");

async function getPuppeteer() {
  // Try CommonJS require for either puppeteer or puppeteer-core
  try {
    return { pkg: require("puppeteer"), name: "puppeteer" };
  } catch (e) {}
  try {
    return { pkg: require("puppeteer-core"), name: "puppeteer-core" };
  } catch (e) {}

  // Fallback to dynamic ESM import for puppeteer or puppeteer-core
  try {
    const mod = await import("puppeteer");
    return { pkg: mod.default || mod, name: "puppeteer" };
  } catch (e) {}
  const mod2 = await import("puppeteer-core");
  return { pkg: mod2.default || mod2, name: "puppeteer-core" };
}

function loadConfig(configPath) {
  const raw = fs.readFileSync(configPath, "utf8");
  return JSON.parse(raw);
}

function findChromeExecutable() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH)
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  const candidates = [];
  if (process.platform === "win32") {
    candidates.push(
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    );
    candidates.push(
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
    );
  } else if (process.platform === "darwin") {
    candidates.push(
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    );
  } else {
    candidates.push(
      "/usr/bin/google-chrome",
      "/usr/bin/chromium-browser",
      "/usr/bin/chromium"
    );
  }
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return p;
    } catch (e) {}
  }
  return null;
}

function matchMapping(url, port, mappings) {
  // url like http://localhost:8080/api/users
  const localPrefix = `http://localhost:${port}`;
  if (!url.startsWith(localPrefix)) return null;
  const path = url.slice(localPrefix.length);
  return mappings.find((m) => path.startsWith(m.prefix)) || null;
}

function applyPathRewrite(path, pathRewrite) {
  if (!pathRewrite) return path;
  // pathRewrite is an object with keys are regex string
  let result = path;
  for (const [k, v] of Object.entries(pathRewrite)) {
    const re = new RegExp(k);
    result = result.replace(re, v);
  }
  return result;
}

async function forwardRequest(req, mapping, port) {
  const localPrefix = `http://localhost:${port}`;
  const url = req.url();
  const path = url.slice(localPrefix.length);
  const rewrittenPath = applyPathRewrite(path, mapping.pathRewrite);
  const targetBase = mapping.target.replace(/\/$/, "");
  const targetUrl = `${targetBase}${rewrittenPath}`;

  const headers = { ...req.headers() };
  // merge mapping headers
  if (mapping.headers) {
    Object.assign(headers, mapping.headers);
  }

  // attach auth header if present (basic)
  if (mapping._authHeader && !headers["authorization"]) {
    headers["authorization"] = mapping._authHeader;
  }

  // attach cookie header from login if present
  if (mapping._cookieHeader) {
    // merge with existing Cookie header if any
    if (headers["cookie"])
      headers["cookie"] = `${headers["cookie"]}; ${mapping._cookieHeader}`;
    else headers["cookie"] = mapping._cookieHeader;
  }

  const opts = {
    method: req.method(),
    headers,
    redirect: "manual",
  };

  if (req.postData()) {
    opts.body = req.postData();
  }

  const res = await fetch(targetUrl, opts);
  const arrayBuffer = await res.arrayBuffer();
  const body = Buffer.from(arrayBuffer);

  const resHeaders = {};
  for (const [k, v] of Object.entries(res.headers || {})) {
    resHeaders[k] = v;
  }

  // Remove hop-by-hop headers that might confuse the browser
  ["transfer-encoding", "connection", "keep-alive"].forEach(
    (h) => delete resHeaders[h]
  );

  await req.respond({
    status: res.status,
    headers: resHeaders,
    body,
  });
}

module.exports = async function startProxy({
  port = 8080,
  configPath,
  headless = false,
  url,
  executablePath,
  channel,
}) {
  const config = loadConfig(configPath);
  const mappings = config.mappings || [];

  const { pkg: puppeteer, name } = await getPuppeteer();

  // Determine executablePath (env or auto-detect)
  const execPath = executablePath || findChromeExecutable();

  if (name === "puppeteer-core" && !execPath && !channel) {
    throw new Error(
      "An `executablePath` or `channel` must be specified for `puppeteer-core`. Set PUPPETEER_EXECUTABLE_PATH, pass `--executable-path`, or install full `puppeteer`."
    );
  }

  const launchOptions = { headless };
  if (execPath) launchOptions.executablePath = execPath;
  if (channel) launchOptions.channel = channel;

  const browser = await puppeteer.launch(launchOptions);
  const page = await browser.newPage();

  await page.setRequestInterception(true);

  // perform login for mappings that declare auth
  async function performLoginForMapping(mapping) {
    if (!mapping.auth) return;
    const auth = mapping.auth;

    if (auth.type === "basic") {
      // just set Authorization header for fetch forwarding
      const token = Buffer.from(`${auth.username}:${auth.password}`).toString(
        "base64"
      );
      mapping._authHeader = `Basic ${token}`;
      return;
    }

    if (auth.type === "form") {
      const loginPage = await browser.newPage();
      try {
        const loginUrl =
          auth.loginUrl && auth.loginUrl.match(/^https?:\/\//)
            ? auth.loginUrl
            : `${mapping.target.replace(/\/$/, "")}${auth.loginUrl}`;
        await loginPage.goto(loginUrl, { waitUntil: "networkidle2" });

        // 支持 iframe 登录场景
        let frame = loginPage.mainFrame();

        // 输入用户名
        if (auth.usernameField && auth.username !== undefined) {
          try {
            // 等待元素可见并获取元素句柄
            const emailInput = await frame.waitForSelector(
              auth.usernameField,
              {
                timeout: 5000, // 10秒超时
                state: "visible", // 确保元素可见
              }
            );

            // 3. 获取焦点（多种方法）
            // 方法A：直接调用 focus() 方法（推荐）
            await emailInput.focus();

            // 方法B：先点击再聚焦（如果方法A无效）
            // await emailInput.click();
            // await emailInput.focus();

            // 4. 输入信息
            await emailInput.type(auth.username, {
              delay: 50, // 每个字符之间的延迟，模拟真实输入
              timeout: 5000,
            });

            
          } catch (e) {
            // fallback: 输出所有 input 元素和页面 HTML
            let inputs = [];
            try {
              inputs = await frame.$$eval("input", (els) =>
                els.map((e) => ({
                  name: e.name,
                  type: e.type,
                  id: e.id,
                  selector: e.outerHTML,
                }))
              );
            } catch (err) {}
            let html = "";
            try {
              html = await frame.content();
            } catch (err) {}
            console.error(
              `[自动登录] 未找到用户名输入框: ${auth.usernameField}\n所有input:`,
              inputs,
              "\n页面HTML片段:",
              html.slice(0, 1000)
            );
            throw e;
          }
        }
        // 输入密码
        if (auth.passwordField && auth.password !== undefined) {
          try {
            await frame.waitForSelector(auth.passwordField, { timeout: 10000 });
            await frame.focus(auth.passwordField);
            await frame.evaluate(
              (selector, value) => {
                const el = document.querySelector(selector);
                if (el) {
                  el.value = value;
                  el.dispatchEvent(new Event("input", { bubbles: true }));
                  el.dispatchEvent(new Event("change", { bubbles: true }));
                }
              },
              auth.passwordField,
              String(auth.password)
            );
          } catch (e) {
            // fallback: 输出所有 input 元素和页面 HTML
            let inputs = [];
            try {
              inputs = await frame.$$eval("input", (els) =>
                els.map((e) => ({
                  name: e.name,
                  type: e.type,
                  id: e.id,
                  selector: e.outerHTML,
                }))
              );
            } catch (err) {}
            let html = "";
            try {
              html = await frame.content();
            } catch (err) {}
            console.error(
              `[自动登录] 未找到密码输入框: ${auth.passwordField}\n所有input:`,
              inputs,
              "\n页面HTML片段:",
              html.slice(0, 1000)
            );
            throw e;
          }
        }
        // 提交表单
        if (auth.submitSelector) {
          await frame.click(auth.submitSelector);
        } else {
          await frame.keyboard.press("Enter");
        }
        // 等待登录成功标志
        if (auth.postLoginSelector) {
          await frame.waitForSelector(auth.postLoginSelector, {
            timeout: 10000,
          });
        } else {
          await loginPage.waitForTimeout(2000);
        }
        // 收集 cookie
        const cookies = await loginPage.cookies();
        const cookiePairs = cookies.map((c) => `${c.name}=${c.value}`);
        if (cookiePairs.length) mapping._cookieHeader = cookiePairs.join("; ");
      } catch (e) {
        let pageInfo = "";
        try {
          pageInfo += `\nLoginUrl: ${loginUrl}`;
          pageInfo += `\nTitle: ` + (await loginPage.title());
          pageInfo += `\nHTML: ` + (await loginPage.content()).slice(0, 500);
        } catch (err) {}
        console.error(
          `Auth login failed for mapping prefix=${mapping.prefix}:`,
          e,
          pageInfo
        );
      } finally {
        try {
          await loginPage.close();
        } catch (e) {}
      }
      return;
    }

    console.warn(
      `Unsupported auth.type for mapping prefix=${mapping.prefix}: ${auth.type}`
    );
  }

  // run login for all mappings (in sequence)
  for (const m of mappings) {
    await performLoginForMapping(m);
  }

  page.on("request", async (req) => {
    try {
      const mapping = matchMapping(req.url(), port, mappings);
      if (!mapping) {
        req.continue();
        return;
      }

      // only handle REST-like (XHR/fetch) + same-origin requests from devServer
      const resourceType = req.resourceType();
      if (
        ["xhr", "fetch", "document", "other"].includes(resourceType) ||
        req.url().startsWith(`http://localhost:${port}`)
      ) {
        await forwardRequest(req, mapping, port);
      } else {
        req.continue();
      }
    } catch (err) {
      console.error("Error handling request:", err);
      try {
        req.continue();
      } catch (e) {}
    }
  });

  // open page
  const openUrl = url || `http://localhost:${port}`;
  console.log(`Opening browser at ${openUrl} (headless=${headless})`);
  await page.goto(openUrl, { waitUntil: "networkidle2" });

  // keep process alive until browser closed
  browser.on("disconnected", () => {
    console.log("Browser closed, exiting");
    process.exit(0);
  });

  process.on("SIGINT", async () => {
    console.log("SIGINT received, closing browser");
    try {
      await browser.close();
    } catch (e) {}
    process.exit(0);
  });

  return { browser, page };
};
