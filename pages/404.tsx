import Page from "@/layout/Page";
import Link from "next/link";
import { useTranslation } from "@/hooks/useTranslation";

const NotFound = () => {
  const { t } = useTranslation();

  return (
    <Page title={t("notFoundTitle")} description={t("notFoundText")} noCrawl>
      <section className="not-found-page">
        <h1>{t("notFoundTitle")}</h1>
        <p>{t("notFoundText")}</p>
        <img src="/assets/404.jpg" alt={t("notFoundTitle")} uk-img="" />
        {/* next/link, not a bare <a href="/"> - that sent an English visitor who
            hit a bad URL to the Czech homepage with no way back. */}
        <Link href="/" className="tm-button tm-black-button">
          {t("backtohp")}
        </Link>
      </section>
    </Page>
  );
};

export default NotFound;
