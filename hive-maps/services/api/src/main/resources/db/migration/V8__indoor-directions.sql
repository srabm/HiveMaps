CREATE TABLE indoor_node (
    id VARCHAR(16) PRIMARY KEY,
    label VARCHAR(16) NOT NULL,
    wheelchair_accessible BOOLEAN NOT NULL,
    floor VARCHAR(8) NOT NULL,
    building VARCHAR(8) NOT NULL,
    lon DOUBLE PRECISION NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    CONSTRAINT fk_building FOREIGN KEY (building) REFERENCES building(code)
);

CREATE TABLE indoor_edge (
    id VARCHAR(16) PRIMARY KEY,
    label VARCHAR(16) NOT NULL,
    wheelchair_accessible BOOLEAN NOT NULL,
    start_node_id VARCHAR(16) NOT NULL,
    end_node_id VARCHAR(16) NOT NULL,
    building VARCHAR(8) NOT NULL,
    distance DOUBLE PRECISION NOT NULL,
    CONSTRAINT fk_start_node FOREIGN KEY (start_node_id) REFERENCES indoor_node(id),
    CONSTRAINT fk_end_node FOREIGN KEY (end_node_id) REFERENCES indoor_node(id),
    CONSTRAINT fk_building FOREIGN KEY (building) REFERENCES building(code)
);

INSERT INTO indoor_node (id, label, wheelchair_accessible, floor, building, lon, lat) VALUES
('H_Entrance_1',    'H_Entrance_1',    true, '1', 'H', -73.57867553830148, 45.49700459298616),
('H1_Junction_1',   'H1_Junction_1',   true, '1', 'H', -73.57872784137727, 45.497038434508866),
('H1_Junction_2',   'H1_Junction_2',   true, '1', 'H', -73.57877612113954, 45.49700459298616),
('H1_Junction_3',   'H1_Junction_3',   true, '1', 'H', -73.578589707613,   45.49717662051555),
('H1_Junction_4',   'H1_Junction_4',   true, '1', 'H', -73.57856690883638, 45.49719871144437),
('H1_Junction_5',   'H1_Junction_5',   true, '1', 'H', -73.57849918305874, 45.49727156444606),
('H110',            'H110',            true, '1', 'H', -73.57880160212518, 45.49702527391913),
('H1_Junction_6',   'H1_Junction_6',   true, '1', 'H', -73.57845425605775, 45.49733266689093),
('H1_Junction_7',   'H1_Junction_7',   true, '1', 'H', -73.57858166098595, 45.49737966872647),
('H1_Junction_8',   'H1_Junction_8',   true, '1', 'H', -73.57867151498796, 45.497301645657956),
('H1_Junction_9',   'H1_Junction_9',   true, '1', 'H', -73.57875466346742, 45.497210461934884),
('H1_Junction_10',  'H1_Junction_10',  true, '1', 'H', -73.57862994074823, 45.49713901891466);

INSERT INTO indoor_edge (id, label, wheelchair_accessible, start_node_id, end_node_id, building, distance) VALUES
('E1',  'E1',  true, 'H_Entrance_1',   'H1_Junction_1',  'H', 5.547863810942689),
('E2',  'E2',  true, 'H1_Junction_1',  'H_Entrance_1',   'H', 5.547863810942689),
('E3',  'E3',  true, 'H1_Junction_2',  'H1_Junction_1',  'H', 5.321693605137608),
('E4',  'E4',  true, 'H1_Junction_1',  'H1_Junction_2',  'H', 5.321693605137608),
('E5',  'E5',  true, 'H1_Junction_4',  'H1_Junction_3',  'H', 3.031751668295485),
('E6',  'E6',  true, 'H1_Junction_3',  'H1_Junction_4',  'H', 3.031751668295485),
('E7',  'E7',  true, 'H1_Junction_5',  'H1_Junction_4',  'H', 9.66893849858886),
('E8',  'E8',  true, 'H1_Junction_4',  'H1_Junction_5',  'H', 9.66893849858886),
('E9',  'E9',  true, 'H1_Junction_2',  'H110',           'H', 3.0385107227857966),
('E10', 'E10', true, 'H110',           'H1_Junction_2',  'H', 3.0385107227857966),
('E11', 'E11', true, 'H1_Junction_5',  'H1_Junction_6',  'H', 7.643555941210224),
('E12', 'E12', true, 'H1_Junction_6',  'H1_Junction_5',  'H', 7.643555941210224),
('E13', 'E13', true, 'H1_Junction_10', 'H1_Junction_9',  'H', 12.554201563990285),
('E14', 'E14', true, 'H1_Junction_9',  'H1_Junction_10', 'H', 12.554201563990285),
('E15', 'E15', true, 'H1_Junction_9',  'H1_Junction_8',  'H', 12.033380738241569),
('E16', 'E16', true, 'H1_Junction_8',  'H1_Junction_9',  'H', 12.033380738241569),
('E17', 'E17', true, 'H1_Junction_8',  'H1_Junction_7',  'H', 11.149692020947976),
('E18', 'E18', true, 'H1_Junction_7',  'H1_Junction_8',  'H', 11.149692020947976),
('E19', 'E19', true, 'H1_Junction_7',  'H1_Junction_6',  'H', 11.22148295080039),
('E20', 'E20', true, 'H1_Junction_6',  'H1_Junction_7',  'H', 11.22148295080039),
('E21', 'E21', true, 'H1_Junction_10', 'H1_Junction_1',  'H', 13.539478740509816),
('E22', 'E22', true, 'H1_Junction_1',  'H1_Junction_10', 'H', 13.539478740509816),
('E23', 'E23', true, 'H1_Junction_3',  'H1_Junction_10', 'H', 5.226384066188548),
('E24', 'E24', true, 'H1_Junction_10', 'H1_Junction_3',  'H', 5.226384066188548);
