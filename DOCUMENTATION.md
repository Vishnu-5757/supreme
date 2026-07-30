# Supreme Energies (SupremeEnergies) — Project Documentation

## 1) Overview
**SupremeEnergies** is a React Native (Expo) mobile application for managing enterprise workflows such as:
- **Dashboard** (daily overview + shortcuts)
- **Service records**
- **Projects** (including project tracking)
- **Leads**
- **Users** (admin/staff management)

The app uses:
- **React Navigation** (Stack + Bottom Tabs)
- **@tanstack/react-query** for app-level query client
- A custom **permission system** fetched from backend
- A custom **JWT token + refresh** mechanism for authenticated API calls

---

## 2) Tech Stack & Key Libraries
- **Expo / React Native**
- **react-native-vector-icons** (MaterialCommunityIcons)
- **React Navigation**:
  - `@react-navigation/native`
  - `@react-navigation/bottom-tabs`
  - `@react-navigation/stack`
- **Axios** is included in dependencies, though some screens use `fetch` directly.
- **@tanstack/react-query**: application wraps everything in `QueryClientProvider`.

---

## 3) Entry Points
### 3.1 `App.tsx`
**Location:** `SupremeEnergies/App.tsx`

Responsibilities:
1. Creates the navigation structure:
   - `Stack.Navigator` for app-level routes
   - `BottomTab.Navigator` for the main tab group
2. Initializes the `QueryClientProvider`
3. Implements **permission guards** for all tabs except Dashboard.
4. Registers modal-style screens for create/edit actions.

#### Navigation routes (high-level)
- `Splash` → `SplashScreenView` (custom splash)
- `Login` → `LoginScreen`
- `MainTabs` → `TabGroup` (bottom tabs)

Stack modal routes:
- `AddUser` → `AddUserScreen`
- `EditUser` → `EditUserScreen`
- `AddEditLead` → `Addeditleadscreen.tsx`
- `AddEditProject` → `AddEditProjectScreen.tsx`
- `ProjectTrackingScreen` → `ProjectTrackingScreen.tsx`
- `AddEditService` → `AddEditServiceScreen.tsx`

### 3.2 `config.ts`
**Location:** `SupremeEnergies/config.ts`
- Defines `API_BASE_URL` (currently set to `http://3.25.162.35`).

---

## 4) Authentication & Token Handling
### 4.1 `hooks/useAuthApi.ts`
**Location:** `SupremeEnergies/hooks/useAuthApi.ts`

Implements:
- Global in-memory storage for:
  - `access` token
  - `refresh` token
- `apiRequest(url, options, retry)` wrapper around `fetch`
- Automatic refresh when a request returns **401**
- Auto-logout scheduling based on **refresh token expiry**

#### Core exported functions
- `setAuthTokens(access: string, refresh: string)`
  - stores tokens and schedules auto-logout
- `clearAuthTokens()`
  - clears tokens + cancels logout timer
- `getAccessToken()`
  - returns the current access token
- `setSessionExpiredCallback(callback)`
  - registers a callback invoked when session expires
- `useAuthApi()`
  - returns `{ apiRequest, isRefreshing }`

#### Refresh flow
1. `apiRequest()` sends request with `Authorization: Bearer <access>`
2. If response is **401** and `retry` is true:
   - calls `refreshAccessToken()` once (shared via `refreshPromise`)
   - retries the original request with the new token
3. If refresh fails, triggers `onSessionExpiredCallback()`.

---

## 5) Permission System (Role/Module Access)
### 5.1 `hooks/usePermissions.ts`
**Location:** `SupremeEnergies/hooks/usePermissions.ts`

Implements:
- Fetching permissions from `GET/POST` style endpoint (uses `apiRef.current(`${API_BASE_URL}/api/permissions/`)`)
- Caching permissions globally to avoid refetching
- Polling every `POLL_INTERVAL_MS` (code comment says 5 minutes, constant is `3 * 60 * 1000`)
- Re-fetch on app foreground via `AppState`

#### Permission mapping
`MODULE_PERMISSION_MAP` maps module names to required permission strings:
- `dashboard` → `dashboard.view_notification`
- `service` → `service.view_servicerecord`
- `project` → `project.view_project`
- `lead` → `lead.view_lead`
- `users` → `auth.view_user`

#### Returned API
The hook returns:
- `canAccess(module: string)`
- `hasPermission(perm: string)`
- `permissions`
- `isSuperuser`
- `loading`
- `refreshPermissions()`

### 5.2 `hooks/PermissionContext.tsx`
**Location:** `SupremeEnergies/hooks/PermissionContext.tsx`

- Provides `PermissionContext` for the tab group.
- `usePermissionContext()` is used by:
  - Bottom navigation rendering
  - Guarded tab wrappers in `App.tsx`
  - Screens like `DashboardScreen` / `NoAccessScreen` integrations

---

## 6) Navigation & Permission Gating UX
### 6.1 Guarded tab wrapper logic in `App.tsx`
In `App.tsx`, tab screens are conditionally replaced with:
- `LoadingScreen` while permissions are loading
- `NoAccessScreen` when the user lacks module access
- otherwise the real screen

Dashboard is not guarded (it checks access internally).

### 6.2 Bottom Navigation Bar: `components/BottomNavBar.tsx`
**Location:** `SupremeEnergies/components/BottomNavBar.tsx`

- Renders 5 tabs:
  - Dashboard
  - Service
  - Projects
  - Leads
  - Users
- Uses `usePermissionContext()` to decide:
  - lock indicator UI (badge + greyed icon)
- Always navigates to the tab screen; the **screen** decides whether to show `NoAccessScreen`.

---

## 7) Screens (UI + Data Loading Patterns)
### 7.1 `components/SplashScreenView.tsx`
- Custom splash UI using `expo-splash-screen`.
- Calls `onFinish()` after 2.5 seconds to navigate to `Login`.

### 7.2 `screens/LoginScreen.tsx`
- Username + password form
- Calls `${API_BASE_URL}/api/login/`
- On success:
  - `setAuthTokens(data.access, data.refresh)`
  - `clearPermissionsCache()`
  - navigates to `MainTabs` → `Dashboard`

### 7.3 `screens/NoAccessScreen.tsx`
- Animated “Access Required” screen.
- Accepts:
  - `moduleName` (optional)
  - `showLogout` + `onLogout` (optional)
- Used by guarded tab wrappers and dashboard restriction.

### 7.4 `screens/DashboardScreen.tsx`
- Main landing screen.
- Fetches dashboard data from `${API_BASE_URL}/dashboard/api/`.
- Uses:
  - `usePermissionContext().canAccess('dashboard')`
  - `useAuthApi().apiRequest()` for authenticated fetch
- Shows:
  - dashboard cards + recent lists if access is allowed
  - otherwise shows a locked/restricted animated card

Also includes:
- A right-side **drawer UI** (custom animated overlay).
- Logout flows:
  - confirmation modal
  - logout request to `${API_BASE_URL}/api/logout/`
  - `clearAuthTokens()` and navigation back to `Login`

### 7.5 `screens/LeadsScreen.tsx`
- Lead list with:
  - search (`q`)
  - multi-select filters for **quality** and **status**
  - pagination (`page`, `page_size=20`)
- Fetch pattern:
  - filter options fetched on mount from:
    - `${API_BASE_URL}/lead/quality/manage/`
    - `${API_BASE_URL}/lead/api/config/status/`
  - leads fetched from:
    - `${API_BASE_URL}/lead/api/leads/?<params>`
- Uses `useFocusEffect` to refresh when returning.
- Lead details in a bottom-sheet style modal (drag down to dismiss).

### 7.6 Other screens
From project structure and imports in `App.tsx`, the app also contains:
- `ServiceScreen.tsx`
- `ProjectsScreen.tsx`
- `ProjectTrackingScreen.tsx`
- `Addeditleadscreen.tsx`
- `AddEditProjectScreen.tsx`
- `AddEditServiceScreen.tsx`
- `UsersScreen.tsx`, `AddUserScreen.tsx`, `EditUserScreen.tsx`
- `UserFormScreen.tsx`

These screens follow the same overall patterns:
- use `useAuthApi()` for authenticated backend access
- use `usePermissionContext()` / `canAccess()` to restrict modules
- navigate to create/edit screens via Stack routes

---

## 8) Create/Edit Modal Screens
Create/edit flows are implemented as Stack screens (often opened with `navigation.navigate('AddEditX', params)`).

Typical usage:
- From list screens, tapping “New” navigates to the corresponding “AddEdit…” screen
- From dashboard shortcuts, the app navigates to tab screens or directly to modals based on `canAccess()`.

---

## 9) Project Structure
```
SupremeEnergies/
  App.tsx                      # Navigation + permission wrappers
  config.ts                    # API base URL
  hooks/
    useAuthApi.ts              # JWT token store + refresh + apiRequest wrapper
    usePermissions.ts          # permission fetch, cache, polling, guards
    PermissionContext.tsx     # context provider + consumer
  components/
    BottomNavBar.tsx         # bottom tab UI + lock badges
    SplashScreenView.tsx    # custom splash
  screens/
    LoginScreen.tsx
    DashboardScreen.tsx
    NoAccessScreen.tsx
    LeadsScreen.tsx
    ProjectsScreen.tsx
    ServiceScreen.tsx
    UsersScreen.tsx
    AddUserScreen.tsx
    EditUserScreen.tsx
    Addeditleadscreen.tsx
    AddEditProjectScreen.tsx
    AddEditServiceScreen.tsx
    ProjectTrackingScreen.tsx
  android/ ...                 # native Android config
  assets/ ...                 # app icons + splash
```

---

## 10) Running the App (Expo)
From `SupremeEnergies/`:
- `npm install`
- `npm start`
- `npm run android`

---

## 11) Notes / Important Behaviors
- **Permission fetching is cached globally** (`usePermissions.ts` has module-level variables).
- **Permissions are refreshed** via:
  - polling
  - app foreground events
- **Token refresh** is centralized in `useAuthApi.ts` and retries once after 401.
- **UI-level gating**:
  - `BottomNavBar` uses permissions only for visual lock badges.
  - actual access control is enforced by guarded wrappers and `NoAccessScreen`.

---

Generated documentation based on the currently visible and read project files in this environment.

