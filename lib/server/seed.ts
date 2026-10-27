import bcrypt from "bcryptjs";
import type { Database } from "./database.ts";
// Public fictional demo credentials. These are not production secrets.
export const DEMO_PASSWORD = "CampusDemo!2026";
export async function seedDemo(db: Database) {
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const statements = [
    ...[
      ["student-asha", "asha@campus.demo", "Asha Rao", "student"],
      ["student-ravi", "ravi@campus.demo", "Ravi Shah", "student"],
      ["admin-meera", "admin@campus.demo", "Meera Patel", "admin"],
    ].map((row) =>
      db
        .prepare(
          "INSERT OR IGNORE INTO users (id,email,name,role,password_hash) VALUES (?,?,?,?,?)",
        )
        .bind(...row, hash),
    ),
    ...[
      [
        "eq-camera",
        "Mirrorless camera kit",
        "Photography",
        "24 MP camera with 18–55 mm lens, spare battery, charger and padded carry case. Bring your campus ID; collect from the media desk.",
        "Media Lab · B-104",
        3,
      ],
      [
        "eq-arduino",
        "Arduino discovery kit",
        "Electronics",
        "Arduino Uno, breadboard, USB cable, sensor pack and jumper wires. A complete starter kit for prototyping your next idea.",
        "Electronics Lab · A-203",
        8,
      ],
      [
        "eq-projector",
        "Portable projector",
        "Presentation",
        "Full HD projector with HDMI cable, remote and carry bag. Suitable for classrooms, project demos and club screenings.",
        "AV Desk · C-101",
        2,
      ],
      [
        "eq-mic",
        "Podcast microphone",
        "Audio",
        "USB condenser microphone, pop filter, desk stand and headphones. Ready for interviews, voiceovers and student podcasts.",
        "Media Lab · B-104",
        4,
      ],
      [
        "eq-vr",
        "VR exploration headset",
        "Computing",
        "Standalone VR headset with two controllers and charging cable. Clean the face pad before returning; indoor use only.",
        "Innovation Lab · A-301",
        2,
      ],
      [
        "eq-tripod",
        "Aluminium tripod",
        "Photography",
        "Lightweight tripod with quick-release plate and carry sleeve. Maximum load 3 kg; fits all campus camera kits.",
        "Media Lab · B-104",
        6,
      ],
    ].map((row) =>
      db
        .prepare(
          "INSERT OR IGNORE INTO equipment (id,name,category,description,location,capacity,active,created_at) VALUES (?,?,?,?,?,?,1,?)",
        )
        .bind(...row, Date.now()),
    ),
  ];
  await db.batch(statements);
  return {
    message:
      "Fictional demo accounts and six equipment types are ready. Existing records were preserved.",
  };
}
