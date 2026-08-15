import "react";

declare module "react" {
  interface HTMLAttributes<T> extends AriaAttributes, DOMAttributes<T> {
    "uk-grid"?: string | boolean;
    "uk-img"?: string | boolean;
    "uk-toggle"?: string | boolean;
    "uk-slider"?: string | boolean;
    "uk-icon"?: string | boolean;
    "uk-spinner"?: string | boolean;
    "uk-scrollspy"?: string | boolean;
    "uk-dropdown"?: string | boolean;
    "uk-height-match"?: string | boolean;
    "uk-filter"?: string | boolean;
    "uk-svg"?: string | boolean;
    "uk-scroll"?: string | boolean;
    "uk-cover"?: string | boolean;
    "uk-close"?: string | boolean;
    "uk-sticky"?: string | boolean;
    "uk-tooltip"?: string | boolean;
    "nohref"?: string | boolean;
  }
}
