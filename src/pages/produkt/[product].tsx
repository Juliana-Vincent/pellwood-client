import { useState, useContext } from "react";
import BlockContent from "@/components/BlockContent";
import Image from "next/image";
import { dropdown, offcanvas } from "uikit";
import Page from "@/layout/Page";
import RandomArticles from "@/components/RandomArticles/index";
import ShortBlock from "@/components/ShortBlock";
import { fetchAPI, urlFor } from "@/lib/strapi";
import { DataStateContext } from "@/context/dataStateContext";
import localize from "@/data/localize";
import { useRouter } from "next/router";
import shuffle from "@/helpers/shuffle";
import { Product as ProductType } from "@/src/types/product";
import type { Article } from "@/src/types/article";
import { useTranslation } from "@/hooks/useTranslation";

export async function getStaticPaths() {
  return { paths: [], fallback: 'blocking' as const };
}

export async function getStaticProps({ params, locale }: any) {
  const { lang, currency } = localize(locale);
  const strapiLocale = lang === "cz" ? "cs" : lang;

  // 1. Fetch Product by slug
  const productRes = await fetchAPI("products", {
    locale: strapiLocale,
    filters: {
      slug: {
        $eq: params.product,
      },
    },
    populate: {
      image: true,
      variants: true,
      parametrs: true,
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
  const articlesRes = await fetchAPI("articles", {
    locale: strapiLocale,
    populate: { category: true },
  });
  const articlesData = articlesRes.data || [];

  const articlesFilteredFirst = articlesData.filter(
    (item: any) => item?.category?.slug === "sluzby",
  );
  const articlesFilteredSeccond = articlesData.filter(
    (item: any) => item?.category?.slug === "o-nas",
  );

  return {
    props: {
      carts: linkedCarts.filter((item: any) => item?.title),
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
  const { dataContextState, dataContextDispatch } =
    useContext(DataStateContext) as any;

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

    var newBasketItem: any = {
      id: productId,
      nameProduct: product.title,
      variantName: select.name,
      variantPrice: select.price,
      countVariant: count,
      imgUrl: urlFor(product.image).url(),
    };

    if (!product?.variants?.length) {
      newBasketItem.variantName = product.title;
      newBasketItem.variantPrice = product.price;
    } else {
      newBasketItem.variantName = select.name;
      newBasketItem.variantPrice = select.price;
    }

    let basket = dataContextState["basket" + lang];
    let basketCount = dataContextState["basketCount" + lang];

    if (!basket || !basket.length) {
      basket = [newBasketItem];
      basketCount = 1;
    } else {
      let indexBasket = -1;
      basket.forEach((item: any, index: number) => {
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
        basket = basket.map((item: any, index: number) =>
          index === indexBasket
            ? { ...item, countVariant: +item.countVariant + count }
            : item
        );
      } else {
        basketCount = +basketCount + 1;
        basket = [...basket, newBasketItem];
      }
    }
    dataContextDispatch({ state: basket, type: "basket" + lang });
    dataContextDispatch({ state: basketCount, type: "basketCount" + lang });
    await offcanvas("#offcanvas-flip").show();
    setLoader(false);
  };

  return (
    <Page
      id="product"
      description={product.SEOdescription || ""}
      title={product.title}
      image={
        product.orientedImage
          ? urlFor(product.image).orientation(270).url()
          : urlFor(product.image).url()
      }
    >
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
                {product.orientedImage ? (
                  <img
                    src={urlFor(product.image).orientation(270).url()}
                    alt={product.title}
                  />
                ) : (
                  <img src={urlFor(product.image).url()} alt={product.title} />
                )}
              </div>
              <div
                className={`uk-hidden@m ${
                  product.orientedImage ? "orianted-img" : ""
                }`}
              >
                {product.orientedImage ? (
                  <img
                    src={urlFor(product.image).orientation(180).url()}
                    alt={product.title}
                  />
                ) : (
                  <img src={urlFor(product.image).url()} alt={product.title} />
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
                            <div className="uk-width-expand" suppressHydrationWarning>{item.title}</div>
                            <div className="short_price" suppressHydrationWarning>
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
                          <button
                            className={`custom-select uk-button uk-button-default ${
                              error.select ? "error" : ""
                            }`}
                            type="button"
                            tabIndex={-1}
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
                    <img src="/assets/check-circle-regular.svg" uk-svg="" />
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
