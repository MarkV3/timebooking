# TimeBooking MVP Setup Guide

This guide will help you set up and deploy the TimeBooking application with all MVP features enabled.

## 🎉 MVP Features Implemented

✅ **Unified User Experience**
- All users start as customers and can upgrade to service providers
- Single dashboard with both customer and provider features
- Seamless role switching

✅ **Payment Integration** 
- Stripe payment processing for all bookings
- Secure payment intents and webhooks
- Automatic refund handling

✅ **Email Notifications**
- Booking confirmations for customers and providers
- Payment confirmations and receipt emails
- Cancellation and refund notifications

✅ **Calendar Integration**
- Google Calendar sync for appointments
- Automatic event creation for both parties
- Calendar management through user dashboard

## 🚀 Quick Setup

### Prerequisites
- Node.js 18+
- Python 3.11+
- Stripe account (free test mode)
- SendGrid account (free tier available)
- Google Cloud Console project (for Calendar API)

### 1. Environment Configuration

#### Backend (.env file)
```bash
cd backend
cp env.example .env
```

Edit the `.env` file with your credentials:

```env
# Database
DATABASE_URL=sqlite:///./timebooking.db

# Security
SECRET_KEY=your-super-secret-key-256-bits-long
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Google Services
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8000/api/v1/auth/google/callback

# Stripe Payments
STRIPE_SECRET_KEY=sk_test_51...
STRIPE_PUBLISHABLE_KEY=pk_test_51...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email (SendGrid)
SENDGRID_API_KEY=SG.your-sendgrid-api-key
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=TimeBooking

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

#### Frontend (.env.local file)
```bash
cd frontend
cp .env.example .env.local
```

Edit the `.env.local` file:

```env
# API Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_API_TIMEOUT=30000

# Stripe (use your publishable key)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51...

# Google OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-oauth-client-id
```

### 2. Install Dependencies and Start

#### Backend
```bash
cd backend
pip install -r requirements.txt

# Seed database with test data
python seed.py

# Start the API server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

#### Frontend
```bash
cd frontend
npm install

# Start development server
npm run dev
```

### 3. Service Setup

#### Stripe Setup
1. Create a Stripe account at https://stripe.com
2. Get your test API keys from the Stripe Dashboard
3. Set up a webhook endpoint: `https://yourdomain.com/api/v1/payments/webhook`
4. Subscribe to these events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`

#### SendGrid Setup
1. Create a SendGrid account at https://sendgrid.com
2. Create an API key with Mail Send permissions
3. Verify your sender email address
4. (Optional) Set up a custom domain for professional emails

#### Google Calendar Setup
1. Go to Google Cloud Console
2. Create a new project or select existing
3. Enable the Google Calendar API
4. Create OAuth 2.0 credentials (Web application)
5. Add authorized redirect URIs:
   - `http://localhost:8000/api/v1/auth/google/callback` (development)
   - `https://yourdomain.com/api/v1/auth/google/callback` (production)

## 🔧 Development Workflow

### Testing Accounts
Pre-seeded test accounts are available:

**Customers:**
- john.doe@email.com / customer123
- jane.smith@email.com / customer456

**Service Providers:**
- bella.salon@email.com / provider123
- techfix.pro@email.com / provider456

### Key URLs
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs
- Database Admin: SQLite browser or similar

### Testing Payment Flow
1. Create a booking as a customer
2. Use Stripe test cards:
   - Success: 4242 4242 4242 4242
   - Decline: 4000 0000 0000 0002
3. Check webhook events in Stripe Dashboard

### Testing Email Notifications
1. Configure SendGrid with a verified sender
2. Create a booking to trigger confirmation emails
3. Check SendGrid activity dashboard for delivery status

### Testing Calendar Integration
1. Connect Google Calendar in user dashboard
2. Create a booking to automatically create calendar events
3. Check Google Calendar for the appointment

## 📊 Database Schema

The application uses SQLite with the following main entities:
- **Users**: Customer and provider authentication
- **ServiceProviders**: Business information and settings
- **Services**: Offered services with pricing
- **TimeSlots**: Available appointment times
- **Bookings**: Customer appointments
- **Payments**: Stripe payment tracking

## 🔐 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- CORS protection
- Input validation with Pydantic
- SQL injection prevention with SQLAlchemy ORM
- Stripe webhook signature verification
- Google OAuth 2.0 for calendar access

## 🚀 Production Deployment

### Environment Variables
Set all production environment variables:
- Use secure, random secret keys
- Use production Stripe keys
- Configure production database (PostgreSQL recommended)
- Set up production email domain
- Use HTTPS URLs for all callbacks

### Infrastructure Recommendations
- **Backend**: Railway, Heroku, or DigitalOcean
- **Frontend**: Vercel, Netlify, or similar
- **Database**: PostgreSQL on Railway/Heroku or managed service
- **File Storage**: AWS S3 or Cloudinary (for future file uploads)

### SSL/HTTPS
- Required for production
- Needed for Stripe webhooks
- Required for Google OAuth redirects

## 📈 Future Enhancements

The MVP foundation supports easy addition of:
- Mobile app (React Native)
- Advanced analytics and reporting
- Multi-language support
- Review and rating system
- Advanced scheduling features
- Team/multi-provider businesses
- Subscription billing
- SMS notifications
- Social media integration

## 🆘 Troubleshooting

### Common Issues

**Database Errors:**
```bash
# Reset database
rm timebooking.db
python seed.py
```

**CORS Issues:**
- Check BACKEND_CORS_ORIGINS includes your frontend URL
- Ensure no trailing slashes in URLs

**Payment Issues:**
- Verify Stripe keys are for the same account
- Check webhook endpoint is accessible
- Ensure webhook secret matches

**Email Issues:**
- Verify SendGrid API key permissions
- Check sender email is verified
- Review SendGrid activity logs

**Calendar Issues:**
- Verify Google Cloud project has Calendar API enabled
- Check OAuth redirect URIs match exactly
- Ensure credentials have calendar scope

### Getting Help
- Check API documentation at `/docs`
- Review application logs
- Test with curl or Postman
- Use browser developer tools for frontend issues

## 📄 License

This project is ready for commercial use and can be customized for your specific business needs.
