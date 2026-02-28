ALTER TABLE indoor_node
ADD COLUMN IF NOT EXISTS is_virtual BOOLEAN NOT NULL DEFAULT false;

INSERT INTO indoor_node (id, label, wheelchair_accessible, floor, building, lon, lat, is_virtual) VALUES

-- MOLSON BUILDING (MB) FLOOR S2 --
('MBS2.330', 'MBS2.330', true, 'S2', 'MB', -73.5788166384271, 45.495088071078385, true),
('MBS2.210', 'MBS2.210', true, 'S2', 'MB', -73.57880020607371, 45.495103340324206, true),
('MBS2.401', 'MBS2.401', true, 'S2', 'MB', -73.57922568383732, 45.495397099706054, true);

INSERT INTO indoor_edge (id, label, wheelchair_accessible, start_node_id, end_node_id, building, distance) VALUES

-- MOLSON BUILDING (MB) FLOOR S2 --
('MBS2_VE1', 'VE1', true, 'MBS2.330_1', 'MBS2.330', 'MB', 0.0),
('MBS2_VE2', 'VE2', true, 'MBS2.330', 'MBS2.330_1', 'MB', 0.0),
('MBS2_VE3', 'VE3', true, 'MBS2.330_2', 'MBS2.330', 'MB', 0.0),
('MBS2_VE4', 'VE4', true, 'MBS2.330', 'MBS2.330_2', 'MB', 0.0),
('MBS2_VE5', 'VE5', true, 'MBS2.210_1', 'MBS2.210', 'MB', 0.0),
('MBS2_VE6', 'VE6', true, 'MBS2.210', 'MBS2.210_1', 'MB', 0.0),
('MBS2_VE7', 'VE7', true, 'MBS2.210_2', 'MBS2.210', 'MB', 0.0),
('MBS2_VE8', 'VE8', true, 'MBS2.210', 'MBS2.210_2', 'MB', 0.0),
('MBS2_VE9', 'VE9', true, 'MBS2.401_1', 'MBS2.401', 'MB', 0.0),
('MBS2_VE10', 'VE10', true, 'MBS2.401', 'MBS2.401_1', 'MB', 0.0),
('MBS2_VE11', 'VE11', true, 'MBS2.401_2', 'MBS2.401', 'MB', 0.0),
('MBS2_VE12', 'VE12', true, 'MBS2.401', 'MBS2.401_2', 'MB', 0.0);