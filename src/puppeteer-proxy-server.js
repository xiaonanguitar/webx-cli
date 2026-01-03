const http = require('http');
const { URL } = require('url');
const { readFileSync } = require('fs');
const { getPuppeteer, performLoginForMapping, applyPathRewrite } = require('./puppeteer-proxy-utils');

async function startProxyServer({ configPath, headless = false, port = 6677, executablePath, channel }) {
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  const mapping = config.mappings[0]; // 只支持单一 target，复杂场景可扩展
  const { pkg: puppeteer } = await getPuppeteer();
  const launchOptions = { headless };
  if (executablePath) launchOptions.executablePath = executablePath;
  if (channel) launchOptions.channel = channel;
  const browser = await puppeteer.launch(launchOptions);
  const page = await browser.newPage();
  await performLoginForMapping(page, mapping, browser);

  const server = http.createServer(async (req, res) => {
    try {
      const targetBase = mapping.target.replace(/\/$/, '');
      const urlObj = new URL(req.url, `http://localhost:${port}`);
      const rewrittenPath = applyPathRewrite(urlObj.pathname + urlObj.search, mapping.pathRewrite);
      const targetUrl = `http://localhost:3000${req.url}`;
      let body = Buffer.alloc(0);
      req.on('data', chunk => { body = Buffer.concat([body, chunk]); });
      req.on('end', async () => {
        const headers = { ...req.headers };
        delete headers['host'];
        delete headers['content-length'];
        const fetchOpts = {
          method: req.method,
          headers,
          credentials: 'include',
          redirect: 'manual',
          body: ['GET', 'HEAD'].includes(req.method) ? undefined : body.toString()
        };
        const result = await page.evaluate(async (url, opts) => {
            let res = await fetch(url, opts).catch(err => {
              return new Response('puppeteer-proxy fetch error: ' + err.message, { status: 502 });
            });
            const buf = new Uint8Array(await res.arrayBuffer());
            const headers = {};
            res.headers.forEach((v, k) => { headers[k] = v; });
            return { status: res.status, headers, body: Array.from(buf) };
        }, targetUrl, fetchOpts);
        res.writeHead(result.status, result.headers);
        res.end(Buffer.from(result.body));
      });
    } catch (e) {
      res.writeHead(502, { 'content-type': 'text/plain' });
      res.end('puppeteer-proxy error: ' + e.message);
    }
  });
  server.listen(port, () => {
    console.log(`puppeteer-proxy server listening on http://localhost:${port}`);
  });
}

module.exports = startProxyServer;
