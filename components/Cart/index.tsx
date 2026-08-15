import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { urlFor } from "@/lib/strapi";
import { Product, Variant } from "@/types/product";
import { useTranslation } from "@/hooks/useTranslation";

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

  let price = "";
  if (!item?.variants?.length) {
    price =
      lang === "en" ? `${currency} ${item.price}` : `${item.price} ${currency}`;
  } else if (item?.variants?.length > 1) {
    const min = getMin(item.variants);
    price =
      lang === "en"
        ? `${t("from")} ${currency} ${min}`
        : `${t("from")} ${min} ${currency}`;
  } else if (item?.variants?.length === 1) {
    const singlePrice = item.variants[0].price;
    price =
      lang === "en"
        ? `${currency} ${singlePrice}`
        : `${singlePrice} ${currency}`;
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
