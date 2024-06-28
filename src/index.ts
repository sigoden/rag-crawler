import { Octokit } from "@octokit/rest";
import * as cheerio from "cheerio";
import { URL } from "node:url";
import TurndownService from "turndown";

import fetch, { RequestInit } from "node-fetch";

const turndownService = new TurndownService();
turndownService.remove("script");

/**
 * Options for the web crawler.
 */
export interface CrawlOptions {
  /**
   * Whether to convert crawled html to markdown.
   */
  toMarkdown: boolean;

  /**
   * Maximum number of concurrent connections allowed.
   */
  maxConnections: number;

  /**
   * Path names to exclude
   */
  exclude: string[];

  /**
   * Whether to stop the crawling process on the first encountered error.
   */
  breakOnError: boolean;

  /**
   * Whether to enable logging during the crawling process.
   */
  logEnabled: boolean;

  /**
   * Fetch options
   */
  fetchOptions: RequestInit;
}

const IS_GITHUB_REPO =
  /^https:\/\/github\.com\/([^\/]+)\/([^\/]+)\/tree\/([^\/]+)/;

export async function* crawlPage(
  startUrl: string,
  options_?: Partial<CrawlOptions>,
): AsyncGenerator<Page, any, Page> {
  const options: CrawlOptions = {
    toMarkdown: true,
    maxConnections: 5,
    exclude: [],
    fetchOptions: {},
    breakOnError: true,
    logEnabled: true,
    ...(options_ || {}),
  };

  if (!startUrl.endsWith("/")) {
    startUrl += "/";
  }
  const startUrlObj = new URL(startUrl);
  let paths: string[] = [startUrlObj.pathname];

  if (IS_GITHUB_REPO.test(startUrl)) {
    paths = await crawlGithubRepo(startUrlObj);
    options.exclude.push("changelog");
  }

  let index = 0;
  while (index < paths.length) {
    const batch = paths.slice(index, index + options.maxConnections);

    const promises = batch.map((path) =>
      getLinksFromUrl(startUrl, path, options),
    );

    const results = await Promise.all(promises);

    for (const { links, text, path } of results) {
      if (text !== "") {
        yield {
          path: new URL(path, startUrlObj).toString(),
          text,
        };
      }
      for (let link of links) {
        if (!paths.some((path) => matchLink(path, link))) {
          paths.push(link);
        }
      }
    }

    index += batch.length;
  }
  if (options.logEnabled) {
    console.log("Crawl completed");
  }
}

async function crawlGithubRepo(startUrl: URL) {
  const octokit = new Octokit({
    auth: undefined,
  });

  let [_, owner, repo, _scope, branch, ...parts] = startUrl.pathname.split("/");
  const rootPath = parts.join("/");

  const tree = await octokit.request(
    "GET /repos/{owner}/{repo}/git/trees/{tree_sha}",
    {
      owner,
      repo,
      tree_sha: branch,
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
      },
      recursive: "true",
    },
  );

  const paths = tree.data.tree
    .filter(
      (file) =>
        file.type === "blob" &&
        file.path?.endsWith(".md") &&
        file.path.startsWith(rootPath),
    )
    .map(
      (file) =>
        `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${file.path}`,
    );

  return paths;
}

export interface Page {
  path: string;
  text: string;
}

async function getLinksFromUrl(
  startUrl: string,
  path: string,
  options: CrawlOptions,
) {
  const location = new URL(path, startUrl).toString();

  if (options.logEnabled) {
    console.log(`Crawl ${location}`);
  }

  let html = "";

  try {
    const response = await fetch(location, options.fetchOptions);
    html = await response.text();
  } catch (err) {
    if (options.breakOnError) {
      throw err;
    }
  }

  let links: string[] = [];

  if (IS_GITHUB_REPO.test(startUrl)) {
    return {
      path,
      text: html,
      links,
    };
  }

  const $ = cheerio.load(html);

  $("a").each((_, element) => {
    const href = $(element).attr("href");
    if (!href) {
      return;
    }

    const parsedUrl = new URL(href, location);
    if (parsedUrl.toString().startsWith(startUrl)) {
      const link = parsedUrl.pathname;
      if (
        !link.includes("#") &&
        !options.exclude.some((exclude) => shouldExcludeLink(exclude, link))
      ) {
        links.push(link);
      }
    }
  });

  links = [...new Set(links)];

  let text = html;
  if (options.toMarkdown) {
    text = turndownService.turndown(html);
  }

  return {
    path,
    text,
    links,
  };
}

function shouldExcludeLink(exclude: string, link: string) {
  const parts = link.replace(/\/$/, "").split("/");
  let name = (parts[parts.length - 1] || "").toLowerCase();
  exclude = exclude.toLowerCase();
  if (/\.[^.]+$/.test(exclude)) {
    return exclude == name;
  } else {
    return exclude == name.replace(/\.[^.]+$/, "");
  }
}

function matchLink(path: string, link: string) {
  return path === link || path === link.replace(/\/index\.(html|htm)$/, "/");
}
