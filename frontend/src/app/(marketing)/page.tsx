import { JsonLd } from "@/components/sections/json-ld";
import { LandingPage } from "@/components/sections/landing-page";
import { SITE_URL, marketingMetadata } from "@/lib/site";

export const metadata = marketingMetadata("/");

export default function Home() {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            { "@type": "Organization", name: "Donc", url: SITE_URL, logo: `${SITE_URL}/icon.svg` },
            { "@type": "WebSite", name: "Donc", url: SITE_URL, inLanguage: "pt-BR" },
          ],
        }}
      />
      <LandingPage />
    </>
  );
}
