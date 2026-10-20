# 💸 Spend — Modern Personal Expense Tracker & Financial Control PWA

[![React 19](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.0-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)
[![Gemini API](https://img.shields.io/badge/Google_Gemini_AI-2.5_Flash-8E75B2?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev)
[![PWA Ready](https://img.shields.io/badge/PWA-Offline_Ready-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)

> **Log an expense in under 5 seconds. Understand "Am I okay?" in under 3 seconds.**  
> *Spend* is a sleek, ultra-fast, mobile-first personal financial companion designed for real-world daily usage with offline PWA support and smart AI-powered receipt parsing.

---

## ✨ Key Features

### ⚡ Rapid Logging & Smart Entry
* **5-Second Transaction Entry**: Quick amount presets (`+50`, `+100`, `+200`, `+500`), category picker grid, and one-tap type toggle (Expense vs Income).
* **Interactive Date Stepper**: Easily jump between days using `‹ Previous` and `Next ›` buttons or tap to open the native calendar picker.
* **Impulse & Unwanted Spend Tagging**: Mark impulse buys with an `Unwanted` badge to track discipline over time.

### 📊 Powerful Analytics & Visualizations
* **Dashboard Overview**: Immediate visibility into spent vs. income, net balance, daily burn rate, and financial streaks.
* **5-Month Expense Comparison Chart**: Interactive custom bar chart powered by Recharts with Y-axis scaling, category breakdowns, and hit-target tooltips.
* **Peak Expense Days**: Uncover your heaviest spending days and spending trends.

### 🤝 Borrow & Lend (Debt Tracker)
* **Track Money Owed & Lent**: Keep a crystal-clear record of debts with friends, family, or colleagues.
* **Partial & Full Settlements**: Settle loans with percentage shortcuts (`25%`, `50%`, `75%`, `100%`) or custom partial repayments.
* **Due Date Alerts**: Overdue and upcoming repayment notifications so you never miss a follow-up.

### 🎯 Budgeting & Financial Planning
* **Category Budgets**: Set spending limits per category with real-time progress bars, remaining budget calculations, and threshold alerts.
* **Recurring Bills**: Manage subscriptions and recurring monthly commitments with automatic status tracking.

### 🤖 AI-Powered Receipt & SMS Inbox
* **Smart Parsing**: Automated receipt and transaction SMS text parsing using the **Google Gemini API** (`@google/genai`).
* **Instant Auto-Categorization**: Extracts vendor, amount, date, and category automatically for approval in one tap.

### 📱 Mobile-First PWA & Offline Support
* **Offline Capability**: Fully functional without internet connectivity via Service Workers.
* **Installable App**: Save to home screen on iOS, Android, and Desktop with responsive dark-theme design.
* **Data Privacy & Control**: Complete data export and import capability in JSON format.

---

## 🛠️ Tech Stack

| Domain | Technology | Description |
| :--- | :--- | :--- |
| **Frontend Framework** | [React 19](https://react.dev) | Modern component architecture with functional hooks & state |
| **Language** | [TypeScript](https://www.typescriptlang.org) | End-to-end type safety and maintainable codebase |
| **Styling & UI** | [Tailwind CSS v4](https://tailwindcss.com) | Modern CSS utility framework with custom dark theme design |
| **Icons & Animations** | [Lucide React](https://lucide.dev) & [Framer Motion](https://framer.com/motion) | Smooth micro-interactions and clean iconography |
| **Data Visualization** | [Recharts](https://recharts.org) | Responsive, high-performance financial charts and bars |
| **State Management** | [Zustand](https://github.com/pmndrs/zustand) | Lightweight, reactive centralized state stores |
| **Backend / Proxy** | [Express.js](https://expressjs.com) & `tsx` | Node.js backend server mounted alongside Vite dev server |
| **AI Integration** | [@google/genai](https://www.npmjs.com/package/@google/genai) | Gemini 2.5 Flash SDK for intelligent document & text parsing |
| **Build & Tooling** | [Vite](https://vitejs.dev) & [vite-plugin-pwa](https://vite-pwa-org.netlify.app) | Lightning-fast HMR build system & Progressive Web App engine |

---

## 📂 Project Architecture

```
├── src/
│   ├── components/       # Reusable UI components
│   │   ├── overview/     # 5-Month chart, Peak expense days, metric cards
│   │   ├── transaction/  # Add/Edit transaction modal, details modal
│   │   ├── borrowLend/   # Loan details and settlement modals
│   │   ├── budget/       # Budget creation and category progress
│   │   └── common/       # Offline indicator, toast, header navigation
│   ├── pages/            # Application pages
│   │   ├── Dashboard/    # Main financial dashboard
│   │   ├── Overview/     # Analytical breakdown & 5-month trends
│   │   ├── Transactions/ # Full transaction history & timeline
│   │   ├── BorrowLend/   # Debt and loan management
│   │   ├── Plan/         # Budgets and recurring expenses
│   │   ├── Notifications/# Actionable alerts and upcoming bills
│   │   └── Settings/     # Backup, restore, currency & format settings
│   ├── stores/           # Zustand state management (appStore, uiStore, inboxStore)
│   ├── utils/            # Calculation logic, currency formatting, date utilities
│   ├── types/            # TypeScript interfaces and type definitions
│   └── App.tsx           # Main application routing and shell
├── server.ts             # Express server for API proxying & Gemini integration
├── index.html            # Main HTML entry point with metadata and fonts
├── vite.config.ts        # Vite configuration with PWA service worker setup
└── package.json          # Project dependencies and scripts
```

---

## 🚀 Getting Started

### Prerequisites
* **Node.js** (v18.0.0 or higher)
* **npm** or **yarn**

### Installation

1. **Clone or navigate to the repository directory**:
   ```bash
   cd spend-app
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables** (Optional):
   Create a `.env` file in the root directory:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   PORT=3000
   ```

4. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

---

## 📜 Available Scripts

- `npm run dev`: Starts the Express server with Vite middleware in development mode (`tsx server.ts`).
- `npm run build`: Compiles TypeScript and builds production bundles into `dist/`.
- `npm run start`: Runs the production Express server (`node server.ts`).
- `npm run lint`: Runs TypeScript type checking (`tsc --noEmit`).

---

## 🔒 Security & Privacy

* **Local-First Storage**: All transactions, budgets, and loans are persisted locally in browser storage with full user ownership.
* **Data Portability**: Easily export your entire database as a JSON file or restore from a backup at any time in Settings.
* **Server-Side API Proxying**: External API calls (such as Gemini receipt processing) run securely through Express proxy endpoints without exposing client keys.

---

<p center>
  Designed & Built with ❤️ for Effortless Financial Clarity.
</p>
