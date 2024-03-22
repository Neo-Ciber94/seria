import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";
import Heading from "@theme/Heading";
import LiveExample from "../components/LiveExample";

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className="hero hero--primary py-36 text-center relative overflow-hidden md:py-16">
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className="flex items-center justify-center">
          <Link
            className="button button--secondary button--lg"
            to="/docs/intro"
          >
            Getting Started
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home() {
  const { siteConfig } = useDocusaurusContext();

  return (
    <Layout
      title={"Serialization beyond JSON"}
      description={siteConfig.tagline}
    >
      <HomepageHeader />
      <main>
        <LiveExample />
      </main>
    </Layout>
  );
}
