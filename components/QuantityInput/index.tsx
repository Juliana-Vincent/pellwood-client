import { useState } from "react";
import { clampQuantity, MIN_QUANTITY, MAX_QUANTITY } from "@/helpers/quantity";
import { useTranslation } from "@/hooks/useTranslation";

interface QuantityInputProps {
  value: number;
  onChange: (value: number) => void;
  onClamp?: (clamped: boolean) => void;
  error?: boolean;
}

const QuantityInput = ({ value, onChange, onClamp, error }: QuantityInputProps) => {
  const { t } = useTranslation();
  // The field is controlled, so an empty intermediate state was rewritten to 1 as
  // the customer typed: selecting the value, deleting it and typing "5" produced
  // 15. `draft` holds the half-typed text until blur, when it is clamped.
  const [draft, setDraft] = useState<string | null>(null);

  const apply = (raw: unknown) => {
    const { value: next, clamped } = clampQuantity(raw);
    setDraft(null);
    onChange(next);
    if (onClamp) onClamp(clamped);
  };

  return (
    <div className={`custom_number quantity ${error ? "error" : ""}`}>
      <input
        type="number"
        min={MIN_QUANTITY}
        max={MAX_QUANTITY}
        step="1"
        value={draft ?? value}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") {
            setDraft("");
            return;
          }
          apply(raw);
        }}
        onBlur={() => {
          if (draft !== null) apply(draft);
        }}
      />
      {/* Buttons, not divs: a div is not focusable, not reachable by keyboard and
          announces nothing, so the only way to change a quantity was to click or
          type. type="button" so it can never submit a surrounding form. */}
      <div className="quantity-nav">
        <button
          type="button"
          className="quantity-button quantity-up"
          aria-label={t("increaseQuantity")}
          onClick={() => apply(Number(value) + 1)}
        >
          +
        </button>
        <button
          type="button"
          className="quantity-button quantity-down"
          aria-label={t("decreaseQuantity")}
          onClick={() => apply(Number(value) - 1)}
        >
          -
        </button>
      </div>
    </div>
  );
};

export default QuantityInput;