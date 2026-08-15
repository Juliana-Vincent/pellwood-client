import { fetchAPI, urlFor } from "@/lib/strapi";
import BlockContent from "@/components/BlockContent";
import Page, { SITE_URL } from "@/layout/Page";
import localize from "@/data/localize";
import { Article as ArticleType } from "@/types/article";
import type { GetStaticPropsContext } from "next";
import { useTranslation } from "@/hooks/useTranslation";
import { buildBreadcrumbJsonLd } from "@/functions/breadcrumbJsonLd";

export async function getStaticProps({
  params,
  locale,
}: GetStaticPropsContext<{ category: string; url: string }>) {
  const { lang } = localize(locale);
  const strapiLocale = lang === "cz" ? "cs" : lang;

  // Fetch the article matching the url slug
  const articlesRes = await fetchAPI<ArticleType[]>("articles", {
    locale: strapiLocale,
    filters: {
      slug: {
        $eq: params?.url,
      },
    },
    populate: {
      category: true,
      chapters: {
        populate: {
          image: true,
        },
      },
    },
  });

  const articles = articlesRes.data || [];

  if (!articles.length) {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      chapters: articles[0],
    },
    revalidate: 60,
  };
}

export async function getStaticPaths() {
  return { paths: [], fallback: "blocking" };
}

interface ArticleProps {
  chapters: ArticleType;
}

const Article = ({ chapters }: ArticleProps) => {
  const { t, lang } = useTranslation();
  const localePrefix = lang === "en" ? "/en" : "";
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: t("homepage"), url: `${SITE_URL}${localePrefix}` },
    ...(chapters.category
      ? [
          {
            name: chapters.category.title,
            url: `${SITE_URL}${localePrefix}/kategorie/${chapters.category.slug}`,
          },
        ]
      : []),
    { name: chapters.title },
  ]);

  return (
    <Page
      id="blog"
      title={chapters.title}
      image={
        chapters?.chapters?.[0]?.image
          ? urlFor(chapters.chapters[0].image).url()
          : undefined
      }
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {chapters?.chapters?.map((item, index) => (
        <section key={index} className="full">
          <div
            className="uk-grid uk-grid-large uk-child-width-1-1 uk-child-width-1-2@m"
            uk-grid=""
            uk-height-match="target: > div > div"
            suppressHydrationWarning
          >
            <div suppressHydrationWarning>
              <div className="article_img_wrap" suppressHydrationWarning>
                <div>
                  <img
                    src={urlFor(item.image).width(1200).url()}
                    srcSet={`${urlFor(item.image).width(400).url()} 400w,
                                    ${urlFor(item.image).width(640).url()} 640w,
                                    ${urlFor(item.image).width(900).url()} 900w,
                                    ${urlFor(item.image).width(1000).url()} 1000w`}
                    sizes="(min-width: 960px) 50vw, 100vw"
                    loading="lazy"
                    alt={item.title}
                  />
                </div>
              </div>
            </div>
            <div suppressHydrationWarning>
              <div className="content_wrap grey" suppressHydrationWarning>
                <div>
                  <div className="content">
                    {!index && <h1 className="head_1">{item.title}</h1>}
                    {!!index && <h2 className="head_1">{item.title}</h2>}
                    <BlockContent blocks={item.text} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      ))}
    </Page>
  );
};

export default Article;
