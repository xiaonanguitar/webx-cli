#!/usr/bin/env node
const path = require('path');
const { program } = require('commander');
const startProxyServer = require('../src/puppeteer-proxy-server');

program
  .option('-h, --headless', 'run browser headless')
  .option('--channel <channel>', 'browser channel (e.g., chrome, chrome-beta, msedge)')
  .parse(process.argv);

const opts = program.opts();
const configPath = path.join(process.cwd(), "proxy.config.json");
const headless = !!opts.headless;
const channel = opts.channel || process.env.PUPPETEER_CHANNEL;

startProxyServer({ configPath, headless, channel });
