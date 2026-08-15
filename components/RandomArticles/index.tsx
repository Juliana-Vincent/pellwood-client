import Article from "../ArticleShort";
import type { Article as ArticleType } from "@/types/article";

interface RandomArticlesProps {
  articleFirst: ArticleType[];
  articleSeccond: ArticleType[];
}

const RandomArticles = ({
  articleFirst,
  articleSeccond,
}: RandomArticlesProps) => {
  return (
    <section className="section_base">
      <div className="uk-container uk-container-expand">
        <div
          className="uk-grid uk-grid-stack"
          uk-grid=""
          uk-scrollspy="target: > div > a; cls: uk-animation-slide-top-small; delay: 500"
          suppressHydrationWarning
        >
          {articleFirst[0] && <Article data={articleFirst[0]} />}
          {articleSeccond[0] && <Article data={articleSeccond[0]} />}
        </div>
      </div>
    </section>
  );
};

export default RandomArticles;
