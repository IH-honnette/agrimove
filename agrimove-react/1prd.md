# AgriMove Frontend — UI Redesign & Authentication PRD

## Overview
Modernize the AgriMove React frontend with a premium, visually stunning design and add login/signup authentication functionality.

## Goals
1. **Premium UI Redesign** — Transform the plain, basic design into a modern, visually impressive interface with gradients, glassmorphism, micro-animations, premium typography, and a dark-mode-ready color palette.
2. **Login/Signup** — Add client-side authentication flow (Login & Signup pages) that integrates with a new backend auth API using JWT tokens. Protect the driver booking flow behind authentication.

## Feature Requirements

### F1: UI Redesign
- Modern Google Font (Inter) for typography
- Rich gradient header with glassmorphism effects
- Smooth card hover animations and micro-interactions
- Enhanced color palette with harmonious tones (not flat green)
- Animated loading states (skeleton or spinner)
- Better spacing, shadows, and depth throughout
- Mobile-first responsive polish

### F2: Authentication
- **Signup page** — name, email, phone, password, confirm password
- **Login page** — email + password
- JWT token stored in localStorage
- Auth state managed via React Context
- Protected routes: booking requires login
- Header shows user name + logout when authenticated
- Backend endpoints: POST /api/auth/signup, POST /api/auth/login, GET /api/auth/me

## Out of Scope
- Password reset / forgot password
- OAuth / social login
- Email verification
