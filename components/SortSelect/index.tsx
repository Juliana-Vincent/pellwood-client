import { useEffect, useRef, useState } from "react";

export interface SortOption {
  value: string;
  label: string;
}

interface SortSelectProps {
  value: string;
  options: SortOption[];
  onChange: (value: string) => void;
  /** Visible text before the control, also its accessible name. */
  label: string;
}

/**
 * A native <select> renders its option list through the operating system, which
 * no stylesheet can reach - on macOS that meant a grey system popup with a blue
 * highlight in the middle of the catalogue. This is the listbox pattern instead,
 * so the list is ours to style, and it keeps the keyboard behaviour a <select>
 * gave for free: arrows to move, Enter to choose, Escape to dismiss.
 */
const SortSelect = ({ value, options, onChange, label }: SortSelectProps) => {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const selected = options[selectedIndex];

  // A click anywhere else closes it, the way a real select does. Pointerdown
  // rather than click, so it also closes when the press starts on a scrollbar.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // Move focus onto the list when it opens so the arrow keys have somewhere to
  // land, and back to the button when it closes - otherwise focus falls to the
  // top of the document and tabbing restarts from the header.
  useEffect(() => {
    if (open) {
      setActiveIndex(selectedIndex);
      listRef.current?.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const choose = (index: number) => {
    const option = options[index];
    if (option) onChange(option.value);
    setOpen(false);
    buttonRef.current?.focus();
  };

  const onListKeyDown = (event: React.KeyboardEvent<HTMLUListElement>) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((i) => Math.min(options.length - 1, i + 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((i) => Math.max(0, i - 1));
        break;
      case "Home":
        event.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        event.preventDefault();
        setActiveIndex(options.length - 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        choose(activeIndex);
        break;
      case "Escape":
      case "Tab":
        setOpen(false);
        buttonRef.current?.focus();
        break;
      default:
        break;
    }
  };

  return (
    <div className="catalog-sort" ref={wrapRef}>
      <span className="catalog-sort-label" id="catalog-sort-label">
        {label}
      </span>
      <div className="catalog-sort-control">
        <button
          type="button"
          ref={buttonRef}
          className="tm-button tm-black-button catalog-sort-button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-labelledby="catalog-sort-label catalog-sort-value"
          onClick={() => setOpen((wasOpen) => !wasOpen)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              setOpen(true);
            }
          }}
        >
          <span id="catalog-sort-value">{selected?.label}</span>
          <span className="catalog-sort-caret" aria-hidden="true" />
        </button>

        {open && (
          <ul
            className="catalog-sort-list"
            role="listbox"
            tabIndex={-1}
            ref={listRef}
            aria-labelledby="catalog-sort-label"
            aria-activedescendant={`catalog-sort-option-${activeIndex}`}
            onKeyDown={onListKeyDown}
          >
            {options.map((option, index) => (
              <li
                key={option.value}
                id={`catalog-sort-option-${index}`}
                role="option"
                aria-selected={option.value === value}
                className={`catalog-sort-option${
                  index === activeIndex ? " is-active" : ""
                }${option.value === value ? " is-selected" : ""}`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => choose(index)}
              >
                {option.label}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default SortSelect;
