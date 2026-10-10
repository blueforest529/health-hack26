# OTrace Library

Lending library for Occupational Therapy equipment at Tallaght University Hospital. Staff only, no login: every action is recorded as Admin. Works on desktop (sidebar, tables) and phones (bottom tabs, list rows) from one responsive React app.

## Run

```bash
npm install
npm run dev        # http://localhost:5173  (also on your LAN for phones: see the "Network" URL)
npm run build      # static files in dist/, open from any web server or folder
npm run preview    # serve dist/ locally
```

## Screens

| Route | Screen |
| --- | --- |
| `#/` | Equipment register: search, Type / Status / Overdue chips, table (desktop) or rows (phone) |
| `#/items/:id` | Item: details, current patient, lending history, Lend or Return |
| `#/items/new`, `#/patients/new` | Add / edit item or patient |
| `#/lend` | Lend and return: two big buttons, last actions |
| `#/lend/new` | Lend in 4 steps: item → patient → due date → confirm, then "Lent D27 to ••••512, due …" with Undo |
| `#/return` | Return: choose item, see who has it, Return item, Undo |
| `#/waitlist` | Queue per type; top entry shows "D27 is available" + Lend to this patient |
| `#/history` | Every lend and return, filter by item, patient, action, date |
| `#/sheet` | Import the Excel tracker (.xlsx) with preview, export to Excel |

## Notes

- Data is kept in the browser (localStorage) on each device. "Restore demo data" on the Update sheet screen resets it. A shared backend is the next step for multi-device use.
- Colour-blind safe statuses: colour + icon + word + shape (Available outline, On loan soft fill, Overdue solid, Waiting dashed), blue/orange axis.
- English only. Ukrainian, Polish and Romanian translations are kept in `src/i18n/` if a switcher is needed again.
- Scanning: handheld USB scanners type into the focused search box (press Enter). Camera scanning uses the browser's BarcodeDetector (Chrome / Edge / Android); other browsers show "type the number".
- Excel import reads every sheet, finds the header row (Asset, Item, Serial, Status, MRN, Patient, Ward, Due, …), and lists problems (missing asset number, duplicates, unreadable dates) before anything is saved.

Stack: React 19, TypeScript, Vite, React Router (hash routes), lucide-react icons, ExcelJS, IBM Plex Sans.
# health-hack26
