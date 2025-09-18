# 🌍 Global Market Dashboard

A minimal, responsive, and visually clean web application that aggregates key global financial indicators into a single-page dashboard. Designed for quick observation of the world’s markets without setting up any backend or database.

## 🚀 Live Demo

Visit the GitHub Pages deployment: [https://vic4code.github.io/economics-analysis-platform/](https://vic4code.github.io/economics-analysis-platform/)

## 🎯 Project Goals

- Provide a one-stop glance at global markets: stocks, bonds, currencies, and commodities.
- Use public embeds (TradingView, FRED, etc.) instead of managing raw data.
- Deliver a mobile-friendly, responsive interface for smooth usage on desktop and smartphones.
- Serve as a personalized financial observatory that is lightweight yet expandable.

## 📊 Dashboard Components

1. **Stock Markets**
   - S&P 500
   - NASDAQ
   - Taiwan Weighted Index
2. **Bonds**
   - US Treasury 10Y Yield Curve (FRED embed)
3. **Currencies**
   - US Dollar Index (DXY)
   - USD/JPY
4. **Commodities**
   - WTI Crude Oil
   - Gold

## 🎨 Frontend Style Guide

- **Layout**
  - Responsive grid (two columns on desktop, one column on mobile).
  - Each indicator sits inside a Card UI with subtle shadow and rounded corners.
- **Color Palette**
  - Background: light gray or off-white (`#f9f9f9`)
  - Cards: white (`#ffffff`)
  - Text: dark gray (`#333333`)
  - Accent: teal (`#009688`) or navy (`#003366`)
- **Typography**
  - Headings: bold, clean sans-serif (e.g., Inter, Roboto)
  - Body: regular sans-serif with minimal text (title + short note)
- **Interactions**
  - Hover on card → slight scale-up & shadow glow
  - Cards are clickable for the full TradingView/FRED page

## 📱 Responsive Design (RWD)

- **Desktop**
  - Grid layout with two columns.
  - Charts fill roughly 40–45% width each.
- **Tablet / Mobile**
  - Collapses into a single-column stack.
  - Cards scale to 100% width.
  - Navigation bar converts to a hamburger menu.

## ⚙️ How It Works

- Uses TradingView embed widgets for stocks, FX, and commodities.
- Uses a FRED iframe embed for bond yields.
- Combines everything into a single HTML file (no backend, no database).
- Adds a minimal CSS file for clean styling and responsive behavior.

## 📂 Project Structure

```text
economics-analysis-platform/
├── index.html   # Main dashboard page with embeds
├── style.css    # Custom styling (cards, grid, RWD)
├── serve.py     # Helper script to run a local HTTP server
└── README.md    # Project documentation
```

## ✨ Future Extensions

- Add a fear/greed index widget for market sentiment.
- Add an event timeline section (earnings, FOMC meetings).
- Add a personal notes panel for daily observations.
- Add a dark mode toggle.

## 📸 Mockup Idea

Imagine a clean white dashboard:

- Top header: “🌍 Global Market Dashboard”.
- Below: grid of 6–7 cards, each showing a chart (stocks, bonds, FX, commodities).
- On mobile: cards stack vertically for easy scrolling.
- Each card has a title, chart, and optional note.

## 🛠️ Local Preview (Desktop & Mobile)

Because the dashboard is a static site, you can use the included `serve.py` helper to run a local HTTP server and review it from any device on the same network.

1. Make sure Python 3.8+ is installed.
2. From the project root, run:
   ```bash
   python3 serve.py
   ```
   This binds to `0.0.0.0:8000` so both your computer and your phone/tablet can reach it.
3. The script prints two URLs:
   - `http://localhost:8000` for your computer.
   - `http://<your-local-ip>:8000` for other devices (open this on your phone while connected to the same Wi‑Fi).
4. When you are done, press `Ctrl+C` in the terminal to stop the server.
