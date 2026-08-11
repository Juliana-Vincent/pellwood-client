import { fetchAPI, urlFor } from "@/lib/strapi";
import BlockContent from "@/components/BlockContent";
import Page from "@/layout/Page";
import localize from "@/data/localize";
import { Article as ArticleType } from "@/src/types/article";

export async function getStaticProps({ params, locale }: any) {
  const { lang } = localize(locale);
  const strapiLocale = lang === "cz" ? "cs" : lang;

  // Fetch the article matching the url slug
  const articlesRes = await fetchAPI("articles", {
    locale: strapiLocale,
    filters: {
      slug: {
        $eq: params.url,
      },
    },
    populate: {
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
  return { paths: [], fallback: 'blocking' }
}


interface ArticleProps {
  chapters: ArticleType;
}

const Article = ({ chapters }: ArticleProps) => {
  return (
    <Page
      id="blog"
      title={chapters.title}
      image={chapters?.chapters?.[0]?.image ? urlFor(chapters.chapters[0].image).url() : undefined}
    >
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
                    className="uk-img"
                    uk-img=""
                    data-src={urlFor(item.image)
                      .width(1200)
                      .format("webp")
                      .url()}
                    data-srcset={`${urlFor(item.image).width(400).format("webp").url()} 400w,
                                    ${urlFor(item.image).width(640).format("webp").url()} 640w,
                                    ${urlFor(item.image).width(900).format("webp").url()} 900w,
                                    ${urlFor(item.image).width(500).format("webp").url()} 1000w,
                                    ${urlFor(item.image).width(1000).format("webp").url()} 2000w`}
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
