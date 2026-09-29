import { clampQuantity, MIN_QUANTITY, MAX_QUANTITY } from "@/helpers/quantity";

interface QuantityInputProps {
  value: number;
  onChange: (value: number) => void;
  onClamp?: (clamped: boolean) => void;
  error?: boolean;
}

const QuantityInput = ({ value, onChange, onClamp, error }: QuantityInputProps) => {
  const apply = (raw: unknown) => {
    const { value: next, clamped } = clampQuantity(raw);
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
        value={value}
        onChange={(e) => apply(e.target.value)}
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