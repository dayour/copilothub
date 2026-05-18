import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';

type Module = {
  to: string;
  icon: string;
  title: string;
  desc: string;
};

const MODULES: Module[] = [
  {to: '/docs/getting-started', icon: 'copilot-hub-create.svg', title: 'Getting started', desc: 'Install prerequisites, clone the repository, and run the workbench locally.'},
  {to: '/docs/architecture', icon: 'copilot-hub-hub.svg', title: 'Architecture', desc: 'How the Tauri shell, React frontend, Rust core, and sidecar fit together.'},
  {to: '/agents/overview', icon: 'copilot-hub-agents.svg', title: 'Agents', desc: 'The @mention routes that target browser, terminal, VS Code, and runbook tools.'},
  {to: '/workflows/overview', icon: 'copilot-hub-automations.svg', title: 'Workflows', desc: 'YAML-defined runbooks parsed and executed inside the workbench.'},
  {to: '/integrations/overview', icon: 'copilot-hub-integrations.svg', title: 'Integrations', desc: 'MCP servers, browser sidecar, VS Code web, terminal, Entra, Key Vault.'},
  {to: '/wiki/concepts', icon: 'copilot-hub-knowledge.svg', title: 'Wiki', desc: 'Concepts, terminology, and FAQs that explain how the workbench is wired.'},
  {to: '/docs/security', icon: 'copilot-hub-security.svg', title: 'Security', desc: 'Tauri capabilities, sidecar boundary, identity, and secret handling.'},
  {to: 'https://github.com/dayour/copilothub/discussions', icon: 'copilot-hub-chat.svg', title: 'Forum', desc: 'GitHub Discussions for questions, proposals, and design notes.'},
];

function Hero() {
  const glow = useBaseUrl('img/logo-glow.svg');
  return (
    <header
      className="hero-banner"
      style={{['--hero-glow-url' as string]: `url(${glow})`}}>
      <h1 className="hero-banner__title">An agent workbench.</h1>
      <p className="hero-banner__tagline">
        CopilotHub is a Tauri desktop application that unifies browser navigation,
        IDE workflows, terminal execution, chat, and agent-driven browser control
        inside a single native window.
      </p>
      <p className="hero-banner__meta">Tauri 2 · React 19 · Rust · WebView2</p>
      <div className="hero-banner__actions">
        <Link className="cta-primary" to="/docs/getting-started">
          Get started
        </Link>
        <Link
          className="cta-secondary"
          to="https://github.com/dayour/copilothub">
          View on GitHub
        </Link>
      </div>
    </header>
  );
}

function ModuleGrid() {
  return (
    <section className="module-grid" aria-label="Catalog">
      {MODULES.map((m) => {
        const external = m.to.startsWith('http');
        const iconSrc = useBaseUrl(`img/${m.icon}`);
        return (
          <Link key={m.to} className="module-card" to={m.to}>
            <img
              className="module-card__icon"
              src={iconSrc}
              alt=""
              aria-hidden
            />
            <h3 className="module-card__title">{m.title}{external ? ' ↗' : ''}</h3>
            <p className="module-card__desc">{m.desc}</p>
          </Link>
        );
      })}
    </section>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={siteConfig.title}
      description="CopilotHub is a workbench for browsing, building, and orchestrating Copilot surfaces inside a single native desktop application.">
      <Hero />
      <main>
        <ModuleGrid />
      </main>
    </Layout>
  );
}
