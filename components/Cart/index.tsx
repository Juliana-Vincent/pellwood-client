import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { urlFor } from "@/lib/strapi";
import { Product, Variant } from "@/types/product";
import { useTranslation } from "@/hooks/useTranslation";
import { formatPrice } from "@/helpers/formatPrice";
import { parsePrice } from "@/functions/parsePrice";

const getMin = (arr: Variant[]) => {
  let lowest = Number.POSITIVE_INFINITY;
  for (let i = arr.length - 1; i >= 0; i--) {
    // Safely handle both string and number prices
    const priceStr = String(arr[i].price || "0")
      .split(",")
      .join(".");
    const tmp = parseFloat(priceStr);
    if (tmp < lowest) lowest = tmp;
  }
  return lowest;
};

interface CartProps {
  item: Product;
  lang: string;
  currency: string;
  block?: boolean;
  priority?: boolean;
}

const Cart = ({ item, lang, currency, block, priority }: CartProps) => {
  const { t } = useTranslation();
  const cardRef = useRef<HTMLElement | any>(null);

  // All three branches used to place the currency symbol themselves, and put it
  // before the number for EN - which is why the homepage and catalogue read
  // "€ 14.5" while every other page read "8.90 €". Intl decides placement now.
  let price = "";
  const priced = (item?.variants || []).filter((v) => parsePrice(v.price) > 0);
  const distinctPrices = new Set(priced.map((v) => parsePrice(v.price)));
  if (!item?.variants?.length) {
    price = formatPrice(item.price, lang);
  } else if (distinctPrices.size > 1) {
    price = `${t("from")} ${formatPrice(getMin(priced), lang)}`;
  } else if (priced.length) {
    price = formatPrice(priced[0].price, lang);
  }

  const hrefUrl = `/produkt/${item.slug}`;

  const InnerCard = () => (
    <>
      <h3 className="card_short_head">{item.title}</h3>
      <div className="cart_img">
        {item.image && (
          <Image
            src={urlFor(item.image).url()}
            alt={item.title}
            width={800}
            height={400}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority={priority}
          />
        )}
      </div>
      <span className="short_price">{price}</span>
    </>
  );

  if (block) {
    return (
      <div ref={cardRef} suppressHydrationWarning>
        <Link
          href={hrefUrl}
          className="card_short"
          style={{ opacity: 1 }}
          suppressHydrationWarning
        >
          <InnerCard />
        </Link>
      </div>
    );
  } else {
    const localizedHref = lang !== "cz" ? `/${lang}${hrefUrl}` : hrefUrl;

    return (
      <li ref={cardRef} suppressHydrationWarning>
        <Link
          href={localizedHref}
          className="card_short"
          suppressHydrationWarning
        >
          <InnerCard />
        </Link>
      </li>
    );
  }
};

export default Cart;
