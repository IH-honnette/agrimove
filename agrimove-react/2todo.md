# AgriMove — Execution Plan

## Phase 1: Backend Auth API
- [x] Install bcrypt + jsonwebtoken in backend
- [x] Create users table migration (schema.sql)
- [x] Create `src/routes/auth.js` with signup/login/me endpoints
- [x] Mount auth routes in `src/index.js`

## Phase 2: Frontend Auth
- [x] Install react-router-dom
- [x] Create AuthContext (src/context/AuthContext.jsx)
- [x] Create auth API helper (src/api/authApi.js)
- [x] Create LoginPage component
- [x] Create SignupPage component
- [x] Add routing in App.jsx — wrap with BrowserRouter + AuthProvider
- [x] Protect booking flow — require login

## Phase 3: UI Redesign
- [x] Add Inter font to index.html
- [x] Rewrite index.css — modern CSS variables, dark/rich palette
- [x] Rewrite App.css — premium header, glassmorphism, animations
- [x] New auth page styles in AuthPages.css
- [x] Update header — show auth state, user menu, login/signup buttons
- [x] Polish all components — cards, forms, modals, filters
- [x] Add micro-animations (fade-in, hover scale, shimmer loading)

## Phase 4: Testing & Polish
- [ ] Verify signup → login → browse → book flow
- [ ] Verify responsive on mobile
- [ ] Write 4test.md scenarios
