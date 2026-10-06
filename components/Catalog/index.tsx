import { useState, useEffect, MouseEvent } from "react";
import { modal, util } from "uikit";
import { useRouter } from "next/router";
import InfiniteScroll from "react-infinite-scroll-component";
import Page from "@/layout/Page";
import RandomArticles from "@/components/RandomArticles/index";
import Cart from "@/components/Cart/index";
import SubMenu from "@/components/SubMenu/index";
import ModalFilter from "@/components/ModalFilter/index";
import Loader from "@/components/Loader/index";
import SortSelect from "@/components/SortSelect";
import changeUrl from "@/helpers/changeUrl";
import { CatalogSort, parseCatalogSort } from "@/helpers/sortProducts";
import { RangeParameter } from "@/helpers/getRangeParameter";
import { useTranslation } from "@/hooks/useTranslation";
import { fetchCatalogProducts } from "@/functions/fetchCatalogProducts";
import type { Product } from "@/types/product";
import type { Category } from "@/types/category";
import type { Setting } from "@/types/setting";
import type { Article } from "@/types/article";
import type { ParsedUrlQuery } from "querystring";

// Lifted out of pages/produkty/index.tsx so the category route can render the
// identical catalogue. Two copies of a 290-line page would drift within a week.


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
  sortBy: CatalogSort;
  /** hreflang pair for a category page; the "all products" page has none. */
  alternates?: { cs: string | null; en: string | null };
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
  sortBy,
  alternates,
}: CatalogProps) => {
  const router = useRouter();
  const { t, lang, currency } = useTranslation();

  const [firstLoad, setFirstLoad] = useState(false);
  const [reset, setReset] = useState(false);
  const [product, setProduct] = useState(productData);
  const [hasMore, setHasMore] = useState(productData.length >= 6);
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
    try {
    const sizeBefore = parseInt((queryUrl.size as string) || "6") - 6 || 0;
    const count = parseInt((queryUrl.size as string) || "6");
    const category = queryUrl.category as string;
    const search = (queryUrl.search as string) || "";
    const sortBy = parseCatalogSort(queryUrl.sort);

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
      sortBy,
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
    } catch (err) {
      // Without this the rejection was unhandled and hasMore stayed true, so the
      // loader at the bottom of the catalogue span forever with no explanation.
      console.error("Failed to load more products:", err);
      setHasMore(false);
    }
  };

  // Changing the order has to reset `size` to 6. changeData appends whenever
  // size > 6, so without this you would get page 4 of the new order stuck on the
  // end of the old list.
  const changeSort = (value: string) => {
    const query = { ...router.query, sort: value, size: "6" } as any;
    if (value === "default") delete query.sort;
    setReset(true);
    router.push({ pathname: router.pathname, query }, undefined, { scroll: false });
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
      alternates={alternates}
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
                {mounted && (
                  <SortSelect
                    label={t("sortBy")}
                    value={sortBy}
                    onChange={changeSort}
                    options={[
                      { value: "default", label: t("sortDefault") },
                      { value: "price-asc", label: t("sortPriceAsc") },
                      { value: "price-desc", label: t("sortPriceDesc") },
                      { value: "title-asc", label: t("sortTitleAsc") },
                      { value: "title-desc", label: t("sortTitleDesc") },
                    ]}
                  />
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
          {!product.length && (
            <div className="uk-text-center uk-padding">
              <p>{t("noProductsFound")}</p>
              {filtered && (
                <button
                  className="tm-button tm-black-button"
                  onClick={(e) => cancelFilter(e)}
                >
                  {t("cancelFilters")}
                </button>
              )}
            </div>
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
