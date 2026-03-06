CREATE TABLE building_floor (
    id VARCHAR(16) NOT NULL,
    building_code VARCHAR(8) NOT NULL,
    label VARCHAR(64) NOT NULL,
    sort_order INTEGER NOT NULL,
    plan_geometry JSONB NOT NULL,
    PRIMARY KEY (building_code, id),
    CONSTRAINT fk_floor_building FOREIGN KEY (building_code) REFERENCES building(code)
);

CREATE TABLE room (
    id VARCHAR(64) PRIMARY KEY,
    building_code VARCHAR(8) NOT NULL,
    floor_id VARCHAR(16) NOT NULL,
    label VARCHAR(128) NOT NULL,
    room_type VARCHAR(64) NOT NULL,
    geometry JSONB NOT NULL,
    CONSTRAINT fk_room_floor FOREIGN KEY (building_code, floor_id) REFERENCES building_floor(building_code, id)
);

CREATE INDEX idx_room_floor ON room(building_code, floor_id);
