import { fetchAPI, urlFor } from "@/lib/strapi";
import Link from "next/link";
import BlockContent from "@/components/BlockContent";
import localize from "@/data/localize";
import Page from "@/layout/Page";
import Article from "@/components/ArticleShort";
import ShortBlock from "@/components/ShortBlock";
import shuffle from "@/helpers/shuffle";
import type { GetStaticPropsContext } from "next";

import { Article as ArticleType } from "@/types/article";
import type { Product } from "@/types/product";
import type { Homepage as HomepageData } from "@/types/homepage";

export async function getStaticProps({ locale }: GetStaticPropsContext) {
  const { lang, currency } = localize(locale);
  const strapiLocale = lang === "cz" ? "cs" : lang;

  let homepageData: Partial<HomepageData> = {};
  let articlesData: ArticleType[] = [];
  let cmsReachable = true;

  try {
    const homepageRes = await fetchAPI<HomepageData>("homepage", {
      locale: strapiLocale,
      populate: {
        image: true,
        button: true,
        banner: { populate: { image: true } },
        recommendedProducts: { populate: { image: true } },
      },
    });
    homepageData = homepageRes.data || {};
  } catch (err) {
    cmsReachable = false;
    console.error("Strapi unreachable (homepage):", (err as Error).message);
  }

  try {
    const articlesRes = await fetchAPI<ArticleType[]>("articles", {
      locale: strapiLocale,
      populate: { category: true, image: true },
    });
    articlesData = articlesRes.data || [];
  } catch (err) {
    cmsReachable = false;
    console.error("Strapi unreachable (articles):", (err as Error).message);
  }

  const articleFirst = shuffle(
    articlesData.filter((item) => item?.category?.slug === "sluzby"), 0
  );
  const articleSeccond = shuffle(
    articlesData.filter((item) => item?.category?.slug === "o-nas"), 1
  );

  return {
    props: {
      homepage: homepageData,
      carts: homepageData.recommendedProducts || [],
      articleFirst,
      articleSeccond,
      lang,
      currency,
    },
    revalidate: cmsReachable ? 60 : 10,
  };
}

interface HomepageProps {
  homepage: Partial<HomepageData>;
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
            className="blanded-mix uk-width-1-1 uk-height-1-1 uk-background-cover"
            style={
              homepage?.image
                ? { backgroundImage: `url(${urlFor(homepage.image).width(2400).url()})` }
                : undefined
            }
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
                      data-src={
                        homepage?.banner?.image
                          ? urlFor(homepage.banner.image).width(2000).url()
                          : ""
                      }
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

            {articleFirst[0] ? <Article data={articleFirst[0]} /> : null}
            {articleSeccond[0] ? <Article data={articleSeccond[0]} /> : null}
          </div>
        </div>
      </section>
    </Page>
  );
};

export default Homepage;
