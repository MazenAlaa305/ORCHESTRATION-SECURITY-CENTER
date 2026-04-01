# components/OpenVAS/Scheduler.jsx — Documentation

## File Purpose

Provides the **OpenVAS recurring scan scheduling interface** (3,621 bytes), allowing users to configure automated periodic OpenVAS scans against registered targets.

## Key Components

### `OpenVASScheduler()`
A form component for defining scan schedules.

**Form Fields:**
- Target IP / Hostname input
- Schedule frequency dropdown: Daily, Weekly, Monthly, Custom (cron expression)
- First run date/time picker
- Notification email (receive alerts on scan completion)
- Scan configuration dropdown (Full and Fast, Full and Very Deep, etc.)

**Logic:**
On submit, calls `openvasService.scheduleScan(data)` which creates an OpenVAS schedule and task via the backend. Success shows a confirmation toast and adds the schedule summary to a list below the form.

**Schedule List:** Below the form, displays all currently configured schedules with their next-run time and a "Delete" button for each.

## Dependencies
- `react` — `useState`
- `@tanstack/react-query` — `useMutation`
- `../../services/api.js` — `openvasService`
