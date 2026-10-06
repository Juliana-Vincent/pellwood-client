import React from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useTranslation } from "@/hooks/useTranslation";

import type { SubMenuProps } from "@/types/menu";

const SubMenu = ({ data, articles = false, setReset }: SubMenuProps) => {
  const router = useRouter();
  const { t } = useTranslation();

  // Categories are pages now, so these are real links: crawlable, middle-clickable,
  // and they survive being copied out of the address bar. They used to be
  // <a href="#"> with preventDefault, which is invisible to a search engine.
  const activeCategory = (router.query.category as string) || "";
  const isProduktyPage = router.pathname.includes("produkty");

  return (
    <nav className="sub_menu">
      <ul>
        {isProduktyPage && (
          <li
            className={`sub_menu_item${!activeCategory ? " active_sub" : ""}`}
          >
            <Link href="/produkty" onClick={() => setReset && setReset(true)}>
              {t("allProducts")}
            </Link>
          </li>
        )}
        {data &&
          data.length > 0 &&
          data.map((item, index) => {
            // Prefer stable ID over index for React array keys
            const key = item.documentId || item.id || index;

            if (!articles) {
              return (
                <li
                  key={key}
                  className={`sub_menu_item${activeCategory === (item.slug || item.documentId) ? " active_sub" : ""}`}
                >
                  <Link
                    href={`/produkty/${item.slug || item.documentId}`}
                    onClick={() => setReset && setReset(true)}
                  >
                    {item.title}
                  </Link>
                </li>
              );
            } else {
              return (
                <li key={key} className="sub_menu_item">
                  <Link href={`/clanek/${router.query.category}/${item.slug}`}>
                    {item.title}
                  </Link>
                </li>
              );
            }
          })}
      </ul>
    </nav>
  );
};

export default SubMenu;
