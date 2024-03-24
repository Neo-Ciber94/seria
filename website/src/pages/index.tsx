import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";
import LiveExample from "../components/LiveExample";

function Hero() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <section className="pattern-cross pattern-indigo-500 pattern-bg-indigo-600 pattern-size-8 pattern-opacity-100 py-10 sm:pt-20 px-4 h-full flex-grow flex flex-col gap-2">
      <div>
        <h1 className="text-white text-center text-3xl lg:text-5xl">
          {siteConfig.title}
        </h1>
        <h3 className="text-white text-center text-xl lg:text-3xl">
          {siteConfig.tagline}
        </h3>
      </div>
      <div className="mt-10 text-center">
        <Link
          className="bg-black py-2 px-10 lg:px-32 rounded-lg !text-white font-bold text-base lg:text-xl hover:bg-neutral-800"
          to="/docs/getting-started/installation"
          style={{
            textDecoration: "none",
          }}
        >
          Getting Started
        </Link>
      </div>

      <div className="text-white bg-black/30 py-8 px-2 rounded-lg mt-10 mb-2 mx-auto xl:max-w-7xl w-full">
        <LiveExample />
      </div>
    </section>
  );
}

export default function Home() {
  const { siteConfig } = useDocusaurusContext();

  return (
    <Layout
      title={"Serialization beyond JSON"}
      description={siteConfig.tagline}
    >
      <Hero />
    </Layout>
  );
}
