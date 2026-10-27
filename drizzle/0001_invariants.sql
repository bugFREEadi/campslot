-- Triggers are inside the same serialized SQLite write as the mutation.
CREATE TRIGGER reservation_insert_guard BEFORE INSERT ON reservations BEGIN
 SELECT CASE WHEN NEW.status!='RESERVED' OR NEW.user_id!=NEW.updated_by OR (SELECT role FROM users WHERE id=NEW.user_id)!='student' THEN RAISE(ABORT,'STATE_CONFLICT') END;
 SELECT CASE WHEN NEW.start_at<CAST(strftime('%s','now') AS INTEGER)*1000 OR NEW.start_at>CAST(strftime('%s','now') AS INTEGER)*1000+7776000000 THEN RAISE(ABORT,'INVALID_INTERVAL') END;
 SELECT CASE WHEN (SELECT active FROM equipment WHERE id=NEW.equipment_id)=0 THEN RAISE(ABORT,'INACTIVE') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM maintenance WHERE equipment_id=NEW.equipment_id AND start_at<NEW.end_at AND end_at>NEW.start_at) THEN RAISE(ABORT,'MAINTENANCE_CONFLICT') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM reservations WHERE equipment_id=NEW.equipment_id AND status='ISSUED' AND end_at<=CAST(strftime('%s','now') AS INTEGER)*1000) THEN RAISE(ABORT,'OVERDUE_CONFLICT') END;
 SELECT CASE WHEN EXISTS (
   SELECT 1 FROM (
     SELECT NEW.start_at AS point
     UNION SELECT start_at FROM reservations WHERE equipment_id=NEW.equipment_id AND status IN ('RESERVED','ISSUED') AND start_at>=NEW.start_at AND start_at<NEW.end_at
   ) points WHERE NEW.quantity + (SELECT COALESCE(SUM(quantity),0) FROM reservations r WHERE r.equipment_id=NEW.equipment_id AND r.status IN ('RESERVED','ISSUED') AND r.start_at<=points.point AND r.end_at>points.point) > (SELECT capacity FROM equipment WHERE id=NEW.equipment_id)
 ) THEN RAISE(ABORT,'CAPACITY_CONFLICT') END;
END;
--> statement-breakpoint
CREATE TRIGGER reservation_update_guard BEFORE UPDATE ON reservations BEGIN
 SELECT CASE WHEN NEW.id!=OLD.id OR NEW.user_id!=OLD.user_id OR NEW.equipment_id!=OLD.equipment_id OR NEW.start_at!=OLD.start_at OR NEW.end_at!=OLD.end_at OR NEW.quantity!=OLD.quantity OR NEW.request_key!=OLD.request_key OR NEW.created_at!=OLD.created_at OR NEW.purpose!=OLD.purpose THEN RAISE(ABORT,'STATE_CONFLICT') END;
 SELECT CASE WHEN NOT ((OLD.status='RESERVED' AND NEW.status IN ('CANCELLED','ISSUED')) OR (OLD.status='ISSUED' AND NEW.status='RETURNED')) THEN RAISE(ABORT,'STATE_CONFLICT') END;
 SELECT CASE WHEN NEW.status='CANCELLED' AND (OLD.start_at<=CAST(strftime('%s','now') AS INTEGER)*1000 OR (NEW.updated_by!=OLD.user_id AND (SELECT role FROM users WHERE id=NEW.updated_by)!='admin')) THEN RAISE(ABORT,'STATE_CONFLICT') END;
 SELECT CASE WHEN NEW.status IN ('ISSUED','RETURNED') AND (SELECT role FROM users WHERE id=NEW.updated_by)!='admin' THEN RAISE(ABORT,'STATE_CONFLICT') END;
 SELECT CASE WHEN NEW.status='ISSUED' AND (CAST(strftime('%s','now') AS INTEGER)*1000<OLD.start_at-900000 OR CAST(strftime('%s','now') AS INTEGER)*1000>=OLD.end_at OR NEW.issued_at IS NULL) THEN RAISE(ABORT,'STATE_CONFLICT') END;
 SELECT CASE WHEN NEW.status='RETURNED' AND NEW.returned_at IS NULL THEN RAISE(ABORT,'STATE_CONFLICT') END;
 SELECT CASE WHEN NEW.status='ISSUED' AND NEW.quantity+(SELECT COALESCE(SUM(quantity),0) FROM reservations WHERE equipment_id=NEW.equipment_id AND status='ISSUED' AND id!=NEW.id)>(SELECT capacity FROM equipment WHERE id=NEW.equipment_id) THEN RAISE(ABORT,'CAPACITY_CONFLICT') END;
END;
--> statement-breakpoint
CREATE TRIGGER maintenance_insert_guard BEFORE INSERT ON maintenance BEGIN
 SELECT CASE WHEN (SELECT role FROM users WHERE id=NEW.created_by)!='admin' THEN RAISE(ABORT,'STATE_CONFLICT') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM reservations WHERE equipment_id=NEW.equipment_id AND status IN ('RESERVED','ISSUED') AND ((start_at<NEW.end_at AND end_at>NEW.start_at) OR (status='ISSUED' AND end_at<=CAST(strftime('%s','now') AS INTEGER)*1000))) THEN RAISE(ABORT,'MAINTENANCE_CONFLICT') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM maintenance WHERE equipment_id=NEW.equipment_id AND start_at<NEW.end_at AND end_at>NEW.start_at) THEN RAISE(ABORT,'MAINTENANCE_CONFLICT') END;
END;
--> statement-breakpoint
CREATE TRIGGER maintenance_immutable BEFORE UPDATE ON maintenance BEGIN SELECT RAISE(ABORT,'MAINTENANCE_CONFLICT'); END;
--> statement-breakpoint
CREATE TRIGGER inventory_guard BEFORE UPDATE ON equipment WHEN NEW.capacity<OLD.capacity OR NEW.active<OLD.active BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM reservations WHERE equipment_id=OLD.id AND (status='ISSUED' OR (status='RESERVED' AND end_at>CAST(strftime('%s','now') AS INTEGER)*1000))) THEN RAISE(ABORT,'INVENTORY_CONFLICT') END;
END;
--> statement-breakpoint
CREATE TRIGGER reservation_created AFTER INSERT ON reservations BEGIN
 INSERT INTO audit(reservation_id,actor_id,action,at) VALUES(NEW.id,NEW.updated_by,NEW.status,NEW.created_at);
END;
--> statement-breakpoint
CREATE TRIGGER reservation_changed AFTER UPDATE OF status ON reservations BEGIN
 INSERT INTO audit(reservation_id,actor_id,action,at) VALUES(NEW.id,NEW.updated_by,NEW.status,CAST(strftime('%s','now') AS INTEGER)*1000);
END;
