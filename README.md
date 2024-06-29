# rag-crawler

[![CI](https://github.com/sigoden/rag-crawler/actions/workflows/ci.yaml/badge.svg)](https://github.com/sigoden/rag-crawler/actions/workflows/ci.yaml)
[![NPM Version](https://img.shields.io/npm/v/rag-crawler)](https://www.npmjs.com/package/rag-crawler)

Crawl a website to generate knowledge file for RAG

## Installation

```bash
npm i -g rag-crawler
yarn add --global rag-crawler
```

## Usage

```
Usage: rag-crawler [options] <startUrl> [outPath]

Arguments:
  startUrl                     The URL to start crawling from. [required]
  outPath                      The output path. If omitted, output to stdout

Options:
  --preset <value>             Use predefined crawl rules (default: "auto")
  -c, --max-connections <int>  Maximum concurrent connections to crawl
  -e, --exclude <values>       Comma-separated list of path names to exclude
  --extract <selector>         Extract specific content using a CSS selector
  --no-markdown                Don't convert crawled HTML to Markdown
  --no-log                     Disable logging
  -V, --version                output the version number
  -h, --help                   display help for command
```

**Output to stdout**
```
$ rag-crawler https://sigoden.github.io/mynotes/languages/ 
[
  {
    "path": "https://sigoden.github.io/mynotes/languages/",
    "text": "# Languages ..."
  },
  {
    "path": "https://sigoden.github.io/mynotes/languages/shell.html",
    "text": "# Shell ..."
  }
  ...
]
```

**Output to JSON file**
```
$ rag-crawler https://sigoden.github.io/mynotes/languages/ knowledge.json
```

**Output to separates files**

```
$ rag-crawler https://sigoden.github.io/mynotes/languages/ pages/
...
$ tree pages
pages
└── mynotes
    ├── languages
    │   ├── markdown.md
    │   ├── nodejs.md
    │   ├── rust.md
    │   └── shell.md
    └── languages.md
```

**Crawler markdown files from github repo**

```
$ rag-crawler https://github.com/sigoden/mynotes/tree/main/src/languages/ knowledge.json
```

> Many documentation sites host their source Markdown files on GitHub. The crawler has been optimized to crawl these files directly from GitHub.

## Preset

A preset consists of predefined crawl rules. You can review the predefined presets at [./src/preset.ts](./src/preset.ts).

### Why Use Presets?

Let's use GitHub Wiki as an example. To enhance scraping quality, we need to configure both `--exclude` and `--extract`.

```
$ rag-crawler https://github.com/sigoden/aichat/wiki wiki.json --exclude _history --extract '#wiki-body'
```

Since all GitHub Wiki websites share these crawl options, we can define a preset for reusability.

```js
{
  name: "github-wiki",
  test: "github.com/([^/]+)/([^/]+)/wiki",
  options: {
    exclude: ["_history"],
    extract: "#wiki-body",
  },
}
```

This allows for a simplified command:

```
$ rag-crawler https://github.com/sigoden/aichat/wiki wiki.json --preset github-wiki
// or
$ rag-crawler https://github.com/sigoden/aichat/wiki wiki.json --preset auto
// or
$ rag-crawler https://github.com/sigoden/aichat/wiki wiki.json # The default value of '--preset' is 'auto'
```

> When the preset is set to `auto`, rag-crawler will automatically determine the appropriate preset. It does this by checking if the `startUrl` matches the `test` regex.

### Custom Presets

You can add custom presets by editing the `$HOME/.rag-crawler.json` file:

```json
[
  {
    "name": "github-wiki",
    "test": "github.com/([^/]+)/([^/]+)/wiki",
    "options": {
      "exclude": ["_history"],
      "extract": "#wiki-body"
    }
  },
  ...
]
```

# License

The project is under the MIT License, Refer to the [LICENSE](https://github.com/sigoden/rag-crawler/blob/main/LICENSE) file for detailed information.