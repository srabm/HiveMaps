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
  latitude: string;
  longitude: string;
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
    label: 'Loyola',
    name: 'Loyola',
    center: [-73.6406, 45.4583],
    zoom: 16.0,
  },
};

export const buildings: Building[] = [
  // SGW
  { campus: 'SGW', code: 'B', name: 'B Annex', addresses: ['2160 Bishop St., Montreal, QC, Canada'], latitude: "45.497864",longitude: "-73.579475" },
  { campus: 'SGW', code: 'CI', name: 'CI Annex', addresses: ['2149 Mackay St., Montreal, QC, Canada'] , latitude: "45.497424",longitude: "-73.579931"  },
  { campus: 'SGW', code: 'CL', name: 'CL Annex', addresses: ['1665 Ste-Catherine St. W., Montreal, QC, Canada'] , latitude: "45.522172",longitude: "-73.553095"  },
  { campus: 'SGW', code: 'D', name: 'D Annex', addresses: ['2140 Bishop St., Montreal, QC, Canada'], latitude: "45.497788",longitude: "-73.579321"  },
  { campus: 'SGW', code: 'EN', name: 'EN Annex', addresses: ['2070 Mackay St., Montreal, QC, Canada'], latitude: "45.4968138",longitude: "-73.5796195"  },
  { campus: 'SGW', code: 'ER', name: 'ER Building', addresses: ['2155 Guy St., Montreal, QC, Canada'] , latitude: "45.4963286",longitude: "-73.5801041" },
  {
    campus: 'SGW',
    code: 'EV',
    name: 'Engineering, Computer Science and Visual Arts Integrated Complex',
    addresses: ['1515 Ste-Catherine St. W., Montreal, QC, Canada'],
    latitude: "45.4956206",longitude: "-73.5782531"
  },
  { campus: 'SGW', code: 'FA', name: 'FA Annex', addresses: ['2060 Mackay St., Montreal, QC, Canada'], latitude: "45.4968256",longitude: "-73.5794809"  },
  { campus: 'SGW', code: 'FB-1', name: 'Faubourg Building', addresses: ['1250 Guy St., Montreal, QC, Canada'] , latitude: "45.4946761",longitude: "-73.5776174" }, //
  { campus: 'SGW', code: 'FB-2', name: 'Faubourg Building', addresses: ['1600 Ste-Catherine St. W., Montreal, QC, Canada'] , latitude: "45.494724",longitude: "-73.5779688" }, //
  { campus: 'SGW', code: 'FG', name: 'Faubourg Ste-Catherine Building', addresses: ['1610 Ste-Catherine St. W., Montreal, QC, Canada'] , latitude: "45.494278",longitude: "-73.578342" },
  { campus: 'SGW', code: 'GA', name: 'Grey Nuns Annex', addresses: ['1211-1215 St-Mathieu St., Montreal, QC, Canada'] , latitude: "45.4939745",longitude: "-73.578136" },
  { campus: 'SGW', code: 'GM', name: 'Guy-De Maisonneuve Building', addresses: ['1550 De Maisonneuve Blvd. W., Montreal, QC, Canada'] , latitude: "45.4955702",longitude: "-73.5782305" },
  { campus: 'SGW', code: 'GN', name: 'Grey Nuns Building', addresses: ['1190 Guy St., Montreal, QC, Canada', '1175 St-Mathieu St., Montreal, QC, Canada'] , latitude: "45.4940284",longitude: "-73.5764162" }, //
  { campus: 'SGW', code: 'GS', name: 'GS Building', addresses: ['1538 Sherbrooke St. W., Montreal, QC, Canada'] , latitude: "45.4966775",longitude: "-73.5811858" },
  { campus: 'SGW', code: 'H', name: 'Henry F. Hall Building', addresses: ['1455 De Maisonneuve Blvd. W., Montreal, QC, Canada'] , latitude: "45.49727",longitude: "-73.57892" },
  { campus: 'SGW', code: 'K', name: 'K Annex', addresses: ['2150 Bishop St., Montreal, QC, Canada'] , latitude: "45.497824",longitude: "-73.5794036" },
  { campus: 'SGW', code: 'LB', name: 'J.W. McConnell Building', addresses: ['1400 De Maisonneuve Blvd. W., Montreal, QC, Canada'] , latitude: "45.5209105",longitude: "-73.5556882" },
  { campus: 'SGW', code: 'LD', name: 'LD Building', addresses: ['1424 Bishop St., Montreal, QC, Canada'] , latitude: "45.4967035",longitude: "-73.5772674" },
  { campus: 'SGW', code: 'LS', name: 'Learning Square', addresses: ['1535 De Maisonneuve Blvd. W., Montreal, QC, Canada'] , latitude: "45.496119",longitude: "-73.5795387" },
  { campus: 'SGW', code: 'M', name: 'M Annex', addresses: ['2135 Mackay St., Montreal, QC, Canada'] , latitude: "45.4973486",longitude: "-73.5797574" },
  { campus: 'SGW', code: 'MB', name: 'John Molson Building', addresses: ['1450 Guy St., Montreal, QC, Canada'] , latitude: "45.49544",longitude: "-73.579191" },
  { campus: 'SGW', code: 'MI', name: 'MI Annex', addresses: ['2130 Bishop St., Montreal, QC, Canada'] , latitude: "45.497753",longitude: "-73.579254" },
  { campus: 'SGW', code: 'MU', name: 'MU Annex', addresses: ['2170 Bishop St., Montreal, QC, Canada'] , latitude: "45.4978963",longitude: "-73.579553" },
  { campus: 'SGW', code: 'P', name: 'P Annex', addresses: ['2020 Mackay St., Montreal, QC, Canada'] , latitude: "45.4966652",longitude: "-73.5791685" },
  { campus: 'SGW', code: 'PR', name: 'PR Annex', addresses: ['2100 Mackay St., Montreal, QC, Canada'] , latitude: "45.4969819",longitude: "-73.5798253" },
  { campus: 'SGW', code: 'Q', name: 'Q Annex', addresses: ['2010 Mackay St., Montreal, QC, Canada'] , latitude: "45.496627",longitude: "-73.579095" },
  { campus: 'SGW', code: 'R', name: 'R Annex', addresses: ['2050 Mackay St., Montreal, QC, Canada'] , latitude: "45.4967536",longitude: "-73.5793768" },
  { campus: 'SGW', code: 'RR', name: 'RR Annex', addresses: ['2040 Mackay St., Montreal, QC, Canada'] , latitude: "45.4967343",longitude: "-73.5793216" },
  { campus: 'SGW', code: 'S', name: 'S Annex', addresses: ['2145 Mackay St., Montreal, QC, Canada'] , latitude:"45.4973832",longitude: "-73.5798374" },
  { campus: 'SGW', code: 'SB', name: 'Samuel Bronfman Building', addresses: ['1590 Docteur-Penfield, Montreal, QC, Canada'] , latitude: "45.49658",longitude: "-73.5860658" },
  { campus: 'SGW', code: 'T', name: 'T Annex', addresses: ['2030 Mackay St., Montreal, QC, Canada'] , latitude: "45.4966998",longitude: "-73.5792395" },
  { campus: 'SGW', code: 'TD', name: 'Toronto-Dominion Building', addresses: ['1410 Guy St., Montreal, QC, Canada'] , latitude: "45.4951561",longitude: "-73.5784094" },
  { campus: 'SGW', code: 'V', name: 'V Annex', addresses: ['2110 Mackay St., Montreal, QC, Canada'] , latitude: "45.4970228",longitude: "-73.5799117" },
  { campus: 'SGW', code: 'VA', name: 'Visual Arts Building', addresses: ['1395 René-Lévesque Blvd. W., Montreal, QC, Canada'] , latitude: "45.4955249",longitude: "-73.5737943" },
  { campus: 'SGW', code: 'X', name: 'X Annex', addresses: ['2080 Mackay St., Montreal, QC, Canada'] , latitude: "45.4968783",longitude: "-73.5796701" },
  { campus: 'SGW', code: 'Z', name: 'Z Annex', addresses: ['2090 Mackay St., Montreal, QC, Canada'] , latitude: "45.4969322",longitude: "-73.5798168" },

  // Loyola
  { campus: 'LOY', code: 'AD', name: 'Administration Building', addresses: ['7141 Sherbrooke St. W., Montreal, QC, Canada'] , latitude: "45.4580395",longitude: "-73.6398195"  },
  { campus: 'LOY', code: 'BB', name: 'BB Annex', addresses: ['3502 Belmore Ave., Montreal, QC, Canada'] , latitude: "45.459762",longitude: "-73.639167"  },
  { campus: 'LOY', code: 'BH', name: 'BH Annex', addresses: ['3500 Belmore Ave., Montreal, QC, Canada'] , latitude: "45.4597136",longitude: "-73.6391706"  },
  { campus: 'LOY', code: 'CC', name: 'Central Building', addresses: ['7141 Sherbrooke St. W., Montreal, QC, Canada'] , latitude: "45.4582154",longitude: "-73.6404240"  },
  { campus: 'LOY', code: 'CJ', name: 'Communication Studies and Journalism Building', addresses: ['7141 Sherbrooke St. W., Montreal, QC, Canada'] , latitude: "45.4573688",longitude: "-73.6400431"  },
  { campus: 'LOY', code: 'DO', name: 'Stinger Dome', addresses: ['7200 Sherbrooke St. W., Montreal, QC, Canada'] , latitude: "45.4576962",longitude: "-73.6360896" },
  { campus: 'LOY', code: 'FC', name: 'F.C. Smith Building', addresses: ['7141 Sherbrooke St. W., Montreal, QC, Canada'] , latitude: "45.4584675",longitude: "-73.6393511"  },
  { campus: 'LOY', code: 'GE', name: 'Centre for Structural and Functional Genomics', addresses: ['7141 Sherbrooke St. W., Montreal, QC, Canada'] , latitude: "45.456969",longitude: "-73.6404347" },
  { campus: 'LOY', code: 'HA', name: 'Hingston Hall, wing HA', addresses: ['7141 Sherbrooke St. W., Montreal, QC, Canada'] , latitude: "45.4594534",longitude: "-73.6409658" },
  { campus: 'LOY', code: 'HB', name: 'Hingston Hall, wing HB', addresses: ['7141 Sherbrooke St. W., Montreal, QC, Canada'] , latitude: "45.4592577",longitude: "-73.6417490" },
  { campus: 'LOY', code: 'HC', name: 'Hingston Hall, wing HC', addresses: ['7141 Sherbrooke St. W., Montreal, QC, Canada'] , latitude: "45.4596565",longitude: "-73.6420226"  },
  { campus: 'LOY', code: 'HU', name: 'Applied Science Hub', addresses: ['7141 Sherbrooke St. W., Montreal, QC, Canada'] ,latitude: "45.4584976",longitude: "-73.6418027"  },
  { campus: 'LOY', code: 'JR', name: 'Jesuit Residence', addresses: ['7141 Sherbrooke St. W., Montreal, QC, Canada'] , latitude: "45.4584111",longitude: "-73.6432403" },
  { campus: 'LOY', code: 'PC', name: 'PERFORM Centre', addresses: ['7200 Sherbrooke St. W., Montreal, QC, Canada'] , latitude: "45.4569549",longitude: "-73.6373073" },
  { campus: 'LOY', code: 'PS', name: 'Physical Services Building', addresses: ['7141 Sherbrooke St. W., Montreal, QC, Canada'] , latitude: "45.4595851",longitude: "-73.6397535" },
  { campus: 'LOY', code: 'PT', name: 'Oscar Peterson Concert Hall', addresses: ['7141 Sherbrooke St. W., Montreal, QC, Canada'] , latitude: "45.4592728",longitude: "-73.6389971" },
  { campus: 'LOY', code: 'PY', name: 'Psychology Building', addresses: ['7141 Sherbrooke St. W., Montreal, QC, Canada'], latitude: "45.4589191",longitude: "-73.6405528"  },
  { campus: 'LOY', code: 'QA', name: 'Quadrangle', addresses: ['7141 Sherbrooke St. W., Montreal, QC, Canada'] , latitude: "45.4585691",longitude: "-73.6400592" },
  { campus: 'LOY', code: 'RA', name: 'Recreation and Athletics Complex', addresses: ['7200 Sherbrooke St. W., Montreal, QC, Canada'] , latitude: "45.4570467",longitude: "-73.6382162"  },
  { campus: 'LOY', code: 'RF', name: 'Loyola Jesuit Hall and Conference Centre', addresses: ['7141 Sherbrooke St. W., Montreal, QC, Canada'], latitude: "45.4586562",longitude: "-73.6409928"  },
  { campus: 'LOY', code: 'SC', name: 'Student Centre', addresses: ['7141 Sherbrooke St. W., Montreal, QC, Canada'] , latitude: "45.4590997",longitude: "-73.6391741" },
  { campus: 'LOY', code: 'SH', name: 'Future Buildings Laboratory', addresses: ['7141 Sherbrooke St. W., Montreal, QC, Canada'] , latitude: "45.4592577",longitude: "-73.6425161" },
  { campus: 'LOY', code: 'SI', name: 'St. Ignatius of Loyola Church', addresses: ['4455 West Broadway St., Montreal, QC, Canada'] , latitude: "45.4577094",longitude: "-73.6424699" },
  { campus: 'LOY', code: 'SP', name: 'Richard J. Renaud Science Complex', addresses: ['7141 Sherbrooke St. W., Montreal, QC, Canada'] , latitude: "45.4578426",longitude: "-73.6415682" },
  { campus: 'LOY', code: 'TA', name: 'Terrebonne Building', addresses: ['7079 de Terrebonne St., Montreal, QC, Canada'] , latitude: "45.4600217",longitude: "-73.6409942" },
  { campus: 'LOY', code: 'VE', name: 'Vanier Extension', addresses: ['7141 Sherbrooke St. W., Montreal, QC, Canada'] , latitude: "45.4590806",longitude: "-73.6387088" },
  { campus: 'LOY', code: 'VL', name: 'Vanier Library Building', addresses: ['7141 Sherbrooke St. W., Montreal, QC, Canada'] , latitude: "45.4590806",longitude: "-73.6387088" },
];

export const buildingsByCampus: Record<CampusId, Building[]> = {
  SGW: buildings.filter((b) => b.campus === 'SGW'),
  LOY: buildings.filter((b) => b.campus === 'LOY'),
};
