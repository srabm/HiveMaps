ALTER TABLE room
ADD COLUMN IF NOT EXISTS label VARCHAR(64);

ALTER TABLE room
ADD COLUMN IF NOT EXISTS room_type VARCHAR(32);

UPDATE room
SET label = id
WHERE label IS NULL OR TRIM(label) = '';

UPDATE room
SET room_type = 'room'
WHERE room_type IS NULL OR TRIM(room_type) = '';

ALTER TABLE room
ALTER COLUMN room_type SET DEFAULT 'room';
