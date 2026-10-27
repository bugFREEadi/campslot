"use client";
import {
  useEffect,
  useRef,
  useState,
  useCallback,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  CalendarDays,
  LayoutGrid,
  ClipboardList,
  Package,
  ArrowUpRight,
  ArrowRight,
  Search,
  MapPin,
  Clock3,
  X,
  Check,
  Camera,
  Cpu,
  Projector,
  Mic2,
  Glasses,
  Triangle,
  LogOut,
  Plus,
  ShieldCheck,
  CircleHelp,
  ChevronRight,
  Wrench,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import type {
  User,
  Equipment,
  Reservation,
  Maintenance,
  Availability,
} from "../lib/types";
const DEMO_PASSWORD = "CampusDemo!2026";
const CATEGORIES = [
  "All equipment",
  "Photography",
  "Electronics",
  "Presentation",
  "Audio",
  "Computing",
];
const ICONS: Record<string, typeof Camera> = {
  Photography: Camera,
  Electronics: Cpu,
  Presentation: Projector,
  Audio: Mic2,
  Computing: Glasses,
};
function localTime(ms: number) {
  return new Date(ms + 330 * 60_000).toISOString().slice(0, 16);
}
function epoch(value: string) {
  return new Date(value + ":00+05:30").getTime();
}
function date(ms: number) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(ms);
}
function initialStart() {
  return localTime(Math.ceil((Date.now() + 5 * 60_000) / 60_000) * 60_000);
}
async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch("/api/" + path, {
      method,
      credentials: "same-origin",
      headers:
        method === "GET"
          ? {}
          : { "Content-Type": "application/json", "X-CampusSlot-Request": "1" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch {
    throw new Error("Connection lost. Check your network and retry.");
  }
  const result = await response
    .json()
    .catch(() => ({ error: "The server did not return a valid response." }));
  if (!response.ok)
    throw new Error(
      (result as { error?: string }).error ??
        "Something went wrong. Please retry.",
    );
  return result as T;
}
function Art({
  equipment,
  large = false,
}: {
  equipment: Equipment;
  large?: boolean;
}) {
  const Icon = equipment.name.toLowerCase().includes("tripod")
    ? Triangle
    : (ICONS[equipment.category] ?? Package);
  return (
    <div
      className={`equipment-art art-${equipment.category.toLowerCase()} ${large ? "art-large" : ""}`}
      aria-hidden="true"
    >
      <span className="art-orbit" />
      <span className="art-shadow" />
      <Icon className="object-icon" strokeWidth={1.25} />
      <span className="art-label">
        CAMPUS / {equipment.category.toUpperCase()}
      </span>
    </div>
  );
}
function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      onCancel={onClose}
      aria-labelledby="dialog-title"
    >
      <div className="modal-header">
        <h2 id="dialog-title">{title}</h2>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X size={21} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
function ErrorBox({ message }: { message: string }) {
  return message ? (
    <div className="notice error" role="alert">
      <AlertCircle size={18} />
      <span>{message}</span>
    </div>
  ) : null;
}
function DateRange({
  start,
  end,
  setStart,
  setEnd,
}: {
  start: string;
  end: string;
  setStart: (s: string) => void;
  setEnd: (s: string) => void;
}) {
  return (
    <div className="date-fields">
      <label>
        From <span className="hint">IST</span>
        <input
          type="datetime-local"
          required
          value={start}
          onChange={(e) => setStart(e.target.value)}
        />
      </label>
      <label>
        Until <span className="hint">IST</span>
        <input
          type="datetime-local"
          required
          value={end}
          onChange={(e) => setEnd(e.target.value)}
        />
      </label>
    </div>
  );
}
function Login({ onLogin }: { onLogin: (u: User) => void }) {
  const [screen, setScreen] = useState<"landing" | "signin">("landing"),
    [email, setEmail] = useState("asha@campus.demo"),
    [password, setPassword] = useState(DEMO_PASSWORD),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = await api<{ user: User }>("auth/login", "POST", {
        email,
        password,
      });
      onLogin(data.user);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function setup() {
    setBusy(true);
    setError("");
    try {
      const result = await api<{ message: string }>("demo/setup", "POST", {});
      setNotice(result.message);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (screen === "landing") {
    return (
      <main className="landing">
        <div className="landing-glow" aria-hidden="true" />
        <div className="landing-grid" aria-hidden="true" />
        <header className="landing-nav">
          <div className="brand landing-brand">
            <CalendarDays />
            <span>
              CampusSlot<span className="brand-dot">.</span>
            </span>
          </div>
          <button
            className="button primary landing-nav-cta"
            onClick={() => setScreen("signin")}
          >
            Sign in
            <ArrowRight size={17} />
          </button>
        </header>
        <section className="landing-hero">
          <div className="landing-copy">
            <p className="landing-kicker">Campus equipment desk</p>
            <h1 className="landing-title">
              CampusSlot
              <span className="landing-title-mark">.</span>
            </h1>
            <p className="landing-lead">
              See what is free, reserve your slot, and borrow shared lab gear
              without the guesswork.
            </p>
            <div className="landing-actions">
              <button
                className="button primary landing-cta"
                onClick={() => setScreen("signin")}
              >
                Sign in
                <ArrowRight size={20} />
              </button>
            </div>
          </div>
          <div className="landing-stage" aria-hidden="true">
            <div className="landing-orb" />
            <div className="landing-float float-a">
              <Camera strokeWidth={1.2} />
            </div>
            <div className="landing-float float-b">
              <Cpu strokeWidth={1.2} />
            </div>
            <div className="landing-float float-c">
              <Mic2 strokeWidth={1.2} />
            </div>
            <div className="landing-float float-d">
              <Projector strokeWidth={1.2} />
            </div>
          </div>
        </section>
      </main>
    );
  }
  return (
    <main className="signin-shell">
      <button
        className="signin-back"
        onClick={() => {
          setScreen("landing");
          setError("");
        }}
        type="button"
      >
        ← Back
      </button>
      <section className="signin-panel">
        <div className="brand signin-brand">
          <CalendarDays />
          <span>
            CampusSlot<span className="brand-dot">.</span>
          </span>
        </div>
        <h1 className="signin-title">Welcome back</h1>
        <p className="muted signin-sub">
          Sign in to reserve equipment and manage your loans.
        </p>
        <form onSubmit={submit}>
          <label>
            Email
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <ErrorBox message={error} />
          <button className="button primary wide" disabled={busy}>
            {busy ? "Please wait…" : "Sign in"}
            <ArrowRight size={18} />
          </button>
        </form>
        <div className="demo-access">
          <div className="section-label">
            <ShieldCheck size={16} /> FICTIONAL DEMO ACCOUNTS
          </div>
          <p>
            Choose an account, then sign in. All accounts use{" "}
            <code>{DEMO_PASSWORD}</code>.
          </p>
          <div className="demo-buttons">
            {[
              ["asha@campus.demo", "Asha · Student"],
              ["ravi@campus.demo", "Ravi · Student"],
              ["admin@campus.demo", "Meera · Admin"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setEmail(value);
                  setPassword(DEMO_PASSWORD);
                  setError("");
                }}
                className={email === value ? "selected" : ""}
              >
                {label}
              </button>
            ))}
          </div>
          <details>
            <summary>First run? Initialize the demo</summary>
            <p>
              Creates fictional accounts and equipment once. Existing
              reservations are preserved.
            </p>
            <button
              className="button secondary"
              onClick={setup}
              disabled={busy}
              type="button"
            >
              Initialize demo data
            </button>
          </details>
          {notice && <p role="status">{notice}</p>}
        </div>
        <p className="privacy-note">
          For coursework evaluation only. Do not enter real personal
          information. Hosted access also uses the Sites sign-in boundary.
        </p>
      </section>
    </main>
  );
}
export default function CampusApp() {
  const [user, setUser] = useState<User | null>(null),
    [booting, setBooting] = useState(true),
    [bootError, setBootError] = useState("");
  const boot = useCallback(async () => {
    setBooting(true);
    setBootError("");
    try {
      setUser((await api<{ user: User | null }>("auth/me")).user);
    } catch (e) {
      setBootError((e as Error).message);
    } finally {
      setBooting(false);
    }
  }, []);
  useEffect(() => {
    void boot();
  }, [boot]);
  if (booting)
    return (
      <main className="boot">
        <CalendarDays size={36} />
        <h1>Opening the equipment desk…</h1>
        <p>Loading CampusSlot</p>
      </main>
    );
  if (bootError)
    return (
      <main className="boot">
        <ErrorBox message={bootError} />
        <button className="button primary" onClick={boot}>
          Retry connection
        </button>
      </main>
    );
  return user ? (
    <Dashboard user={user} onLogout={() => setUser(null)} />
  ) : (
    <Login onLogin={setUser} />
  );
}
function Dashboard({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [view, setView] = useState("discover"),
    [equipment, setEquipment] = useState<Equipment[]>([]),
    [reservations, setReservations] = useState<Reservation[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [search, setSearch] = useState(""),
    [category, setCategory] = useState("All equipment"),
    [start, setStart] = useState(initialStart),
    [end, setEnd] = useState(() =>
      localTime(epoch(initialStart()) + 2 * 3600000),
    );
  const [avail, setAvail] = useState<Record<string, Availability>>({}),
    [checking, setChecking] = useState(false),
    [selected, setSelected] = useState<Equipment | null>(null),
    [edit, setEdit] = useState<Equipment | "new" | null>(null),
    [maintenance, setMaintenance] = useState<Equipment | null>(null),
    [reservationDetail, setReservationDetail] = useState<Reservation | null>(
      null,
    ),
    [statusFilter, setStatusFilter] = useState("All"),
    [actionBusy, setActionBusy] = useState("");
  const availabilityGeneration = useRef(0);
  const admin = user.role === "admin";
  const refresh = useCallback(async () => {
    availabilityGeneration.current += 1;
    setAvail({});
    setChecking(false);
    setLoading(true);
    setError("");
    try {
      const [inventory, bookings] = await Promise.all([
        api<{ equipment: Equipment[] }>("equipment"),
        api<{ reservations: Reservation[] }>("reservations"),
      ]);
      setEquipment(inventory.equipment);
      setReservations(bookings.reservations);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  useEffect(() => {
    availabilityGeneration.current += 1;
    setAvail({});
    setChecking(false);
  }, [start, end]);
  async function checkAvailability() {
    const generation = ++availabilityGeneration.current;
    setChecking(true);
    setError("");
    setAvail({});
    try {
      const rows = await Promise.all(
        equipment
          .filter((e) => e.active)
          .map(
            async (e) =>
              [
                e.id,
                await api<Availability>(
                  `equipment/${e.id}/availability?start=${epoch(start)}&end=${epoch(end)}`,
                ),
              ] as const,
          ),
      );
      if (generation === availabilityGeneration.current)
        setAvail(Object.fromEntries(rows));
    } catch (e) {
      if (generation === availabilityGeneration.current)
        setError((e as Error).message);
    } finally {
      if (generation === availabilityGeneration.current) setChecking(false);
    }
  }
  async function logout() {
    try {
      await api("auth/logout", "POST", {});
      onLogout();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function action(r: Reservation, a: string) {
    setActionBusy(r.id);
    setError("");
    try {
      await api(`reservations/${r.id}`, "PATCH", { action: a });
      setNotice(
        a === "cancel"
          ? "Reservation cancelled. Its units are available again."
          : a === "issue"
            ? "Equipment issued. The loan is now active."
            : "Return recorded. Thank you for keeping the desk moving.",
      );
      setAvail({});
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setActionBusy("");
    }
  }
  const filtered = equipment.filter(
    (e) =>
      (category === "All equipment" || e.category === category) &&
      `${e.name} ${e.description} ${e.location}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const upcoming = reservations.filter(
      (r) => r.status === "RESERVED" && r.end_at > Date.now(),
    ),
    loans = reservations.filter((r) => r.status === "ISSUED"),
    overdue = loans.filter((r) => r.overdue);
  const list = reservations.filter(
    (r) =>
      statusFilter === "All" ||
      (statusFilter === "Overdue" ? r.overdue : r.status === statusFilter),
  );
  const nav = [
    ["discover", "Discover", LayoutGrid],
    ["reservations", admin ? "Lending desk" : "My reservations", ClipboardList],
    ...(admin ? [["inventory", "Inventory", Package]] : []),
  ] as const;
  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <aside className="sidebar">
        <a className="brand" href="/" aria-label="CampusSlot home">
          <CalendarDays />
          <span>
            CampusSlot<span className="brand-dot">.</span>
          </span>
        </a>
        <div className="workspace-label">CAMPUS EQUIPMENT DESK</div>
        <nav aria-label="Main navigation">
          {nav.map(([key, label, Icon]) => (
            <button
              key={String(key)}
              className={`nav-item ${view === key ? "active" : ""}`}
              onClick={() => {
                setView(String(key));
                setError("");
                setStatusFilter("All");
              }}
              aria-current={view === key ? "page" : undefined}
            >
              <Icon size={19} />
              <span>{String(label)}</span>
              {view === key && <ChevronRight size={16} />}
            </button>
          ))}
        </nav>
        <div className="sidebar-tip">
          <span className="mini-icon">
            <CircleHelp size={20} />
          </span>
          <h3>Good tools. Shared well.</h3>
          <p>Collect with your campus ID. Return every component on time.</p>
          <span>All booking times are in IST.</span>
        </div>
        <div className="sidebar-bottom">
          <div className="avatar">
            {user.name
              .split(" ")
              .map((s) => s[0])
              .join("")}
          </div>
          <div>
            <strong>{user.name}</strong>
            <small>{admin ? "Lab administrator" : "Student account"}</small>
          </div>
          <button
            className="icon-button"
            aria-label="Sign out"
            title="Sign out"
            onClick={logout}
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <span>
            Workspace <ChevronRight size={13} />{" "}
            <strong>
              {view === "discover"
                ? "Discover equipment"
                : view === "inventory"
                  ? "Manage inventory"
                  : admin
                    ? "Lending desk"
                    : "My reservations"}
            </strong>
          </span>
          <div className="demo-badge">
            <i /> Fictional campus demo
          </div>
        </header>
        <main id="main" className="content">
          <div className="page-intro">
            <div>
              <p className="eyebrow">
                {view === "discover"
                  ? "LESS WAITING. MORE MAKING."
                  : view === "inventory"
                    ? "A WELL-EQUIPPED CAMPUS"
                    : "EVERY LOAN, IN ONE PLACE"}
              </p>
              <h1>
                {view === "discover"
                  ? "What will you make next?"
                  : view === "inventory"
                    ? "Keep the campus creating."
                    : admin
                      ? "Your lending desk."
                      : "Your plans, reserved."}
              </h1>
              <p className="muted">
                {view === "discover"
                  ? "Find the right tools for your next project. We’ll save you a slot."
                  : view === "inventory"
                    ? "Manage equipment, capacity and planned maintenance."
                    : admin
                      ? "Issue equipment, record returns and keep track of overdue loans."
                      : "Pick up, create, return. Keep track of every step here."}
              </p>
            </div>
            <button
              className="button secondary compact"
              onClick={refresh}
              disabled={loading}
            >
              <RefreshCw size={16} className={loading ? "spin" : ""} />
              <span>Refresh</span>
            </button>
          </div>
          <div className="stats">
            <div>
              <span className="stat-icon sage">
                <Package size={21} />
              </span>
              <div>
                <strong>
                  {equipment
                    .filter((e) => e.active)
                    .length.toString()
                    .padStart(2, "0")}
                </strong>
                <span>Equipment types</span>
              </div>
            </div>
            <div>
              <span className="stat-icon blue">
                <CalendarDays size={21} />
              </span>
              <div>
                <strong>{upcoming.length.toString().padStart(2, "0")}</strong>
                <span>
                  {admin ? "Upcoming reservations" : "Your upcoming slots"}
                </span>
              </div>
            </div>
            <div>
              <span className="stat-icon peach">
                <Clock3 size={21} />
              </span>
              <div>
                <strong>{loans.length.toString().padStart(2, "0")}</strong>
                <span>
                  {admin
                    ? `Active loans · ${overdue.length} overdue`
                    : "Your active loans"}
                </span>
              </div>
            </div>
          </div>
          {notice && (
            <div className="notice success" role="status">
              <Check size={18} />
              <span>{notice}</span>
              <button
                className="icon-button"
                aria-label="Dismiss notification"
                onClick={() => setNotice("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          <ErrorBox message={error} />
          {view === "discover" && (
            <>
              <section
                className="booking-toolbar"
                aria-label="Availability search"
              >
                <div className="toolbar-heading">
                  <CalendarDays size={20} />
                  <div>
                    <h2>Start with your schedule</h2>
                    <p>Check available units for your entire time slot.</p>
                  </div>
                </div>
                <DateRange
                  start={start}
                  end={end}
                  setStart={setStart}
                  setEnd={setEnd}
                />
                <button
                  className="button primary"
                  onClick={checkAvailability}
                  disabled={checking || loading}
                >
                  {checking ? "Checking…" : "Check availability"}
                  <ArrowRight size={17} />
                </button>
              </section>
              <div className="inventory-heading">
                <h2>
                  Explore the equipment{" "}
                  <span>{filtered.filter((e) => e.active).length}</span>
                </h2>
                <label className="search">
                  <Search size={18} />
                  <input
                    aria-label="Search equipment"
                    placeholder="Search equipment or location…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
              </div>
              <div className="category-tabs" aria-label="Equipment categories">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    className={category === c ? "selected" : ""}
                    onClick={() => setCategory(c)}
                    aria-pressed={category === c}
                  >
                    {c}
                  </button>
                ))}
              </div>
              {loading ? (
                <div className="empty" role="status">
                  Loading equipment…
                </div>
              ) : (
                <div className="equipment-grid">
                  {filtered
                    .filter((e) => e.active)
                    .map((e) => (
                      <article className="equipment-card" key={e.id}>
                        <div className="art-wrap">
                          <Art equipment={e} />
                          <span className="stock-badge">
                            {e.capacity} units on campus
                          </span>
                        </div>
                        <div className="card-body">
                          <span className="card-category">{e.category}</span>
                          <h3>{e.name}</h3>
                          <p className="card-description">{e.description}</p>
                          <p className="location">
                            <MapPin size={14} />
                            {e.location}
                          </p>
                          <div className="card-bottom">
                            <span
                              className={`availability ${avail[e.id]?.available === 0 ? "unavailable" : ""}`}
                            >
                              <i />
                              {avail[e.id]
                                ? `${avail[e.id].available} of ${e.capacity} available`
                                : "Select your time slot"}
                            </span>
                            <button
                              className="card-link"
                              onClick={() => setSelected(e)}
                              aria-label={`View ${e.name}`}
                            >
                              View <ArrowUpRight size={18} />
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                </div>
              )}
              {!loading && !filtered.some((e) => e.active) && (
                <div className="empty">
                  <Search size={28} />
                  <h3>No equipment found</h3>
                  <p>Try another search or category.</p>
                  <button
                    className="button secondary"
                    onClick={() => {
                      setSearch("");
                      setCategory("All equipment");
                    }}
                  >
                    Clear filters
                  </button>
                </div>
              )}
              <div className="bottom-note">
                <ShieldCheck size={18} />
                <p>
                  Plans change. Cancel before your slot starts to make room for
                  someone else.
                </p>
                <span>Shared tools. Shared possibilities.</span>
              </div>
            </>
          )}
          {view === "reservations" && (
            <>
              <div className="inventory-heading">
                <h2>
                  {admin ? "Reservations & loans" : "Reservation history"}
                </h2>
                <span className="hint">
                  Showing the latest 500 records · IST
                </span>
              </div>
              <div className="category-tabs">
                {[
                  "All",
                  "RESERVED",
                  "ISSUED",
                  "RETURNED",
                  "CANCELLED",
                  ...(admin ? ["Overdue"] : []),
                ].map((s) => (
                  <button
                    key={s}
                    className={statusFilter === s ? "selected" : ""}
                    onClick={() => setStatusFilter(s)}
                  >
                    {s.charAt(0) + s.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
              {loading ? (
                <div className="empty">Loading reservations…</div>
              ) : !list.length ? (
                <div className="empty">
                  <CalendarDays size={32} />
                  <h3>No reservations here yet</h3>
                  <p>
                    {admin
                      ? "Student bookings will appear here."
                      : "Your next project starts with a time slot."}
                  </p>
                  <button
                    className="button primary"
                    onClick={() => setView("discover")}
                  >
                    Explore equipment <ArrowRight size={16} />
                  </button>
                </div>
              ) : (
                <div className="reservation-list">
                  {list.map((r) => (
                    <article className="reservation-card" key={r.id}>
                      <div className="reservation-main">
                        <span className="reservation-icon">
                          <Package size={24} />
                        </span>
                        <div>
                          <div className="reservation-title">
                            <h3>{r.equipment_name}</h3>
                            <span
                              className={`status status-${r.overdue ? "overdue" : r.status.toLowerCase()}`}
                            >
                              {r.overdue
                                ? "OVERDUE"
                                : r.status === "RESERVED" &&
                                    r.end_at < Date.now()
                                  ? "EXPIRED"
                                  : r.status}
                            </span>
                          </div>
                          <p>
                            {date(r.start_at)} → {date(r.end_at)} IST
                          </p>
                          <span className="hint">
                            {r.quantity} {r.quantity === 1 ? "unit" : "units"} ·{" "}
                            {admin ? r.student_name : r.location}
                          </span>
                        </div>
                      </div>
                      <div className="reservation-actions">
                        <button
                          className="button text-button"
                          onClick={() => setReservationDetail(r)}
                        >
                          Details
                        </button>
                        {r.status === "RESERVED" && r.start_at > Date.now() && (
                          <button
                            className="button secondary"
                            onClick={() => action(r, "cancel")}
                            disabled={actionBusy === r.id}
                          >
                            Cancel
                          </button>
                        )}
                        {admin &&
                          r.status === "RESERVED" &&
                          r.start_at <= Date.now() + 900000 &&
                          r.end_at > Date.now() && (
                            <button
                              className="button primary"
                              disabled={actionBusy === r.id}
                              onClick={() => action(r, "issue")}
                            >
                              Issue equipment
                            </button>
                          )}
                        {admin && r.status === "ISSUED" && (
                          <button
                            className="button primary"
                            disabled={actionBusy === r.id}
                            onClick={() => action(r, "return")}
                          >
                            Record return
                          </button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
              <p className="rules-note">
                Cancellation is available before the start. The lab desk can
                issue from 15 minutes before a slot until its end. Overdue loans
                must be returned before new bookings can be made for that
                equipment.
              </p>
            </>
          )}
          {view === "inventory" && admin && (
            <>
              <div className="inventory-heading">
                <h2>Equipment register</h2>
                <button
                  className="button primary"
                  onClick={() => setEdit("new")}
                >
                  <Plus size={17} />
                  Add equipment
                </button>
              </div>
              <div className="inventory-list">
                {equipment.map((e) => (
                  <article key={e.id} className="inventory-row">
                    <span className="inventory-icon">
                      {(() => {
                        const Icon = ICONS[e.category] ?? Package;
                        return <Icon size={25} />;
                      })()}
                    </span>
                    <div>
                      <h3>
                        {e.name}{" "}
                        {!e.active && <span className="status">ARCHIVED</span>}
                      </h3>
                      <p>
                        {e.category} · {e.location} · {e.capacity} units
                      </p>
                    </div>
                    <div className="inventory-actions">
                      <button
                        className="button secondary"
                        onClick={() => setMaintenance(e)}
                      >
                        <Wrench size={15} />
                        Maintenance
                      </button>
                      <button
                        className="button secondary"
                        onClick={() => setEdit(e)}
                      >
                        Edit
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              <p className="rules-note">
                Capacity reductions and archiving are blocked while equipment
                has outstanding reservations. Maintenance blocks all units and
                is rejected when it overlaps an active booking.
              </p>
            </>
          )}
        </main>
        <footer className="app-footer">
          <span>
            CampusSlot <span className="brand-dot">●</span> Built for the things
            you’re building.
          </span>
          <span>Fictional data · Asia/Kolkata (UTC+05:30)</span>
        </footer>
      </div>
      {selected && (
        <BookingModal
          equipment={selected}
          user={user}
          initialStart={start}
          initialEnd={end}
          onClose={() => setSelected(null)}
          onBooked={async (r) => {
            setSelected(null);
            setNotice(
              `Reservation confirmed · ${r.id.slice(0, 8).toUpperCase()}. Bring your campus ID to collect your equipment.`,
            );
            setAvail({});
            setView("reservations");
            await refresh();
          }}
        />
      )}
      {edit && (
        <EquipmentModal
          equipment={edit === "new" ? null : edit}
          onClose={() => setEdit(null)}
          onSaved={async () => {
            setEdit(null);
            setNotice("Equipment saved.");
            await refresh();
          }}
        />
      )}
      {maintenance && (
        <MaintenanceModal
          equipment={maintenance}
          onClose={() => setMaintenance(null)}
          onChanged={() => {
            setAvail({});
            void refresh();
          }}
        />
      )}
      {reservationDetail && (
        <ReservationModal
          reservation={reservationDetail}
          onClose={() => setReservationDetail(null)}
        />
      )}
    </div>
  );
}
function BookingModal({
  equipment,
  user,
  initialStart,
  initialEnd,
  onClose,
  onBooked,
}: {
  equipment: Equipment;
  user: User;
  initialStart: string;
  initialEnd: string;
  onClose: () => void;
  onBooked: (r: Reservation) => void;
}) {
  const [start, setStart] = useState(initialStart),
    [end, setEnd] = useState(initialEnd),
    [quantity, setQuantity] = useState(1),
    [purpose, setPurpose] = useState(""),
    [available, setAvailable] = useState<Availability | null>(null),
    [checking, setChecking] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const key = useRef(crypto.randomUUID()),
    lastPayload = useRef("");
  useEffect(() => {
    let live = true;
    setAvailable(null);
    setChecking(true);
    setError("");
    api<Availability>(
      `equipment/${equipment.id}/availability?start=${epoch(start)}&end=${epoch(end)}`,
    )
      .then((a) => {
        if (live) setAvailable(a);
      })
      .catch((e) => {
        if (live) setError(e.message);
      })
      .finally(() => {
        if (live) setChecking(false);
      });
    return () => {
      live = false;
    };
  }, [equipment.id, start, end]);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const input = {
      equipmentId: equipment.id,
      startAt: epoch(start),
      endAt: epoch(end),
      quantity,
      purpose,
    };
    const payload = JSON.stringify(input);
    if (lastPayload.current && lastPayload.current !== payload)
      key.current = crypto.randomUUID();
    lastPayload.current = payload;
    try {
      const result = await api<{ reservation: Reservation }>(
        "reservations",
        "POST",
        { ...input, requestKey: key.current },
      );
      onBooked(result.reservation);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={equipment.name} onClose={onClose}>
      <div className="modal-content">
        <Art equipment={equipment} large />
        <p>{equipment.description}</p>
        <p className="location">
          <MapPin size={15} />
          {equipment.location}
        </p>
        <form onSubmit={submit}>
          <DateRange
            start={start}
            end={end}
            setStart={setStart}
            setEnd={setEnd}
          />
          <div className="availability-panel" role="status">
            {checking ? (
              "Checking this time slot…"
            ) : available ? (
              <>
                <strong>
                  {available.available} of {available.capacity} units available
                </strong>
                <span>
                  {available.maintenance.length
                    ? "This slot overlaps scheduled maintenance."
                    : available.overdue
                      ? "An overdue loan is blocking this equipment."
                      : "Availability is checked again when you reserve."}
                </span>
              </>
            ) : (
              "Choose a valid time slot to check availability."
            )}
          </div>
          <ErrorBox message={error} />
          {user.role === "student" ? (
            <>
              <div className="form-row">
                <label>
                  Units
                  <input
                    type="number"
                    min={1}
                    max={equipment.capacity}
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                  />
                </label>
                <label>
                  Project or purpose
                  <input
                    maxLength={240}
                    required
                    placeholder="e.g. Final-year robotics prototype"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                  />
                </label>
              </div>
              <p className="hint">
                Up to 7 days per booking. Cancel any time before your slot
                starts.
              </p>
              <button
                className="button primary wide"
                disabled={
                  busy ||
                  checking ||
                  !available ||
                  available.available < quantity
                }
              >
                {busy ? "Reserving your slot…" : "Confirm reservation"}
                <ArrowRight size={18} />
              </button>
            </>
          ) : (
            <p className="notice">
              Sign in with a student account to reserve. Administrators manage
              loans from the lending desk.
            </p>
          )}
        </form>
      </div>
    </Modal>
  );
}
function EquipmentModal({
  equipment,
  onClose,
  onSaved,
}: {
  equipment: Equipment | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      await api(
        equipment ? `equipment/${equipment.id}` : "equipment",
        equipment ? "PATCH" : "POST",
        {
          name: f.get("name"),
          category: f.get("category"),
          description: f.get("description"),
          location: f.get("location"),
          capacity: Number(f.get("capacity")),
          active: f.get("active") === "on",
        },
      );
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={equipment ? "Edit equipment" : "Add equipment"}
      onClose={onClose}
    >
      <form className="modal-content" onSubmit={submit}>
        <label>
          Equipment name
          <input
            name="name"
            required
            maxLength={100}
            defaultValue={equipment?.name}
          />
        </label>
        <div className="form-row">
          <label>
            Category
            <select
              name="category"
              defaultValue={equipment?.category ?? "Photography"}
            >
              {CATEGORIES.slice(1).map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Total units
            <input
              name="capacity"
              type="number"
              min={1}
              max={100}
              required
              defaultValue={equipment?.capacity ?? 1}
            />
          </label>
        </div>
        <label>
          Collection location
          <input
            name="location"
            required
            maxLength={100}
            defaultValue={equipment?.location}
          />
        </label>
        <label>
          Description & collection notes
          <textarea
            name="description"
            required
            maxLength={1200}
            rows={4}
            defaultValue={equipment?.description}
          />
        </label>
        <label className="checkbox">
          <input
            name="active"
            type="checkbox"
            defaultChecked={equipment?.active !== 0}
          />{" "}
          Available in the catalogue (uncheck to archive)
        </label>
        <ErrorBox message={error} />
        <button className="button primary wide" disabled={busy}>
          {busy ? "Saving…" : "Save equipment"}
          <Check size={18} />
        </button>
      </form>
    </Modal>
  );
}
function MaintenanceModal({
  equipment,
  onClose,
  onChanged,
}: {
  equipment: Equipment;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [rows, setRows] = useState<Maintenance[]>([]),
    [start, setStart] = useState(initialStart),
    [end, setEnd] = useState(() => localTime(epoch(initialStart()) + 3600000)),
    [reason, setReason] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    try {
      setRows(
        (await api<{ maintenance: Maintenance[] }>(`equipment/${equipment.id}`))
          .maintenance,
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }, [equipment.id]);
  useEffect(() => {
    void load();
  }, [load]);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(`equipment/${equipment.id}/maintenance`, "POST", {
        startAt: epoch(start),
        endAt: epoch(end),
        reason,
      });
      setNotice(
        "Maintenance scheduled. All units are blocked for this interval.",
      );
      setReason("");
      await load();
      onChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove(id: string) {
    setBusy(true);
    setError("");
    try {
      await api(`maintenance/${id}`, "DELETE", {});
      await load();
      setNotice("Maintenance removed. Availability has been restored.");
      onChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={`Maintenance · ${equipment.name}`} onClose={onClose}>
      <div className="modal-content">
        <p>
          Block all units for servicing. Any overlap with an active reservation
          is rejected; cancel an eligible booking or choose another time.
        </p>
        {notice && (
          <p className="notice success" role="status">
            {notice}
          </p>
        )}
        <ErrorBox message={error} />
        <form onSubmit={submit}>
          <DateRange
            start={start}
            end={end}
            setStart={setStart}
            setEnd={setEnd}
          />
          <label>
            Reason
            <input
              required
              maxLength={240}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Lens cleaning and calibration"
            />
          </label>
          <button className="button primary wide" disabled={busy}>
            {busy ? "Updating…" : "Schedule maintenance"}
            <Wrench size={17} />
          </button>
        </form>
        <h3 className="section-space">Scheduled periods</h3>
        {!rows.length ? (
          <p className="muted">No upcoming maintenance.</p>
        ) : (
          rows.map((m) => (
            <div className="maintenance-row" key={m.id}>
              <div>
                <strong>{m.reason}</strong>
                <p>
                  {date(m.start_at)} → {date(m.end_at)} IST
                </p>
              </div>
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => remove(m.id)}
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>
    </Modal>
  );
}
function ReservationModal({
  reservation: r,
  onClose,
}: {
  reservation: Reservation;
  onClose: () => void;
}) {
  const [events, setEvents] = useState<
      { action: string; at: number; actor: string }[]
    >([]),
    [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    api<{ events: typeof events }>(`reservations/${r.id}`)
      .then((d) => {
        if (live) setEvents(d.events);
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [r.id]);
  return (
    <Modal title="Reservation details" onClose={onClose}>
      <div className="modal-content">
        <span className={`status status-${r.status.toLowerCase()}`}>
          {r.status}
        </span>
        <h3 className="section-space">{r.equipment_name}</h3>
        <p>
          {date(r.start_at)} → {date(r.end_at)} IST
        </p>
        <p>
          {r.quantity} units · {r.location}
        </p>
        <dl className="detail-list">
          <dt>Purpose</dt>
          <dd>{r.purpose}</dd>
          <dt>Reference</dt>
          <dd className="reference">{r.id}</dd>
          <dt>Created</dt>
          <dd>{date(r.created_at)} IST</dd>
        </dl>
        <h3>Activity history</h3>
        <ErrorBox message={error} />
        <ol className="timeline">
          {events.map((a, i) => (
            <li key={i}>
              <strong>{a.action}</strong>
              <span>
                {date(a.at)} IST · {a.actor}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </Modal>
  );
}
