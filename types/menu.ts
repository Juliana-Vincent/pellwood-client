export interface Menu {
  title: string;
  location: string;
  items: Items[];
}

export interface Items {
  title: string;
  menuUrl: string;
}

export interface SubMenuProps {
  data: any[];
  articles?: boolean;
  setReset?: any;
}
