<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=0,2,2,5,30&height=140&section=header&text=TOOSII-XD%20ULTRA&fontSize=48&fontColor=ffffff&animation=fadeIn&fontAlignY=40&desc=WhatsApp%20Automation%20Bot%20%E2%80%94%20v1.2.0&descAlignY=62&descSize=16" width="100%"/>

<br/>

[![Version](https://img.shields.io/badge/Version-1.2.0-blueviolet?style=for-the-badge&logo=whatsapp&logoColor=white)](https://github.com/TOOSII102/toosii-xd-ultra/releases)
[![Node](https://img.shields.io/badge/Node.js-20.x-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Commands](https://img.shields.io/badge/Commands-947+-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)](#command-highlights)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)
[![Made by](https://img.shields.io/badge/Made%20by-TOOSII%20TECH-FF6B6B?style=for-the-badge)](https://t.me/toosiitech)

<br/>

> **TOOSII-XD ULTRA** is a feature-rich, open-source WhatsApp bot built on the Baileys library.  
> It delivers 947+ commands across AI, media, group management, games, and utilities — all free, no subscription required.

<br/>

</div>

---

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Local Setup](#local-setup)
- [Deployment](#deployment)
  - [Heroku / wolfXnode](#heroku--wolfxnode)
  - [bot-hosting.net / Pterodactyl](#bot-hostingnet--pterodactyl)
- [Environment Variables](#environment-variables)
- [Command Highlights](#command-highlights)
- [Branches](#branches)
- [Built With](#built-with)
- [Support](#support)

---

## Features

| Category | Highlights |
|:---|:---|
| **AI & Chat** | Free AI chatbot powered by Pollinations — no API key required |
| **Games & Fun** | 8-ball, truth or dare, ship, rock-paper-scissors, riddles |
| **Group Management** | Anti-link, anti-spam, welcome messages, polls, kick/ban |
| **Media Tools** | Sticker maker, TTS, YouTube audio/video downloader |
| **Search & Info** | GitHub profiles, live news, crypto prices, weather, recipes |
| **Utilities** | Calculator, translator, QR generator, currency converter |
| **Owner Controls** | Broadcast, sudo users, eval, auto-update, mode switching |
| **Automation** | Auto-read, anti-delete, auto-react, status viewer |

---

## Prerequisites

- **Node.js** 18 or newer
- A **WhatsApp account** to link as the bot
- A **Session ID** — generated at the link in [Local Setup](#local-setup)

---

## Local Setup

### 1. Generate a Session ID

Visit the session generator, scan with WhatsApp, and copy the `SESSION_ID` shown:

```
https://toosiitechdevelopertools.zone.id/session
```

### 2. Clone the repository

```bash
git clone https://github.com/TOOSII102/toosii-xd-ultra.git
cd toosii-xd-ultra/bot
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in the required values:

```env
SESSION_ID=your_session_id_here
OWNER_NUMBER=254712345678
```

### 4. Install dependencies and start

```bash
npm install
node index.js
```

---

## Deployment

### Heroku / wolfXnode

Use the **`heroku`** branch — all bot files live at the root with no build steps required.

**Steps:**

1. Fork this repository
2. Create a new app on your hosting platform
3. Connect GitHub and select the **`heroku`** branch
4. Add the [environment variables](#environment-variables) in your dashboard
5. Deploy

**Compatible platforms:** Heroku · wolfXnode · Railway · Koyeb · Render

**Not compatible with:** Vercel, Netlify, or any serverless/edge platform.

> **Note for Heroku and wolfXnode users:**
> These platforms use an ephemeral filesystem — local files (including the bot's saved settings) are wiped on every redeploy. Always set `PREFIX`, `MODE`, and other preferences as environment variables in your dashboard rather than relying on in-bot settings commands. This ensures your configuration survives redeployments.

---

### bot-hosting.net / Pterodactyl

Use the **`main`** branch — bot files are located inside the `bot/` subfolder.

**Steps:**

1. Create a Node.js server on bot-hosting.net
2. Upload or link the `main` branch
3. Set environment variables in the Pterodactyl panel
4. Start the server — entry point is `bot/index.js`

---

## Environment Variables

| Variable | Required | Default | Description |
|:---|:---:|:---:|:---|
| `SESSION_ID` | ✅ | — | Session from the generator |
| `OWNER_NUMBER` | ✅ | — | Your WhatsApp number — digits only, no `+` |
| `PREFIX` | | `.` | Command prefix character |
| `BOT_NAME` | | `TOOSII-XD` | Bot display name |
| `OWNER_NAME` | | — | Your name shown in bot menus |
| `MODE` | | `public` | Bot mode: `public` or `private` |
| `TIME_ZONE` | | — | e.g. `Africa/Nairobi` |
| `OPENAI_API_KEY` | | — | Optional — a free AI fallback is built in |
| `WEATHER_API_KEY` | | — | OpenWeatherMap free tier |
| `NEWSAPI_API_KEY` | | — | NewsAPI free tier |

---

## Command Highlights

The default prefix is `.` (dot). Replace it with your configured prefix if you changed it.

```
  .menu               →  Full command list with categories
  .ai  <question>     →  Chat with Toosii AI
  .sticker            →  Convert image or video to sticker
  .play  <song>       →  Download YouTube audio
  .weather  <city>    →  Current weather conditions
  .crypto  <coin>     →  Live cryptocurrency price
  .github  <user>     →  GitHub profile lookup
  .news  <topic>      →  Latest news headlines
  .tts  <text>        →  Text to speech audio
  .translate  <text>  →  Auto-detect language and translate
  .8ball  <question>  →  Magic 8-ball answer
  .tod                →  Truth or dare
  .recipe  <dish>     →  Recipe search
  .riddle             →  Random riddle
  .qr  <text>         →  Generate a QR code
```

Send `.menu` to the bot for the complete list of 947+ commands.

---

## Branches

| Branch | Structure | Use for |
|:---|:---|:---|
| `main` | Monorepo — bot files inside `bot/` | Local development, Pterodactyl |
| `heroku` | Flat — all files at root | Cloud platforms (Heroku, wolfXnode, Railway) |

---

## Built With

| Library / Service | Role |
|:---|:---|
| [@whiskeysockets/baileys](https://github.com/WhiskeySockets/Baileys) v7 | WhatsApp Web API |
| Node.js 20.x | Runtime |
| [Pollinations AI](https://pollinations.ai) | Free AI — no key required |
| [CoinGecko API](https://coingecko.com) | Live cryptocurrency prices |
| [OpenWeatherMap](https://openweathermap.org) | Weather data |
| BBC RSS | News feeds |
| [TheMealDB](https://www.themealdb.com) | Recipe search |
| GitHub REST API | Developer profile lookups |

---

## Support

<div align="center">

[![Telegram](https://img.shields.io/badge/Telegram-%40toosiitech-2CA5E0?style=for-the-badge&logo=telegram&logoColor=white)](https://t.me/toosiitech)
[![WhatsApp](https://img.shields.io/badge/WhatsApp-+254%20746%20677%20793-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)](https://wa.me/254746677793)
[![WhatsApp](https://img.shields.io/badge/WhatsApp-+254%20748%20340%20864-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)](https://wa.me/254748340864)
[![Session Generator](https://img.shields.io/badge/Get%20Session%20ID-Click%20Here-FF6B6B?style=for-the-badge&logo=whatsapp&logoColor=white)](https://toosiitechdevelopertools.zone.id/session)

<br/>

If this project has been useful to you, please consider giving it a **star** ⭐ — it helps others discover it.

<br/>

<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=0,2,2,5,30&height=100&section=footer" width="100%"/>

</div>
