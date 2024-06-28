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
  startUrl                    The URL to start crawling from. [required]
  outPath                     The output path. If omitted, output to stdout

Options:
  --max-connections <number>  Maximum concurrent connections (default: 5)
  -e, --exclude <names>       Comma-separated list of path names to exclude
  --no-markdown               Don't convert crawled html to markdown
  --no-log                    Disable logging
  -V, --version               output the version number
  -h, --help                  display help for command
```

**Output knowledge.json to stdout**
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

**Output to knowledge.json**
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

# License

The project is under the MIT License, Refer to the [LICENSE](https://github.com/sigoden/rag-crawler/blob/main/LICENSE) file for detailed information.