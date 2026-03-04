# CarePoint

CarePoint is a full-stack, multi-tenant healthcare management system designed to streamline clinical workflows across hospitals and clinics. It provides role-based dashboards for every healthcare professional — from front-desk receptionists to doctors, lab technicians, pharmacists, and administrators — all under a single, organization-isolated platform.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Roles & Modules](#roles--modules)
- [Key Features](#key-features)
- [Getting Started](#getting-started)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Environment Variables](#environment-variables)
- [API Overview](#api-overview)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Backend | Python, Flask, Flask-SQLAlchemy, Flask-Migrate |
| Auth | Flask-JWT-Extended (JWT tokens) |
| Database | SQLite (dev) / PostgreSQL (production) |
| HTTP Client | Axios |
| UI Components | Headless UI, Heroicons |

---

## Architecture

CarePoint follows a **multi-tenant architecture** where every piece of data is scoped to an `organization_id`. Different healthcare facilities can share the same deployment with complete data isolation between them.

```
frontend/          React + TypeScript SPA (Vite)
backend/
  app/
    models/        SQLAlchemy ORM models
    routes/        Flask Blueprint API routes (one per role/domain)
    utils/         Data isolation helpers and role decorators
  config/          Environment-based configuration
  migrations/      Alembic database migrations
```

---

## Roles & Modules

CarePoint supports **eight distinct user roles**, each with a dedicated dashboard and permission set:

| Role | Dashboard | Responsibilities |
|------|-----------|-----------------|
| `super_admin` | Super Admin Dashboard | Manage organizations, approve facility registrations |
| `admin` | Admin Dashboard | Manage users, departments, reports, and organization settings |
| `receptionist` | Receptionist Dashboard | Patient registration, triage, queue management, appointments |
| `doctor` | Doctor Dashboard | Consultations, medical records, prescriptions, lab test orders |
| `lab_technician` | Lab Technician Dashboard | Process lab tests, record results, flag abnormal findings |
| `pharmacist` | Pharmacist Dashboard | Dispense prescriptions, manage pharmacy inventory |
| `nurse` | (shared access) | Triage support, patient monitoring |
| `patient` | Patient Portal | View own records and appointments |

Organization administrators can enable or disable the `doctor`, `receptionist`, `lab_technician`, and `pharmacist` modules on a per-facility basis.

---

## Key Features

### Patient Management
- Register walk-in, appointment, emergency, and follow-up patients
- Auto-generated organization-scoped patient IDs
- Capture demographics, emergency contacts, allergies, chronic conditions, and insurance info
- Search patients by name, phone, or patient ID

### Triage & Queue Management
- Record chief complaint, pain scale (1–10), and full vital signs (BP, heart rate, temperature, SpO₂, weight, height)
- Auto-calculate priority scores (Emergency → Urgent → Less Urgent → Non-Urgent)
- Real-time queue tracking with status updates (waiting → called → in progress → completed)
- Estimated wait time display

### Appointments
- Schedule, confirm, and cancel appointments per doctor and department
- Track appointment status through its full lifecycle
- Consultation fee capture and payment status

### Medical Records & Consultations
- Structured visit records: diagnosis, treatment plan, vital signs, follow-up instructions
- Free-text prescription writing with automatic parsing into structured fields (medication, dosage, frequency, duration, quantity)
- Lab test ordering directly from the consultation screen
- Patient referrals between departments

### Lab Technician Module
- View ordered lab tests filtered by status (pending, in progress, completed)
- Record results with result values, notes, and abnormal flags
- Automatic doctor notifications on result completion

### Pharmacist Module
- View and filter prescriptions by status (pending, dispensed, referred, cancelled)
- One-click dispensing with automatic inventory deduction
- Refer patients to external pharmacies when stock is unavailable
- Inventory management: add/update medications, track stock levels, batch numbers, expiry dates, and storage locations
- Low-stock and out-of-stock alerts on the dashboard

### Billing
- Automatic bill creation per patient visit (one bill per day)
- Bill items added automatically as services are rendered: consultations, lab tests, dispensed medications
- Bill status lifecycle: open → pending payment → paid / cancelled
- Supports partial payments and payment tracking

### Notifications
- Role-specific in-app notifications (e.g., lab results ready for doctors, prescription pickup alerts for pharmacists)
- Read/unread tracking with filtering by type

### Reports & Analytics
- Doctor activity reports (consultations, prescriptions issued)
- Lab test turnaround reports
- Billing and revenue summaries
- CSV export support

### Administration
- User management: create, activate/deactivate staff accounts
- Department management with head-doctor assignment
- Subscription plans and per-organization user limits
- Facility registration request workflow (reviewed by super admin)

---

## Getting Started

### Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment (see Environment Variables section)
cp .env.example .env

# Initialize and migrate the database
flask db upgrade

# Run the development server
python run.py
```

The API will be available at `http://localhost:5000`.

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## Environment Variables

Create a `.env` file inside the `backend/` directory:

```env
SECRET_KEY=your-secret-key
JWT_SECRET_KEY=your-jwt-secret-key
DATABASE_URL=postgresql://username:password@localhost:5432/carepoint_db
```

For local development, SQLite is used automatically when `DATABASE_URL` is not set.

---

## API Overview

All API endpoints are prefixed with `/api/` and require a JWT bearer token (except auth endpoints).

| Prefix | Module |
|--------|--------|
| `/api/auth` | Registration, login, password reset |
| `/api/healthcare` | Patients, appointments, medical records, lab tests, triage |
| `/api/receptionist` | Patient registration and queue workflows |
| `/api/pharmacist` | Prescriptions and pharmacy inventory |
| `/api/lab_technician` | Lab test processing and results |
| `/api/billing` | Bills and payments |
| `/api/reports` | Analytics and CSV exports |
| `/api/notifications` | In-app notification inbox |
| `/api/admin` | User and department management |
| `/api/super_admin` | Organization and facility management |

