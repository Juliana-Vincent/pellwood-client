import React, { useReducer, createContext, useEffect, ReactNode } from "react";
import { setCookie, getCookie } from 'cookies-next';

export interface DataState {
  basketcz: any[];
  basketCountcz: number;
  basketen: any[];
  basketCounten: number;
  user: any;
  state: {
    searchFocus: boolean;
  };
  // True once the cookie-restoration effect below has run at least once, so pages
  // can tell "basket is genuinely empty" apart from "cookies haven't loaded yet".
  hydrated: boolean;
}

export type DataAction =
  | { type: "basketcz"; state: any[] }
  | { type: "basketCountcz"; state: number }
  | { type: "basketen"; state: any[] }
  | { type: "basketCounten"; state: number }
  | { type: "user"; state: any }
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
    searchFocus: false
  },
  hydrated: false
};

const reducer = (state: DataState, action: DataAction): DataState => {
  switch (action.type) {
    case "basketcz":
      setCookie('basketcz', JSON.stringify([ ...action.state ]));
      return { ...state, basketcz: action.state };
    case "basketCountcz":
      setCookie('basketCountcz', JSON.stringify(action.state));
      return { ...state, basketCountcz: action.state };
    case "basketen":
      setCookie('basketen', JSON.stringify([ ...action.state ]));
      return { ...state, basketen: action.state };
    case "basketCounten":
      setCookie('basketCounten', JSON.stringify(action.state));
      return { ...state, basketCounten: action.state };
    case "user":
      setCookie('user', JSON.stringify({ ...action.state }));
      return { ...state, user: action.state };
    case "state":
      return { ...state, state: action.state };
    case "hydrated":
      return { ...state, hydrated: action.state };
    default:
      console.error('action.type is not implemented');
      return state;
  }
};

export const DataStateContext = createContext<DataContextProps>({
  dataContextState: initialState,
  dataContextDispatch: () => null,
});

export function DataProvider({ children }: { children: ReactNode }) {
  const [dataContextState, dataContextDispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    try {
      const bcz = getCookie('basketcz');
      if (bcz && typeof bcz === 'string') dataContextDispatch({ type: 'basketcz', state: JSON.parse(bcz) });

      const bccz = getCookie('basketCountcz');
      if (bccz && typeof bccz === 'string') dataContextDispatch({ type: 'basketCountcz', state: JSON.parse(bccz) });

      const ben = getCookie('basketen');
      if (ben && typeof ben === 'string') dataContextDispatch({ type: 'basketen', state: JSON.parse(ben) });

      const bcen = getCookie('basketCounten');
      if (bcen && typeof bcen === 'string') dataContextDispatch({ type: 'basketCounten', state: JSON.parse(bcen) });

      const u = getCookie('user');
      if (u && typeof u === 'string') dataContextDispatch({ type: 'user', state: JSON.parse(u) });
    } catch (e) {
      console.error("Failed to parse cookies", e);
    } finally {
      dataContextDispatch({ type: 'hydrated', state: true });
    }
  }, []);

  return (
    <DataStateContext.Provider value={{ dataContextState, dataContextDispatch }}>
      {children}
    </DataStateContext.Provider>
  );
}
