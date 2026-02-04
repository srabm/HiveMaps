CREATE TABLE campus (
    id VARCHAR(3) PRIMARY KEY,
    label VARCHAR(16) NOT NULL,
    name VARCHAR(128) NOT NULL,
    center_lon DOUBLE PRECISION NOT NULL,
    center_lat DOUBLE PRECISION NOT NULL,
    zoom DOUBLE PRECISION NOT NULL
);

CREATE TABLE building (
    code VARCHAR(8) PRIMARY KEY,
    campus_id VARCHAR(3) NOT NULL,
    name VARCHAR(256) NOT NULL,
    CONSTRAINT fk_building_campus FOREIGN KEY (campus_id) REFERENCES campus(id)
);

CREATE INDEX idx_building_campus ON building(campus_id);

CREATE TABLE building_address (
    building_code VARCHAR(8) NOT NULL,
    address VARCHAR(256) NOT NULL,
    CONSTRAINT fk_address_building FOREIGN KEY (building_code) REFERENCES building(code)
);

CREATE INDEX idx_building_address_code ON building_address(building_code);
