#!/usr/bin/env node

import { program } from "commander";
import { RequestInit } from "node-fetch";
import { HttpsProxyAgent } from "https-proxy-agent";
import path from "node:path";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";

import { CrawlOptions, Page, crawlPage } from "./index.js";

async function main() {
  const { extract, maxConnections, markdown, log, exclude } = program.opts();
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
    extract,
    exclude: exclude || [],
    toMarkdown: !!markdown,
    logEnabled: !!log,
    fetchOptions,
  };
  if (!outPath) {
    options.logEnabled = false;
  }
  const pages: Page[] = [];
  for await (const page of crawlPage(startUrl, options)) {
    pages.push(page);
  }
  const data = JSON.stringify(pages, null, 2);
  if (outPath) {
    if (existsSync(outPath) || outPath.endsWith(".json")) {
      mkdirSync(path.dirname(outPath), { recursive: true });
      writeFileSync(outPath, data);
    } else {
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
    }
  } else {
    console.log(data);
  }
}

program
  .name("rag-crawler")
  .argument("<startUrl>", "The URL to start crawling from. [required]")
  .argument("[outPath]", "The output path. If omitted, output to stdout")
  .option(
    "--extract <css-selector>",
    "Extract specific content using a CSS selector"
  )
  .option(
    "--max-connections <number>",
    "Maximum concurrent connections",
    parseInt,
    5,
  )
  .option(
    "-e, --exclude <names>",
    "Comma-separated list of path names to exclude",
    (value: string) => value.split(","),
  )
  .option("--no-markdown", "Don't convert crawled HTML to Markdown")
  .option("--no-log", "Disable logging")
  .version("1.1.0");

program.parse();

main().catch((err) => {
  console.error(err);
});
