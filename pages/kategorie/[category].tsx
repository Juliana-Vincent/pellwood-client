import Page, { SITE_URL } from "@/layout/Page";
import SubMenu from "@/components/SubMenu/index";
import Article from "@/components/ArticleShort/index";
import localize from "@/data/localize";
import { fetchAPI } from "@/lib/strapi";
import { Article as ArticleType } from "@/types/article";
import type { Archive } from "@/types/archive";
import type { GetStaticPropsContext } from "next";
import { useTranslation } from "@/hooks/useTranslation";
import { buildBreadcrumbJsonLd } from "@/functions/breadcrumbJsonLd";

export async function getStaticPaths() {
  return { paths: [], fallback: "blocking" };
}

export async function getStaticProps({
  params,
  locale,
}: GetStaticPropsContext<{ category: string }>) {
  const { lang } = localize(locale);
  const strapiLocale = lang === "cz" ? "cs" : lang;

  // 1. Fetch the specific archive category by its slug
  const archiveRes = await fetchAPI<Archive[]>("archives", {
    locale: strapiLocale,
    filters: {
      slug: {
        $eq: params?.category,
      },
    },
  });

  const archiveData = archiveRes.data || [];

  if (!archiveData.length) {
    return {
      notFound: true,
    };
  }

  // 2. Fetch all articles belonging to this archive category
  const articlesRes = await fetchAPI<ArticleType[]>("articles", {
    locale: strapiLocale,
    filters: {
      category: {
        documentId: {
          $eq: archiveData[0].documentId,
        },
      },
    },
    populate: { image: true },
  });

  const articles = articlesRes.data || [];

  return {
    props: {
      articles,
      archives: archiveData[0],
      lang,
    },
    revalidate: 60,
  };
}

interface BlogShortProps {
  articles: ArticleType[];
  archives: Archive;
  lang: string;
}

const BlogShort = ({ articles, archives, lang }: BlogShortProps) => {
  const { t } = useTranslation();
  const localePrefix = lang === "en" ? "/en" : "";
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: t("homepage"), url: `${SITE_URL}${localePrefix}` },
    { name: archives.title },
  ]);

  return (
    <Page id="blog" title={archives.title}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <section className="head_category head_category_articles">
        <div className="uk-container uk-container-expand">
          <SubMenu data={articles} articles />
        </div>
      </section>

      <section className="category grey">
        <div className="uk-container uk-container-expand">
          <div
            className="uk-grid uk-child-width-1-1 uk-child-width-1-2@s"
            uk-grid=""
            uk-scrollspy="target: > div > a; cls: uk-animation-slide-top-small; delay: 500"
            suppressHydrationWarning
          >
            {(articles || []).map((item, index) => (
              <Article key={index} data={item} />
            ))}
          </div>
        </div>
      </section>
    </Page>
  );
};

export default BlogShort;
