# BR30 Market Scanner Backend

BR30 Market Scanner is a multi-market live scanner backend built with Node.js, Express, MongoDB and real-time market data APIs.

## Features

- Live Indian Market Scanner
  - Equity Stocks
  - Equity Stock Options
  - Stock Futures
  - Stock Future Options
  - Index Futures
  - Index Options

- Global Market Scanner
  - Crypto Futures
  - Forex Majors
  - Forex Cross Pairs
  - Metals: Gold, Silver, Platinum, Palladium
  - Commodities
  - Global Indices
  - US Stocks
  - US ETFs

- Scanner Logic
  - BUY / SELL signals
  - Strong BUY / Strong SELL signals
  - OI build-up detection
  - Volume breakout detection
  - Top gainers and top losers
  - Move percentage filters
  - Volume ratio filters
  - Multi-market support

- Authentication System
  - User registration
  - OTP verification
  - Login with JWT
  - Forgot password
  - Reset password
  - Admin-only access control

- Subscription System
  - Free trial support
  - Active / expired / cancelled subscription status
  - Trial start and trial end tracking
  - Subscription start and end tracking
  - Founding member plan support
  - AutoPay status tracking
  - Paytm subscription ID and mandate ID tracking

- Payment Tracking
  - Payment order creation
  - Payment success / failed status tracking
  - Transaction ID tracking
  - Payment mode tracking
  - Payment history for admin dashboard
  - Revenue calculation from successful payments

- Admin Panel
  - View all users
  - Approve / unapprove users
  - Delete users
  - Admin-only protected routes

- Admin Dashboard
  - Total users
  - Active users
  - Trial users
  - Expired users
  - Blocked users
  - Total revenue
  - Payment history
  - Subscription tracking
  - Bulk mail system

- Bulk Mail System
  - Send mail to all users
  - Trial users
  - Active users
  - Active 30+ days users
  - Active 90+ days users
  - Expired users
  - Pending approval users
  - Founding members
  - AutoPay users
  - Blocked users
  - Top paying users
  - No payment users

- Security
  - JWT authentication
  - Admin middleware protection
  - Subscription access middleware
  - Environment variables protected with `.gitignore`
  - Upstox token stored securely in environment variables

## Tech Stack

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT
- Bcrypt.js
- Axios
- Paytm Subscription API
- Upstox Market APIs
- Yahoo Finance API
- Binance Futures API
- Brevo / SMTP Email System

## Environment Variables

Create a `.env` file in the backend root:

```env
PORT=5001
MONGO_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
FRONTEND_URL=your_frontend_url

UPSTOX_ACCESS_TOKEN=your_upstox_analytics_token

PAYTM_MID=your_paytm_mid
PAYTM_KEY=your_paytm_key
PAYTM_WEBSITE=your_paytm_website
PAYTM_CALLBACK_URL=your_callback_url

BREVO_API_KEY=your_brevo_api_key
MAIL_FROM=your_sender_email
MASTER_ADMIN_EMAIL=your_admin_email
