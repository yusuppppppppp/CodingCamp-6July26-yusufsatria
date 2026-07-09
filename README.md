# Expense & Budget Visualizer

A mobile-friendly web application for tracking daily expenses with balance calculation, transaction history, and category-based spending visualization.

## Features

- **Transaction Management** — Add, view, sort, and delete expenses
- **Balance Tracking** — Automatic total calculation with spending limit warnings
- **Spending Chart** — Interactive pie chart (Chart.js) showing distribution by category
- **Custom Categories** — Add personalized expense categories
- **Monthly Summary** — View expenses grouped by month with category breakdowns
- **Theme Toggle** — Switch between light and dark themes (persists across sessions)
- **Responsive Design** — Works on mobile, tablet, and desktop

## Usage

Open `index.html` in any modern browser. No build step or server required.

## Technical Stack

- Vanilla JavaScript (ES5-compatible, no frameworks)
- HTML5 semantic markup with ARIA accessibility
- CSS custom properties with dark/light theme support
- Chart.js 4.x (loaded via CDN)
- localStorage for data persistence

## localStorage Keys

| Key | Data |
|---|---|
| `ebv_transactions` | All transaction records |
| `ebv_categories` | Default and custom categories |
| `ebv_settings` | Theme preference and spending limit |

## Browser Support

Chrome, Firefox, Edge, Safari (latest 2 versions).