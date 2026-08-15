import "@/scss/main.scss";
import "vanilla-cookieconsent/dist/cookieconsent.css";
import { useEffect } from "react";
import { DataProvider } from "@/context/dataStateContext";
import { Oswald, Raleway } from "next/font/google";
import type { AppProps } from "next/app";

const oswald = Oswald({ subsets: ["latin"], weight: ["200", "300", "400"], display: "swap" });
const raleway = Raleway({ subsets: ["latin"], weight: ["500"], display: "swap" });

const App = ({ Component, pageProps }: AppProps) => {
  useEffect(() => {
    // UIkit's icon set is only needed once the page is interactive, not for the
    // initial paint - loading it dynamically here (instead of a static top-level
    // import) keeps it out of the shared bundle every page pays for on first load.
    // Components that need UIkit's imperative API (dropdown/offcanvas/modal) still
    // import it directly themselves; this effect's only job is registering icons.
    Promise.all([import("uikit"), import("uikit/dist/js/uikit-icons")]).then(
      ([{ default: UIkit }, { default: Icons }]) => {
        UIkit.use(Icons);
      }
    );
  }, []);

  return (
    <DataProvider>
      <style jsx global>{`
        :root {
          --font-oswald: ${oswald.style.fontFamily};
          --font-raleway: ${raleway.style.fontFamily};
        }
        body {
          font-family: ${raleway.style.fontFamily}, sans-serif;
        }
        h1, h2, h3, h4, h5, h6, .category_short_name, .basket-body-price, .tm-basket-body table thead tr th, .status span, .tm-remove-item a, .textarea_item textarea, .select_item button, .input_item label, .input_item input, .tm-payship .uk-grid label, .tm-payship .uk-grid .method-price, .copyright span {
          font-family: ${oswald.style.fontFamily}, sans-serif !important;
        }
      `}</style>
      <div className={`${oswald.className} ${raleway.className}`}>
        <Component {...pageProps} />
      </div>
    </DataProvider>
  );
};

export default App;
