import React, { useReducer, createContext, useEffect, ReactNode } from "react";
import type { BasketItem, SessionUser } from "@/types/shop";

export interface DataState {
  basketcz: BasketItem[];
  basketCountcz: number;
  basketen: BasketItem[];
  basketCounten: number;
  user: SessionUser;
  state: {
    searchFocus: boolean;
  };
  // True once the storage-restoration effect below has run at least once, so pages
  // can tell "basket is genuinely empty" apart from "storage hasn't loaded yet".
  hydrated: boolean;
}

export type DataAction =
  | { type: "basketcz"; state: BasketItem[] }
  | { type: "basketCountcz"; state: number }
  | { type: "basketen"; state: BasketItem[] }
  | { type: "basketCounten"; state: number }
  | { type: "user"; state: SessionUser }
  | { type: "state"; state: { searchFocus: boolean } }
  | { type: "hydrated"; state: boolean };

export interface DataContextProps {
  dataContextState: DataState;
  dataContextDispatch: React.Dispatch<DataAction>;
}

const initialState: DataState = {
  basketcz: [],
  basketCountcz: 0,
  basketen: [],
  basketCounten: 0,
  user: {},
  state: {
    searchFocus: false,
  },
  hydrated: false,
};

// Cart/user data here is a purely client-side display concern - nothing in the app
// reads these values during SSR (no getServerSideProps/getStaticProps touches them;
// real auth uses the separate httpOnly session cookie in lib/auth.ts, not this
// context) - so localStorage is the right fit, not cookies. Cookies have a ~4KB
// practical size limit and are sent on every single HTTP request to the origin
// (including static assets), which doesn't scale with cart size and adds needless
// payload to every request for data the server never looks at.
const STORAGE_PREFIX = "pellwood_";

function readStorage(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_PREFIX + key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_PREFIX + key, value);
  } catch (e) {
    console.error(`Failed to persist ${key} to localStorage`, e);
  }
}

const reducer = (state: DataState, action: DataAction): DataState => {
  switch (action.type) {
    case "basketcz":
      writeStorage("basketcz", JSON.stringify([...action.state]));
      return { ...state, basketcz: action.state };
    case "basketCountcz":
      writeStorage("basketCountcz", JSON.stringify(action.state));
      return { ...state, basketCountcz: action.state };
    case "basketen":
      writeStorage("basketen", JSON.stringify([...action.state]));
      return { ...state, basketen: action.state };
    case "basketCounten":
      writeStorage("basketCounten", JSON.stringify(action.state));
      return { ...state, basketCounten: action.state };
    case "user":
      writeStorage("user", JSON.stringify({ ...action.state }));
      return { ...state, user: action.state };
    case "state":
      return { ...state, state: action.state };
    case "hydrated":
      return { ...state, hydrated: action.state };
    default:
      console.error("action.type is not implemented");
      return state;
  }
};

export const DataStateContext = createContext<DataContextProps>({
  dataContextState: initialState,
  dataContextDispatch: () => null,
});

export function DataProvider({ children }: { children: ReactNode }) {
  const [dataContextState, dataContextDispatch] = useReducer(
    reducer,
    initialState,
  );

  useEffect(() => {
    // Each key is restored independently. Sharing one try meant a single corrupt
    // value - a half-written count, a stale key from an older build - aborted
    // everything after it, typically leaving the basket restored but its counter
    // at 0, which then hid the basket entirely (the mini-cart reads the counter).
    const restore = <T,>(key: string, type: DataAction["type"]): T | undefined => {
      try {
        const raw = readStorage(key);
        if (!raw) return undefined;
        const parsed = JSON.parse(raw);
        dataContextDispatch({ type, state: parsed } as DataAction);
        return parsed as T;
      } catch (e) {
        console.error(`Failed to restore stored "${key}"`, e);
        return undefined;
      }
    };

    const basketCz = restore<any[]>("basketcz", "basketcz");
    const countCz = restore<number>("basketCountcz", "basketCountcz");
    const basketEn = restore<any[]>("basketen", "basketen");
    const countEn = restore<number>("basketCounten", "basketCounten");
    restore("user", "user");

    // The array and its counter are stored as two independent keys and can drift
    // apart on their own. The array is the source of truth; repair the counter
    // from it rather than trusting a stale number.
    if (Array.isArray(basketCz) && countCz !== basketCz.length) {
      dataContextDispatch({ type: "basketCountcz", state: basketCz.length });
    }
    if (Array.isArray(basketEn) && countEn !== basketEn.length) {
      dataContextDispatch({ type: "basketCounten", state: basketEn.length });
    }

    dataContextDispatch({ type: "hydrated", state: true });
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/user/me")
      .then((r) => r.json())
      .then((body) => {
        if (cancelled) return;
        dataContextDispatch({ type: "user", state: body?.data || {} });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <DataStateContext.Provider
      value={{ dataContextState, dataContextDispatch }}
    >
      {children}
    </DataStateContext.Provider>
  );
}
