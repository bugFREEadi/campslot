# CampusSlot — 4 minute 30 second demonstration

## Before recording

Use a normal terminal with local-server permissions:

```sh
npm ci
npm run setup
npm start
```

Open `http://127.0.0.1:3000`. For a hosted demo, use only the verified live URL and confirm evaluator access. Close unrelated tabs and avoid showing credentials or personal files. All shown project data is fictional.

Use Asha (`asha@campus.demo`) and Meera (`admin@campus.demo`); password for both: `CampusDemo!2026`. Set the first slot to **five minutes from the current time**, ending one hour later. This is future-bookable and inside the 15-minute issue window. If rehearsal runs longer, update the start before recording.

Prepare no fake confirmations. A clean local dataset has six equipment types and no bookings. Do not reset an existing database simply to film; choose an available slot or use a separate `DATABASE_PATH` with `npm run setup` and `npm start`.

## Timed walkthrough

| Time | Exact actions | Suggested narration |
| --- | --- | --- |
| 0:00–0:25 | Show sign-in screen. Choose **Asha · Student**, click **Sign in**. | “CampusSlot helps students reserve shared campus equipment before visiting a lab. The lab administrator manages collection, returns and maintenance. These accounts and records are fictional.” |
| 0:25–0:55 | Search `camera`; clear search. Select Photography. Enter a start five minutes ahead and end one hour later; click **Check availability**. Open **Mirrorless camera kit**. | “Availability is calculated for the whole selected interval, in Indian Standard Time. We track quantities, so more than one student can book a kit without exceeding the total capacity.” |
| 0:55–1:25 | In details, set quantity 1, purpose `End-term project demonstration`, click **Confirm reservation**. Read confirmation/reference. Refresh the browser, then open **My reservations**. | “The server validates the interval and role. A database trigger performs the capacity check atomically, so concurrent requests cannot both claim the last unit. The confirmation survives refresh because it is stored in SQLite, not browser storage.” |
| 1:25–1:50 | Cancel this booking. Return to Discover and make a second one-unit camera booking with purpose `Demo collection and return`, start again five minutes ahead. | “Students can cancel their own reservation before it starts. Cancellation releases capacity. Terminal states cannot be reopened, and duplicate submissions use an idempotency key.” |
| 1:50–2:30 | Sign out. Choose **Meera · Admin**, sign in. Open **Lending desk**, find latest camera booking. Click **Issue equipment**, then **Record return**. Open **Details** to show activity history. | “Only an administrator can issue or return equipment. Issue is limited to the pickup window and available physical capacity. Every transition creates an audit entry in the same database write. Overdue loans remain issued and are flagged until returned.” |
| 2:30–3:15 | Open Inventory. Click **Add equipment**. Name `Demo sensor kit`, Electronics, 2 units, location `Fictional Lab D-201`, description `Fictional demonstration kit with sensors and cable`. Save. Open its **Maintenance**, choose tomorrow 10:00–11:00 IST, reason `Sensor calibration`, schedule. | “Inventory changes are permission-checked on the server. Maintenance blocks every unit for its interval. It cannot silently displace a student's existing booking; a conflict is rejected explicitly.” |
| 3:15–3:45 | Close maintenance. Open Discover; choose the same tomorrow 10:00–11:00 slot. Search `Demo sensor kit`, check availability and open it. Show zero available and maintenance explanation. | “The same maintenance rule affects the student-facing availability calculation. There are no decorative buttons: this block is stored in the database and enforced again during reservation.” |
| 3:45–4:10 | Resize browser to a narrow mobile-sized window. Show catalogue and a details dialog. Restore desktop. | “The catalogue, time selection and dialogs adapt to a small screen. Forms have labels, errors remain visible and the interface supports keyboard operation.” |
| 4:10–4:30 | Show terminal output from `npm test` and `npm run typecheck`, then architecture diagram if time allows. | “The automated suite tests real SQL constraints, privacy, lifecycle rules, and a race with 12 separate database connections. The project deliberately focuses on four complete workflows rather than unrelated features.” |

Do not say “deployed and verified” unless the checks in `TESTING.md` have actually run on the live origin. If presenting locally, explicitly say it is the persistent local build.

## Optional conflict proof if time remains

As Asha, reserve an available kit for tomorrow 12:00–13:00. As Meera, try scheduling maintenance for that same kit and interval. Show the conflict message. Choose another interval; do not silently cancel the student's reservation. This replaces, rather than adds to, the inventory creation segment if keeping below five minutes.

## Recording and delivery

**No demo video has been recorded or uploaded in this workspace.** Chromium and local server startup were blocked by the sandbox. Recording and upload remain the student's action.

Use macOS **Shift–Command–5** to record the relevant browser window/screen with microphone narration, or your institution's approved recorder. Aim for 3–5 minutes. Trim setup/waiting; do not edit out a failure in a way that misrepresents functionality. The optional browser test script can produce an unedited silent QA video after permissions are enabled, but it is not the narrated submission demo.

Upload the final recording to the course-approved location, set evaluator viewing access, verify it in another authorized session, and paste its actual URL into `SUBMISSION.md` and the official form. Do not invent a video link.
