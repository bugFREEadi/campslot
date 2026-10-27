-- Early pickup consumes actual capacity from issued_at, not only scheduled start.
CREATE TRIGGER reservation_numeric_guard BEFORE INSERT ON reservations BEGIN
 SELECT CASE WHEN typeof(NEW.start_at)!='integer' OR typeof(NEW.end_at)!='integer' OR typeof(NEW.quantity)!='integer' THEN RAISE(ABORT,'INVALID_INTERVAL') END;
 SELECT CASE WHEN EXISTS (
  SELECT 1 FROM (
   SELECT NEW.start_at AS point UNION
   SELECT CASE WHEN status='ISSUED' THEN MIN(start_at,issued_at) ELSE start_at END FROM reservations
   WHERE equipment_id=NEW.equipment_id AND status IN ('RESERVED','ISSUED')
   AND CASE WHEN status='ISSUED' THEN MIN(start_at,issued_at) ELSE start_at END>=NEW.start_at
   AND CASE WHEN status='ISSUED' THEN MIN(start_at,issued_at) ELSE start_at END<NEW.end_at
  ) points WHERE NEW.quantity+(SELECT COALESCE(SUM(quantity),0) FROM reservations r
   WHERE r.equipment_id=NEW.equipment_id AND r.status IN ('RESERVED','ISSUED')
   AND CASE WHEN r.status='ISSUED' THEN MIN(r.start_at,r.issued_at) ELSE r.start_at END<=points.point AND r.end_at>points.point
  )>(SELECT capacity FROM equipment WHERE id=NEW.equipment_id)
 ) THEN RAISE(ABORT,'CAPACITY_CONFLICT') END;
END;
--> statement-breakpoint
CREATE TRIGGER early_pickup_guard BEFORE UPDATE OF status ON reservations WHEN NEW.status='ISSUED' BEGIN
 SELECT CASE WHEN typeof(NEW.issued_at)!='integer' OR NEW.issued_at<NEW.start_at-900000 OR NEW.issued_at>CAST(strftime('%s','now') AS INTEGER)*1000+2000 THEN RAISE(ABORT,'STATE_CONFLICT') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM maintenance WHERE equipment_id=NEW.equipment_id AND start_at<NEW.end_at AND end_at>NEW.issued_at) THEN RAISE(ABORT,'MAINTENANCE_CONFLICT') END;
 SELECT CASE WHEN EXISTS (
  SELECT 1 FROM (
   SELECT NEW.issued_at AS point UNION
   SELECT CASE WHEN status='ISSUED' THEN MIN(start_at,issued_at) ELSE start_at END FROM reservations
   WHERE id!=NEW.id AND equipment_id=NEW.equipment_id AND status IN ('RESERVED','ISSUED')
   AND CASE WHEN status='ISSUED' THEN MIN(start_at,issued_at) ELSE start_at END>=NEW.issued_at
   AND CASE WHEN status='ISSUED' THEN MIN(start_at,issued_at) ELSE start_at END<NEW.end_at
  ) points WHERE NEW.quantity+(SELECT COALESCE(SUM(quantity),0) FROM reservations r
   WHERE r.id!=NEW.id AND r.equipment_id=NEW.equipment_id AND r.status IN ('RESERVED','ISSUED')
   AND CASE WHEN r.status='ISSUED' THEN MIN(r.start_at,r.issued_at) ELSE r.start_at END<=points.point AND r.end_at>points.point
  )>(SELECT capacity FROM equipment WHERE id=NEW.equipment_id)
 ) THEN RAISE(ABORT,'CAPACITY_CONFLICT') END;
END;
--> statement-breakpoint
CREATE TRIGGER equipment_integer_insert BEFORE INSERT ON equipment BEGIN
 SELECT CASE WHEN typeof(NEW.capacity)!='integer' THEN RAISE(ABORT,'INVENTORY_CONFLICT') END;
END;
--> statement-breakpoint
CREATE TRIGGER equipment_integer_update BEFORE UPDATE ON equipment BEGIN
 SELECT CASE WHEN typeof(NEW.capacity)!='integer' THEN RAISE(ABORT,'INVENTORY_CONFLICT') END;
END;
--> statement-breakpoint
CREATE TRIGGER maintenance_numeric_guard BEFORE INSERT ON maintenance BEGIN
 SELECT CASE WHEN typeof(NEW.start_at)!='integer' OR typeof(NEW.end_at)!='integer' OR NEW.start_at<CAST(strftime('%s','now') AS INTEGER)*1000 OR NEW.end_at-NEW.start_at>2592000000 THEN RAISE(ABORT,'INVALID_INTERVAL') END;
 -- Early issued loans occupy the actual collection interval too.
 SELECT CASE WHEN EXISTS(SELECT 1 FROM reservations WHERE equipment_id=NEW.equipment_id AND status='ISSUED' AND MIN(start_at,issued_at)<NEW.end_at AND end_at>NEW.start_at) THEN RAISE(ABORT,'MAINTENANCE_CONFLICT') END;
END;
