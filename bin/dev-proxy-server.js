#!/usr/bin/env node
const path = require('path');
const { program } = require('commander');
const startProxyServer = require('../src/puppeteer-proxy-server');

program
  .option('-c, --config <path>', 'proxy config file', 'proxy.config.json')
  .option('-p, --port <number>', 'proxy server port', '6677')
  .option('-h, --headless', 'run browser headless')
  .option('--executable-path <path>', 'path to Chrome/Chromium executable (or set PUPPETEER_EXECUTABLE_PATH env)')
  .option('--channel <channel>', 'browser channel (e.g., chrome, chrome-beta, msedge)')
  .parse(process.argv);

const opts = program.opts();
const configPath = path.isAbsolute(opts.config) ? opts.config : path.join(process.cwd(), opts.config);
const port = parseInt(opts.port, 10);
const headless = !!opts.headless;
const executablePath = opts.executablePath || process.env.PUPPETEER_EXECUTABLE_PATH;
const channel = opts.channel || process.env.PUPPETEER_CHANNEL;

startProxyServer({ configPath, port, headless, channel });
