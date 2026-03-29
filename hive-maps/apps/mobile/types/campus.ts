export type CampusMeta = {
  id: string;
  label: string;
  name: string;
  center: [number, number];
  zoom: number;
};

export type Building = {
  campus: string;
  code: string;
  name: string;
  location?: any;
  addresses: string[];
  center: [number, number];
  hasIndoorMap: boolean;
};

export type CampusMetaById = Record<string, CampusMeta>;
