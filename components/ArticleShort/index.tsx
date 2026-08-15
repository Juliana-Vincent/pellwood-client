import { useRouter } from "next/router";
import Link from "next/link";
import { urlFor } from "@/lib/strapi";

import type { Article as ArticleType } from "@/types/article";

interface ArticleProps {
  data: ArticleType;
}

const Article = ({ data }: ArticleProps) => {
  const router = useRouter();

  return (
    <div className="uk-width-1-1 uk-width-1-2@s" suppressHydrationWarning>
      <Link
        href={`/clanek/${router.query.category || data.category?.slug}/${
          data.slug
        }`}
        className="big_category"
        suppressHydrationWarning
      >
        <div className="category_wrap">
          <div className="uk-inline uk-height-1-1 uk-width-1-1">
            <div
              className="blanded-mix uk-width-1-1 uk-height-1-1 uk-background-cover"
              data-src={urlFor(data.image).width(1200).url()}
              uk-img=""
            ></div>
            <div className="overlay uk-position-center uk-flex uk-flex-center uk-flex-middle">
              <h2 className="category_short_name">{data.title}</h2>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
};

export default Article;
