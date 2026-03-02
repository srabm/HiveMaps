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
  center: [number, number]; // [longitude, latitude]
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
    name: 'LOYOLA',
    center: [-73.6406, 45.4583],
    zoom: 16.0,
  },
};

export const buildings: Building[] = [
  {
    campus: 'SGW',
    code: 'B',
    name: 'B Annex',
    addresses: [ '2160 Bishop St., Montreal, QC, Canada' ],
    center: [ -73.579588, 45.497856 ]
  },
  {
    campus: 'SGW',
    code: 'CI',
    name: 'CI Annex',
    addresses: [ '2149 Mackay St., Montreal, QC, Canada' ],
    center: [ -73.579925, 45.497467 ]
  },
  {
    campus: 'SGW',
    code: 'CL',
    name: 'CL Annex',
    addresses: [ '1665 Ste-Catherine St. W., Montreal, QC, Canada' ],
    center: [ -73.579007, 45.494259 ]
  },
  {
    campus: 'SGW',
    code: 'D',
    name: 'D Annex',
    addresses: [ '2140 Bishop St., Montreal, QC, Canada' ],
    center: [ -73.579409, 45.497827 ]
  },
  {
    campus: 'SGW',
    code: 'EN',
    name: 'EN Annex',
    addresses: [ '2070 Mackay St., Montreal, QC, Canada' ],
    center: [ -73.579555, 45.496944 ]
  },
  {
    campus: 'SGW',
    code: 'ER',
    name: 'ER Building',
    addresses: [ '2155 Guy St., Montreal, QC, Canada' ],
    center: [ -73.57999, 45.496428 ]
  },
  {
    campus: 'SGW',
    code: 'EV',
    name: 'Engineering, Computer Science and Visual Arts Integrated Complex',
    addresses: [ '1515 Ste-Catherine St. W., Montreal, QC, Canada' ],
    center: [ -73.577997, 45.495376 ]
  },
  {
    campus: 'SGW',
    code: 'FA',
    name: 'FA Annex',
    addresses: [ '2060 Mackay St., Montreal, QC, Canada' ],
    center: [ -73.579468, 45.496874 ]
  },
  {
    campus: 'SGW',
    code: 'FB',
    name: 'Faubourg Building',
    addresses: [ '1250 Guy St., Montreal, QC, Canada' ],
    center: [ -73.577603, 45.494666 ]
  },
  {
    campus: 'SGW',
    code: 'FG',
    name: 'Faubourg Ste-Catherine Building',
    addresses: [ '1610 Ste-Catherine St. W., Montreal, QC, Canada' ],
    center: [ -73.578425, 45.494381 ]
  },
  {
    campus: 'SGW',
    code: 'GA',
    name: 'Grey Nuns Annex',
    addresses: [ '1211-1215 St-Mathieu St., Montreal, QC, Canada' ],
    center: [ -73.57787, 45.494123 ]
  },
  {
    campus: 'SGW',
    code: 'GM',
    name: 'Guy-De Maisonneuve Building',
    addresses: [ '1550 De Maisonneuve Blvd. W., Montreal, QC, Canada' ],
    center: [ -73.578824, 45.495983 ]
  },
  {
    campus: 'SGW',
    code: 'GN',
    name: 'Grey Nuns Building',
    addresses: [
      '1190 Guy St., Montreal, QC, Canada',
      '1175 St-Mathieu St., Montreal, QC, Canada'
    ],
    center: [ 0, 0 ]
  },
  {
    campus: 'SGW',
    code: 'GS',
    name: 'GS Building',
    addresses: [ '1538 Sherbrooke St. W., Montreal, QC, Canada' ],
    center: [ -73.581409, 45.496673 ]
  },
  {
    campus: 'SGW',
    code: 'H',
    name: 'Henry F. Hall Building',
    addresses: [ '1455 De Maisonneuve Blvd. W., Montreal, QC, Canada' ],
    center: [ -73.5788, 45.497092 ]
  },
  {
    campus: 'SGW',
    code: 'K',
    name: 'K Annex',
    addresses: [ '2150 Bishop St., Montreal, QC, Canada' ],
    center: [ -73.579531, 45.497777 ]
  },
  {
    campus: 'SGW',
    code: 'LB',
    name: 'J.W. McConnell Building',
    addresses: [ '1400 De Maisonneuve Blvd. W., Montreal, QC, Canada' ],
    center: [ -73.578009, 45.49705 ]
  },
  {
    campus: 'SGW',
    code: 'LD',
    name: 'LD Building',
    addresses: [ '1424 Bishop St., Montreal, QC, Canada' ],
    center: [ -73.577312, 45.496697 ]
  },
  {
    campus: 'SGW',
    code: 'LS',
    name: 'Learning Square',
    addresses: [ '1535 De Maisonneuve Blvd. W., Montreal, QC, Canada' ],
    center: [ -73.5795, 45.4964 ]
  },
  {
    campus: 'SGW',
    code: 'M',
    name: 'M Annex',
    addresses: [ '2135 Mackay St., Montreal, QC, Canada' ],
    center: [ -73.579777, 45.497368 ]
  },
  {
    campus: 'SGW',
    code: 'MB',
    name: 'John Molson Building',
    addresses: [ '1450 Guy St., Montreal, QC, Canada' ],
    center: [ -73.579044, 45.495304 ]
  },
  {
    campus: 'SGW',
    code: 'MI',
    name: 'MI Annex',
    addresses: [ '2130 Bishop St., Montreal, QC, Canada' ],
    center: [ -73.579261, 45.497807 ]
  },
  {
    campus: 'SGW',
    code: 'MU',
    name: 'MU Annex',
    addresses: [ '2170 Bishop St., Montreal, QC, Canada' ],
    center: [ -73.579506, 45.497963 ]
  },
  {
    campus: 'SGW',
    code: 'P',
    name: 'P Annex',
    addresses: [ '2020 Mackay St., Montreal, QC, Canada' ],
    center: [ -73.579113, 45.496745 ]
  },
  {
    campus: 'SGW',
    code: 'PR',
    name: 'PR Annex',
    addresses: [ '2100 Mackay St., Montreal, QC, Canada' ],
    center: [ -73.57979, 45.497066 ]
  },
  {
    campus: 'SGW',
    code: 'Q',
    name: 'Q Annex',
    addresses: [ '2010 Mackay St., Montreal, QC, Canada' ],
    center: [ -73.579094, 45.496648 ]
  },
  {
    campus: 'SGW',
    code: 'R',
    name: 'R Annex',
    addresses: [ '2050 Mackay St., Montreal, QC, Canada' ],
    center: [ -73.579389, 45.496826 ]
  },
  {
    campus: 'SGW',
    code: 'RR',
    name: 'RR Annex',
    addresses: [ '2040 Mackay St., Montreal, QC, Canada' ],
    center: [ -73.579259, 45.496796 ]
  },
  {
    campus: 'SGW',
    code: 'S',
    name: 'S Annex',
    addresses: [ '2145 Mackay St., Montreal, QC, Canada' ],
    center: [ -73.579851, 45.497423 ]
  },
  {
    campus: 'SGW',
    code: 'SB',
    name: 'Samuel Bronfman Building',
    addresses: [ '1590 Docteur-Penfield, Montreal, QC, Canada' ],
    center: [ -73.58609, 45.4966 ]
  },
  {
    campus: 'SGW',
    code: 'T',
    name: 'T Annex',
    addresses: [ '2030 Mackay St., Montreal, QC, Canada' ],
    center: [ -73.57927, 45.49671 ]
  },
  {
    campus: 'SGW',
    code: 'TD',
    name: 'Toronto-Dominion Building',
    addresses: [ '1410 Guy St., Montreal, QC, Canada' ],
    center: [ -73.578375, 45.495103 ]
  },
  {
    campus: 'SGW',
    code: 'V',
    name: 'V Annex',
    addresses: [ '2110 Mackay St., Montreal, QC, Canada' ],
    center: [ -73.579907, 45.497101 ]
  },
  {
    campus: 'SGW',
    code: 'VA',
    name: 'Visual Arts Building',
    addresses: [ '1395 René-Lévesque Blvd. W., Montreal, QC, Canada' ],
    center: [ -73.573795, 45.495543 ]
  },
  {
    campus: 'SGW',
    code: 'X',
    name: 'X Annex',
    addresses: [ '2080 Mackay St., Montreal, QC, Canada' ],
    center: [ -73.579593, 45.49694 ]
  },
  {
    campus: 'SGW',
    code: 'Z',
    name: 'Z Annex',
    addresses: [ '2090 Mackay St., Montreal, QC, Canada' ],
    center: [ -73.579705, 45.496981 ]
  },
  {
    campus: 'LOY',
    code: 'AD',
    name: 'Administration Building',
    addresses: [ '7141 Sherbrooke St. W., Montreal, QC, Canada' ],
    center: [ -73.639834, 45.457984 ]
  },
  {
    campus: 'LOY',
    code: 'BB',
    name: 'BB Annex',
    addresses: [ '3502 Belmore Ave., Montreal, QC, Canada' ],
    center: [ -73.639174, 45.459793 ]
  },
  {
    campus: 'LOY',
    code: 'BH',
    name: 'BH Annex',
    addresses: [ '3500 Belmore Ave., Montreal, QC, Canada' ],
    center: [ -73.639152, 45.459819 ]
  },
  {
    campus: 'LOY',
    code: 'CC',
    name: 'Central Building',
    addresses: [ '7141 Sherbrooke St. W., Montreal, QC, Canada' ],
    center: [ -73.6403, 45.458204 ]
  },
  {
    campus: 'LOY',
    code: 'CJ',
    name: 'Communication Studies and Journalism Building',
    addresses: [ '7141 Sherbrooke St. W., Montreal, QC, Canada' ],
    center: [ 0, 0 ]
  },
  {
    campus: 'LOY',
    code: 'DO',
    name: 'Stinger Dome',
    addresses: [ '7200 Sherbrooke St. W., Montreal, QC, Canada' ],
    center: [ 0, 0 ]
  },
  {
    campus: 'LOY',
    code: 'FC',
    name: 'F.C. Smith Building',
    addresses: [ '7141 Sherbrooke St. W., Montreal, QC, Canada' ],
    center: [ -73.639287, 45.458493 ]
  },
  {
    campus: 'LOY',
    code: 'GE',
    name: 'Centre for Structural and Functional Genomics',
    addresses: [ '7141 Sherbrooke St. W., Montreal, QC, Canada' ],
    center: [ -73.640432, 45.457017 ]
  },
  {
    campus: 'LOY',
    code: 'HA',
    name: 'Hingston Hall, wing HA',
    addresses: [ '7141 Sherbrooke St. W., Montreal, QC, Canada' ],
    center: [ -73.64127, 45.459356 ]
  },
  {
    campus: 'LOY',
    code: 'HB',
    name: 'Hingston Hall, wing HB',
    addresses: [ '7141 Sherbrooke St. W., Montreal, QC, Canada' ],
    center: [ -73.641849, 45.459308 ]
  },
  {
    campus: 'LOY',
    code: 'HC',
    name: 'Hingston Hall, wing HC',
    addresses: [ '7141 Sherbrooke St. W., Montreal, QC, Canada' ],
    center: [ -73.64208, 45.459663 ]
  },
  {
    campus: 'LOY',
    code: 'HU',
    name: 'Applied Science Hub',
    addresses: [ '7141 Sherbrooke St. W., Montreal, QC, Canada' ],
    center: [ -73.641921, 45.458513 ]
  },
  {
    campus: 'LOY',
    code: 'JR',
    name: 'Jesuit Residence',
    addresses: [ '7141 Sherbrooke St. W., Montreal, QC, Canada' ],
    center: [ -73.643235, 45.458432 ]
  },
  {
    campus: 'LOY',
    code: 'PC',
    name: 'PERFORM Centre',
    addresses: [ '7200 Sherbrooke St. W., Montreal, QC, Canada' ],
    center: [ -73.637683, 45.457088 ]
  },
  {
    campus: 'LOY',
    code: 'PS',
    name: 'Physical Services Building',
    addresses: [ '7141 Sherbrooke St. W., Montreal, QC, Canada' ],
    center: [ -73.639758, 45.459636 ]
  },
  {
    campus: 'LOY',
    code: 'PT',
    name: 'Oscar Peterson Concert Hall',
    addresses: [ '7141 Sherbrooke St. W., Montreal, QC, Canada' ],
    center: [ -73.638941, 45.459308 ]
  },
  {
    campus: 'LOY',
    code: 'PY',
    name: 'Psychology Building',
    addresses: [ '7141 Sherbrooke St. W., Montreal, QC, Canada' ],
    center: [ -73.640467, 45.458938 ]
  },
  {
    campus: 'LOY',
    code: 'QA',
    name: 'Quadrangle',
    addresses: [ '7141 Sherbrooke St. W., Montreal, QC, Canada' ],
    center: [ 0, 0 ]
  },
  {
    campus: 'LOY',
    code: 'RA',
    name: 'Recreation and Athletics Complex',
    addresses: [ '7200 Sherbrooke St. W., Montreal, QC, Canada' ],
    center: [ -73.63761, 45.456774 ]
  },
  {
    campus: 'LOY',
    code: 'RF',
    name: 'Loyola Jesuit Hall and Conference Centre',
    addresses: [ '7141 Sherbrooke St. W., Montreal, QC, Canada' ],
    center: [ -73.641028, 45.458489 ]
  },
  {
    campus: 'LOY',
    code: 'SC',
    name: 'Student Centre',
    addresses: [ '7141 Sherbrooke St. W., Montreal, QC, Canada' ],
    center: [ -73.639251, 45.459131 ]
  },
  {
    campus: 'LOY',
    code: 'SH',
    name: 'Future Buildings Laboratory',
    addresses: [ '7141 Sherbrooke St. W., Montreal, QC, Canada' ],
    center: [ -73.642478, 45.459298 ]
  },
  {
    campus: 'LOY',
    code: 'SI',
    name: 'St. Ignatius of Loyola Church',
    addresses: [ '4455 West Broadway St., Montreal, QC, Canada' ],
    center: [ 0, 0 ]
  },
  {
    campus: 'LOY',
    code: 'SP',
    name: 'Richard J. Renaud Science Complex',
    addresses: [ '7141 Sherbrooke St. W., Montreal, QC, Canada' ],
    center: [ -73.641565, 45.457881 ]
  },
  {
    campus: 'LOY',
    code: 'TA',
    name: 'Terrebonne Building',
    addresses: [ '7079 de Terrebonne St., Montreal, QC, Canada' ],
    center: [ -73.640897, 45.459992 ]
  },
  {
    campus: 'LOY',
    code: 'VE',
    name: 'Vanier Extension',
    addresses: [ '7141 Sherbrooke St. W., Montreal, QC, Canada' ],
    center: [ -73.638606, 45.459026 ]
  },
  {
    campus: 'LOY',
    code: 'VL',
    name: 'Vanier Library Building',
    addresses: [ '7141 Sherbrooke St. W., Montreal, QC, Canada' ],
    center: [ -73.638606, 45.459026 ]
  }
];

export const buildingsByCampus: Record<CampusId, Building[]> = {
  SGW: buildings.filter((b) => b.campus === 'SGW'),
  LOY: buildings.filter((b) => b.campus === 'LOY'),
};
