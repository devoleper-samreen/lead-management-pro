# Lead Management System

A production-grade Lead & Data Management System with role-based access control, built to demonstrate full-stack development skills and engineering judgment.

## Overview

This application streamlines lead management workflows across three distinct user roles: Admins, Team Leaders, and HR Users. It provides comprehensive tools for lead distribution, tracking, analytics, and performance monitoring.

## Features

### Authentication & Authorization
- JWT-based authentication
- Role-based access control (Admin, Team Leader, HR User)
- Protected routes with automatic redirection
- Secure password hashing

### Admin Dashboard
- **User Management**
  - Create and manage Team Leaders and HR Users
  - Update user details (name, email, phone, role)
  - Delete users with cascade handling
  - Assign HR users to Team Leaders
- **Lead Management**
  - Upload leads via CSV/Excel files
  - Bulk lead distribution to HR users
  - View all leads with assignment status
- **Analytics**
  - Real-time lead statistics (total, converted, rejected, not reachable)
  - HR performance metrics with conversion rates
  - Visual charts (Pie charts, Bar graphs)
  - Team-wide performance overview

### Team Leader Dashboard
- View assigned HR team members
- Monitor team performance statistics
- Filter leads by team member
- Read-only analytics access
- Individual HR user performance cards

### HR User Dashboard
- View assigned leads
- Update lead status (Pending, Contacted, Converted, Rejected, Not Reachable)
- Search and filter leads
- Personal performance metrics
- Lead status distribution charts

## Tech Stack

### Frontend
- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Charts:** Recharts
- **HTTP Client:** Axios
- **Notifications:** React Hot Toast
- **State Management:** React Context API

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** JWT (jsonwebtoken)
- **File Upload:** Multer
- **Excel/CSV Parsing:** xlsx
- **Security:** bcryptjs, cors
- **Validation:** Express-validator

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or MongoDB Atlas)
- npm or yarn

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/lead-management
# or use MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/lead-management

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d

# CORS
CORS_ORIGIN=http://localhost:3000
```


4. Start backend server:
```bash
npm run dev
```

Backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env.local` file:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

4. Start frontend server:
```bash
npm run dev
```

Frontend will run on `http://localhost:3000`

### Sample CSV Format

For uploading leads, use this CSV structure:
```csv
name,email,phone,company,position
John Doe,john@example.com,+1234567890,ABC Corp,Manager
Jane Smith,jane@example.com,+0987654321,XYZ Inc,Director
```

## Architecture Overview

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│  (Next.js 15 App Router + TypeScript + Tailwind CSS)       │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTP/REST API
                        │ (JWT Authentication)
┌───────────────────────▼─────────────────────────────────────┐
│                    API Gateway Layer                         │
│              (Express.js Middleware)                         │
│  • Authentication (JWT verify)                               │
│  • Authorization (Role-based)                                │
│  • Error Handling                                            │
│  • Request Validation                                        │
└───────────────────────┬─────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
┌───────▼──────┐ ┌─────▼──────┐ ┌─────▼──────┐
│    Admin     │ │Team Leader │ │  HR User   │
│  Controller  │ │ Controller │ │ Controller │
└───────┬──────┘ └─────┬──────┘ └─────┬──────┘
        │              │              │
        └──────────────┼──────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                   Business Logic Layer                       │
│  • User Management                                           │
│  • Lead Management                                           │
│  • Analytics & Aggregation                                   │
│  • File Processing                                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                   Data Access Layer                          │
│              (Mongoose Models & Schema)                      │
│  • User Model (with bcrypt middleware)                       │
│  • Lead Model (with pre-save hooks)                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                   Database Layer                             │
│                  (MongoDB)                                   │
│  Collections: users, leads                                   │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

**Lead Upload & Distribution Flow:**
1. Admin uploads CSV file
2. Backend parses and validates data
3. Leads stored in MongoDB (unassigned)
4. Admin distributes leads to HR users
5. HR users receive and update lead status
6. Real-time analytics aggregation

**Authentication Flow:**
1. User submits credentials
2. Backend validates and generates JWT
3. Token stored in localStorage
4. Token sent with every API request
5. Middleware validates token and role
6. Access granted/denied based on role

### Database Schema

**User Collection:**
```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  role: Enum ['admin', 'team_leader', 'hr'],
  phone: String,
  teamLeader: ObjectId (ref: User),
  isActive: Boolean,
  createdBy: ObjectId (ref: User),
  timestamps: true
}
```

**Lead Collection:**
```javascript
{
  name: String,
  email: String,
  phone: String,
  company: String,
  position: String,
  status: Enum ['pending', 'contacted', 'converted', 'rejected', 'not_reachable'],
  assignedTo: ObjectId (ref: User) | null,
  uploadedBy: ObjectId (ref: User),
  lastContactedAt: Date,
  timestamps: true
}
```

### API Architecture

**RESTful Endpoints:**

```
Authentication:
POST   /api/auth/login
GET    /api/auth/me

Admin Routes:
GET    /api/admin/users
POST   /api/admin/users
PUT    /api/admin/users/:id
DELETE /api/admin/users/:id
PUT    /api/admin/assign-hr
POST   /api/admin/upload-leads
POST   /api/admin/distribute-leads
GET    /api/admin/leads
GET    /api/admin/analytics

Team Leader Routes:
GET    /api/team-leader/hr-users
GET    /api/team-leader/analytics
GET    /api/team-leader/leads

HR Routes:
GET    /api/hr/stats
GET    /api/hr/leads
PUT    /api/hr/leads/:id
```

## Trade-offs & Design Decisions

### Implemented Features (Mandatory)

✅ **Authentication System**
- JWT-based with 7-day expiry
- Role-based middleware
- Secure password hashing

✅ **Complete User Management**
- Full CRUD operations
- Role assignment and updates
- Cascade delete handling

✅ **Lead Management**
- CSV/Excel upload with validation
- Bulk distribution
- Status tracking

✅ **Analytics Dashboard**
- Real-time MongoDB aggregation
- No hardcoded data
- Multiple chart types

### Skipped Features (Optional/Extra)

❌ **Wallet/Payments** - Not implemented
- Reason: Not critical for MVP
- Future: Could integrate Stripe/Razorpay

❌ **KYC** - Not implemented
- Reason: Outside core lead management scope
- Future: Document upload with verification workflow

❌ **Attendance** - Not implemented
- Reason: Time constraints
- Future: Clock-in/out system with reports

❌ **OTP Services** - Not implemented
- Reason: Basic auth sufficient for demo
- Future: SMS/Email OTP via Twilio/SendGrid

❌ **Offers/Notifications** - Not implemented
- Reason: Prioritized core features
- Future: Real-time notifications with Socket.io

### Technical Trade-offs

**1. File Storage: Local vs Cloud**
- **Decision:** Local file system
- **Trade-off:** Files stored in `/uploads` directory
- **Production:** Should use AWS S3 or Cloudinary
- **Reason:** Faster development, sufficient for demo

**2. State Management: Context API vs Redux**
- **Decision:** React Context API
- **Trade-off:** Less boilerplate, simpler for this scope
- **Production:** Consider Redux Toolkit for larger apps
- **Reason:** Adequate for current complexity

**3. Pagination: Client vs Server**
- **Decision:** Server-side pagination with limit
- **Trade-off:** Limits shown to 50-100 records
- **Production:** Implement cursor-based pagination
- **Reason:** Better performance with large datasets

**4. Real-time Updates: Polling vs WebSockets**
- **Decision:** Manual refresh
- **Trade-off:** No auto-updates
- **Production:** Implement Socket.io for live updates
- **Reason:** Simpler implementation, reduced complexity

**5. Error Handling: Client vs Server**
- **Decision:** Centralized Axios interceptor
- **Trade-off:** Generic error messages
- **Production:** More granular error codes
- **Reason:** Consistent UX, faster development

**6. Testing: Manual vs Automated**
- **Decision:** Manual testing
- **Trade-off:** No test coverage
- **Production:** Add Jest, React Testing Library, Supertest
- **Reason:** Time constraints for demo

### Performance Optimizations

**Implemented:**
- MongoDB indexes on frequently queried fields
- Aggregation pipelines for analytics
- Password hashing on model save hooks
- JWT token caching in localStorage
- Next.js automatic code splitting

**Future Improvements:**
- Redis caching for analytics
- Database query optimization
- CDN for static assets
- Image optimization
- Rate limiting


## Sample Credentials

After running seed script:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@leadmanagement.com | admin123 |
| Team Leader | rajesh.kumar@leadmanagement.com | 12345678 |
| HR User | neha.singh@leadmanagement.com | 12345678 |


## Project Structure

```
lead-management-pro/
├── backend/
│   ├── src/
│   │   ├── config/         # Database & app config
│   │   ├── controllers/    # Route controllers
│   │   ├── middleware/     # Auth, upload, error handlers
│   │   ├── models/         # Mongoose schemas
│   │   ├── routes/         # API routes
│   │   └── utils/          # Helper functions
│   ├── uploads/            # Uploaded files
│   ├── .env.example
│   ├── server.js           # Entry point
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── app/            # Next.js pages (App Router)
│   │   │   ├── admin/      # Admin dashboard
│   │   │   ├── team-leader/# TL dashboard
│   │   │   ├── hr/         # HR dashboard
│   │   │   └── login/      # Login page
│   │   ├── components/     # Reusable components
│   │   ├── context/        # React Context (Auth)
│   │   ├── lib/            # API client (Axios)
│   │   └── types/          # TypeScript types
│   ├── .env.local.example
│   └── package.json
│
└── README.md
```


## Deployment

### Recommended Stack

- **Frontend:** Vercel (optimal for Next.js)
- **Backend:** Render
- **Database:** MongoDB Atlas

---

**Built with ❤️ as a demonstration of full-stack development capabilities**
