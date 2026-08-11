import { fetchAPI, urlFor } from "@/lib/strapi";
import Link from "next/link";
import BlockContent from "@/components/BlockContent";
import localize from "@/data/localize";
import Page from "@/layout/Page";
import Article from "@/components/ArticleShort";
import ShortBlock from "@/components/ShortBlock";
import shuffle from "@/helpers/shuffle";

import { Article as ArticleType } from "@/src/types/article";
import type { Product } from "@/src/types/product";

export async function getStaticProps({ locale }: { locale: string }) {
  const { lang, currency } = localize(locale);
  const strapiLocale = lang === "cz" ? "cs" : lang;

  // Fetch Homepage
  const homepageRes = await fetchAPI("homepage", {
    locale: strapiLocale,
    populate: {
      image: true,
      button: true,
      banner: { populate: { image: true } },
      recommendedProducts: { populate: { image: true } },
    },
  });

  const homepageData = homepageRes.data || {};
  const carts = homepageData.recommendedProducts || [];

  // Fetch Articles
  const articlesRes = await fetchAPI("articles", {
    locale: strapiLocale,
    populate: {
      category: true,
      image: true,
    },
  });
  const articlesData = articlesRes.data || [];

  const articlesFilteredFirst = articlesData.filter(
    (item: any) => item?.category?.slug === "sluzby",
  );
  const articlesFilteredSeccond = articlesData.filter(
    (item: any) => item?.category?.slug === "o-nas",
  );

  const articleFirst = shuffle(articlesFilteredFirst, 0);
  const articleSeccond = shuffle(articlesFilteredSeccond, 1);

  return {
    props: {
      homepage: homepageData,
      carts,
      articleFirst,
      articleSeccond,
      lang,
      currency,
    },
    revalidate: 60,
  };
}

interface HomepageProps {
  homepage: any;
  carts: Product[];
  articleFirst: ArticleType[];
  articleSeccond: ArticleType[];
  lang: string;
  currency: string;
}

const Homepage = ({
  homepage,
  carts,
  articleFirst,
  articleSeccond,
  lang,
  currency,
}: HomepageProps) => {
  return (
    <Page
      id="homepage"
      title={homepage?.title}
      image={homepage?.image ? urlFor(homepage.image).url() : ""}
    >
      <section className="homepage_slide">
        <div className="uk-inline uk-cover-container uk-height-1-1 uk-width-1-1">
          <div
            className="blanded-mix uk-width-1-1 uk-height-1-1 uk-background-cover uk-img"
            data-src={homepage?.image ? urlFor(homepage.image).width(2400).format("webp").url() : ""}
            data-srcset={homepage?.image ? `${urlFor(homepage.image).width(400).format("webp").url()} 400w,
                      ${urlFor(homepage.image).width(640).format("webp").url()} 640w,
                      ${urlFor(homepage.image).width(900).format("webp").url()} 900w,
                      ${urlFor(homepage.image).width(1000).format("webp").url()} 1000w,
                      ${urlFor(homepage.image).width(1600).format("webp").url()} 1600w,
                      ${urlFor(homepage.image).width(2000).format("webp").url()} 2000w` : ""}
            uk-img=""
          ></div>
          <div className="overlay uk-position-center uk-flex uk-flex-center uk-flex-middle">
            <div>
              <h1
                className="contrast"
                uk-scrollspy="cls: uk-animation-slide-top-small; delay: 500"
                suppressHydrationWarning
              >
                {homepage?.title}
              </h1>
              <Link
                href={homepage?.button?.url || "/"}
                className="tm-button tm-bare-button tm-contrast"
                uk-scrollspy="cls: uk-animation-slide-top; delay: 500"
                suppressHydrationWarning
              >
                {homepage?.button?.title || ""}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="description uk-flex uk-flex-middle">
        <div className="uk-container uk-container-expand">
          <div
            uk-scrollspy="cls: uk-animation-slide-top-small; delay: 500"
            suppressHydrationWarning
          >
            {homepage?.content && <BlockContent blocks={homepage.content} />}
          </div>
        </div>
      </section>

      {carts?.length > 0 && (
        <ShortBlock data={carts} lang={lang} currency={currency} />
      )}

      <section className="section_base">
        <div className="uk-container uk-container-expand">
          <div
            className="uk-grid"
            uk-grid=""
            uk-scrollspy="target: > div > a; cls: uk-animation-slide-top-small; delay: 500"
            suppressHydrationWarning
          >
            <div className="uk-width-1-1" suppressHydrationWarning>
              <Link
                href={homepage?.banner?.url || "/"}
                className="big_category big_grid"
                suppressHydrationWarning
              >
                <div className="category_wrap">
                  <div className="uk-inline uk-height-1-1 uk-width-1-1">
                    <div
                      className="blanded-mix uk-width-1-1 uk-height-1-1 uk-background-cover uk-img"
                      data-src={homepage?.banner?.image ? urlFor(homepage.banner.image).width(2000).url() : ""}
                      uk-img=""
                    ></div>
                    <div className="overlay uk-position-center uk-flex uk-flex-center uk-flex-middle">
                      <h2 className="category_short_name">
                        {homepage?.banner?.title || ""}
                      </h2>
                    </div>
                  </div>
                </div>
              </Link>
            </div>

            {articleFirst[0] ? (
              <Article data={articleFirst[0]} />
            ) : null}
            {articleSeccond[0] ? (
              <Article data={articleSeccond[0]} />
            ) : null}
          </div>
        </div>
      </section>
    </Page>
  );
};

export default Homepage;
