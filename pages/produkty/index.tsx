import { useState, useEffect, MouseEvent } from "react";
import { modal, util } from "uikit";
import Page from "@/layout/Page";
import RandomArticles from "@/components/RandomArticles/index";
import Cart from "@/components/Cart/index";
import SubMenu from "@/components/SubMenu/index";
import { fetchAPI } from "@/lib/strapi";
import ModalFilter from "@/components/ModalFilter/index";
import localize from "@/data/localize";
import changeUrl from "@/helpers/changeUrl";
import { useRouter } from "next/router";
import controledProduct from "@/helpers/controlledProduct";
import getRangeParameter, { RangeParameter } from "@/helpers/getRangeParameter";
import shuffle from "@/helpers/shuffle";
import InfiniteScroll from "react-infinite-scroll-component";
import type { Product } from "@/types/product";
import type { Category } from "@/types/category";
import type { Setting } from "@/types/setting";
import type { Article } from "@/types/article";
import Loader from "@/components/Loader/index";
import { useTranslation } from "@/hooks/useTranslation";
import { fetchCatalogProducts } from "@/functions/fetchCatalogProducts";
import type { GetServerSidePropsContext } from "next";
import type { ParsedUrlQuery } from "querystring";

interface FilterParams {
  lengthMin: string | number;
  lengthMax: string | number;
  diameterMin: string | number;
  diameterMax: string | number;
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const { lang, currency } = localize(context.locale);
  const strapiLocale = lang === "cz" ? "cs" : lang;

  const query = context.query || {};
  const category = (query.category as string) || "all";
  const size = parseInt((query.size as string) || "6");
  const search = (query.search as string) || "";
  const diameterMin = (query.diameterMin as string) || false;
  const diameterMax = (query.diameterMax as string) || false;
  const lengthMin = (query.lengthMin as string) || false;
  const lengthMax = (query.lengthMax as string) || false;

  let parametersArr: FilterParams | false = false;
  if (lengthMin && lengthMax && diameterMin && diameterMax) {
    parametersArr = { lengthMin, lengthMax, diameterMin, diameterMax };
  }

  // The filter sliders' min/max bounds need every product's parameters, but nothing
  // else about them - populate only parametrs here instead of also pulling
  // category/image/variants for products that are just being scanned for a number.
  const strapiLocale2 = lang === "cz" ? "cs" : lang;
  const rangeRes = await fetchAPI<Product[]>("products", {
    locale: strapiLocale2,
    populate: { parametrs: true },
    pagination: { limit: 500 },
  });
  const range = getRangeParameter(rangeRes.data || []);
  const rangeState = getRangeParameter(rangeRes.data || [], parametersArr);

  // Only the page actually being rendered is fetched (with full populate), pushed
  // down to Strapi as real filters/pagination where possible - see
  // fetchCatalogProducts for why the diameter/length range filter can't be.
  const productsSliced = await fetchCatalogProducts({
    lang,
    category,
    search,
    diameterMin,
    diameterMax,
    lengthMin,
    lengthMax,
    offset: 0,
    limit: size,
  });
  const products = await controledProduct(lang, productsSliced);

  // 3. Fetch categories
  const categoriesRes = await fetchAPI<Category[]>("categories", {
    locale: strapiLocale,
    sort: ["sort:asc"],
  });
  const categoriesData = categoriesRes.data || [];

  // 4. Fetch articles
  const articlesRes = await fetchAPI<Article[]>("articles", {
    locale: strapiLocale,
    populate: { category: true, image: true },
  });
  const articlesData = articlesRes.data || [];

  // 5. Fetch settings
  const settingsRes = await fetchAPI<Setting>("setting", {
    locale: strapiLocale,
  });
  const settingsData: Partial<Setting> = settingsRes.data || {};

  const ifFiltered = !!search.length || !!parametersArr;

  return {
    props: {
      category: categoriesData,
      settings: settingsData,
      articleFirst: shuffle(
        articlesData.filter((item) => item?.category?.slug === "sluzby"),
        0,
      ),
      articleSeccond: shuffle(
        articlesData.filter((item) => item?.category?.slug === "o-nas"),
        1,
      ),
      lang,
      currency,
      productData: products,
      range,
      rangeState,
      ifFiltered,
      searchQuery: search,
    },
  };
}

interface CatalogProps {
  category: Category[];
  settings: Partial<Setting>;
  articleFirst: Article[];
  articleSeccond: Article[];
  productData: Product[];
  range: RangeParameter;
  rangeState: RangeParameter;
  ifFiltered: boolean;
  searchQuery: string;
}

const Catalog = ({
  category,
  settings,
  articleFirst,
  articleSeccond,
  productData,
  range,
  rangeState,
  ifFiltered,
  searchQuery,
}: CatalogProps) => {
  const router = useRouter();
  const { t, lang, currency } = useTranslation();

  const [firstLoad, setFirstLoad] = useState(false);
  const [reset, setReset] = useState(false);
  const [product, setProduct] = useState(productData);
  const [hasMore, setHasMore] = useState(true);
  const [filtered, setFiltered] = useState(ifFiltered);
  const [search, setSearch] = useState(searchQuery || "");

  const [stateRange, setStateRange] = useState(rangeState);
  const [rangeNumber, setRangeNumber] = useState(range);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (firstLoad) {
      changeData(router.query);
    }
    setFirstLoad(true);
  }, [router.query]);

  const changeData = async (queryUrl: ParsedUrlQuery) => {
    const sizeBefore = parseInt((queryUrl.size as string) || "6") - 6 || 0;
    const count = parseInt((queryUrl.size as string) || "6");
    const category = queryUrl.category as string;
    const search = (queryUrl.search as string) || "";

    const diameterMin = (queryUrl.diameterMin as string) || false;
    const diameterMax = (queryUrl.diameterMax as string) || false;
    const lengthMin = (queryUrl.lengthMin as string) || false;
    const lengthMax = (queryUrl.lengthMax as string) || false;

    const data = await fetchCatalogProducts({
      lang,
      category,
      search,
      diameterMin,
      diameterMax,
      lengthMin,
      lengthMax,
      offset: sizeBefore,
      limit: count - sizeBefore,
    });

    if (data.length < 6) {
      setHasMore(false);
    } else {
      setHasMore(true);
    }

    if (reset || sizeBefore === 0) {
      setProduct(data);
      setReset(false);
    } else {
      // filter out duplicates by id just in case
      const existingIds = new Set(
        product.map((p) => p.documentId || p.id),
      );
      const newData = data.filter(
        (p) => !existingIds.has(p.documentId || p.id),
      );
      setProduct([...product, ...newData]);
    }
  };

  const moreData = () => {
    changeUrl(
      parseInt((router.query.size as string) || "6") + 6,
      false,
      false,
      [],
      router,
    );
  };

  const closeModal = () => {
    modal(util.find("#modal-filter")).hide();
  };

  const handleFilter = () => {
    setReset(true);

    // stateRange is always a real {min,max} object (initialized from the full
    // computed catalog bounds), even when the customer never touched the
    // sliders - passing it through unconditionally meant every single filter
    // submission silently ALSO applied a diameter/length filter pinned to
    // whatever the (often untouched) slider values were, which could zero out
    // results that plainly matched the search/category. Only pass the range
    // through when it's actually narrower than the full bounds.
    const isRangeNarrowed =
      stateRange.length.min !== rangeNumber.length.min ||
      stateRange.length.max !== rangeNumber.length.max ||
      stateRange.diameter.min !== rangeNumber.diameter.min ||
      stateRange.diameter.max !== rangeNumber.diameter.max;
    changeUrl(6, false, search, isRangeNarrowed ? stateRange : {}, router);

    closeModal();
    setFiltered(true);
  };

  const cancelFilter = async (e: MouseEvent) => {
    e.preventDefault();
    setFiltered(false);
    setStateRange(rangeNumber);
    setSearch("");
    setReset(true);
    changeUrl(6, false, "", {}, router, true);
  };

  return (
    <Page
      id="catalog"
      title={settings?.title}
      description={settings?.description}
    >
      {settings?.title && (
        <section className="head_category">
          <div className="uk-container uk-container-expand">
            <div className="content_head_wrap">
              <h1>{settings.title}</h1>
              <p>{settings.description}</p>
            </div>
          </div>
        </section>
      )}

      <section
        className="category grey"
        id="catalog-short"
        uk-filter="target: .js-filter"
      >
        <div className="uk-container uk-container-expand">
          <div className="category_menu uk-flex uk-flex-between uk-flex-middle uk-flex-wrap">
            <div className="uk-flex uk-flex-middle uk-width-1-1 uk-flex-between uk-flex-wrap">
              <div className="filter-controls-wrap">
                {mounted && (
                  <a
                    className="tm-button tm-black-button"
                    href="#modal-filter"
                    uk-toggle=""
                  >
                    {t("searchAndFilter")}
                  </a>
                )}
                {mounted && !!filtered && (
                  <button
                    className="cancel-filtered tm-button tm-button-text"
                    onClick={(e) => cancelFilter(e)}
                  >
                    <img
                      className="uk-svg"
                      src="/assets/times.svg"
                      alt="Cancel filter"
                      uk-svg=""
                      hidden
                    />
                    {t("cancelFilters")}
                  </button>
                )}
              </div>
              <SubMenu data={category} setReset={setReset} />
            </div>
          </div>
        </div>

        <div className="uk-container uk-container-expand">
          {!!product.length && (
            <InfiniteScroll
              dataLength={product.length}
              next={moreData}
              hasMore={hasMore}
              loader={<Loader />}
              scrollThreshold={0.6}
              endMessage={<div></div>}
            >
              <ul
                className="uk-grid uk-child-width-1-1 uk-child-width-1-3@m uk-child-width-1-2@s"
                uk-grid=""
                suppressHydrationWarning
              >
                {product.map((item, index) => (
                  <Cart
                    item={item}
                    key={index}
                    lang={lang}
                    currency={currency}
                    priority={index < 6}
                  />
                ))}
              </ul>
            </InfiniteScroll>
          )}
        </div>
      </section>

      <RandomArticles
        articleFirst={articleFirst}
        articleSeccond={articleSeccond}
      />

      <ModalFilter
        setSearch={setSearch}
        search={search}
        closeModal={closeModal}
        setStateRange={setStateRange}
        handleFilter={handleFilter}
        rangeNumber={rangeNumber}
        stateRange={stateRange}
      />
    </Page>
  );
};

export default Catalog;
