# Time Booking Application

A modern, fully-functional booking platform connecting service providers with customers. Built with Next.js frontend, FastAPI backend, and SQLite database.

## 🎉 What's Implemented

This is a **complete, working application** with all major features implemented:

### Backend (FastAPI)
- ✅ Complete database models (Users, ServiceProviders, Services, TimeSlots, Bookings)
- ✅ JWT authentication system  
- ✅ RESTful API endpoints for all operations
- ✅ Automatic time slot generation based on provider availability
- ✅ Service provider search and filtering
- ✅ Real-time booking system with availability checking
- ✅ SQLite database for easy local development

### Frontend (Next.js)
- ✅ Modern React-based user interface with TypeScript
- ✅ Authentication flows (login/logout/registration)
- ✅ Service provider search and browsing
- ✅ Real-time service booking with time slot selection
- ✅ Provider dashboard with booking analytics
- ✅ Customer interface for booking management
- ✅ Responsive design with Tailwind CSS

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- No database setup required (uses SQLite)

### 1. Backend Setup

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Seed database with test data
python seed.py

# Start the API server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend available at `http://localhost:8000` (API docs: `http://localhost:8000/docs`)

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies  
npm install

# Start development server
npm run dev
```

Frontend available at `http://localhost:3000`

### 3. One-Command Start (Alternative)

```bash
chmod +x start-dev.sh
./start-dev.sh
```

## 👥 Test Accounts

Pre-seeded test accounts for immediate testing:

### Customer Accounts
- **john.doe@email.com** | Password: `customer123`
- **jane.smith@email.com** | Password: `customer456`
- **mike.johnson@email.com** | Password: `customer789`

### Service Provider Accounts  
- **bella.salon@email.com** | Password: `provider123`
  - Business: Bella's Beauty Salon (New York, NY)
  - Services: Haircut, Manicure, Facial, Hair Coloring
  
- **techfix.pro@email.com** | Password: `provider456`
  - Business: TechFix Pro (San Francisco, CA)  
  - Services: Computer Diagnosis, Phone Repair, Data Recovery

## 🎯 How to Test

### For Customers:
1. Visit `http://localhost:3000` 
2. Click "Get Started" → Use test customer credentials
3. Browse services → Select provider → Book time slot
4. View bookings in "My Bookings"

### For Service Providers:
1. Login with provider credentials
2. View dashboard with booking statistics  
3. Monitor incoming bookings and business metrics

## 🏗️ Architecture

- **Frontend**: Next.js 14+ with TypeScript, Tailwind CSS, App Router
- **Backend**: FastAPI with SQLAlchemy ORM and SQLite
- **Authentication**: JWT-based auth system
- **State Management**: React Context API
- **Forms**: React Hook Form + Zod validation
- **Data Fetching**: Custom API service with error handling

## 📁 Project Structure

```
time_booking/
├── frontend/                 # Next.js frontend application
│   ├── src/
│   │   ├── app/             # App Router pages  
│   │   ├── components/      # Reusable UI components
│   │   ├── contexts/        # React context providers
│   │   ├── lib/            # API client and utilities
│   │   ├── hooks/          # Custom React hooks
│   │   ├── types/          # TypeScript definitions
│   │   └── styles/         # Global styles
│   └── public/             # Static assets
├── backend/                 # FastAPI backend application
│   ├── app/
│   │   ├── api/            # API routes and endpoints
│   │   ├── core/           # Core configurations  
│   │   ├── models/         # SQLAlchemy database models
│   │   ├── schemas/        # Pydantic validation schemas
│   │   └── services/       # Business logic services
│   ├── main.py            # FastAPI application entry
│   ├── seed.py            # Database seeding script
│   └── requirements.txt    # Python dependencies
└── README.md               # This documentation
```

## 🔑 Key Features

### Implemented ✅
- **User Authentication**: Registration, login, JWT tokens
- **Service Discovery**: Search providers by location, service type
- **Real-time Booking**: Available time slot selection and booking
- **Provider Dashboard**: View bookings, manage services, analytics
- **Customer Interface**: Browse services, make bookings, view history
- **Responsive Design**: Works on desktop, tablet, mobile
- **Database Management**: Automatic schema and test data

### Future Enhancements 🔮
- Payment integration (Stripe/PayPal)
- Email notifications
- Calendar integrations
- Mobile app
- Advanced analytics
- Customer reviews and ratings

## 🔧 Development

### Environment Configuration

Copy environment files and customize:

```bash
# Backend
cp backend/env.example backend/.env

# Frontend  
cp frontend/.env.example frontend/.env.local
```

### API Documentation

With the backend running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Key API Endpoints

- `POST /api/v1/auth/login` - User authentication
- `GET /api/v1/providers/search` - Search service providers  
- `GET /api/v1/bookings/providers/{id}/time-slots` - Get available slots
- `POST /api/v1/bookings/book` - Create new booking

## 🎨 Design System

- **Primary**: #3b82f6 (Blue) 
- **Secondary**: #10b981 (Green)
- **Accent**: #8b5cf6 (Purple)
- **Typography**: Inter (body), Montserrat (headings)
- **Components**: Custom design system with Tailwind CSS

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

---

**Ready to use!** This is a complete, functional booking platform. Follow the Quick Start guide to get it running in minutes. 