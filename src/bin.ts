#!/usr/bin/env node

import { program } from "commander";
import { RequestInit } from "node-fetch";
import { HttpsProxyAgent } from "https-proxy-agent";
import path from "node:path";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";

import { CrawlOptions, Page, crawlPage } from "./index.js";
import PRESET_LIST, { Preset } from "./preset.js";

async function main() {
  const {
    preset,
    maxConnections,
    exclude = [],
    extract,
    markdown,
    log,
  } = program.opts();
  const [startUrl, outPath] = program.args;
  const fetchOptions: RequestInit = {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    },
    follow: 3,
  };
  if (startUrl.startsWith("https://") && process.env["HTTPS_PROXY"]) {
    fetchOptions.agent = new HttpsProxyAgent(process.env["HTTPS_PROXY"]);
  }
  let options: Partial<CrawlOptions> = {
    maxConnections,
    exclude,
    extract,
    toMarkdown: !!markdown,
    logEnabled: !!log,
    fetchOptions,
  };
  applyPreset(preset, startUrl, options);
  if (!options.maxConnections) {
    options.maxConnections = 5;
  }
  if (!outPath) {
    options.logEnabled = false;
  }
  if (options.logEnabled) {
    console.log(`🕸️  Starting crawl of ${startUrl}`);
    console.log(
      `⚙️  maxConnections=${
        options.maxConnections
      } exclude='${options.exclude.join(",")}' extract='${
        options.extract || ""
      }' toMarkdown=${options.toMarkdown}`,
    );
  }
  const pages: Page[] = [];
  for await (const page of crawlPage(startUrl, options)) {
    pages.push(page);
  }
  const data = JSON.stringify(pages, null, 2);
  if (outPath) {
    if (/(\/|\\)$/.test(outPath) || isDir(outPath)) {
      let ext = ".html";
      if (options.toMarkdown) {
        ext = ".md";
      }
      for (const page of pages) {
        let filePath = page.path.replace(/(\/|\.html)$/, "");
        filePath = path.join(outPath, new URL(filePath).pathname + ext);
        mkdirSync(path.dirname(filePath), { recursive: true });
        writeFileSync(filePath, page.text);
      }
    } else {
      mkdirSync(path.dirname(outPath), { recursive: true });
      writeFileSync(outPath, data);
    }
  } else {
    console.log(data);
  }
}

function applyPreset(
  preset: string,
  startUrl: string,
  options: Partial<CrawlOptions>,
) {
  let presetOptions: Preset["options"] | undefined;
  let presets = loadPresets();
  if (preset === "auto") {
    presetOptions = presets.find((p) => new RegExp(p.test).test(startUrl))
      ?.options;
  } else if (preset) {
    presetOptions = presets.find((p) => p.name === preset)?.options;
  }
  if (presetOptions) {
    if (presetOptions.maxConnections && !options.maxConnections) {
      options.maxConnections = presetOptions.maxConnections;
    }
    if (presetOptions.exclude?.length && !options.exclude?.length) {
      options.exclude = presetOptions.exclude;
    }
    if (presetOptions.extract && !options.extract) {
      options.extract = presetOptions.extract;
    }
    if (
      presetOptions.headers &&
      Object.getPrototypeOf(presetOptions.headers) === Object.prototype
    ) {
      options.fetchOptions.headers = {
        ...options.fetchOptions.headers,
        ...presetOptions.headers,
      };
    }
  }
}

function loadPresets(): Preset[] {
  const homeDir = process.env.HOME;
  const filePath = path.join(homeDir, ".rag-crawler.json");
  try {
    const data = readFileSync(filePath, "utf-8");

    const jsonData = JSON.parse(data);

    if (Array.isArray(jsonData)) {
      return [...jsonData, ...PRESET_LIST];
    }
  } catch {
    return PRESET_LIST;
  }
}

function isDir(path: string): boolean {
  try {
    const stat = statSync(path);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

program
  .name("rag-crawler")
  .argument("<startUrl>", "The URL to start crawling from. [required]")
  .argument("[outPath]", "The output path. If omitted, output to stdout")
  .option("--preset <value>", "Use predefined crawl options", "auto")
  .option(
    "-c, --max-connections <int>",
    "Maximum concurrent connections to crawl",
    parseInt,
  )
  .option(
    "-e, --exclude <values>",
    "Comma-separated list of path names to exclude",
    (value: string) => value.split(","),
  )
  .option(
    "--extract <selector>",
    "Extract specific content using a CSS selector",
  )
  .option("--no-markdown", "Don't convert crawled HTML to Markdown")
  .option("--no-log", "Disable logging")
  .version("1.2.0");

program.parse();

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
