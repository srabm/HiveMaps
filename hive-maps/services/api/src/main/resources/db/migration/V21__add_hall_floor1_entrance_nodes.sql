INSERT INTO indoor_node (id, label, wheelchair_accessible, floor, building, lon, lat) VALUES
('H_ENTRANCE', 'Entrance', true, '1', 'H', -73.57868635323575, 45.496974706215035),
('H1_E1', 'Junction', true, '1', 'H', -73.5787562243582, 45.49702568456171),
('LB_ENTRANCE', 'Entrance', true, '2', 'LB', -73.57830242370292, 45.4969326666722),
('CC_ENTRANCE', 'Entrance', true, '1', 'CC', -73.64059508815996, 45.45843198951718);

INSERT INTO indoor_edge (id, label, wheelchair_accessible, start_node_id, end_node_id, building, distance) VALUES
('H1_E299', 'E299', true, 'H_ENTRANCE', 'H1_E1', 'H', 7.860650198089838),
('H1_E300', 'E300', true, 'H1_E1', 'H_ENTRANCE', 'H', 7.860650198089838),
('H1_E301', 'E301', true, 'H1.110', 'H1_E1', 'H', 6.084710757687337),
('H1_E302', 'E302', true, 'H1_E1', 'H1.110', 'H', 6.084710757687337),
('LB2_E303', 'E303', true, 'LB_ENTRANCE', 'LB2.STAIRS_1', 'LB', 0.9841343067979018),
('LB2_E304', 'E304', true, 'LB2.STAIRS_1', 'LB_ENTRANCE', 'LB', 0.9841343067979018),
('CC1_E305', 'E305', true, 'CC_ENTRANCE', 'CC_J1', 'CC', 11.512392157489627),
('CC1_E306', 'E306', true, 'CC_J1', 'CC_ENTRANCE', 'CC', 11.512392157489627);
