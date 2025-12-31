#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const { program } = require('commander');
const startProxy = require('../src/puppeteer-proxy');

program
  .option('-p, --port <number>', 'webpack devServer port', '8080')
  .option('-c, --config <path>', 'proxy config file', 'proxy.config.json')
  .option('-h, --headless', 'run browser headless')
  .option('-u, --url <url>', 'open URL (defaults to http://localhost:port)')
  .option('--executable-path <path>', 'path to Chrome/Chromium executable (or set PUPPETEER_EXECUTABLE_PATH env)')
  .option('--channel <channel>', 'browser channel (e.g., chrome, chrome-beta, msedge)')
  .parse(process.argv);

const opts = program.opts();
const port = parseInt(opts.port, 10);
const configPath = path.isAbsolute(opts.config) ? opts.config : path.join(process.cwd(), opts.config);
const headless = !!opts.headless;
const url = opts.url || `http://localhost:${port}`;
const executablePath = opts.executablePath || process.env.PUPPETEER_EXECUTABLE_PATH;
const channel = opts.channel || process.env.PUPPETEER_CHANNEL;

if (!fs.existsSync(configPath)) {
  console.error(`Config file not found: ${configPath}`);
  console.error('Create a config file or use --config to point to one. Example: proxy.config.example.json');
  process.exit(1);
}

startProxy({ port, configPath, headless, url, executablePath, channel }).catch(err => {
  console.error('Error starting dev proxy:', err);
  process.exit(1);
});
