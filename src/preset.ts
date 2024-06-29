const PRESET_LIST: Preset[] = [
  {
    name: "github-repo",
    test: "github.com/([^/]+)/([^/]+)/tree/([^/]+)",
    options: {
      exclude: ["changelog", "changes", "license"],
    },
  },
  {
    name: "github-wiki",
    test: "github.com/([^/]+)/([^/]+)/wiki",
    options: {
      exclude: ["_history"],
      extract: "#wiki-body",
    },
  },
];

export interface Preset {
  name: string;
  test: string;
  options: {
    exclude?: string[];
    extract?: string;
    maxConnections?: number;
    headers?: Record<string, string>;
  };
}

export default PRESET_LIST;
