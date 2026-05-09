# Marize Ehap — Frontend Sub-Leader
# ماريز إيهاب — مسؤولة الفريق الفرعي للـ Frontend

> **Sub-Team:** 2 — Frontend & Visualization | **الفريق الفرعي:** 2 — الواجهة الأمامية والتصوير
> **Stack:** React 18, Vite, TailwindCSS, Zustand, React Query, Axios, WebSocket

---

## Role Summary | ملخص الدور

**English:** Marize owns the entire React frontend — its architecture, routing, state management, authentication flow, and component design system. She is the gatekeeper for all frontend code (reviews and merges all frontend PRs) and runs the daily Sub-Team 2 standup. She ensures the cyber-theme design language (neon glow, glass cards) stays consistent across every component.

**عربي:** ماريز تمتلك الـ frontend بالكامل — معماريته، التوجيه، إدارة الحالة، تدفق المصادقة، ونظام تصميم المكونات. هي الحارسة لكل كود الـ frontend (تراجع وتدمج جميع PRs) وتدير الستاند أب اليومي للفريق الفرعي 2. تضمن بقاء لغة تصميم السيبر (توهّج النيون، بطاقات الزجاج) متسقة عبر كل مكوّن.

---

## Files She Owns | الملفات التي تمتلكها

| File | What it does | ماذا تفعل |
|------|-------------|-----------|
| `frontend/src/main.jsx` | App entry — wraps everything in QueryClient + RealTimeProvider | نقطة دخول التطبيق — يلفّ كل شيء |
| `frontend/src/App.jsx` | Root component + routing | المكوّن الجذري + التوجيه |
| `frontend/src/pages/Dashboard.jsx` | Main dashboard page — all tabs, all panels | صفحة لوحة التحكم الرئيسية |
| `frontend/src/layout/Layout.jsx` | Page wrapper, health check, ⌘K shortcut | غلاف الصفحة، فحص الصحة |
| `frontend/src/layout/Sidebar.jsx` | Navigation sidebar with WebSocket status badge | شريط التنقل الجانبي |
| `frontend/src/context/RealTimeContext.jsx` | WebSocket state + reducer — ALL real-time data | حالة WebSocket + المخفّض |
| `frontend/src/context/AuthContext.jsx` | Auth state (JWT token, user role) | حالة المصادقة |
| `frontend/src/services/api.js` | Axios instance + all service objects | مثيل Axios + جميع كائنات الخدمة |
| `frontend/src/components/ui/` | ALL shared UI primitives | جميع العناصر الأولية المشتركة |
| `tailwind.config.js` | Custom cyber theme — colors + animations | ثيم السيبر المخصص |

## Files to Create | الملفات التي يجب إنشاؤها

| File | Purpose | الغرض |
|------|---------|-------|
| `frontend/src/pages/LoginPage.jsx` | Login form with JWT auth flow | صفحة تسجيل الدخول |
| `frontend/src/components/ui/ProtectedRoute.jsx` | Redirects unauthenticated users | يعيد توجيه المستخدمين غير المصادق عليهم |
| `frontend/src/components/ui/RoleGuard.jsx` | Hides UI elements by user role | يُخفي عناصر UI حسب الدور |
| `frontend/src/hooks/useAuth.js` | Custom hook wrapping AuthContext | Hook مخصص يلفّ AuthContext |
| `frontend/src/pages/SettingsPage.jsx` | User settings, role display, logout | إعدادات المستخدم |

---

## Key Code Explained | شرح الكود الرئيسي

### `frontend/src/main.jsx` — App Entry Point

**English:** This is the first file React loads. It wraps the entire app in two providers:

**عربي:** هذا أول ملف يحمله React. يلفّ التطبيق بالكامل في مزوّدَين:

```jsx
// main.jsx — the full file (simplified)
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { RealTimeProvider } from './context/RealTimeContext'
import App from './App'

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')).render(
  <QueryClientProvider client={queryClient}>
    {/* React Query handles ALL server data fetching and caching */}
    {/* React Query يتعامل مع جلب وتخزين جميع بيانات الخادم */}
    
    <RealTimeProvider>
      {/* RealTimeProvider manages the WebSocket connection + real-time state */}
      {/* RealTimeProvider يدير اتصال WebSocket + الحالة الفورية */}
      
      <App />
    </RealTimeProvider>
  </QueryClientProvider>
)
```

**Why two providers?**
- `QueryClientProvider` → Handles API calls (async HTTP). When you call `useQuery(...)` anywhere in the app, it uses this.
- `RealTimeProvider` → Handles WebSocket. When a scan runs, events flow through this without needing an API call.

**لماذا مزوّدان؟**
- `QueryClientProvider` → يتعامل مع استدعاءات API (HTTP غير متزامن). عند استدعاء `useQuery(...)` في أي مكان بالتطبيق، يستخدم هذا.
- `RealTimeProvider` → يتعامل مع WebSocket. عند تشغيل مسح، تتدفق الأحداث عبر هذا بدون الحاجة لاستدعاء API.

---

### `frontend/src/context/RealTimeContext.jsx` — The Live Data Brain

**English:** This is the most complex file in the frontend. It manages the WebSocket connection AND all real-time state. It uses React's `useReducer` pattern (like Redux but built-in).

**عربي:** هذا أكثر الملفات تعقيدًا في الـ frontend. يدير اتصال WebSocket وجميع الحالة الفورية. يستخدم نمط `useReducer` في React (مثل Redux لكن مدمج).

```javascript
// The STATE SHAPE — everything the real-time system knows
const initialState = {
    kpi: {
        overall_score: 0,      // The big risk score (0-100)
        health_score: 100,     // 100 - overall_score
        counts: {              // Vulnerability counts by severity
            critical: 0, high: 0, medium: 0, low: 0
        },
        total_assets: 0,       // How many devices/services found
        last_scan_id: null,    // ID of the most recent scan
    },
    alerts: [],            // Array of security alerts (max 50)
    orchestrationLog: [], // Array of agent log messages (max 200)
    scanStatus: 'IDLE',   // 'IDLE' | 'RUNNING' | 'COMPLETED' | 'FAILED'
    isConnected: false,   // Is WebSocket currently connected?
};
```

**عربي لشكل الحالة:**
```javascript
// شكل الحالة — كل ما يعرفه نظام الوقت الفعلي
const initialState = {
    kpi: {
        overall_score: 0,      // درجة الخطر الكبيرة (0-100)
        health_score: 100,     // 100 - overall_score
        counts: { critical: 0, high: 0, medium: 0, low: 0 },
        total_assets: 0,       // عدد الأجهزة/الخدمات المكتشفة
        last_scan_id: null,    // معرّف آخر مسح
    },
    alerts: [],            // مصفوفة تنبيهات أمنية (حد أقصى 50)
    orchestrationLog: [], // مصفوفة رسائل سجل الوكيل (حد أقصى 200)
    scanStatus: 'IDLE',   // 'IDLE' | 'RUNNING' | 'COMPLETED' | 'FAILED'
    isConnected: false,   // هل WebSocket متصل حاليًا؟
};
```

```javascript
// The REDUCER — responds to WebSocket events and updates state
function reducer(state, action) {
    switch (action.type) {
        case 'UPDATE_RISK':
            // Called when backend sends a "RISK_UPDATE" WebSocket message
            // Updates the big risk score on the dashboard
            return { ...state, kpi: { ...state.kpi, overall_score: action.payload.overall_score } };

        case 'ADD_LOG':
            // Called for every "LOG_STREAM" message from backend
            // Adds to the Orchestration Feed (newest first, max 200)
            const entry = { message: action.payload, timestamp: new Date().toISOString() };
            return { ...state, orchestrationLog: [entry, ...state.orchestrationLog].slice(0, 200) };

        case 'SET_SCAN_STATUS':
            // 'IDLE' | 'RUNNING' | 'COMPLETED' | 'FAILED'
            return { ...state, scanStatus: action.payload };
    }
}
```

**WebSocket connection with exponential backoff:**
```javascript
// If the WebSocket disconnects, it automatically reconnects:
// Attempt 1: wait 1 second, then retry
// Attempt 2: wait 2 seconds
// Attempt 3: wait 4 seconds
// ...capped at 30 seconds
// This is called "exponential backoff" — prevents flooding the server
```

**WebSocket مع التراجع الأسي:**
```javascript
// إذا انقطع WebSocket، يعيد الاتصال تلقائيًا:
// المحاولة 1: انتظر ثانية، ثم أعد المحاولة
// المحاولة 2: انتظر ثانيتين
// المحاولة 3: انتظر 4 ثوانٍ
// ...حد أقصى 30 ثانية
// يُسمى "التراجع الأسي" — يمنع إغراق الخادم
```

---

### `frontend/src/services/api.js` — The API Layer

**English:** All HTTP calls to the backend go through this file. It creates one Axios instance configured for the backend URL, then organizes all API calls into service objects.

**عربي:** جميع استدعاءات HTTP للـ backend تمر عبر هذا الملف. ينشئ مثيلًا واحدًا من Axios مُعدًّا لرابط الـ backend، ثم ينظّم جميع استدعاءات API في كائنات خدمة.

```javascript
// ONE axios instance for the whole app
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
    // VITE_API_URL comes from the .env file
    // This is 'https://localhost/api/v1' in Docker (goes through Caddy)
});

// JWT interceptor — adds Authorization header to EVERY request automatically
api.interceptors.request.use(config => {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// Service objects — organized API calls
export const scanService = {
    startScan: (data) => api.post('/scans/', data),
    getScans: () => api.get('/scans/'),
    getScanDetails: (id) => api.get(`/scans/${id}`),
};

export const dashboardService = {
    getKpiSnapshot: () => api.get('/dashboard/kpi'),
    getRiskOverview: () => api.get('/dashboard/risk-overview'),
    getActionItems: () => api.get('/dashboard/action-items'),
};
```

---

## What Marize Must Learn | ما يجب على ماريز تعلّمه

| Topic | Why | لماذا |
|-------|-----|-------|
| React Router v6: `<Routes>`, `<Route>`, `useNavigate()` | Build multi-page routing + protected routes | بناء توجيه متعدد الصفحات + مسارات محمية |
| JWT in React: `localStorage` vs `sessionStorage` | Implement auth correctly | تطبيق المصادقة بشكل صحيح |
| React Query: `useQuery`, `useMutation`, `invalidateQueries` | All data fetching uses this | جميع عمليات جلب البيانات تستخدم هذا |
| `useReducer` pattern | Understand and extend `RealTimeContext` | فهم وتوسيع `RealTimeContext` |
| React.lazy() + Suspense | Code splitting for performance | تقسيم الكود للأداء |
| Tailwind responsive: `sm:`, `md:`, `lg:` | Mobile layout | تخطيط الجوال |

**Resources | الموارد:**
- React Router v6: https://reactrouter.com/en/main
- React Query: https://tanstack.com/query/latest/docs/framework/react/overview
- React docs (useReducer): https://react.dev/reference/react/useReducer

---

## Phase 3 Timeline | الجدول الزمني للمرحلة 3

| Week | Task | المهمة |
|------|------|-------|
| 10 | Build `LoginPage.jsx`; wire to `/auth/login`; store JWT | بناء صفحة تسجيل الدخول |
| 11 | Add `ProtectedRoute` and `RoleGuard`; hide analyst features from viewer | إضافة حماية المسار والحراسة بالدور |
| 12 | Mobile responsiveness; loading skeletons; error boundaries | استجابة الجوال؛ هياكل التحميل |
| 13 | Fix all UAT-reported UI bugs; freeze frontend | إصلاح أخطاء UAT؛ تجميد الـ frontend |

---

## Presentation Duty | دور التقديم

**English:** Marize presents the 5-minute **Frontend & UX walkthrough** — showing the dashboard tabs, the real-time scan update animation, and the role-based UI (how the viewer sees a read-only dashboard while the admin can trigger scans).

**عربي:** ماريز تقدّم مقطع **جولة الواجهة الأمامية وتجربة المستخدم** لمدة 5 دقائق — تُظهر تبويبات لوحة التحكم، رسوم المسح الفوري المتحركة، والواجهة القائمة على الدور (كيف يرى المشاهد لوحة تحكم للقراءة فقط بينما المشرف يستطيع تشغيل المسوح).
