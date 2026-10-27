const base = process.env.BASE_URL ?? "http://127.0.0.1:5173";
const result = await fetch(new URL("/api/demo/setup", base), {
  method: "POST",
  headers: {
    Origin: base,
    "Content-Type": "application/json",
    "X-CampusSlot-Request": "1",
  },
  body: "{}",
});
const data = await result.json();
console.log(data.message ?? data.error);
if (!result.ok && result.status !== 409) process.exit(1);
