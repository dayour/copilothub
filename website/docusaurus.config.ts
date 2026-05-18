import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'CopilotHub',
  tagline: 'An agent workbench.',
  favicon: 'img/favicon.ico',

  future: {v4: true},

  url: 'https://dayour.github.io',
  baseUrl: '/copilothub/',
  organizationName: 'dayour',
  projectName: 'copilothub',
  trailingSlash: false,

  onBrokenLinks: 'warn',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  i18n: {defaultLocale: 'en', locales: ['en']},

  presets: [
    [
      'classic',
      {
        docs: {
          path: 'docs',
          routeBasePath: 'docs',
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/dayour/copilothub/tree/master/website/',
        },
        blog: false,
        theme: {customCss: './src/css/custom.css'},
      } satisfies Preset.Options,
    ],
  ],

  plugins: [
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'wiki',
        path: 'wiki',
        routeBasePath: 'wiki',
        sidebarPath: './sidebars.ts',
        editUrl: 'https://github.com/dayour/copilothub/tree/master/website/',
      },
    ],
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'agents',
        path: 'agents',
        routeBasePath: 'agents',
        sidebarPath: './sidebars.ts',
        editUrl: 'https://github.com/dayour/copilothub/tree/master/website/',
      },
    ],
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'workflows',
        path: 'workflows',
        routeBasePath: 'workflows',
        sidebarPath: './sidebars.ts',
        editUrl: 'https://github.com/dayour/copilothub/tree/master/website/',
      },
    ],
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'integrations',
        path: 'integrations',
        routeBasePath: 'integrations',
        sidebarPath: './sidebars.ts',
        editUrl: 'https://github.com/dayour/copilothub/tree/master/website/',
      },
    ],
  ],

  themeConfig: {
    image: 'img/og-image.png',
    metadata: [
      {name: 'description', content: 'CopilotHub is a workbench for browsing, building, and orchestrating Copilot surfaces inside a single native desktop application.'},
      {name: 'theme-color', content: '#0B1117'},
    ],
    colorMode: {
      defaultMode: 'dark',
      disableSwitch: false,
      respectPrefersColorScheme: false,
    },
    navbar: {
      title: 'CopilotHub',
      logo: {
        alt: 'CopilotHub',
        src: 'img/logo.svg',
        srcDark: 'img/logo.svg',
      },
      items: [
        {to: '/docs/getting-started', label: 'Docs', position: 'left'},
        {to: '/wiki/concepts', label: 'Wiki', position: 'left'},
        {to: '/agents/overview', label: 'Agents', position: 'left'},
        {to: '/workflows/overview', label: 'Workflows', position: 'left'},
        {to: '/integrations/overview', label: 'Integrations', position: 'left'},
        {
          href: 'https://github.com/dayour/copilothub/discussions',
          label: 'Forum',
          position: 'left',
        },
        {
          href: 'https://github.com/dayour/copilothub/releases',
          label: 'Releases',
          position: 'right',
        },
        {
          href: 'https://github.com/dayour/copilothub',
          'aria-label': 'GitHub repository',
          className: 'header-github-link',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      logo: {
        alt: 'CopilotHub',
        src: 'img/lockup-light.svg',
        width: 160,
      },
      links: [
        {
          title: 'Reference',
          items: [
            {label: 'Getting started', to: '/docs/getting-started'},
            {label: 'Architecture', to: '/docs/architecture'},
            {label: 'Security', to: '/docs/security'},
            {label: 'Releases', to: '/docs/releases'},
          ],
        },
        {
          title: 'Catalogs',
          items: [
            {label: 'Agents', to: '/agents/overview'},
            {label: 'Workflows', to: '/workflows/overview'},
            {label: 'Integrations', to: '/integrations/overview'},
          ],
        },
        {
          title: 'Community',
          items: [
            {label: 'Forum (Discussions)', href: 'https://github.com/dayour/copilothub/discussions'},
            {label: 'Issues', href: 'https://github.com/dayour/copilothub/issues'},
            {label: 'Source', href: 'https://github.com/dayour/copilothub'},
          ],
        },
      ],
      copyright: `© ${new Date().getFullYear()} CopilotHub. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.vsDark,
      darkTheme: prismThemes.vsDark,
      additionalLanguages: ['rust', 'powershell', 'bash', 'json', 'yaml', 'toml'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
