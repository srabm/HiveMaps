export type CampusId = 'SGW' | 'LOY';

export type CampusMeta = {
  id: CampusId;
  label: string;
  name: string;
  center: [number, number]; // [longitude, latitude]
  zoom: number;
};

export type Building = {
  campus: CampusId;
  code: string;
  name: string;
  location?: any;
  addresses: string[];
};

export const campuses: Record<CampusId, CampusMeta> = {
  SGW: {
    id: 'SGW',
    label: 'SGW',
    name: 'Sir George Williams',
    center: [-73.5788, 45.4972],
    zoom: 16.2,
  },
  LOY: {
    id: 'LOY',
    label: 'LOYOLA',
    name: 'Loyola',
    center: [-73.6406, 45.4583],
    zoom: 16.0,
  },
};

export const buildings: Building[] = [
  // SGW
  { campus: 'SGW', code: 'B', name: 'B Annex', addresses: ['2160 Bishop St., Montreal, QC, Canada'] },
  { campus: 'SGW', code: 'CI', name: 'CI Annex', addresses: ['2149 Mackay St., Montreal, QC, Canada'] },
  { campus: 'SGW', code: 'CL', name: 'CL Annex', addresses: ['1665 Ste-Catherine St. W., Montreal, QC, Canada'] },
  { campus: 'SGW', code: 'D', name: 'D Annex', addresses: ['2140 Bishop St., Montreal, QC, Canada'] },
  { campus: 'SGW', code: 'EN', name: 'EN Annex', addresses: ['2070 Mackay St., Montreal, QC, Canada'] },
  { campus: 'SGW', code: 'ER', name: 'ER Building', addresses: ['2155 Guy St., Montreal, QC, Canada'] },
  {
    campus: 'SGW',
    code: 'EV',
    name: 'Engineering, Computer Science and Visual Arts Integrated Complex',
    addresses: ['1515 Ste-Catherine St. W., Montreal, QC, Canada'],
  },
  { campus: 'SGW', code: 'FA', name: 'FA Annex', addresses: ['2060 Mackay St., Montreal, QC, Canada'] },
  { campus: 'SGW', code: 'FB', name: 'Faubourg Building', addresses: ['1250 Guy St., Montreal, QC, Canada', '1600 Ste-Catherine St. W., Montreal, QC, Canada'] },
  { campus: 'SGW', code: 'FG', name: 'Faubourg Ste-Catherine Building', addresses: ['1610 Ste-Catherine St. W., Montreal, QC, Canada'] },
  { campus: 'SGW', code: 'GA', name: 'Grey Nuns Annex', addresses: ['1211-1215 St-Mathieu St., Montreal, QC, Canada'] },
  { campus: 'SGW', code: 'GM', name: 'Guy-De Maisonneuve Building', addresses: ['1550 De Maisonneuve Blvd. W., Montreal, QC, Canada'] },
  { campus: 'SGW', code: 'GN', name: 'Grey Nuns Building', addresses: ['1190 Guy St., Montreal, QC, Canada', '1175 St-Mathieu St., Montreal, QC, Canada'] },
  { campus: 'SGW', code: 'GS', name: 'GS Building', addresses: ['1538 Sherbrooke St. W., Montreal, QC, Canada'] },
  { campus: 'SGW', code: 'H', name: 'Henry F. Hall Building', addresses: ['1455 De Maisonneuve Blvd. W., Montreal, QC, Canada'] },
  { campus: 'SGW', code: 'K', name: 'K Annex', addresses: ['2150 Bishop St., Montreal, QC, Canada'] },
  { campus: 'SGW', code: 'LB', name: 'J.W. McConnell Building', addresses: ['1400 De Maisonneuve Blvd. W., Montreal, QC, Canada'] },
  { campus: 'SGW', code: 'LD', name: 'LD Building', addresses: ['1424 Bishop St., Montreal, QC, Canada'] },
  { campus: 'SGW', code: 'LS', name: 'Learning Square', addresses: ['1535 De Maisonneuve Blvd. W., Montreal, QC, Canada'] },
  { campus: 'SGW', code: 'M', name: 'M Annex', addresses: ['2135 Mackay St., Montreal, QC, Canada'] },
  { campus: 'SGW', code: 'MB', name: 'John Molson Building', addresses: ['1450 Guy St., Montreal, QC, Canada'] },
  { campus: 'SGW', code: 'MI', name: 'MI Annex', addresses: ['2130 Bishop St., Montreal, QC, Canada'] },
  { campus: 'SGW', code: 'MU', name: 'MU Annex', addresses: ['2170 Bishop St., Montreal, QC, Canada'] },
  { campus: 'SGW', code: 'P', name: 'P Annex', addresses: ['2020 Mackay St., Montreal, QC, Canada'] },
  { campus: 'SGW', code: 'PR', name: 'PR Annex', addresses: ['2100 Mackay St., Montreal, QC, Canada'] },
  { campus: 'SGW', code: 'Q', name: 'Q Annex', addresses: ['2010 Mackay St., Montreal, QC, Canada'] },
  { campus: 'SGW', code: 'R', name: 'R Annex', addresses: ['2050 Mackay St., Montreal, QC, Canada'] },
  { campus: 'SGW', code: 'RR', name: 'RR Annex', addresses: ['2040 Mackay St., Montreal, QC, Canada'] },
  { campus: 'SGW', code: 'S', name: 'S Annex', addresses: ['2145 Mackay St., Montreal, QC, Canada'] },
  { campus: 'SGW', code: 'SB', name: 'Samuel Bronfman Building', addresses: ['1590 Docteur-Penfield, Montreal, QC, Canada'] },
  { campus: 'SGW', code: 'T', name: 'T Annex', addresses: ['2030 Mackay St., Montreal, QC, Canada'] },
  { campus: 'SGW', code: 'TD', name: 'Toronto-Dominion Building', addresses: ['1410 Guy St., Montreal, QC, Canada'] },
  { campus: 'SGW', code: 'V', name: 'V Annex', addresses: ['2110 Mackay St., Montreal, QC, Canada'] },
  { campus: 'SGW', code: 'VA', name: 'Visual Arts Building', addresses: ['1395 René-Lévesque Blvd. W., Montreal, QC, Canada'] },
  { campus: 'SGW', code: 'X', name: 'X Annex', addresses: ['2080 Mackay St., Montreal, QC, Canada'] },
  { campus: 'SGW', code: 'Z', name: 'Z Annex', addresses: ['2090 Mackay St., Montreal, QC, Canada'] },

  // Loyola
  { campus: 'LOY', code: 'AD', name: 'Administration Building', addresses: ['7141 Sherbrooke St. W., Montreal, QC, Canada'] },
  { campus: 'LOY', code: 'BB', name: 'BB Annex', addresses: ['3502 Belmore Ave., Montreal, QC, Canada'] },
  { campus: 'LOY', code: 'BH', name: 'BH Annex', addresses: ['3500 Belmore Ave., Montreal, QC, Canada'] },
  { campus: 'LOY', code: 'CC', name: 'Central Building', addresses: ['7141 Sherbrooke St. W., Montreal, QC, Canada'] },
  { campus: 'LOY', code: 'CJ', name: 'Communication Studies and Journalism Building', addresses: ['7141 Sherbrooke St. W., Montreal, QC, Canada'] },
  { campus: 'LOY', code: 'DO', name: 'Stinger Dome', addresses: ['7141 Sherbrooke St. W., Montreal, QC, Canada'] },
  { campus: 'LOY', code: 'FC', name: 'F.C. Smith Building', addresses: ['7141 Sherbrooke St. W., Montreal, QC, Canada'] },
  { campus: 'LOY', code: 'GE', name: 'Centre for Structural and Functional Genomics', addresses: ['7141 Sherbrooke St. W., Montreal, QC, Canada'] },
  { campus: 'LOY', code: 'HA', name: 'Hingston Hall, wing HA', addresses: ['7141 Sherbrooke St. W., Montreal, QC, Canada'] },
  { campus: 'LOY', code: 'HB', name: 'Hingston Hall, wing HB', addresses: ['7141 Sherbrooke St. W., Montreal, QC, Canada'] },
  { campus: 'LOY', code: 'HC', name: 'Hingston Hall, wing HC', addresses: ['7141 Sherbrooke St. W., Montreal, QC, Canada'] },
  { campus: 'LOY', code: 'HU', name: 'Applied Science Hub', addresses: ['7141 Sherbrooke St. W., Montreal, QC, Canada'] },
  { campus: 'LOY', code: 'JR', name: 'Jesuit Residence', addresses: ['7141 Sherbrooke St. W., Montreal, QC, Canada'] },
  { campus: 'LOY', code: 'PC', name: 'PERFORM Centre', addresses: ['7200 Sherbrooke St. W., Montreal, QC, Canada'] },
  { campus: 'LOY', code: 'PS', name: 'Physical Services Building', addresses: ['7141 Sherbrooke St. W., Montreal, QC, Canada'] },
  { campus: 'LOY', code: 'PT', name: 'Oscar Peterson Concert Hall', addresses: ['7141 Sherbrooke St. W., Montreal, QC, Canada'] },
  { campus: 'LOY', code: 'PY', name: 'Psychology Building', addresses: ['7141 Sherbrooke St. W., Montreal, QC, Canada'] },
  { campus: 'LOY', code: 'QA', name: 'Quadrangle', addresses: ['7141 Sherbrooke St. W., Montreal, QC, Canada'] },
  { campus: 'LOY', code: 'RA', name: 'Recreation and Athletics Complex', addresses: ['7200 Sherbrooke St. W., Montreal, QC, Canada'] },
  { campus: 'LOY', code: 'RF', name: 'Loyola Jesuit Hall and Conference Centre', addresses: ['7141 Sherbrooke St. W., Montreal, QC, Canada'] },
  { campus: 'LOY', code: 'SC', name: 'Student Centre', addresses: ['7141 Sherbrooke St. W., Montreal, QC, Canada'] },
  { campus: 'LOY', code: 'SH', name: 'Future Buildings Laboratory', addresses: ['7141 Sherbrooke St. W., Montreal, QC, Canada'] },
  { campus: 'LOY', code: 'SI', name: 'St. Ignatius of Loyola Church', addresses: ['4455 West Broadway St., Montreal, QC, Canada'] },
  { campus: 'LOY', code: 'SP', name: 'Richard J. Renaud Science Complex', addresses: ['7141 Sherbrooke St. W., Montreal, QC, Canada'] },
  { campus: 'LOY', code: 'TA', name: 'Terrebonne Building', addresses: ['7079 de Terrebonne St., Montreal, QC, Canada'] },
  { campus: 'LOY', code: 'VE', name: 'Vanier Extension', addresses: ['7141 Sherbrooke St. W., Montreal, QC, Canada'] },
  { campus: 'LOY', code: 'VL', name: 'Vanier Library Building', addresses: ['7141 Sherbrooke St. W., Montreal, QC, Canada'] },
];

export const buildingsByCampus: Record<CampusId, Building[]> = {
  SGW: buildings.filter((b) => b.campus === 'SGW'),
  LOY: buildings.filter((b) => b.campus === 'LOY'),
};
