import { NextRouter } from "next/router";

const changeUrl = (
  size: number | string | false = false,
  category: string | false = false,
  search: string | false = false,
  parameters: any = {},
  router: NextRouter,
  resetFilter: boolean = false,
  // Loading the next page of the infinite scroll is not a place the visitor can
  // go back to. Pushing it put one history entry per scroll step, so Back walked
  // size=24 -> 18 -> 12 without visibly changing anything, and after one Back the
  // next scroll asked for products already on screen and the spinner never ended.
  historyMode: "push" | "replace" = "push",
) => {
  var queryUrl = { ...router.query } as any;

  if(!router.query.category){
    queryUrl.size = '6'
  }

  if(size) queryUrl.size = String(size)
  // `category` is a path segment now (/produkty/<slug>), not a query parameter.
  // On the category route router.query.category holds the segment, and copying it
  // through above is what keeps router.push filling the dynamic part of the path.
  if(search !== false) queryUrl.search = search

  if(parameters.diameter || parameters.length) {
    queryUrl.diameterMin = parameters.diameter.min
    queryUrl.diameterMax = parameters.diameter.max
    queryUrl.lengthMin = parameters.length.min
    queryUrl.lengthMax = parameters.length.max
  } else {
    // These were only ever written, never removed, and the object starts as a copy
    // of the current query - so dragging the sliders back to the full range left
    // the old bounds in the URL and the results stayed narrowed while the slider
    // said otherwise. The only escape was "clear all filters", which also wiped
    // the search term.
    delete queryUrl.diameterMin
    delete queryUrl.diameterMax
    delete queryUrl.lengthMin
    delete queryUrl.lengthMax
  }

  if(resetFilter){
    queryUrl = {
      size: size ? String(size) : undefined,
      category: router.query.category,
      // Ordering is a display choice, not a filter - "clear all filters" should
      // not silently reorder the catalogue as well.
      sort: router.query.sort
    }
  }

  router[historyMode]({pathname: router.pathname, query: queryUrl}, undefined, { scroll: false })
}

export default changeUrl
