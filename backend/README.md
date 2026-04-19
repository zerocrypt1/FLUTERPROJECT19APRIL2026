# Secure Backend API

A fully secured, production-ready backend API with user authentication, admin management, payment integration, and location services.

## 🚀 Features

- **User Authentication**: JWT-based auth with OTP verification
- **Admin Panel**: Separate admin system with role-based access
- **Payment Gateway**: Stripe & Razorpay integration
- **Location Services**: Google Maps API integration (geocoding, elevation, distance)
- **Security**: XSS, SSRF, NoSQL injection protection, rate limiting
- **Email Service**: OTP verification, welcome emails, admin notifications

## 📋 Prerequisites

- Node.js >= 18.0.0
- MongoDB >= 5.0
- Gmail account (for email service)
- Google Cloud account (for OAuth & Maps API)
- Stripe account (for payments)
- Razorpay account (for payments)

## 🔧 Installation

1. Clone the repository
```bash
git clone <repository-url>
cd secure-backend
```

2. Install dependencies
```bash
npm install
```

3. Create .env file
```bash
cp .env.example .env
```

4. Configure environment variables (see .env.example)

5. Start the server
```bash
# Development
npm run dev

# Production
npm start
```

## 📚 API Documentation

### Base URL