-- Each equipment group has one name per collection location. This also prevents
-- a retried create request from silently duplicating the same inventory group.
CREATE UNIQUE INDEX equipment_name_location ON equipment(lower(trim(name)),lower(trim(location)));
