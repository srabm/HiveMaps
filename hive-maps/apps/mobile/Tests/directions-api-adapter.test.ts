import {convertGoogleMapsResponse, convertMapboxResponse} from "@/services/maps/directions-api-adapter";

const googleMapsResponse = {
    "routes": [
        {
            "legs": [
                {
                    "steps": [
                        {
                            "distanceMeters": 169,
                            "staticDuration": "141s",
                            "polyline": {
                                "encodedPolyline": "}cutGnxa`MzBnBn@j@t@VZB"
                            },
                            "startLocation": {
                                "latLng": {
                                    "latitude": 45.4971071,
                                    "longitude": -73.57848349999999
                                }
                            },
                            "endLocation": {
                                "latLng": {
                                    "latitude": 45.4958434,
                                    "longitude": -73.5794044
                                }
                            },
                            "navigationInstruction": {
                                "maneuver": "DEPART",
                                "instructions": "Head southwest on Blvd. De Maisonneuve Ouest toward Rue Mackay"
                            },
                            "localizedValues": {
                                "distance": {
                                    "text": "0.2 km"
                                },
                                "staticDuration": {
                                    "text": "2 mins"
                                }
                            },
                            "travelMode": "WALK"
                        },
                        {
                            "distanceMeters": 137,
                            "staticDuration": "116s",
                            "polyline": {
                                "encodedPolyline": "_|ttGf~a`MF_@R_@jBuFLW"
                            },
                            "startLocation": {
                                "latLng": {
                                    "latitude": 45.4958434,
                                    "longitude": -73.5794044
                                }
                            },
                            "endLocation": {
                                "latLng": {
                                    "latitude": 45.495086,
                                    "longitude": -73.5777267
                                }
                            },
                            "navigationInstruction": {
                                "maneuver": "TURN_LEFT",
                                "instructions": "Turn left onto Rue Guy"
                            },
                            "localizedValues": {
                                "distance": {
                                    "text": "0.1 km"
                                },
                                "staticDuration": {
                                    "text": "2 mins"
                                }
                            },
                            "travelMode": "WALK"
                        },
                        {
                            "distanceMeters": 101,
                            "staticDuration": "102s",
                            "polyline": {
                                "encodedPolyline": "iwttGxsa`MxA~A`AlA"
                            },
                            "startLocation": {
                                "latLng": {
                                    "latitude": 45.495086,
                                    "longitude": -73.5777267
                                }
                            },
                            "endLocation": {
                                "latLng": {
                                    "latitude": 45.4943138,
                                    "longitude": -73.578597899999991
                                }
                            },
                            "navigationInstruction": {
                                "maneuver": "TURN_RIGHT",
                                "instructions": "Turn right onto Rue Sainte-Catherine O\nDestination will be on the left"
                            },
                            "localizedValues": {
                                "distance": {
                                    "text": "0.1 km"
                                },
                                "staticDuration": {
                                    "text": "2 mins"
                                }
                            },
                            "travelMode": "WALK"
                        }
                    ]
                }
            ],
            "distanceMeters": 407,
            "duration": "358s",
            "polyline": {
                "encodedPolyline": "}cutGnxa`MzBnBn@j@t@VZBF_@R_@jBuFLWxA~A`AlA"
            }
        }
    ]
}


const mapboxResponse = {
    "routes": [
        {
            "weight_name": "pedestrian",
            "weight": 323.438,
            "duration": 287.621,
            "distance": 404.684,
            "legs": [
                {
                    "via_waypoints": [],
                    "admins": [
                        {
                            "iso_3166_1_alpha3": "CAN",
                            "iso_3166_1": "CA"
                        }
                    ],
                    "weight": 323.438,
                    "duration": 287.621,
                    "steps": [
                        {
                            "intersections": [
                                {
                                    "entry": [
                                        true
                                    ],
                                    "bearings": [
                                        215
                                    ],
                                    "duration": 8.349,
                                    "mapbox_streets_v8": {
                                        "class": "service"
                                    },
                                    "is_urban": true,
                                    "admin_index": 0,
                                    "out": 0,
                                    "weight": 8.349,
                                    "geometry_index": 0,
                                    "location": [
                                        -73.578528,
                                        45.497116
                                    ]
                                },
                                {
                                    "bearings": [
                                        35,
                                        213,
                                        287
                                    ],
                                    "entry": [
                                        false,
                                        true,
                                        true
                                    ],
                                    "in": 0,
                                    "mapbox_streets_v8": {
                                        "class": "service"
                                    },
                                    "is_urban": true,
                                    "admin_index": 0,
                                    "out": 1,
                                    "geometry_index": 1,
                                    "location": [
                                        -73.57861,
                                        45.497034
                                    ]
                                }
                            ],
                            "maneuver": {
                                "type": "depart",
                                "instruction": "Walk southwest on Boulevard De Maisonneuve Ouest.",
                                "bearing_after": 215,
                                "bearing_before": 0,
                                "location": [
                                    -73.578528,
                                    45.497116
                                ]
                            },
                            "name": "Boulevard De Maisonneuve Ouest",
                            "duration": 33.101,
                            "distance": 44.259,
                            "driving_side": "right",
                            "weight": 33.101,
                            "mode": "walking",
                            "geometry": "_dutGxxa`MPNd@b@JH"
                        },
                        {
                            "intersections": [
                                {
                                    "bearings": [
                                        33,
                                        176,
                                        306
                                    ],
                                    "entry": [
                                        false,
                                        true,
                                        true
                                    ],
                                    "in": 0,
                                    "turn_weight": 5,
                                    "mapbox_streets_v8": {
                                        "class": "service"
                                    },
                                    "is_urban": true,
                                    "admin_index": 0,
                                    "out": 1,
                                    "geometry_index": 3,
                                    "location": [
                                        -73.578841,
                                        45.496784
                                    ]
                                }
                            ],
                            "maneuver": {
                                "type": "turn",
                                "instruction": "Bear left onto the walkway.",
                                "modifier": "slight left",
                                "bearing_after": 176,
                                "bearing_before": 213,
                                "location": [
                                    -73.578841,
                                    45.496784
                                ]
                            },
                            "name": "",
                            "duration": 2.831,
                            "distance": 4.02,
                            "driving_side": "right",
                            "weight": 7.831,
                            "mode": "walking",
                            "geometry": "{autGvza`MD?"
                        },
                        {
                            "intersections": [
                                {
                                    "entry": [
                                        true,
                                        true,
                                        false
                                    ],
                                    "in": 2,
                                    "bearings": [
                                        126,
                                        199,
                                        356
                                    ],
                                    "duration": 1.08,
                                    "turn_weight": 5,
                                    "mapbox_streets_v8": {
                                        "class": "service"
                                    },
                                    "is_urban": true,
                                    "admin_index": 0,
                                    "out": 0,
                                    "weight": 6.08,
                                    "geometry_index": 4,
                                    "location": [
                                        -73.578837,
                                        45.496748
                                    ]
                                },
                                {
                                    "bearings": [
                                        124,
                                        306
                                    ],
                                    "entry": [
                                        true,
                                        false
                                    ],
                                    "in": 1,
                                    "mapbox_streets_v8": {
                                        "class": "service"
                                    },
                                    "is_urban": true,
                                    "admin_index": 0,
                                    "out": 0,
                                    "geometry_index": 5,
                                    "location": [
                                        -73.578821,
                                        45.49674
                                    ]
                                }
                            ],
                            "maneuver": {
                                "type": "turn",
                                "instruction": "Turn left onto Rue Mackay.",
                                "modifier": "left",
                                "bearing_after": 126,
                                "bearing_before": 176,
                                "location": [
                                    -73.578837,
                                    45.496748
                                ]
                            },
                            "name": "Rue Mackay",
                            "duration": 5.985,
                            "distance": 8.499,
                            "driving_side": "right",
                            "weight": 10.985,
                            "mode": "walking",
                            "geometry": "uautGvza`M@CDM"
                        },
                        {
                            "intersections": [
                                {
                                    "entry": [
                                        true,
                                        true,
                                        true,
                                        false
                                    ],
                                    "in": 3,
                                    "bearings": [
                                        23,
                                        125,
                                        199,
                                        304
                                    ],
                                    "duration": 3.157,
                                    "turn_weight": 5,
                                    "mapbox_streets_v8": {
                                        "class": "tertiary"
                                    },
                                    "is_urban": true,
                                    "admin_index": 0,
                                    "out": 2,
                                    "weight": 8.157,
                                    "geometry_index": 6,
                                    "location": [
                                        -73.578747,
                                        45.496705
                                    ]
                                },
                                {
                                    "entry": [
                                        false,
                                        true,
                                        true,
                                        true
                                    ],
                                    "in": 0,
                                    "bearings": [
                                        19,
                                        125,
                                        204,
                                        303
                                    ],
                                    "duration": 4.611,
                                    "turn_weight": 1,
                                    "turn_duration": 1,
                                    "mapbox_streets_v8": {
                                        "class": "tertiary"
                                    },
                                    "is_urban": true,
                                    "admin_index": 0,
                                    "out": 2,
                                    "weight": 4.611,
                                    "geometry_index": 7,
                                    "location": [
                                        -73.578766,
                                        45.496667
                                    ]
                                },
                                {
                                    "entry": [
                                        false,
                                        true,
                                        true,
                                        true
                                    ],
                                    "in": 0,
                                    "bearings": [
                                        24,
                                        125,
                                        214,
                                        306
                                    ],
                                    "duration": 29.221,
                                    "turn_weight": 1,
                                    "turn_duration": 1,
                                    "mapbox_streets_v8": {
                                        "class": "tertiary"
                                    },
                                    "is_urban": true,
                                    "admin_index": 0,
                                    "out": 2,
                                    "weight": 29.221,
                                    "geometry_index": 8,
                                    "location": [
                                        -73.578793,
                                        45.496625
                                    ]
                                },
                                {
                                    "entry": [
                                        false,
                                        true,
                                        true,
                                        true
                                    ],
                                    "in": 0,
                                    "bearings": [
                                        34,
                                        125,
                                        209,
                                        304
                                    ],
                                    "duration": 23.831,
                                    "turn_weight": 1,
                                    "turn_duration": 1,
                                    "mapbox_streets_v8": {
                                        "class": "tertiary"
                                    },
                                    "is_urban": true,
                                    "admin_index": 0,
                                    "out": 2,
                                    "weight": 23.831,
                                    "geometry_index": 9,
                                    "location": [
                                        -73.579079,
                                        45.496326
                                    ]
                                },
                                {
                                    "entry": [
                                        false,
                                        true,
                                        true
                                    ],
                                    "in": 0,
                                    "bearings": [
                                        20,
                                        188,
                                        286
                                    ],
                                    "duration": 17.114,
                                    "mapbox_streets_v8": {
                                        "class": "tertiary"
                                    },
                                    "is_urban": true,
                                    "admin_index": 0,
                                    "out": 1,
                                    "weight": 17.114,
                                    "geometry_index": 17,
                                    "location": [
                                        -73.579249,
                                        45.496063
                                    ]
                                },
                                {
                                    "entry": [
                                        false,
                                        true
                                    ],
                                    "in": 0,
                                    "bearings": [
                                        8,
                                        186
                                    ],
                                    "duration": 2.05,
                                    "traffic_signal": true,
                                    "mapbox_streets_v8": {
                                        "class": "tertiary"
                                    },
                                    "is_urban": true,
                                    "admin_index": 0,
                                    "out": 1,
                                    "weight": 2.05,
                                    "geometry_index": 19,
                                    "location": [
                                        -73.579299,
                                        45.495823
                                    ]
                                },
                                {
                                    "entry": [
                                        false,
                                        true,
                                        true,
                                        true
                                    ],
                                    "in": 0,
                                    "bearings": [
                                        6,
                                        125,
                                        187,
                                        306
                                    ],
                                    "duration": 10.16,
                                    "turn_weight": 1,
                                    "turn_duration": 1,
                                    "mapbox_streets_v8": {
                                        "class": "tertiary"
                                    },
                                    "is_urban": true,
                                    "admin_index": 0,
                                    "out": 2,
                                    "weight": 10.16,
                                    "geometry_index": 20,
                                    "location": [
                                        -73.579303,
                                        45.495797
                                    ]
                                },
                                {
                                    "entry": [
                                        false,
                                        true,
                                        true,
                                        true
                                    ],
                                    "in": 0,
                                    "bearings": [
                                        7,
                                        122,
                                        191,
                                        303
                                    ],
                                    "duration": 7.947,
                                    "turn_weight": 2,
                                    "turn_duration": 2,
                                    "mapbox_streets_v8": {
                                        "class": "tertiary"
                                    },
                                    "is_urban": true,
                                    "admin_index": 0,
                                    "out": 2,
                                    "weight": 7.947,
                                    "geometry_index": 21,
                                    "location": [
                                        -73.579323,
                                        45.495681
                                    ]
                                },
                                {
                                    "entry": [
                                        false,
                                        true,
                                        true,
                                        true
                                    ],
                                    "in": 0,
                                    "bearings": [
                                        11,
                                        122,
                                        218,
                                        300
                                    ],
                                    "duration": 40.533,
                                    "turn_weight": 1,
                                    "turn_duration": 1,
                                    "mapbox_streets_v8": {
                                        "class": "tertiary"
                                    },
                                    "is_urban": true,
                                    "admin_index": 0,
                                    "out": 2,
                                    "weight": 40.533,
                                    "geometry_index": 25,
                                    "location": [
                                        -73.579344,
                                        45.495607
                                    ]
                                },
                                {
                                    "bearings": [
                                        39,
                                        130,
                                        219,
                                        308
                                    ],
                                    "entry": [
                                        false,
                                        true,
                                        true,
                                        true
                                    ],
                                    "in": 0,
                                    "turn_weight": 1,
                                    "turn_duration": 1,
                                    "mapbox_streets_v8": {
                                        "class": "tertiary"
                                    },
                                    "is_urban": true,
                                    "admin_index": 0,
                                    "out": 2,
                                    "geometry_index": 28,
                                    "location": [
                                        -73.579792,
                                        45.495213
                                    ]
                                }
                            ],
                            "maneuver": {
                                "type": "turn",
                                "instruction": "Turn right onto Boulevard De Maisonneuve Ouest.",
                                "modifier": "right",
                                "bearing_after": 199,
                                "bearing_before": 124,
                                "location": [
                                    -73.578747,
                                    45.496705
                                ]
                            },
                            "name": "Boulevard De Maisonneuve Ouest",
                            "duration": 143.235,
                            "distance": 194.735,
                            "driving_side": "right",
                            "weight": 148.235,
                            "mode": "walking",
                            "geometry": "mautGdza`MFBHBx@x@LJFDBBD@BBD@FBB?B@j@FB?VB@?B@B?B@B@@@hAtADF"
                        },
                        {
                            "intersections": [
                                {
                                    "entry": [
                                        false,
                                        true,
                                        true
                                    ],
                                    "in": 0,
                                    "bearings": [
                                        39,
                                        130,
                                        218
                                    ],
                                    "duration": 3.928,
                                    "turn_weight": 5,
                                    "mapbox_streets_v8": {
                                        "class": "street_limited"
                                    },
                                    "is_urban": true,
                                    "admin_index": 0,
                                    "out": 1,
                                    "weight": 8.928,
                                    "geometry_index": 29,
                                    "location": [
                                        -73.579833,
                                        45.495177
                                    ]
                                },
                                {
                                    "entry": [
                                        false,
                                        true,
                                        false,
                                        false
                                    ],
                                    "in": 3,
                                    "bearings": [
                                        39,
                                        129,
                                        221,
                                        310
                                    ],
                                    "duration": 3.12,
                                    "turn_weight": 1,
                                    "turn_duration": 1,
                                    "mapbox_streets_v8": {
                                        "class": "street_limited"
                                    },
                                    "is_urban": true,
                                    "admin_index": 0,
                                    "out": 1,
                                    "weight": 3.12,
                                    "geometry_index": 30,
                                    "location": [
                                        -73.579778,
                                        45.495145
                                    ]
                                },
                                {
                                    "entry": [
                                        true,
                                        true,
                                        true,
                                        false
                                    ],
                                    "in": 3,
                                    "bearings": [
                                        38,
                                        130,
                                        220,
                                        309
                                    ],
                                    "duration": 17.35,
                                    "turn_weight": 1,
                                    "turn_duration": 1,
                                    "mapbox_streets_v8": {
                                        "class": "street_limited"
                                    },
                                    "is_urban": true,
                                    "admin_index": 0,
                                    "out": 1,
                                    "weight": 18.168,
                                    "geometry_index": 31,
                                    "location": [
                                        -73.579748,
                                        45.495128
                                    ]
                                },
                                {
                                    "entry": [
                                        true,
                                        true,
                                        false
                                    ],
                                    "in": 2,
                                    "bearings": [
                                        129,
                                        220,
                                        310
                                    ],
                                    "duration": 2.978,
                                    "mapbox_streets_v8": {
                                        "class": "street_limited"
                                    },
                                    "is_urban": true,
                                    "admin_index": 0,
                                    "out": 0,
                                    "weight": 2.978,
                                    "geometry_index": 33,
                                    "location": [
                                        -73.579479,
                                        45.494971
                                    ]
                                },
                                {
                                    "entry": [
                                        true,
                                        true,
                                        false
                                    ],
                                    "in": 2,
                                    "bearings": [
                                        39,
                                        130,
                                        309
                                    ],
                                    "duration": 24.094,
                                    "mapbox_streets_v8": {
                                        "class": "street_limited"
                                    },
                                    "is_urban": true,
                                    "admin_index": 0,
                                    "out": 1,
                                    "weight": 24.094,
                                    "geometry_index": 34,
                                    "location": [
                                        -73.579437,
                                        45.494947
                                    ]
                                },
                                {
                                    "entry": [
                                        true,
                                        true,
                                        false
                                    ],
                                    "in": 2,
                                    "bearings": [
                                        129,
                                        220,
                                        310
                                    ],
                                    "duration": 2.978,
                                    "mapbox_streets_v8": {
                                        "class": "street_limited"
                                    },
                                    "is_urban": true,
                                    "admin_index": 0,
                                    "out": 0,
                                    "weight": 2.978,
                                    "geometry_index": 35,
                                    "location": [
                                        -73.579062,
                                        45.494729
                                    ]
                                },
                                {
                                    "entry": [
                                        true,
                                        true,
                                        false
                                    ],
                                    "in": 2,
                                    "bearings": [
                                        41,
                                        130,
                                        309
                                    ],
                                    "duration": 25.563,
                                    "mapbox_streets_v8": {
                                        "class": "street_limited"
                                    },
                                    "is_urban": true,
                                    "admin_index": 0,
                                    "out": 1,
                                    "weight": 25.563,
                                    "geometry_index": 36,
                                    "location": [
                                        -73.57902,
                                        45.494705
                                    ]
                                },
                                {
                                    "bearings": [
                                        35,
                                        130,
                                        215,
                                        310
                                    ],
                                    "entry": [
                                        true,
                                        true,
                                        true,
                                        false
                                    ],
                                    "in": 3,
                                    "turn_weight": 1,
                                    "turn_duration": 1,
                                    "mapbox_streets_v8": {
                                        "class": "street_limited"
                                    },
                                    "is_urban": true,
                                    "admin_index": 0,
                                    "out": 1,
                                    "geometry_index": 37,
                                    "location": [
                                        -73.578623,
                                        45.494473
                                    ]
                                }
                            ],
                            "maneuver": {
                                "type": "turn",
                                "instruction": "Turn left onto Rue Pierce.",
                                "modifier": "left",
                                "bearing_after": 130,
                                "bearing_before": 219,
                                "location": [
                                    -73.579833,
                                    45.495177
                                ]
                            },
                            "name": "Rue Pierce",
                            "duration": 86.789,
                            "distance": 130.912,
                            "driving_side": "right",
                            "weight": 92.606,
                            "mode": "walking",
                            "geometry": "{wttG|`b`MDIBE@C\\q@BGj@kABGn@oAFO"
                        },
                        {
                            "intersections": [
                                {
                                    "bearings": [
                                        39,
                                        221,
                                        310
                                    ],
                                    "entry": [
                                        true,
                                        true,
                                        false
                                    ],
                                    "in": 2,
                                    "turn_weight": 5,
                                    "mapbox_streets_v8": {
                                        "class": "tertiary"
                                    },
                                    "is_urban": true,
                                    "admin_index": 0,
                                    "out": 1,
                                    "geometry_index": 38,
                                    "location": [
                                        -73.578542,
                                        45.494426
                                    ]
                                }
                            ],
                            "maneuver": {
                                "type": "end of road",
                                "instruction": "Turn right onto Rue Sainte-Catherine Ouest.",
                                "modifier": "right",
                                "bearing_after": 221,
                                "bearing_before": 130,
                                "location": [
                                    -73.578542,
                                    45.494426
                                ]
                            },
                            "name": "Rue Sainte-Catherine Ouest",
                            "duration": 2.787,
                            "distance": 3.958,
                            "driving_side": "right",
                            "weight": 7.787,
                            "mode": "walking",
                            "geometry": "esttGzxa`MDF"
                        },
                        {
                            "intersections": [
                                {
                                    "entry": [
                                        false,
                                        true,
                                        true,
                                        true
                                    ],
                                    "in": 0,
                                    "bearings": [
                                        41,
                                        129,
                                        220,
                                        307
                                    ],
                                    "duration": 4.013,
                                    "turn_weight": 5,
                                    "mapbox_streets_v8": {
                                        "class": "service"
                                    },
                                    "is_urban": true,
                                    "admin_index": 0,
                                    "out": 1,
                                    "weight": 9.013,
                                    "geometry_index": 39,
                                    "location": [
                                        -73.578575,
                                        45.494399
                                    ]
                                },
                                {
                                    "bearings": [
                                        128,
                                        309
                                    ],
                                    "entry": [
                                        true,
                                        false
                                    ],
                                    "in": 1,
                                    "mapbox_streets_v8": {
                                        "class": "service"
                                    },
                                    "is_urban": true,
                                    "admin_index": 0,
                                    "out": 0,
                                    "geometry_index": 40,
                                    "location": [
                                        -73.578518,
                                        45.494367
                                    ]
                                }
                            ],
                            "maneuver": {
                                "type": "turn",
                                "instruction": "Turn left onto Rue Pierce.",
                                "modifier": "left",
                                "bearing_after": 129,
                                "bearing_before": 221,
                                "location": [
                                    -73.578575,
                                    45.494399
                                ]
                            },
                            "name": "Rue Pierce",
                            "duration": 6.716,
                            "distance": 9.536,
                            "driving_side": "right",
                            "weight": 11.716,
                            "mode": "walking",
                            "geometry": "_sttGbya`MDKBG"
                        },
                        {
                            "intersections": [
                                {
                                    "bearings": [
                                        39,
                                        219,
                                        308
                                    ],
                                    "entry": [
                                        true,
                                        true,
                                        false
                                    ],
                                    "in": 2,
                                    "turn_weight": 5,
                                    "mapbox_streets_v8": {
                                        "class": "service"
                                    },
                                    "is_urban": true,
                                    "admin_index": 0,
                                    "out": 1,
                                    "geometry_index": 41,
                                    "location": [
                                        -73.578479,
                                        45.494346
                                    ]
                                }
                            ],
                            "maneuver": {
                                "type": "end of road",
                                "instruction": "Turn right onto Rue Sainte-Catherine Ouest.",
                                "modifier": "right",
                                "bearing_after": 219,
                                "bearing_before": 128,
                                "location": [
                                    -73.578479,
                                    45.494346
                                ]
                            },
                            "name": "Rue Sainte-Catherine Ouest",
                            "duration": 6.177,
                            "distance": 8.767,
                            "driving_side": "right",
                            "weight": 11.177,
                            "mode": "walking",
                            "geometry": "urttGnxa`MJL"
                        },
                        {
                            "intersections": [
                                {
                                    "bearings": [
                                        39
                                    ],
                                    "entry": [
                                        true
                                    ],
                                    "in": 0,
                                    "admin_index": 0,
                                    "geometry_index": 42,
                                    "location": [
                                        -73.57855,
                                        45.494285
                                    ]
                                }
                            ],
                            "maneuver": {
                                "type": "arrive",
                                "instruction": "Your destination is on the left.",
                                "modifier": "left",
                                "bearing_after": 0,
                                "bearing_before": 219,
                                "location": [
                                    -73.57855,
                                    45.494285
                                ]
                            },
                            "name": "Rue Sainte-Catherine Ouest",
                            "duration": 0,
                            "distance": 0,
                            "driving_side": "right",
                            "weight": 0,
                            "mode": "walking",
                            "geometry": "irttG|xa`M??"
                        }
                    ],
                    "distance": 404.684,
                    "summary": "Boulevard De Maisonneuve Ouest, Rue Pierce"
                }
            ],
            "geometry": "_dutGxxa`MPNd@b@JHD?@CDMFBHBx@x@LJFDBBD@BBD@FBB?B@j@FB?VB@?B@B?B@B@@@hAtADFDIBE@C\\q@BGj@kABGn@oAFODFDKBGJL"
        }
    ],
    "waypoints": [
        {
            "distance": 16.357,
            "name": "Boulevard De Maisonneuve Ouest",
            "location": [
                -73.578528,
                45.497116
            ]
        },
        {
            "distance": 15.01,
            "name": "Rue Sainte-Catherine Ouest",
            "location": [
                -73.57855,
                45.494285
            ]
        }
    ],
    "code": "Ok",
    "uuid": "co2CpIU0VhA7LL64Pqdcay8EUvTDFZGl1LfHoUlqMPtj_7LEnpwIJQ=="
}

// Test Google Maps conversion
console.log("=== Google Maps Conversion ===");
try {
    const googleResult = convertGoogleMapsResponse(googleMapsResponse);
    console.log(JSON.stringify(googleResult, null, 2));
} catch (error) {
    console.error("Google Maps conversion failed:", error);
}

// Test Mapbox conversion
console.log("\n=== Mapbox Conversion ===");
try {
    const mapboxResult = convertMapboxResponse(mapboxResponse);
    console.log(JSON.stringify(mapboxResult, null, 2));
} catch (error) {
    console.error("Mapbox conversion failed:", error);
}


