🌍 Global Market Dashboard

A minimal, responsive, and visually clean web application that aggregates key global financial indicators into a single-page dashboard. Designed for quick observation of the world’s markets without setting up any backend or database.

🎯 Project Goal

Provide a one-stop glance at global markets: stocks, bonds, currencies, and commodities.

Use public embeds (TradingView, FRED, etc.) instead of managing raw data.

Deliver a mobile-friendly, RWD interface for smooth usage on desktop and smartphones.

Serve as a personalized financial observatory, lightweight yet expandable.

📊 Dashboard Components
1. Stock Markets

S&P 500

NASDAQ

Taiwan Weighted Index

2. Bonds

US Treasury 10Y Yield Curve (FRED embed)

3. Currencies

US Dollar Index (DXY)

USD/JPY

4. Commodities

WTI Crude Oil

Gold

🎨 Frontend Style Guide

Layout:

Responsive grid (2 columns on desktop, 1 column on mobile).

Each indicator inside a Card UI with subtle shadow and rounded corners.

Color Palette:

Background: light gray or off-white (#f9f9f9)

Cards: white (#ffffff)

Text: dark gray (#333333)

Accent: teal (#009688) or navy (#003366)

Typography:

Headings: bold, clean sans-serif (e.g., Inter, Roboto)

Body: regular sans-serif

Keep text minimal (title + short note).

Interactions:

Hover on card → slight scale-up & shadow glow.

Cards clickable for full-page TradingView/FRED link.

📱 Responsive Design (RWD)

Desktop:

Grid layout, 2×N cards.

Charts fill ~40–45% width each.

Tablet / Mobile:

Collapse into single-column stack.

Cards scale to 100% width.

Navigation bar converts to hamburger menu.

🚀 How It Works

Use TradingView embed widgets for stocks, FX, commodities.

Use FRED iframe embed for bond yields.

Combine into one HTML file (no backend, no DB).

Add a minimal CSS file (or TailwindCSS) for clean styling + RWD.

📂 Project Structure
global-market-dashboard/
├── index.html      # main dashboard page with embeds
├── style.css       # custom styling (cards, grid, RWD)
└── README.md       # project documentation

✨ Future Extensions

Add fear/greed index widget for market sentiment.

Add event timeline section (earnings, FOMC meetings).

Add personal notes panel for daily observations.

Add dark mode toggle.

📸 Mockup Idea

Imagine a clean white dashboard:

Top header: “🌍 Global Market Dashboard”

Below: grid of 6–7 cards, each showing a chart (stocks, bonds, FX, commodities).

On mobile: cards stack vertically, easy to scroll.

Each card has a title + chart + optional note.
