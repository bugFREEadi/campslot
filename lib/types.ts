export type Role = "student" | "admin";
export type Status = "RESERVED" | "CANCELLED" | "ISSUED" | "RETURNED";
export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
}
export interface Equipment {
  id: string;
  name: string;
  category: string;
  description: string;
  location: string;
  capacity: number;
  active: number;
  created_at: number;
}
export interface Reservation {
  id: string;
  user_id: string;
  equipment_id: string;
  start_at: number;
  end_at: number;
  quantity: number;
  status: Status;
  purpose: string;
  request_key: string;
  created_at: number;
  issued_at: number | null;
  returned_at: number | null;
  updated_by: string;
  equipment_name?: string;
  location?: string;
  student_name?: string;
  overdue?: boolean;
}
export interface Maintenance {
  id: string;
  equipment_id: string;
  start_at: number;
  end_at: number;
  reason: string;
  created_by: string;
}
export interface Availability {
  available: number;
  capacity: number;
  peak: number;
  maintenance: Maintenance[];
  overdue: number;
}
