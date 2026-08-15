import React from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useTranslation } from "@/hooks/useTranslation";
import changeUrl from "@/helpers/changeUrl";

import type { SubMenuProps } from "@/types/menu";

const SubMenu = ({ data, articles = false, setReset }: SubMenuProps) => {
  const router = useRouter();
  const { t } = useTranslation();

  const handleChangeUrl = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    if (setReset) setReset(true);
    changeUrl(6, id, false, {}, router);
  };

  const isProduktyPage = router.pathname.includes("produkty");

  return (
    <nav className="sub_menu">
      <ul>
        {isProduktyPage && (
          <li
            className={`sub_menu_item${router.query.category === "all" ? " active_sub" : ""}`}
          >
            <a href="#catalog-short" onClick={(e) => handleChangeUrl(e, "all")}>
              {t("allProducts")}
            </a>
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
                  className={`sub_menu_item${router.query.category === item.documentId ? " active_sub" : ""}`}
                >
                  <a
                    href="#"
                    onClick={(e) => handleChangeUrl(e, item.documentId)}
                  >
                    {item.title}
                  </a>
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
