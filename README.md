# PriceOracle

Multi-asset price prediction platform using ML models. Predicts stocks, gold, silver, crude oil, Bitcoin, USD, and 10+ currencies.

## Tech Stack

- **Frontend**: React + Vite (single App.css, no Tailwind)
- **Backend**: Node.js + Express.js
- **Database**: MongoDB Atlas
- **ML Pipeline**: Python (scikit-learn, XGBoost, yfinance)
- **Real-time**: Socket.IO
- **Charts**: Recharts

## Quick Start

### 1. ML Pipeline (Python)
```bash
cd ml
pip install -r requirements.txt
python data_collection.py
python sentiment_analysis.py
python preprocessing.py
python train_model.py --symbol AAPL --task regression
python api_server.py  # starts Flask API on port 5001
```

### 2. Backend (Node.js)
```bash
cd server
npm install
# Copy .env.example to .env and fill in your values
cp .env.example .env
npm run dev
```

### 3. Frontend (React)
```bash
cd client
npm install
npm run dev
```

## Environment Variables

Copy `.env.example` to `.env` in the `server/` directory and fill in:
- `MONGODB_URI` — MongoDB Atlas connection string
- `JWT_SECRET` — Secret for JWT tokens
- `TWILIO_*` — Twilio credentials for SMS OTP (optional, free trial)
- `EMAIL_*` — Gmail credentials for password reset emails
- `NEWSAPI_KEY` — NewsAPI key for sentiment data (optional)
- `FRED_API_KEY` — FRED API key for macro data (optional)

## Project Structure

```
PriceOracle/
├── client/          # React + Vite frontend
├── server/          # Node.js + Express backend
├── ml/              # Python ML pipeline
└── .env.example     # Environment variables template
```
