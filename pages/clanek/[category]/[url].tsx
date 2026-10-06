import { fetchAPI, urlFor } from "@/lib/strapi";
import { firstText } from "@/helpers/seoText";
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
      localizations: {
        populate: {
          category: true,
        },
      },
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

  const article = articles[0];

  const expectedCategory = article.category?.slug || "archive";
  if (params?.category !== expectedCategory) {
    const prefix = locale === "en" ? "/en" : "";
    return {
      redirect: {
        destination: `${prefix}/clanek/${expectedCategory}/${article.slug}`,
        locale: false,
        permanent: true,
      },
    };
  }

  const localizations = ((article as any).localizations || []) as Array<{
    locale: string;
    slug: string;
    category?: { slug: string };
  }>;
  const findLoc = (code: string) => localizations.find((l) => l.locale === code) || null;

  const csEntry = lang === "cz" ? article : findLoc("cs");
  const enEntry = lang === "en" ? article : findLoc("en");

  const pathFor = (entry: any) =>
    entry ? `/clanek/${entry.category?.slug || "archive"}/${entry.slug}` : null;

  return {
    props: {
      chapters: article,
      alternates: {
        cs: pathFor(csEntry),
        en: pathFor(enEntry),
      },
    },
    revalidate: 60,
  };
}

export async function getStaticPaths() {
  return { paths: [], fallback: "blocking" };
}

interface ArticleProps {
  chapters: ArticleType;
    alternates: { cs: string | null; en: string | null };

}

const Article = ({ chapters, alternates }: ArticleProps) => {
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
      title={chapters.SEOtitle || chapters.title}
      description={firstText(chapters.SEOdescription, chapters.chapters?.[0]?.text)}
      alternates={alternates}
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
                    {!index && <h1 className="head_1">{chapters.title}</h1>}
                    {(!!index || item.title !== chapters.title) && (
                      <h2 className="head_1">{item.title}</h2>
                    )}
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
