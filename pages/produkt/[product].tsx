import { useState, useContext } from "react";
import BlockContent from "@/components/BlockContent";
import { dropdown, offcanvas } from "uikit";
import Page, { SITE_URL } from "@/layout/Page";
import RandomArticles from "@/components/RandomArticles/index";
import ShortBlock from "@/components/ShortBlock";
import { fetchAPI, urlFor } from "@/lib/strapi";
import { DataStateContext } from "@/context/dataStateContext";
import localize from "@/data/localize";
import { useRouter } from "next/router";
import shuffle from "@/helpers/shuffle";
import { buildBreadcrumbJsonLd } from "@/functions/breadcrumbJsonLd";
import { Product as ProductType } from "@/types/product";
import type { Article } from "@/types/article";
import type { BasketItem } from "@/types/shop";
import { useTranslation } from "@/hooks/useTranslation";
import type { GetStaticPropsContext } from "next";
import { parsePrice } from "@/functions/parsePrice";
import QuantityInput from "@/components/QuantityInput";
import { clampQuantity, MAX_QUANTITY } from "@/helpers/quantity";

export async function getStaticPaths() {
  return { paths: [], fallback: "blocking" as const };
}

export async function getStaticProps({
  params,
  locale,
}: GetStaticPropsContext<{ product: string }>) {
  const { lang, currency } = localize(locale);
  const strapiLocale = lang === "cz" ? "cs" : lang;

  // 1. Fetch Product by slug
  const productRes = await fetchAPI<ProductType[]>("products", {
    locale: strapiLocale,
    filters: {
      slug: {
        $eq: params?.product,
      },
    },
    populate: {
      image: true,
      variants: true,
      parametrs: true,
      category: true,
      localizations: true,
      linkedProducts: {
        populate: {
          image: true,
          variants: true,
        },
      },
    },
  });

  const productData = productRes.data || [];

  if (!productData.length) {
    return {
      notFound: true,
    };
  }

  const product = productData[0];
  const linkedCarts = product.linkedProducts || [];

  // 2. Fetch Articles for footer
  const articlesRes = await fetchAPI<Article[]>("articles", {
    locale: strapiLocale,
    populate: { category: true },
  });
  const articlesData = articlesRes.data || [];

  const articlesFilteredFirst = articlesData.filter(
    (item) => item?.category?.slug === "sluzby",
  );
  const articlesFilteredSeccond = articlesData.filter(
    (item) => item?.category?.slug === "o-nas",
  );

  const localizations = ((product as any).localizations || []) as Array<{
    locale: string;
    slug: string;
  }>;
  const csSlug =
    lang === "cz" ? product.slug : localizations.find((l) => l.locale === "cs")?.slug || null;
  const enSlug =
    lang === "en" ? product.slug : localizations.find((l) => l.locale === "en")?.slug || null;

  return {
    props: {
      carts: linkedCarts.filter((item) => item?.title),
      articleFirst: shuffle(articlesFilteredFirst, 0),
      articleSeccond: shuffle(articlesFilteredSeccond, 1),
      product: product,
      productId: product.documentId,
      alternates: {
        cs: csSlug ? `/produkt/${csSlug}` : null,
        en: enSlug ? `/produkt/${enSlug}` : null,
      },
    },
    revalidate: 60,
  };
}

interface ProductPageProps {
  carts: ProductType[];
  articleFirst: Article[];
  articleSeccond: Article[];
  product: ProductType;
  productId: string;
  alternates: {
    cs: string | null;
    en: string | null;
  };
}

const Product = ({
  carts,
  articleFirst,
  articleSeccond,
  product,
  productId,
  alternates,
}: ProductPageProps) => {
  const router = useRouter();
  const { t, lang, currency } = useTranslation();
  const [count, setCount] = useState(1);
  const [loader, setLoader] = useState(false);
  const { dataContextState, dataContextDispatch } = useContext(
    DataStateContext,
  );
  const [quantityNotice, setQuantityNotice] = useState(false);

  // A variant with no price can't be bought - it must not appear in the dropdown,
  // where selecting it added a 0-price line to the basket.
  const pricedVariants = (product?.variants || []).filter((v) => !!v.price);
  const productImage = product.image ? urlFor(product.image).url() : "";

  // `chosen` rather than comparing the label against t("selectvariant"). Switching
  // locale on a product page keeps this state while the translation changes, so the
  // old check stopped matching and let an unchosen variant through as a 0-price line
  // literally named "Vybrat variantu".
  const [select, setSelect] = useState({
    name: t("selectvariant"),
    price: "",
    chosen: false,
  });

  const [error, setError] = useState({
    select: false,
    count: false,
  });

  const selectHandle = (name: string, price: string) => {
    setSelect({ ...select, name, price, chosen: true });
    setError({ ...error, select: false });
    dropdown(".select-variant").hide();
  };

  const onBuy = async () => {
    setLoader(true);
    if (!select.chosen && pricedVariants.length) {
      setError({ ...error, select: true });
      setLoader(false);
      router.push(router.asPath);
      return;
    }
    if (count === 0) {
      setError({ ...error, count: true });
      setLoader(false);
      router.push(router.asPath);
      return;
    }

    // asPath already carries the query, so concatenating produced
    // ?buy=true?buy=true?buy=true. Setting it as a query value is idempotent, and
    // scroll:false stops the page jumping to the top on every add.
    router.push(
      { pathname: router.pathname, query: { ...router.query, buy: "true" } },
      undefined,
      { scroll: false },
    );

    const newBasketItem: BasketItem = {
      id: productId,
      nameProduct: product.title,
      variantName: select.name,
      variantPrice: select.price,
      countVariant: count,
      imgUrl: urlFor(product.image).url(),
    };

    if (!product?.variants?.length) {
      newBasketItem.variantName = product.title;
      newBasketItem.variantPrice = parsePrice(product.price);
    } else {
      newBasketItem.variantName = select.name;
      newBasketItem.variantPrice = parsePrice(select.price);
    }

    // "basket" + lang / "basketCount" + lang are built dynamically, so they can't be
    // statically narrowed to keyof DataState - same pattern as layout/Header.tsx.
    const basketKey = ("basket" + lang) as "basketcz" | "basketen";
    const basketCountKey = ("basketCount" + lang) as "basketCountcz" | "basketCounten";

    let basket = dataContextState[basketKey];
    let basketCount = dataContextState[basketCountKey];

    if (!basket || !basket.length) {
      basket = [newBasketItem];
      basketCount = 1;
    } else {
      let indexBasket = -1;
      basket.forEach((item, index) => {
        if (product?.variants?.length) {
          if (
            item.id === productId &&
            basket[index].variantName === select.name
          ) {
            indexBasket = index;
          }
        } else if (item.id === productId) {
          indexBasket = index;
        }
      });
      if (indexBasket >= 0) {
        // Build a new array/item instead of mutating in place - context consumers
        // (e.g. the mini-cart total) rely on the basket reference actually changing
        // to know they need to recompute.
        basket = basket.map((item, index) =>
          index === indexBasket
            ? { ...item,                 countVariant: clampQuantity(+item.countVariant + count).value, }
            : item,
        );
      } else {
        basketCount = +basketCount + 1;
        basket = [...basket, newBasketItem];
      }
    }
    dataContextDispatch({ state: basket, type: basketKey });
    dataContextDispatch({ state: basketCount, type: basketCountKey });
    await offcanvas("#offcanvas-flip").show();
    setLoader(false);
  };

  // Product/Offer structured data - lets Google show price/availability rich
  // results for this page, which no page in the app currently provides.
  const inStock = product.variants?.length
    ? product.variants.some((v) => v.inStock !== false)
    : true;
  const price = product.variants?.length
    ? Math.min(...product.variants.map((v) => parsePrice(v.price)))
    : parsePrice(product.price);
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    ...(product.SEOdescription ? { description: product.SEOdescription } : {}),
    ...(product.image ? { image: urlFor(product.image).url() } : {}),
    sku: productId,
    offers: {
      "@type": "Offer",
      url: `${SITE_URL}${lang === "en" ? "/en" : ""}/produkt/${product.slug}`,
      priceCurrency: currency === "Kč" ? "CZK" : "EUR",
      price,
      availability: `https://schema.org/${inStock ? "InStock" : "OutOfStock"}`,
    },
  };

  const localePrefix = lang === "en" ? "/en" : "";
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: t("homepage"), url: `${SITE_URL}${localePrefix}` },
    ...(product.category
      ? [
          {
            name: product.category.title,
                        url: `${SITE_URL}${localePrefix}/produkty?category=${product.category.slug || product.category.documentId}`,
          },
        ]
      : [{ name: t("products"), url: `${SITE_URL}${localePrefix}/produkty` }]),
    { name: product.title },
  ]);

  return (
    <Page
      id="product"
      description={product.SEOdescription || ""}
      title={product.title}
      image={urlFor(product.image).url()}
      alternates={alternates}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <section className="full product">
        <div
          className="uk-grid uk-child-width-1-1 uk-child-width-1-2@m uk-grid-stack"
          uk-grid=""
          uk-height-match="target: > div > div"
          suppressHydrationWarning
        >
          <div suppressHydrationWarning>
            <div
              className={`article_img_wrap ${
                product.orientedImage ? "scale_img" : ""
              }`}
              suppressHydrationWarning
            >
              <div className={`uk-visible@m ${product.orientedImage ? "stiky_img_product" : ""}`}>
                {/* An <img> with src="" makes the browser re-request the current
                    document as an image and render a broken-image box. */}
                {!!productImage && (
                  <img src={productImage} alt={product.title} fetchPriority="high" />
                )}
              </div>
              <div
                className={`uk-hidden@m ${
                  product.orientedImage ? "orianted-img" : ""
                }`}
              >
                {!!productImage && (
                  <img src={productImage} alt={product.title} fetchPriority="high" />
                )}
              </div>
            </div>
          </div>
          <div suppressHydrationWarning>
            <div className="content_wrap grey" suppressHydrationWarning>
              <div className="content">
                <h1 className="head_1">{product.title}</h1>
                {!!product?.variants?.length && (
                  <div className="variants_list">
                    {product.variants.map((item, index) => {
                      if (item.price) {
                        return (
                          <div
                            key={index}
                            className="uk-grid uk-grid-medium"
                            uk-grid=""
                            suppressHydrationWarning
                          >
                            <div
                              className="uk-width-expand"
                              suppressHydrationWarning
                            >
                              {item.title}
                            </div>
                            <div
                              className="short_price"
                              suppressHydrationWarning
                            >
                              {lang === "en"
                                ? parsePrice(item.price).toFixed(2)
                                : item.price
                              }{" "}
                              {currency}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                )}

                {/* Gated on "any variant has a price", not on the FIRST one having
                    one. With variants like [{5A, no price}, {7A, 350}] the product
                    page rendered the title, image, price table and stock badge with
                    no buy control anywhere and no explanation. */}
                {!!pricedVariants.length && (
                  <div className="order_block">
                    <div className="uk-flex uk-flex-between">
                      <div className="uk-width-1-1 uk-width-auto@m">
                        <div className="custom-select-wrap">
                          <button
                            className={`custom-select uk-button uk-button-default ${
                              error.select ? "error" : ""
                            }`}
                            type="button"
                            tabIndex={-1}
                            suppressHydrationWarning
                          >
                            <span>{select.chosen ? select.name : t("selectvariant")}</span>
                            <span>
                              <img
                                src="/assets/chevron-down-light.svg"
                                alt="Down"
                              />
                            </span>
                          </button>
                          <div
                            className="uk-dropdown select-variant"
                            uk-dropdown="mode: click; pos: bottom-justify; offset: 0"
                            suppressHydrationWarning
                          >
                            <ul className="uk-nav uk-dropdown-nav">
                              {pricedVariants.map((item, index) => (
                                <Variant
                                  key={index}
                                  lang={lang}
                                  currency={currency}
                                  handle={selectHandle}
                                  name={item.title}
                                  price={item.price}
                                />
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                      <QuantityInput
                        value={count}
                        onChange={setCount}
                        onClamp={setQuantityNotice}
                        error={error.count}
                      />
                    </div>
                    {quantityNotice && (
                      <div className="uk-alert-danger" uk-alert="">
                        <p>{t("quantityLimit")}</p>
                      </div>
                    )}
                    <button
                      className="uk-width-1-1 uk-margin-top tm-button tm-black-button"
                      onClick={() => onBuy()}
                    >
                      {loader && (
                        <div uk-spinner="" className="uk-icon uk-spinner"></div>
                      )}
                      {t("addToBasket")}
                    </button>
                  </div>
                )}
                {!product?.variants?.length && (
                  <div className="tm-single-order">
                    <div className="tm-single-price uk-text-center uk-margin-bottom">
                      {currency === "$" && currency} {product.price}{" "}
                      {currency !== "$" && currency}
                    </div>
                    <div
                      className="uk-grid-small uk-grid uk-grid-stack"
                      uk-grid=""
                      suppressHydrationWarning
                    >
                      <div className="uk-width-1-3" suppressHydrationWarning>
                      <QuantityInput
                        value={count}
                        onChange={setCount}
                        onClamp={setQuantityNotice}
                        error={error.count}
                      />
                      </div>
                      <div className="uk-width-2-3" suppressHydrationWarning>
                        {quantityNotice && (
                          <div className="uk-alert-danger" uk-alert="">
                            <p>{t("quantityLimit")}</p>
                          </div>
                        )}
                        <button
                          className="uk-width-1-1 tm-button tm-black-button"
                          onClick={() => onBuy()}
                        >
                          {loader && (
                            <div
                              uk-spinner=""
                              className="uk-icon uk-spinner"
                            ></div>
                          )}
                          {t("addToBasket")}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                <div className={`status${inStock ? "" : " status-out"}`}>
                  <div>
                    <svg aria-hidden="true" focusable="false" viewBox="0 0 512 512">
                      <path
                        fill="currentColor"
                        d="M256 8C119.033 8 8 119.033 8 256s111.033 248 248 248 248-111.033 248-248S392.967 8 256 8zm0 48c110.532 0 200 89.451 200 200 0 110.532-89.451 200-200 200-110.532 0-200-89.451-200-200 0-110.532 89.451-200 200-200m140.204 130.267l-22.536-22.718c-4.667-4.705-12.265-4.736-16.97-.068L215.346 303.697l-59.792-60.277c-4.667-4.705-12.265-4.736-16.97-.069l-22.719 22.536c-4.705 4.667-4.736 12.265-.068 16.971l90.781 91.516c4.667 4.705 12.265 4.736 16.97.068l172.589-171.204c4.704-4.668 4.734-12.266.067-16.971z"
                      />
                    </svg>
                  </div>
                  <span>{inStock ? t("stock") : t("outOfStock")}</span>
                </div>
                <div className="description_product">
                  <BlockContent blocks={product.text} />
                </div>
                <div className="paramets">
                  <table className="uk-table uk-table-divider uk-table-small">
                    <tbody>
                      {(product.parametrs || []).map((item, index) => (
                        <tr key={index}>
                          <td>{item.title}</td>
                          <td className="uk-text-right">{item.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <ShortBlock data={carts} lang={lang} currency={currency} />
      <RandomArticles
        articleFirst={articleFirst}
        articleSeccond={articleSeccond}
      />
    </Page>
  );
};

interface VariantProps {
  handle: (name: string, price: string) => void;
  name: string;
  price: string | number;
  lang: string;
  currency: string;
}

const Variant = ({ handle, name, price, lang, currency }: VariantProps) => {
  return (
    <li
      className="variant_select uk-flex"
      onClick={(e) => handle(name, String(price))}
    >
      <span className="uk-width-expand">{name}</span>
      <span className="uk-width-auto uk-text-right">
        {lang === "en"
          ? parsePrice(price).toFixed(2)
          : price
        }{" "}
        {currency}
      </span>
    </li>
  );
};

export default Product;
