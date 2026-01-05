const { fetch } = require('undici');
const fs = require('fs');
const path = require('path');

async function getPuppeteer() {
  try { return { pkg: require('puppeteer'), name: 'puppeteer' }; } catch (e) {}
  try { return { pkg: require('puppeteer-core'), name: 'puppeteer-core' }; } catch (e) {}
  try {
    const mod = await import('puppeteer');
    return { pkg: mod.default || mod, name: 'puppeteer' };
  } catch (e) {}
  const mod2 = await import('puppeteer-core');
  return { pkg: mod2.default || mod2, name: 'puppeteer-core' };
}

function applyPathRewrite(path, pathRewrite) {
  if (!pathRewrite) return path;
  let result = path;
  for (const [k, v] of Object.entries(pathRewrite)) {
    const re = new RegExp(k);
    result = result.replace(re, v);
  }
  return result;
}

async function performLoginForMapping(page, mapping, browser) {
  const auth = mapping.auth;
  if (!auth) return;
  if (auth.type === 'basic') {
    // nothing to do for browser fetch
    return;
  }
  if (auth.type === 'form') {
    try {
      const loginUrl = auth.loginUrl && auth.loginUrl.match(/^https?:\/\//) ? auth.loginUrl : `${mapping.target.replace(/\/$/, '')}${auth.loginUrl}`;
      await page.goto(loginUrl, { waitUntil: 'networkidle2' });
      if (auth.usernameField && auth.username !== undefined) {
        await page.waitForSelector(auth.usernameField, { timeout: 10000 });
        await page.focus(auth.usernameField);
        await page.keyboard.type(String(auth.username));
      }
      if (auth.passwordField && auth.password !== undefined) {
        await page.waitForSelector(auth.passwordField, { timeout: 10000 });
        await page.focus(auth.passwordField);
        await page.keyboard.type(String(auth.password));
      }
      if (auth.submitSelector) {
        await page.click(auth.submitSelector);
      } else {
        await page.keyboard.press('Enter');
      }
      if (auth.postLoginSelector) {
        await page.waitForSelector(auth.postLoginSelector, { timeout: 10000 });
      } else {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (e) {
      console.error('puppeteer-proxy login failed:', e);
    }
  }
}


function getInstalledChromeVersion(cacheDir) {
  const chromeDir = path.join(cacheDir, 'chrome');
  if (!fs.existsSync(chromeDir)) {
    throw new Error(`Chrome directory not found: ${chromeDir}`);
  }
  // 读取 chrome 目录下的所有文件夹，找到以 'stable-' 开头的文件夹
  const items = fs.readdirSync(chromeDir);
  const stableFolder = items.find(item => item.startsWith('win64-'));
  if (!stableFolder) {
    throw new Error(`No stable version found in ${chromeDir}`);
  }
  // 提取版本号，例如 'stable-121.0.6167.85' -> '121.0.6167.85'
  return stableFolder.replace('win64-', '');
}

module.exports = { getPuppeteer, performLoginForMapping, applyPathRewrite, getInstalledChromeVersion };
