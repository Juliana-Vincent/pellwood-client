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
      linkedProducts: {
        populate: {
          image: true,
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

  return {
    props: {
      carts: linkedCarts.filter((item) => item?.title),
      articleFirst: shuffle(articlesFilteredFirst, 0),
      articleSeccond: shuffle(articlesFilteredSeccond, 1),
      product: product,
      productId: product.documentId,
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
}

const Product = ({
  carts,
  articleFirst,
  articleSeccond,
  product,
  productId,
}: ProductPageProps) => {
  const router = useRouter();
  const { t, lang, currency } = useTranslation();
  const [count, setCount] = useState(1);
  const [loader, setLoader] = useState(false);
  const { dataContextState, dataContextDispatch } = useContext(
    DataStateContext,
  );

  const [select, setSelect] = useState({
    name: t("selectvariant"),
    price: "",
  });

  const [error, setError] = useState({
    select: false,
    count: false,
  });

  const selectHandle = (name: string, price: string) => {
    setSelect({ ...select, name, price });
    setError({ ...error, select: false });
    dropdown(".select-variant").hide();
  };

  const onBuy = async () => {
    setLoader(true);
    if (select.name === t("selectvariant") && product?.variants?.length) {
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

    router.push(router.asPath + "?buy=true");

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
      newBasketItem.variantPrice = product.price ?? "";
    } else {
      newBasketItem.variantName = select.name;
      newBasketItem.variantPrice = select.price;
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
            ? { ...item, countVariant: +item.countVariant + count }
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
    ? Math.min(...product.variants.map((v) => Number(v.price) || 0))
    : Number(product.price) || 0;
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
            url: `${SITE_URL}${localePrefix}/produkty?category=${product.category.documentId}`,
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
              <div className="uk-visible@m">
                <img
                  src={urlFor(product.image).url()}
                  alt={product.title}
                  fetchPriority="high"
                />
              </div>
              <div
                className={`uk-hidden@m ${
                  product.orientedImage ? "orianted-img" : ""
                }`}
              >
                <img
                  src={urlFor(product.image).url()}
                  alt={product.title}
                  fetchPriority="high"
                />
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
                                ? (Math.round(+item.price * 100) / 100).toFixed(
                                    2,
                                  )
                                : item.price}{" "}
                              {currency}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                )}

                {!!product?.variants?.[0]?.price && (
                  <div className="order_block">
                    <div className="uk-flex uk-flex-between">
                      <div className="uk-width-1-1 uk-width-auto@m">
                        <div className="custom-select-wrap">
                          {/* UIkit's uk-dropdown auto-init scans and mutates these two elements
                              (adds aria-haspopup/aria-expanded to the button, an extra uk-drop
                              class to the dropdown) in the window between initial paint and
                              React's hydration walk - a real, understood conflict between
                              UIkit's DOM-scanning auto-init and React's hydration model, not a
                              bug in this component. suppressHydrationWarning is placed on
                              exactly these two nodes (and no others) because they're the only
                              ones UIkit actually touches here. */}
                          <button
                            className={`custom-select uk-button uk-button-default ${
                              error.select ? "error" : ""
                            }`}
                            type="button"
                            tabIndex={-1}
                            suppressHydrationWarning
                          >
                            <span>{select.name}</span>
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
                              {(product?.variants || []).map((item, index) => (
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
                      <div
                        className={`custom_number quantity ${
                          error.count ? "error" : ""
                        }`}
                      >
                        <input
                          type="number"
                          min="1"
                          max="1000"
                          step="1"
                          onChange={(e) => setCount(+e.target.value)}
                          value={count}
                        />
                        <div className="quantity-nav">
                          <div
                            className="quantity-button quantity-up"
                            onClick={() => setCount(count + 1)}
                          >
                            +
                          </div>
                          <div
                            className="quantity-button quantity-down"
                            onClick={() => {
                              if (count > 0) {
                                return setCount(count - 1);
                              } else {
                                return false;
                              }
                            }}
                          >
                            -
                          </div>
                        </div>
                      </div>
                    </div>
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
                        <div
                          className={`custom_number quantity ${
                            error.count ? "error" : ""
                          }`}
                        >
                          <input
                            type="number"
                            min="1"
                            max="1000"
                            step="1"
                            onChange={(e) => setCount(+e.target.value)}
                            value={count}
                          />
                          <div className="quantity-nav">
                            <div
                              className="quantity-button quantity-up"
                              onClick={() => setCount(count + 1)}
                            >
                              +
                            </div>
                            <div
                              className="quantity-button quantity-down"
                              onClick={() => {
                                if (count > 0) {
                                  return setCount(count - 1);
                                } else {
                                  return false;
                                }
                              }}
                            >
                              -
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="uk-width-2-3" suppressHydrationWarning>
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
                <div className="status">
                  <div>
                    {/* Inlined directly (instead of <img uk-svg>) so the fill="currentColor"
                        path actually picks up the .status svg { color } CSS rule - an <img>
                        can't reach into an external SVG document's fill, which is exactly why
                        uk-svg existed: it swaps the <img> for inline markup client-side, which
                        is also what was causing a hydration mismatch on this exact element. */}
                    <svg aria-hidden="true" focusable="false" viewBox="0 0 512 512">
                      <path
                        fill="currentColor"
                        d="M256 8C119.033 8 8 119.033 8 256s111.033 248 248 248 248-111.033 248-248S392.967 8 256 8zm0 48c110.532 0 200 89.451 200 200 0 110.532-89.451 200-200 200-110.532 0-200-89.451-200-200 0-110.532 89.451-200 200-200m140.204 130.267l-22.536-22.718c-4.667-4.705-12.265-4.736-16.97-.068L215.346 303.697l-59.792-60.277c-4.667-4.705-12.265-4.736-16.97-.069l-22.719 22.536c-4.705 4.667-4.736 12.265-.068 16.971l90.781 91.516c4.667 4.705 12.265 4.736 16.97.068l172.589-171.204c4.704-4.668 4.734-12.266.067-16.971z"
                      />
                    </svg>
                  </div>
                  <span>{t("stock")}</span>
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
          ? (Math.round(Number(price) * 100) / 100).toFixed(2)
          : price}{" "}
        {currency}
      </span>
    </li>
  );
};

export default Product;
