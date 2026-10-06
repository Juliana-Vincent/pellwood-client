import React, { useRef, useEffect, useState, useCallback } from "react";
import styles from "./CustomRangeSlider.module.scss";
import type { CustomRangeSliderProps } from "@/types/shop";

const CustomRangeSlider = ({
  minValue,
  maxValue,
  value,
  onChange,
  label,
}: CustomRangeSliderProps) => {
  const [isDragging, setIsDragging] = useState<"min" | "max" | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const minSliderRef = useRef<HTMLDivElement>(null);
  const maxSliderRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !trackRef.current) return;

      e.preventDefault();
      e.stopPropagation();

      const rect = trackRef.current.getBoundingClientRect();
      const percentage = Math.max(
        0,
        Math.min(1, (e.clientX - rect.left) / rect.width),
      );
      const newValue = minValue + percentage * (maxValue - minValue);

      if (isDragging === "min") {
        const clampedValue = Math.min(newValue, value.max);
        const newMin = Math.round(clampedValue);
        if (newMin !== value.min) {
          onChange({ min: newMin, max: value.max });
        }
      } else if (isDragging === "max") {
        const clampedValue = Math.max(newValue, value.min);
        const newMax = Math.round(clampedValue);
        if (newMax !== value.max) {
          onChange({ min: value.min, max: newMax });
        }
      }
    },
    [isDragging, minValue, maxValue, value, onChange],
  );

  const handleMouseUp = useCallback((e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(null);
  }, []);

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging || !trackRef.current) return;

      const touch = e.touches[0];
      const rect = trackRef.current.getBoundingClientRect();
      const percentage = Math.max(
        0,
        Math.min(1, (touch.clientX - rect.left) / rect.width),
      );
      const newValue = minValue + percentage * (maxValue - minValue);

      if (isDragging === "min") {
        const clampedValue = Math.min(newValue, value.max);
        onChange({ min: Math.round(clampedValue), max: value.max });
      } else if (isDragging === "max") {
        const clampedValue = Math.max(newValue, value.min);
        onChange({ min: value.min, max: Math.round(clampedValue) });
      }
    },
    [isDragging, minValue, maxValue, value, onChange],
  );

  const handleTouchEnd = useCallback(() => {
    setIsDragging(null);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("pointermove", handleMouseMove, true);
      document.addEventListener("mousemove", handleMouseMove, true);
      document.addEventListener("mouseup", handleMouseUp, true);
      document.addEventListener("pointerup", handleMouseUp, true);
      document.addEventListener("touchmove", handleTouchMove, true);
      document.addEventListener("touchend", handleTouchEnd, true);

      return () => {
        document.removeEventListener("pointermove", handleMouseMove, true);
        document.removeEventListener("mousemove", handleMouseMove, true);
        document.removeEventListener("mouseup", handleMouseUp, true);
        document.removeEventListener("pointerup", handleMouseUp, true);
        document.removeEventListener("touchmove", handleTouchMove, true);
        document.removeEventListener("touchend", handleTouchEnd, true);
      };
    }
  }, [
    isDragging,
    handleMouseMove,
    handleMouseUp,
    handleTouchMove,
    handleTouchEnd,
  ]);

  useEffect(() => {
    const minSlider = minSliderRef.current;
    const maxSlider = maxSliderRef.current;
    const track = trackRef.current;

    const handleMinPointerDown = (e: MouseEvent | PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging("min");
    };

    const handleMaxPointerDown = (e: MouseEvent | PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging("max");
    };

    const handleDirectTrackClick = (e: MouseEvent) => {
      if (e.target === minSlider || e.target === maxSlider) {
        return;
      }

      e.stopPropagation();

      if (!track) return;

      const rect = track.getBoundingClientRect();
      const percentage = Math.max(
        0,
        Math.min(1, (e.clientX - rect.left) / rect.width),
      );
      const clickValue = minValue + percentage * (maxValue - minValue);

      const distToMin = Math.abs(clickValue - value.min);
      const distToMax = Math.abs(clickValue - value.max);

      if (distToMin < distToMax) {
        onChange({ min: Math.round(clickValue), max: value.max });
      } else {
        onChange({ min: value.min, max: Math.round(clickValue) });
      }
    };

    if (minSlider) {
      minSlider.addEventListener(
        "pointerdown",
        handleMinPointerDown as EventListener,
        true,
      );
      minSlider.addEventListener(
        "mousedown",
        handleMinPointerDown as EventListener,
        true,
      );
    }

    if (maxSlider) {
      maxSlider.addEventListener(
        "pointerdown",
        handleMaxPointerDown as EventListener,
        true,
      );
      maxSlider.addEventListener(
        "mousedown",
        handleMaxPointerDown as EventListener,
        true,
      );
    }

    if (track) {
      track.addEventListener(
        "click",
        handleDirectTrackClick as EventListener,
        true,
      );
    }

    return () => {
      if (minSlider) {
        minSlider.removeEventListener(
          "pointerdown",
          handleMinPointerDown as EventListener,
          true,
        );
        minSlider.removeEventListener(
          "mousedown",
          handleMinPointerDown as EventListener,
          true,
        );
      }
      if (maxSlider) {
        maxSlider.removeEventListener(
          "pointerdown",
          handleMaxPointerDown as EventListener,
          true,
        );
        maxSlider.removeEventListener(
          "mousedown",
          handleMaxPointerDown as EventListener,
          true,
        );
      }
      if (track) {
        track.removeEventListener(
          "click",
          handleDirectTrackClick as EventListener,
          true,
        );
      }
    };
  }, [minValue, maxValue, value, onChange]);

  const handlePointerDown =
    (thumb: "min" | "max") => (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      // preventDefault above stops the browser focusing the thumb on its own, so
      // after clicking one you could not then nudge it with the arrow keys.
      e.currentTarget.focus();
      setIsDragging(thumb);
    };

  // The values are whole millimetres, so one key press moves one unit and
  // PageUp/PageDown move a tenth of the range - dragging from 4 mm to 18 mm one
  // arrow at a time is not a usable control.
  const bigStep = Math.max(1, Math.round((maxValue - minValue) / 10));

  // Each thumb is bounded by the other one, exactly as the drag handlers bound it.
  const boundsFor = (thumb: "min" | "max") =>
    thumb === "min"
      ? { lower: minValue, upper: value.max }
      : { lower: value.min, upper: maxValue };

  const handleKeyDown =
    (thumb: "min" | "max") => (e: React.KeyboardEvent<HTMLDivElement>) => {
      const current = thumb === "min" ? value.min : value.max;
      const { lower, upper } = boundsFor(thumb);
      let next = current;

      switch (e.key) {
        case "ArrowLeft":
        case "ArrowDown":
          next = current - 1;
          break;
        case "ArrowRight":
        case "ArrowUp":
          next = current + 1;
          break;
        case "PageDown":
          next = current - bigStep;
          break;
        case "PageUp":
          next = current + bigStep;
          break;
        case "Home":
          next = lower;
          break;
        case "End":
          next = upper;
          break;
        default:
          return;
      }

      // Only once a key we handle has matched, so Tab, Enter and Escape still do
      // their normal thing - and the arrows no longer scroll the modal.
      e.preventDefault();

      next = Math.round(Math.min(upper, Math.max(lower, next)));
      if (next === current) return;

      onChange(
        thumb === "min"
          ? { min: next, max: value.max }
          : { min: value.min, max: next },
      );
    };

  const getPositionPercentage = (val: number) => {
    return ((val - minValue) / (maxValue - minValue)) * 100;
  };

  const minPosition = getPositionPercentage(value.min);
  const maxPosition = getPositionPercentage(value.max);

  return (
    <div className={styles["custom-range-slider"]} data-uk-slider="false">
      <div
        className={styles["custom-range-slider__track-container"]}
        ref={trackRef}
        data-uk-slider="false"
      >
        <div className={styles["custom-range-slider__track-background"]} />
        <div
          className={styles["custom-range-slider__track-active"]}
          style={{
            left: `${minPosition}%`,
            width: `${maxPosition - minPosition}%`,
          }}
        />
        <div
          ref={minSliderRef}
          className={styles["custom-range-slider__slider"]}
          style={{ left: `${minPosition}%` }}
          onPointerDown={handlePointerDown("min")}
          onKeyDown={handleKeyDown("min")}
          role="slider"
          tabIndex={0}
          aria-orientation="horizontal"
          aria-valuemin={minValue}
          aria-valuemax={value.max}
          aria-valuenow={value.min}
          // "minimum" and "maximum" are the same word in Czech and English, so
          // this needs no translation key.
          aria-label={label ? `${label} – minimum` : "minimum"}
        />
        <div
          ref={maxSliderRef}
          className={styles["custom-range-slider__slider"]}
          style={{ left: `${maxPosition}%` }}
          onPointerDown={handlePointerDown("max")}
          onKeyDown={handleKeyDown("max")}
          role="slider"
          tabIndex={0}
          aria-orientation="horizontal"
          aria-valuemin={value.min}
          aria-valuemax={maxValue}
          aria-valuenow={value.max}
          aria-label={label ? `${label} – maximum` : "maximum"}
        />
      </div>
    </div>
  );
};

export default CustomRangeSlider;
