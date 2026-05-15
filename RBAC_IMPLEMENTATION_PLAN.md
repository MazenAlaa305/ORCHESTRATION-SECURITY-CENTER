# RBAC Full Implementation Plan — Orchestration Security Center

> **Purpose:** This document is a self-contained, step-by-step implementation plan for
> completing full Role-Based Access Control (RBAC) in the Orchestration Security Center.
> Any AI assistant can read this file and implement every step without additional context.

---

## 1. Project Context

| Layer | Technology |
|---|---|
| Backend | FastAPI (Python 3.10), SQLAlchemy ORM, PostgreSQL, Alembic migrations |
| Auth | JWT (HS256) via `python-jose`, `passlib[bcrypt]` for password hashing |
| Task queue | Celery + Redis |
| Frontend | React 18, Vite, Tailwind CSS |
| Container | Docker Compose — main stack + lab stack |
| Entry point | Caddy reverse proxy → `https://localhost` |

### 1.1 Existing Auth Infrastructure (already in codebase — do NOT recreate)

| File | What exists |
|---|---|
| `backend/app/models/user.py` | `User` model + `UserRole` enum (`VIEWER`, `ANALYST`, `ADMIN`) |
| `backend/app/core/security.py` | `create_access_token`, `decode_token`, `hash_password`, `verify_password` |
| `backend/app/api/deps.py` | `get_current_user`, `require_role(*roles)` dependency factory |
| `backend/app/api/v1/endpoints/auth.py` | `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `POST /auth/change-password` |
| `backend/app/api/v1/endpoints/rbac.py` | `GET /rbac/users`, `POST /rbac/users`, `PATCH /rbac/users/{id}/role`, `POST /rbac/users/{id}/disable` |

### 1.2 Role Hierarchy

```
ADMIN    → full access: user management, target CRUD, scan triggers, report export, all reads
ANALYST  → scan triggers, vulnerability status updates, all reads — no user management, no target delete
VIEWER   → read-only: all GET endpoints, no mutations of any kind
```

---

## 2. What Is Missing (Gap Analysis)

Before writing any code, confirm each gap still exists by reading the relevant file.

| # | Gap | Relevant files |
|---|---|---|
| G1 | No `PATCH /rbac/users/{id}` to update email or force-reset password by admin | `rbac.py` |
| G2 | No `POST /rbac/users/{id}/enable` to re-enable a disabled account | `rbac.py` |
| G3 | No `DELETE /rbac/users/{id}` hard-delete endpoint | `rbac.py` |
| G4 | No `force_password_change` toggle endpoint for admin | `rbac.py` |
| G5 | No pagination on `GET /rbac/users` | `rbac.py` |
| G6 | Existing endpoints in `targets.py`, `scans.py`, `vulnerabilities.py` etc. lack `require_role` guards on mutating routes | all endpoint files |
| G7 | No audit log model or table for user-management actions | `models/` |
| G8 | No frontend User Management page | `frontend/src/` |
| G9 | No frontend role-guard hook or HOC | `frontend/src/` |
| G10 | No frontend route protection (VIEWER cannot see admin-only tabs) | `frontend/src/` |
| G11 | Alembic migration missing for audit log table | `backend/alembic/versions/` |

---

## 3. Implementation Steps

Work through these steps in order. Each step is self-contained with exact file paths,
what to change, and the acceptance test.

---

### Step 1 — Extend `UserRole` with `SUPERADMIN` (optional — skip if 3 roles suffice)

**File:** `backend/app/models/user.py`

Add `SUPERADMIN` above `ADMIN` if the project requires a root-level role that can demote
other admins. If 3 roles are enough, skip to Step 2.

```python
class UserRole(str, enum.Enum):
    VIEWER    = "VIEWER"      # read-only
    ANALYST   = "ANALYST"     # scans + vuln updates
    ADMIN     = "ADMIN"       # + target CRUD + user management
    SUPERADMIN = "SUPERADMIN" # + can demote/delete other admins
```

Generate an Alembic migration after this change:
```bash
alembic revision --autogenerate -m "add_superadmin_role"
alembic upgrade head
```

**Acceptance:** `GET /rbac/users` returns `role` values that include `SUPERADMIN`.

---

### Step 2 — Add Missing RBAC API Endpoints

**File:** `backend/app/api/v1/endpoints/rbac.py`

Add the following endpoints. Read the existing file first — do not duplicate imports.

#### 2a. Enable a disabled user

```python
@router.post("/users/{user_id}/enable", response_model=UserOut, dependencies=[admin_only])
def enable_user(
    user_id: str,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    user.disabled = False
    db.commit()
    db.refresh(user)
    return user
```

#### 2b. Admin force-reset another user's password

```python
class PasswordReset(BaseModel):
    new_password: str

@router.post("/users/{user_id}/reset-password", response_model=UserOut, dependencies=[admin_only])
def admin_reset_password(
    user_id: str,
    body: PasswordReset,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    if user.id == current.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Use /auth/change-password to change your own password")
    user.password_hash = hash_password(body.new_password)
    user.force_password_change = True
    db.commit()
    db.refresh(user)
    return user
```

#### 2c. Paginated user list

Replace the existing `list_users` route:

```python
@router.get("/users", response_model=list[UserOut], dependencies=[admin_only])
def list_users(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    return db.query(User).offset(skip).limit(limit).all()
```

#### 2d. Hard-delete a user (ADMIN only, cannot delete self)

```python
@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[admin_only])
def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    if user.id == current.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Cannot delete yourself")
    db.delete(user)
    db.commit()
```

**Acceptance:** Each new route appears in `http://localhost:8000/docs` under `/api/v1/rbac`.

---

### Step 3 — Enforce `require_role` Guards on All Mutating Routes

For each file listed below, read the file, find every `POST`, `PUT`, `PATCH`, `DELETE`
route that does NOT already have a `require_role` dependency, and add one.

**Role guard cheatsheet:**
```python
from app.api.deps import require_role
from app.models.user import UserRole

analyst_or_above = Depends(require_role(UserRole.ANALYST, UserRole.ADMIN))
admin_only        = Depends(require_role(UserRole.ADMIN))
```

**Files to audit and fix:**

| File | Routes that need guarding | Required role |
|---|---|---|
| `backend/app/api/v1/endpoints/targets.py` | `POST /targets`, `PUT /targets/{id}`, `DELETE /targets/{id}` | `ADMIN` |
| `backend/app/api/v1/endpoints/scans.py` | `POST /scans` (trigger scan) | `ANALYST` or `ADMIN` |
| `backend/app/api/v1/endpoints/vulnerabilities.py` | `PATCH /vulnerabilities/{id}` (status update) | `ANALYST` or `ADMIN` |
| `backend/app/api/v1/endpoints/reports.py` | `POST /reports` (generate) | `ANALYST` or `ADMIN` |
| `backend/app/api/v1/endpoints/config.py` | All write routes | `ADMIN` |
| `backend/app/api/v1/endpoints/lab.py` | `POST /lab/seed`, `POST /lab/reset` | `ADMIN` |

**Pattern for adding a dependency to an existing route:**
```python
# Before
@router.post("/targets")
def create_target(...):

# After
@router.post("/targets", dependencies=[Depends(require_role(UserRole.ADMIN))])
def create_target(...):
```

**Acceptance:** Log in as a `VIEWER` JWT, attempt `POST /api/v1/targets` — expect HTTP 403.
Log in as `ANALYST` JWT, attempt `POST /api/v1/scans` — expect HTTP 201.

---

### Step 4 — Create Audit Log Model and Migration

**File to create:** `backend/app/models/audit_log.py`

```python
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text
from app.core.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id         = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    actor_id   = Column(String(36), nullable=False, index=True)   # user who performed action
    actor_email= Column(String(255), nullable=False)
    action     = Column(String(64), nullable=False)                # e.g. "USER_CREATED"
    target_id  = Column(String(36), nullable=True)                 # user/resource affected
    detail     = Column(Text, nullable=True)                       # JSON or plain string
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
```

**File to update:** `backend/app/models/__init__.py`

Import `AuditLog` so Alembic detects it:
```python
from .audit_log import AuditLog  # noqa: F401
```

**Generate migration:**
```bash
alembic revision --autogenerate -m "add_audit_log_table"
alembic upgrade head
```

**Add a helper function** to `backend/app/core/audit.py` (create this file):

```python
from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog
from app.models.user import User


def log_action(db: Session, actor: User, action: str, target_id: str = None, detail: str = None):
    entry = AuditLog(
        actor_id=actor.id,
        actor_email=actor.email,
        action=action,
        target_id=target_id,
        detail=detail,
    )
    db.add(entry)
    db.commit()
```

**Wire up audit logging** inside `rbac.py` endpoints — call `log_action` after each
successful user mutation (CREATE, ROLE_CHANGE, DISABLE, ENABLE, DELETE, PASSWORD_RESET).

Example in `create_user`:
```python
from app.core.audit import log_action

# after db.commit():
log_action(db, actor=current, action="USER_CREATED", target_id=user.id, detail=user.email)
```

**Acceptance:** Create a user via `POST /rbac/users`, then query `SELECT * FROM audit_logs;`
in the Postgres container — one row should appear with `action = "USER_CREATED"`.

---

### Step 5 — Add `GET /rbac/audit-logs` Endpoint (Admin Only)

**File:** `backend/app/api/v1/endpoints/rbac.py`

Add schema and route:

```python
from app.models.audit_log import AuditLog

class AuditLogOut(BaseModel):
    id: str
    actor_email: str
    action: str
    target_id: str | None
    detail: str | None
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("/audit-logs", response_model=list[AuditLogOut], dependencies=[admin_only])
def get_audit_logs(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    return (
        db.query(AuditLog)
        .order_by(AuditLog.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
```

**Acceptance:** `GET /api/v1/rbac/audit-logs` returns a list of log entries when called
with an ADMIN JWT.

---

### Step 6 — Register `rbac` Router in `api.py` (if not already registered)

**File:** `backend/app/api/api.py`

Read the file. If `/rbac` is not already included, add it:

```python
from app.api.v1.endpoints import rbac

api_router.include_router(rbac.router, prefix="/rbac", tags=["RBAC"])
```

**Acceptance:** `http://localhost:8000/docs` shows the RBAC section.

---

### Step 7 — Frontend: Auth Context with Role

**File:** `frontend/src/context/AuthContext.jsx` (create if it does not exist)

This context stores the current user's JWT, role, and expiry. All other hooks read from it.

```jsx
import { createContext, useContext, useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode"; // npm install jwt-decode if missing

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return null;
    try {
      const decoded = jwtDecode(token);
      if (decoded.exp * 1000 < Date.now()) {
        localStorage.removeItem("access_token");
        return null;
      }
      return { token, role: decoded.role, email: decoded.sub };
    } catch {
      return null;
    }
  });

  const login = (token) => {
    localStorage.setItem("access_token", token);
    const decoded = jwtDecode(token);
    setUser({ token, role: decoded.role, email: decoded.sub });
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

Wrap the root component in `frontend/src/main.jsx`:
```jsx
import { AuthProvider } from "./context/AuthContext";

<AuthProvider>
  <App />
</AuthProvider>
```

**Acceptance:** After login, `useAuth().user.role` returns `"ADMIN"`, `"ANALYST"`, or `"VIEWER"`.

---

### Step 8 — Frontend: `usePermission` Hook

**File:** `frontend/src/hooks/usePermission.js` (create)

```js
import { useAuth } from "../context/AuthContext";

const ROLE_RANK = { VIEWER: 0, ANALYST: 1, ADMIN: 2, SUPERADMIN: 3 };

export function usePermission() {
  const { user } = useAuth();
  const role = user?.role ?? "VIEWER";

  return {
    isAdmin:    ROLE_RANK[role] >= ROLE_RANK["ADMIN"],
    isAnalyst:  ROLE_RANK[role] >= ROLE_RANK["ANALYST"],
    isViewer:   ROLE_RANK[role] >= ROLE_RANK["VIEWER"],
    canManageUsers:  ROLE_RANK[role] >= ROLE_RANK["ADMIN"],
    canTriggerScan:  ROLE_RANK[role] >= ROLE_RANK["ANALYST"],
    canDeleteTarget: ROLE_RANK[role] >= ROLE_RANK["ADMIN"],
    canExportReport: ROLE_RANK[role] >= ROLE_RANK["ANALYST"],
    role,
  };
}
```

**Usage example:**
```jsx
const { canTriggerScan } = usePermission();
{canTriggerScan && <button onClick={handleScan}>Scan</button>}
```

**Acceptance:** A VIEWER-logged-in session shows no Scan button in the Targets tab.

---

### Step 9 — Frontend: Hide Admin-Only Tabs in `TabNavigation.jsx`

**File:** `frontend/src/components/TabNavigation.jsx`

Read the current file. Locate the tabs array or JSX that renders the navigation items.
Wrap any admin-only tabs (`Settings`, `User Management`, `Config`) with a permission check.

```jsx
import { usePermission } from "../hooks/usePermission";

// Inside the component:
const { isAdmin } = usePermission();

// In the tabs list, add a condition:
const tabs = [
  { id: "dashboard",   label: "Dashboard",    visible: true },
  { id: "targets",     label: "Targets",      visible: true },
  { id: "scans",       label: "Scan History", visible: true },
  { id: "vulns",       label: "Findings",     visible: true },
  { id: "lab",         label: "Lab",          visible: isAdmin },
  { id: "users",       label: "Users",        visible: isAdmin },
  { id: "settings",    label: "Settings",     visible: isAdmin },
].filter(t => t.visible);
```

**Acceptance:** Log in as VIEWER — the Users and Settings tabs must not appear in navigation.

---

### Step 10 — Frontend: User Management Page

**File:** `frontend/src/pages/UserManagementPage.jsx` (create)

This page is only reachable when `isAdmin` is true (enforced in Step 9).
It must call the backend RBAC endpoints and render a table of users with actions.

#### Component structure:

```
UserManagementPage
├── UserTable          — lists all users with role badge, status badge
│   └── UserRow        — one row per user with action buttons
├── CreateUserModal    — form: email, password, role selector
└── RoleChangeModal    — dropdown to select new role for a user
```

#### API calls (all require the JWT in `Authorization: Bearer <token>`):

| Action | Endpoint | Method |
|---|---|---|
| List users | `/api/v1/rbac/users` | GET |
| Create user | `/api/v1/rbac/users` | POST |
| Change role | `/api/v1/rbac/users/{id}/role` | PATCH |
| Disable user | `/api/v1/rbac/users/{id}/disable` | POST |
| Enable user | `/api/v1/rbac/users/{id}/enable` | POST |
| Reset password | `/api/v1/rbac/users/{id}/reset-password` | POST |
| Delete user | `/api/v1/rbac/users/{id}` | DELETE |

#### Minimal implementation:

```jsx
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

const API = "http://localhost:8000/api/v1";

function authHeaders(token) {
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

export default function UserManagementPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [showCreate, setShowCreate] = useState(false);

  const fetchUsers = async () => {
    const res = await fetch(`${API}/rbac/users`, { headers: authHeaders(user.token) });
    if (res.ok) setUsers(await res.json());
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleDisable = async (id) => {
    await fetch(`${API}/rbac/users/${id}/disable`, { method: "POST", headers: authHeaders(user.token) });
    fetchUsers();
  };

  const handleEnable = async (id) => {
    await fetch(`${API}/rbac/users/${id}/enable`, { method: "POST", headers: authHeaders(user.token) });
    fetchUsers();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Permanently delete this user?")) return;
    await fetch(`${API}/rbac/users/${id}`, { method: "DELETE", headers: authHeaders(user.token) });
    fetchUsers();
  };

  const handleRoleChange = async (id, newRole) => {
    await fetch(`${API}/rbac/users/${id}/role`, {
      method: "PATCH",
      headers: authHeaders(user.token),
      body: JSON.stringify({ role: newRole }),
    });
    fetchUsers();
  };

  const handleCreate = async (email, password, role) => {
    await fetch(`${API}/rbac/users`, {
      method: "POST",
      headers: authHeaders(user.token),
      body: JSON.stringify({ email, password, role }),
    });
    setShowCreate(false);
    fetchUsers();
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">User Management</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + New User
        </button>
      </div>

      <table className="w-full border-collapse border border-gray-700 text-sm">
        <thead className="bg-gray-800">
          <tr>
            <th className="p-3 text-left">Email</th>
            <th className="p-3 text-left">Role</th>
            <th className="p-3 text-left">Status</th>
            <th className="p-3 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-t border-gray-700">
              <td className="p-3">{u.email}</td>
              <td className="p-3">
                <select
                  value={u.role}
                  onChange={(e) => handleRoleChange(u.id, e.target.value)}
                  className="bg-gray-700 text-white rounded px-2 py-1"
                  disabled={u.id === user.id}
                >
                  {["VIEWER", "ANALYST", "ADMIN"].map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </td>
              <td className="p-3">
                <span className={u.disabled ? "text-red-400" : "text-green-400"}>
                  {u.disabled ? "Disabled" : "Active"}
                </span>
              </td>
              <td className="p-3 flex gap-2">
                {u.id !== user.id && (
                  <>
                    {u.disabled
                      ? <button onClick={() => handleEnable(u.id)} className="text-green-400 hover:underline">Enable</button>
                      : <button onClick={() => handleDisable(u.id)} className="text-yellow-400 hover:underline">Disable</button>
                    }
                    <button onClick={() => handleDelete(u.id)} className="text-red-400 hover:underline">Delete</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showCreate && <CreateUserModal onSubmit={handleCreate} onClose={() => setShowCreate(false)} />}
    </div>
  );
}

function CreateUserModal({ onSubmit, onClose }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("VIEWER");

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg w-96 space-y-4">
        <h2 className="text-lg font-semibold">Create New User</h2>
        <input
          type="email" placeholder="Email" value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-gray-700 text-white rounded px-3 py-2"
        />
        <input
          type="password" placeholder="Password" value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-gray-700 text-white rounded px-3 py-2"
        />
        <select
          value={role} onChange={(e) => setRole(e.target.value)}
          className="w-full bg-gray-700 text-white rounded px-3 py-2"
        >
          {["VIEWER", "ANALYST", "ADMIN"].map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 bg-gray-600 rounded">Cancel</button>
          <button
            onClick={() => onSubmit(email, password, role)}
            className="px-4 py-2 bg-blue-600 rounded"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Acceptance:** Log in as ADMIN, open the Users tab — see the user table and be able to
create, disable, enable, change role, and delete users without page reload.

---

### Step 11 — Frontend: Wire the New Page into the Router / App

**File:** `frontend/src/App.jsx` (or wherever tab routing lives — read the file first)

Import the page and render it when the active tab is `"users"`:

```jsx
import UserManagementPage from "./pages/UserManagementPage";

// In the tab switch / conditional render:
{activeTab === "users" && <UserManagementPage />}
```

---

### Step 12 — Frontend: Role Badge Component (reusable)

**File:** `frontend/src/components/ui/RoleBadge.jsx` (create)

```jsx
const COLORS = {
  SUPERADMIN: "bg-purple-700 text-white",
  ADMIN:      "bg-red-700 text-white",
  ANALYST:    "bg-yellow-600 text-white",
  VIEWER:     "bg-gray-600 text-white",
};

export default function RoleBadge({ role }) {
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${COLORS[role] ?? COLORS.VIEWER}`}>
      {role}
    </span>
  );
}
```

Use it in `UserManagementPage` and in `GET /auth/me` display in the header/sidebar.

---

### Step 13 — Verify Alembic Migration History is Clean

```bash
# Inside the backend container or venv:
alembic history --verbose
alembic current
```

Ensure `head` equals `current`. If a migration is pending, run:
```bash
alembic upgrade head
```

If the `users` table is missing the `disabled` column (old schema), generate a migration:
```bash
alembic revision --autogenerate -m "ensure_users_disabled_column"
alembic upgrade head
```

---

### Step 14 — End-to-End Test Matrix

Manually test every combination before marking this feature done.

| # | Actor | Action | Expected HTTP | Expected UI |
|---|---|---|---|---|
| T1 | VIEWER | `GET /api/v1/targets` | 200 | — |
| T2 | VIEWER | `POST /api/v1/targets` | 403 | — |
| T3 | VIEWER | `POST /api/v1/scans` | 403 | — |
| T4 | ANALYST | `POST /api/v1/scans` | 201 | — |
| T5 | ANALYST | `DELETE /api/v1/targets/{id}` | 403 | — |
| T6 | ANALYST | `POST /api/v1/rbac/users` | 403 | — |
| T7 | ADMIN | `POST /api/v1/rbac/users` | 201 | User appears in table |
| T8 | ADMIN | `PATCH /api/v1/rbac/users/{id}/role` | 200 | Role badge updates |
| T9 | ADMIN | `POST /api/v1/rbac/users/{id}/disable` | 200 | Status shows Disabled |
| T10 | ADMIN | `POST /api/v1/rbac/users/{id}/enable` | 200 | Status shows Active |
| T11 | ADMIN | `DELETE /api/v1/rbac/users/{id}` | 204 | Row disappears |
| T12 | VIEWER | UI — Users tab visible? | — | No (tab hidden) |
| T13 | ADMIN | UI — Users tab visible? | — | Yes |
| T14 | Disabled user | `POST /auth/login` | 403 | — |
| T15 | ADMIN | `GET /rbac/audit-logs` | 200 | List of log entries |
| T16 | ANALYST | `GET /rbac/audit-logs` | 403 | — |

---

## 4. File Change Summary

| File | Change type |
|---|---|
| `backend/app/models/user.py` | Extend enum (Step 1) |
| `backend/app/models/audit_log.py` | **Create** (Step 4) |
| `backend/app/models/__init__.py` | Import `AuditLog` (Step 4) |
| `backend/app/core/audit.py` | **Create** `log_action` helper (Step 4) |
| `backend/app/api/v1/endpoints/rbac.py` | Add 4 endpoints + audit calls (Steps 2, 4, 5) |
| `backend/app/api/v1/endpoints/targets.py` | Add `require_role` guards (Step 3) |
| `backend/app/api/v1/endpoints/scans.py` | Add `require_role` guards (Step 3) |
| `backend/app/api/v1/endpoints/vulnerabilities.py` | Add `require_role` guards (Step 3) |
| `backend/app/api/v1/endpoints/reports.py` | Add `require_role` guards (Step 3) |
| `backend/app/api/v1/endpoints/config.py` | Add `require_role` guards (Step 3) |
| `backend/app/api/v1/endpoints/lab.py` | Add `require_role` guards (Step 3) |
| `backend/app/api/api.py` | Register rbac router if missing (Step 6) |
| `backend/alembic/versions/` | New migration file(s) (Steps 1, 4) |
| `frontend/src/context/AuthContext.jsx` | **Create** auth context (Step 7) |
| `frontend/src/hooks/usePermission.js` | **Create** permission hook (Step 8) |
| `frontend/src/components/TabNavigation.jsx` | Hide admin tabs (Step 9) |
| `frontend/src/pages/UserManagementPage.jsx` | **Create** full page (Step 10) |
| `frontend/src/App.jsx` | Wire new page to tab (Step 11) |
| `frontend/src/components/ui/RoleBadge.jsx` | **Create** badge component (Step 12) |
| `frontend/src/main.jsx` | Wrap with `AuthProvider` (Step 7) |

---

## 5. Dos and Don'ts

**Do:**
- Read every file before editing it — the existing code may already implement part of a step.
- Run `alembic upgrade head` inside the backend container after every model change.
- Restart the backend container after Python changes: `docker compose restart backend`.
- Use the existing `require_role` factory from `deps.py` — do not invent a new one.
- Keep all JWT validation in the backend — never trust the frontend role for authorization.

**Do not:**
- Recreate `User`, `UserRole`, `get_current_user`, or `require_role` — they already exist.
- Add frontend route-guards as a security mechanism — they are UX only. Security lives in the API.
- Use `disabled: true` as a substitute for role checks — a disabled user is blocked at login, not at the route level.
- Skip the Alembic migration — deploying model changes without a migration will break the running container.

---

*Plan version: 1.0 — generated 2026-05-15 for Orchestration Security Center*
