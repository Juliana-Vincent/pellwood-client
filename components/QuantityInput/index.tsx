import { useState } from "react";
import { clampQuantity, MIN_QUANTITY, MAX_QUANTITY } from "@/helpers/quantity";

interface QuantityInputProps {
  value: number;
  onChange: (value: number) => void;
  onClamp?: (clamped: boolean) => void;
  error?: boolean;
}

const QuantityInput = ({ value, onChange, onClamp, error }: QuantityInputProps) => {
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
      <div className="quantity-nav">
        <div className="quantity-button quantity-up" onClick={() => apply(Number(value) + 1)}>
          +
        </div>
        <div className="quantity-button quantity-down" onClick={() => apply(Number(value) - 1)}>
          -
        </div>
      </div>
    </div>
  );
};

export default QuantityInput;