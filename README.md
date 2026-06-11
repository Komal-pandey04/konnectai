
> Production AI + Human hybrid communication platform powered by **HuggingFace Inference API**

## ⚡ Quick Start

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env
# → Open .env and add your HF_API_TOKEN

# 3. Run
npm start
# → http://localhost:3000
```

## 🤗 HuggingFace Setup (Free!)

1. Go to **https://huggingface.co/settings/tokens**
2. Click **"New token"** → choose **"Read"** access
3. Copy the token → paste into `.env` as `HF_API_TOKEN`

That's it! Free tier supports ~30,000 tokens/month.

## 🧠 Recommended Models

Set `HF_MODEL` in `.env` to any of these:

| Model | Quality | Speed | Free? |
|---|---|---|---|
| `mistralai/Mistral-7B-Instruct-v0.3` | ⭐⭐⭐⭐ | Fast | ✅ Yes |
| `HuggingFaceH4/zephyr-7b-beta` | ⭐⭐⭐⭐ | Fast | ✅ Yes |
| `microsoft/Phi-3-mini-4k-instruct` | ⭐⭐⭐ | Very fast | ✅ Yes |
| `meta-llama/Meta-Llama-3-8B-Instruct` | ⭐⭐⭐⭐⭐ | Medium | Needs HF Pro |

Default: `mistralai/Mistral-7B-Instruct-v0.3`

> **Note:** First request to a model may take 20-30s (cold start). Subsequent requests are fast.

## 👤 Demo Accounts

| Email | Password | Role |
|---|---|---|
| demo@konnect.ai | demo123 | User |
| komal@konnect.ai | admin123 | Admin |

## 📡 API Routes

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | /api/auth/signup | — | Register |
| POST | /api/auth/login | — | Login |
| POST | /api/chat | User | Send message (→ HuggingFace AI) |
| GET | /api/chat/history | User | Chat history |
| GET | /api/chat/model-info | — | Active model info |
| GET | /api/admin/stats | Admin | Dashboard stats |
| GET | /api/admin/pending-messages | Admin | Sensitive messages |
| POST | /api/admin/manual-reply | Admin | Komal replies (real-time via Socket.io) |

## 🗂 Project Structure

```
konnectapi/
├── server.js              # Express + Socket.io + Helmet + Rate-limit
├── database.js            # SQLite via sql.js (zero native deps)
├── twilio.js              # Optional SMS alerts
├── middleware/auth.js     # JWT + role-based auth
├── routes/
│   ├── auth.js            # Login / Signup
│   ├── chat.js            # HuggingFace AI, sensitive detection, memory
│   └── admin.js           # Admin panel, manual-reply, Socket.io push
└── public/
    ├── index.html         # SPA shell
    ├── css/app.css        # All styles
    └── js/app.js          # Frontend logic + Socket.io client
```

## 🔑 .env Reference

| Key | Required | Description |
|---|---|---|
| `HF_API_TOKEN` | ✅ Yes | huggingface.co/settings/tokens |
| `HF_MODEL` | Optional | Default: Mistral-7B-Instruct-v0.3 |
| `JWT_SECRET` | Optional | Change in production! |
| `TWILIO_*` | Optional | SMS alerts when sensitive question detected |
