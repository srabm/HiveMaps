export type CampusId = string;

export type CampusMeta = {
  id: CampusId;
  label: string;
  name: string;
  center: [number, number];
  zoom: number;
};

export type Building = {
  campus: CampusId;
  code: string;
  name: string;
  location?: any;
  addresses: string[];
  center: [number, number];
  hasIndoorMap: boolean;
};

export type CampusMetaById = Record<CampusId, CampusMeta>;
