import Page from "@/layout/Page";
import Link from "next/link";
import { useTranslation } from "@/hooks/useTranslation";

// The catalogue and product pages deliberately answer 500 when the product data
// itself cannot be loaded - an empty shop would be a worse lie. Without this page
// that 500 was Next's bare English "Internal Server Error", with no header, footer
// or way back, in both languages. Static on purpose: an error page must not depend
// on the thing that just failed.
const ServerError = () => {
  const { t } = useTranslation();

  return (
    <Page title={t("serverErrorTitle")} description={t("serverErrorText")} noCrawl>
      <section className="not-found-page">
        <h1>{t("serverErrorTitle")}</h1>
        <p>{t("serverErrorText")}</p>
        <Link href="/" className="tm-button tm-black-button">
          {t("backtohp")}
        </Link>
      </section>
    </Page>
  );
};

export default ServerError;
