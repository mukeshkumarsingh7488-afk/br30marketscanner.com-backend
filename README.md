# BR30 Market Scanner Backend

🚀 **BR30 Market Scanner Backend** is a powerful multi-market scanning engine built for traders. It provides real-time market analysis, scanner signals, subscription management, payment tracking, admin controls, bulk communication tools, and global market coverage.

---

## 🌐 Platform Coverage

### 🇮🇳 Indian Markets

- Equity Stocks
- Equity Stock Options
- Stock Futures
- Stock Future Options
- Index Futures
- Index Options

### 🌎 Global Markets

- Crypto Futures
- Forex Majors
- Forex Cross Pairs
- Commodities
- Precious Metals (Gold, Silver, Platinum, Palladium)
- Global Indices
- US Stocks
- US ETFs

---

## 🌟 Core Features

### Market Scanner

- Live Scanner Engine
- Buy Signals
- Sell Signals
- OI Spurts Detection
- Volume Breakout Detection
- Top Gainers
- Top Losers
- TradingView Integration
- Global Market Support
- Search Symbol Functionality
- Heatmap Support
- Multi-Market Filtering

### Authentication System

- User Registration
- OTP Verification
- Login System
- JWT Authentication
- Forgot Password
- Reset Password
- Protected Routes

### Subscription System

- Free Trial Access
- Active Subscription Management
- Subscription Expiry Tracking
- AutoPay Tracking
- Founding Member Plans
- Subscription Renewal Monitoring

### Payment System

- Subscription Payments
- Transaction Tracking
- Order Tracking
- Revenue Monitoring
- Payment History
- Success / Failed Payment Tracking

### Admin Dashboard

- Total Users Analytics
- Active Users Tracking
- Trial Users Tracking
- Expired Users Tracking
- Blocked Users Tracking
- Revenue Analytics
- Subscription Management
- User Management
- Payment Monitoring

### Bulk Mail System

Send emails to:

- All Users
- Trial Users
- Active Users
- Active Users (30+ Days)
- Active Users (90+ Days)
- Expired Users
- Pending Approval Users
- Founding Members
- AutoPay Users
- Blocked Users
- Top Paying Users
- No Payment Users

### Security

- JWT Protection
- Role-Based Access Control
- Admin Middleware
- Subscription Middleware
- Secure Environment Variables
- Git Ignore Protection

---

## 🛠️ Technology Stack

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT
- Bcrypt.js
- Axios
- Brevo SMTP
- Paytm Subscription APIs
- Upstox APIs
- Yahoo Finance APIs

---

## 📁 Project Structure

````bash
BR30 Market Scanner Backend
│
├── config/
│   └── upstoxConfig.js
│
├── controllers/
│   ├── authController.js
│   ├── scannerController.js
│   └── subscriptionController.js
│
├── data/
│   ├── fnoStocks.js
│   └── oiBase.json
│
├── middleware/
│   └── authMiddleware.js
│
├── models/
│   ├── Payment.js
│   └── User.js
│
├── routes/
│   ├── authRoutes.js
│   ├── scannerRoutes.js
│   └── subscriptionRoutes.js
│
├── services/
│   ├── binanceService.js
│   ├── bybitService.js
│   ├── instrumentService.js
│   ├── marketCache.js
│   ├── marketEngine.js
│   ├── paytmService.js
│   ├── scannerService.js
│   ├── twelveDataService.js
│   ├── upstoxService.js
│   └── yahooService.js
│
├── utils/
│   ├── mailHelper.js
│   ├── mailTemplates.js
│   └── marketLogic.js
│
├── .env
├── .gitignore
├── package-lock.json
├── package.json
├── README.md
└── server.js

---

## 🔐 Environment Variables

This project requires environment variables for:

* Database Connection
* JWT Authentication
* SMTP Email Service
* Paytm Subscription Services
* Upstox Market Data APIs
* Frontend Connection URLs

Environment variables must be configured locally and on the deployment platform before running the application.

⚠️ Never commit `.env` files to GitHub.

---

## 🚀 Installation

```bash
npm install
````

---

## ▶️ Start Development Server

```bash
npm start
```

or

```bash
node server.js
```

---

## 📌 Main Modules

### Authentication

- Registration
- OTP Verification
- Login
- Password Reset

### Scanner Engine

- Indian Markets Scanner
- Global Markets Scanner
- OI Scanner
- Volume Scanner
- Heatmap Engine

### Subscription System

- Trial Management
- Active Subscription Monitoring
- AutoPay Tracking

### Admin Dashboard

- User Management
- Payment Monitoring
- Revenue Analytics
- Bulk Mail Center

---

## 🚀 Backend Tech Stack

### Core Backend

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=fff)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=fff)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=fff)
![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=fff)

---

### Market Data Services

![Upstox](https://img.shields.io/badge/Upstox-6F3FF5?style=for-the-badge)
![Twelve Data](https://img.shields.io/badge/Twelve_Data-0A66C2?style=for-the-badge)
![Yahoo Finance](https://img.shields.io/badge/Yahoo_Finance-720E9E?style=for-the-badge)
![Binance](https://img.shields.io/badge/Binance-F3BA2F?style=for-the-badge&logo=binance&logoColor=000)
![Bybit](https://img.shields.io/badge/Bybit-F7A600?style=for-the-badge)

---

### Authentication & Payments

![JWT](https://img.shields.io/badge/JWT_Auth-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=fff)
![Paytm](https://img.shields.io/badge/Paytm-00BAF2?style=for-the-badge)
![Nodemailer](https://img.shields.io/badge/Nodemailer-34A853?style=for-the-badge)

---

### Tools

![Git](https://img.shields.io/badge/Git-F05032?style=for-the-badge&logo=git&logoColor=fff)
![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=fff)
![VS Code](https://img.shields.io/badge/VS_Code-007ACC?style=for-the-badge&logo=visualstudiocode&logoColor=fff)
![Postman](https://img.shields.io/badge/Postman-FF6C37?style=for-the-badge&logo=postman&logoColor=fff)

---

---

## 👨‍💻 Developed By

Mukesh Raj

Founder — BR30 Group

---

## 📌 Project Status

Production Ready

Actively maintained and continuously upgraded with new market scanners, analytics tools, subscription management features, admin controls, and trading intelligence systems.

---

### Scan • Analyze • Trade • Grow 🚀
