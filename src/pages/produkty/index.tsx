import { useState, useEffect } from "react";
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
import getRangeParameter from "@/helpers/getRangeParameter";
import shuffle from "@/helpers/shuffle";
import InfiniteScroll from "react-infinite-scroll-component";
import type { Product } from "@/src/types/product";
import type { Category } from "@/src/types/category";
import type { Setting } from "@/src/types/setting";
import type { Article } from "@/src/types/article";
import Loader from "@/components/Loader/index";
import { useTranslation } from "@/hooks/useTranslation";

async function getProductsData({
  lang,
  category,
  search,
  diameterMin,
  diameterMax,
  lengthMin,
  lengthMax,
}: any) {
  const strapiLocale = lang === "cz" ? "cs" : lang;

  // Fetch all products from Strapi
  const res = await fetchAPI("products", {
    locale: strapiLocale,
    populate: {
      category: true,
      image: true,
      variants: true,
      parametrs: true,
    },
    pagination: {
      limit: 1000, // Fetch all for filtering/ranges
    },
  });

  let products = res.data || [];

  // Filter by category
  if (category && category !== "all") {
    products = products.filter(
      (p: any) =>
        p.category &&
        (p.category.documentId === category || p.category.slug === category),
    );
  }

  // Filter by search
  if (search) {
    const s = search.toLowerCase();
    products = products.filter(
      (p: any) => p.title && p.title.toLowerCase().includes(s),
    );
  }

  // Filter by diameter range
  if (diameterMin && diameterMax) {
    products = products.filter((p: any) => {
      const d = p.parametrs?.find(
        (o: any) => o.title === "Průměr" || o.title === "Diameter",
      );
      if (!d) return false;
      const val = parseFloat(d.value.replace(",", "."));
      return val >= parseFloat(diameterMin) && val <= parseFloat(diameterMax);
    });
  }

  // Filter by length range
  if (lengthMin && lengthMax) {
    products = products.filter((p: any) => {
      const l = p.parametrs?.find(
        (o: any) => o.title === "Délka" || o.title === "Length",
      );
      if (!l) return false;
      const val = parseFloat(l.value.replace(",", "."));
      return val >= parseFloat(lengthMin) && val <= parseFloat(lengthMax);
    });
  }

  return products;
}

export async function getServerSideProps(context: any) {
  const { lang, currency } = localize(context.locale);
  const strapiLocale = lang === "cz" ? "cs" : lang;

  const category = context.query?.category || "all";
  const size = parseInt(context.query?.size || 6);
  const search = context.query?.search || "";
  const diameterMin = context.query?.diameterMin || false;
  const diameterMax = context.query?.diameterMax || false;
  const lengthMin = context.query?.lengthMin || false;
  const lengthMax = context.query?.lengthMax || false;

  var parametersArr: any = false;
  if (lengthMin && lengthMax && diameterMin && diameterMax) {
    parametersArr = { lengthMin, lengthMax, diameterMin, diameterMax };
  }

  // 1. Fetch ALL products once (for both filtering and range calculation)
  const strapiLocale2 = lang === "cz" ? "cs" : lang;
  const allRes = await fetchAPI("products", {
    locale: strapiLocale2,
    populate: {
      category: true,
      image: true,
      variants: true,
      parametrs: true,
    },
    pagination: { limit: 1000 },
  });
  const allProductsRaw = allRes.data || [];

  // Calculate ranges from all products BEFORE filtering
  const range = getRangeParameter(allProductsRaw);
  const rangeState = getRangeParameter(allProductsRaw, parametersArr);

  // Apply filters to the already-fetched data
  let filteredProducts = [...allProductsRaw];
  if (category && category !== "all") {
    filteredProducts = filteredProducts.filter(
      (p: any) => p.category && (p.category.documentId === category || p.category.slug === category),
    );
  }
  if (search) {
    const s = search.toLowerCase();
    filteredProducts = filteredProducts.filter(
      (p: any) => p.title && p.title.toLowerCase().includes(s),
    );
  }
  if (diameterMin && diameterMax) {
    filteredProducts = filteredProducts.filter((p: any) => {
      const d = p.parametrs?.find((o: any) => o.title === "Průměr" || o.title === "Diameter");
      if (!d) return false;
      const val = parseFloat(d.value.replace(",", "."));
      return val >= parseFloat(diameterMin) && val <= parseFloat(diameterMax);
    });
  }
  if (lengthMin && lengthMax) {
    filteredProducts = filteredProducts.filter((p: any) => {
      const l = p.parametrs?.find((o: any) => o.title === "Délka" || o.title === "Length");
      if (!l) return false;
      const val = parseFloat(l.value.replace(",", "."));
      return val >= parseFloat(lengthMin) && val <= parseFloat(lengthMax);
    });
  }

  const productsSliced = filteredProducts.slice(0, size);
  const products = await controledProduct(lang, productsSliced);

  // 3. Fetch categories
  const categoriesRes = await fetchAPI("categories", {
    locale: strapiLocale,
    sort: ["sort:asc"],
  });
  const categoriesData = categoriesRes.data || [];

  // 4. Fetch articles
  const articlesRes = await fetchAPI("articles", {
    locale: strapiLocale,
    populate: { category: true, image: true },
  });
  const articlesData = articlesRes.data || [];

  // 5. Fetch settings
  const settingsRes = await fetchAPI("setting", {
    locale: strapiLocale,
  });
  const settingsData = settingsRes.data || {};

  const ifFiltered = !!search.length || !!parametersArr;

  return {
    props: {
      category: categoriesData,
      settings: settingsData,
      articleFirst: shuffle(
        articlesData.filter((item: any) => item?.category?.slug === "sluzby"),
        0,
      ),
      articleSeccond: shuffle(
        articlesData.filter((item: any) => item?.category?.slug === "o-nas"),
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
  settings: Setting;
  articleFirst: Article[];
  articleSeccond: Article[];
  productData: Product[];
  range: any;
  rangeState: any;
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

  const changeData = async (queryUrl: any) => {
    const sizeBefore = parseInt(queryUrl.size || 6) - 6 || 0;
    const count = parseInt(queryUrl.size || 6);
    const category = queryUrl.category;
    const search = queryUrl.search || "";

    const diameterMin = queryUrl.diameterMin || false;
    const diameterMax = queryUrl.diameterMax || false;
    const lengthMin = queryUrl.lengthMin || false;
    const lengthMax = queryUrl.lengthMax || false;

    const allProducts = await getProductsData({
      lang,
      category,
      search,
      diameterMin,
      diameterMax,
      lengthMin,
      lengthMax,
    });

    const data = allProducts.slice(sizeBefore, count);

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
      const existingIds = new Set(product.map((p: any) => p.documentId || p.id));
      const newData = data.filter((p: any) => !existingIds.has(p.documentId || p.id));
      setProduct([...product, ...newData]);
    }
  };

  const moreData = () => {
    changeUrl(parseInt(router.query.size as string || "6") + 6, false, false, [], router);
  };

  const closeModal = () => {
    modal(util.find("#modal-filter")).hide();
  };

  const handleFilter = () => {
    setReset(true);
    changeUrl(6, false, search, stateRange, router);

    closeModal();
    setFiltered(true);
  };

  const cancelFilter = async (e: any) => {
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
