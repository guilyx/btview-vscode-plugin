import path from 'node:path';
import { defineConfig, type DefaultTheme } from 'vitepress';

const REPO = 'https://github.com/guilyx/btview-vscode-plugin';
const BASE = '/btview-vscode-plugin/';

/**
 * Links in docs/ that point outside the docs tree (../CHANGELOG.md, ../../webview/…)
 * work on GitHub but not on the site. Send CHANGELOG to the generated /changelog page
 * and everything else to the file on GitHub.
 */
function rewriteRepoLink(href: string, relativePath: string): string {
  if (/^(?:[a-z]+:|#|\/)/i.test(href)) {
    return href;
  }
  const [target, hash] = href.split('#');
  const resolved = path.posix.normalize(
    path.posix.join('docs', path.posix.dirname(relativePath), target),
  );
  if (resolved.startsWith('docs/')) {
    return href;
  }
  if (resolved === 'CHANGELOG.md') {
    const rel =
      path.posix.relative(path.posix.dirname(relativePath), 'changelog.md') || 'changelog.md';
    return (rel.startsWith('.') ? rel : `./${rel}`) + (hash ? `#${hash}` : '');
  }
  return `${REPO}/blob/main/${resolved}${hash ? `#${hash}` : ''}`;
}

const guide: DefaultTheme.SidebarItem[] = [
  {
    text: 'Guide',
    items: [
      { text: 'Installation', link: '/getting-started/INSTALLATION' },
      { text: 'User guide', link: '/getting-started/USER_GUIDE' },
      { text: 'Configuration', link: '/getting-started/CONFIGURATION' },
      { text: 'Try it live', link: '/try' },
    ],
  },
  {
    text: 'Tutorials',
    items: [
      { text: 'Your first tree in 5 minutes', link: '/tutorials/first-tree' },
      { text: 'Ports & node models', link: '/tutorials/ports-and-models' },
      { text: 'Subtrees & includes', link: '/tutorials/subtrees-and-includes' },
      { text: 'Validate, simulate & verify', link: '/tutorials/validate-simulate-verify' },
      { text: 'Migrating v3 → v4', link: '/tutorials/migrate-v3-v4' },
    ],
  },
  {
    text: 'Reference',
    items: [
      { text: 'Commands & keybindings', link: '/reference/commands' },
      { text: 'Settings', link: '/reference/settings' },
      { text: 'XML format support', link: '/reference/xml-format' },
      { text: 'Protocol & architecture', link: '/reference/protocol' },
    ],
  },
];

const development: DefaultTheme.SidebarItem[] = [
  {
    text: 'Development',
    items: [
      { text: 'Architecture', link: '/development/ARCHITECTURE' },
      { text: 'Webview', link: '/development/WEBVIEW' },
      { text: 'Development', link: '/development/DEVELOPMENT' },
      { text: 'Branching', link: '/development/BRANCHING' },
      { text: 'Docs & media', link: '/development/MEDIA' },
    ],
  },
  {
    text: 'Release',
    items: [
      { text: 'Release process', link: '/release/RELEASE' },
      { text: 'Distribution', link: '/release/DISTRIBUTION' },
    ],
  },
];

const roadmap: DefaultTheme.SidebarItem[] = [
  {
    text: 'Roadmap',
    items: [
      { text: 'Roadmap', link: '/ROADMAP' },
      { text: 'Editor roadmap', link: '/planning/EDITOR_ROADMAP' },
      { text: 'Command surfaces', link: '/planning/COMMAND_SURFACES' },
      { text: 'Groot parity', link: '/planning/GROOT_PARITY' },
      { text: 'AI & agents', link: '/planning/AI_AGENT_INTEGRATION' },
      { text: 'Changelog', link: '/changelog' },
    ],
  },
];

export default defineConfig({
  title: 'BTView',
  description:
    'Visual editor, simulator and verifier for BehaviorTree.CPP v3 & v4 XML — in VS Code and Cursor.',
  lang: 'en-US',
  base: BASE,
  cleanUrls: true,
  srcExclude: ['README.md'],
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: `${BASE}logo.svg` }],
    ['meta', { name: 'theme-color', content: '#4a9eff' }],
    ['meta', { property: 'og:title', content: 'BTView — Behavior Trees, visually' }],
    [
      'meta',
      {
        property: 'og:description',
        content: 'BehaviorTree.CPP v3 & v4 graph editor for VS Code & Cursor.',
      },
    ],
    ['meta', { property: 'og:image', content: `${BASE}media/poster.png` }],
  ],
  // The demo is a separately built app copied into public/ (see scripts/docs/prepare.mjs).
  ignoreDeadLinks: [/^\/demo\//, /\/demo\/index$/],
  markdown: {
    config(md) {
      const previous = md.renderer.rules.link_open;
      md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
        const token = tokens[idx];
        const href = token.attrGet('href');
        if (href && env?.relativePath) {
          const next = rewriteRepoLink(href, env.relativePath as string);
          if (next !== href) {
            token.attrSet('href', next);
          }
        }
        return previous
          ? previous(tokens, idx, options, env, self)
          : self.renderToken(tokens, idx, options);
      };
    },
  },
  themeConfig: {
    logo: '/logo.svg',
    nav: [
      { text: 'Guide', link: '/getting-started/INSTALLATION', activeMatch: '/getting-started/' },
      { text: 'Tutorials', link: '/tutorials/first-tree', activeMatch: '/tutorials/' },
      { text: 'Reference', link: '/reference/commands', activeMatch: '/reference/' },
      { text: 'Try it live', link: '/try' },
      {
        text: 'More',
        items: [
          { text: 'Development', link: '/development/ARCHITECTURE' },
          { text: 'Roadmap', link: '/ROADMAP' },
          { text: 'Changelog', link: '/changelog' },
        ],
      },
    ],
    sidebar: {
      '/getting-started/': guide,
      '/tutorials/': guide,
      '/reference/': guide,
      '/try': guide,
      '/development/': development,
      '/release/': development,
      '/ROADMAP': roadmap,
      '/planning/': roadmap,
      '/changelog': roadmap,
    },
    socialLinks: [{ icon: 'github', link: REPO }],
    search: { provider: 'local' },
    editLink: {
      pattern: `${REPO}/edit/devel/docs/:path`,
      text: 'Edit this page on GitHub',
    },
    outline: { level: [2, 3] },
    footer: {
      message: 'Released under the Apache-2.0 License.',
      copyright: 'BTView · rangonomics.btview',
    },
  },
});
