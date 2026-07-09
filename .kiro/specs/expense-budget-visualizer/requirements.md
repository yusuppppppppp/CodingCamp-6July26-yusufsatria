# Requirements Document: Expense & Budget Visualizer

## Introduction

The Expense & Budget Visualizer is a mobile-friendly web application for tracking daily expenses with balance calculation, transaction history, and category-based spending visualization. The application runs entirely client-side using vanilla JavaScript, with data persisted in browser localStorage. Users can input transactions, view spending distribution via pie charts, manage custom categories, analyze monthly summaries, and set spending limits with visual warnings.

## Glossary

- **System**: The Expense & Budget Visualizer web application
- **Transaction**: A record of a single expense with name, amount, category, and timestamp
- **Category**: A classification label for transactions (e.g., Food, Transport, Fun)
- **Balance**: The total sum of all transaction amounts
- **Spending_Limit**: A user-configured threshold for total spending that triggers visual warnings
- **LocalStorage**: Browser-based persistent storage mechanism
- **Theme**: Visual appearance mode (light or dark)
- **Chart**: Visual representation of spending distribution using Chart.js pie chart

## Requirements

### Requirement 1: Transaction Input and Validation

**User Story:** As a user, I want to input transaction details with validation, so that I can record expenses accurately without invalid data.

#### Acceptance Criteria

1. THE System SHALL provide an input form with fields for Item Name, Amount, and Category
2. WHEN a user submits the form with empty Item Name, THEN the System SHALL display an inline error message without using alert()
3. WHEN a user submits the form with empty Amount, THEN the System SHALL display an inline error message without using alert()
4. WHEN a user submits the form with non-positive Amount, THEN the System SHALL display an inline error message without using alert()
5. WHEN a user submits the form with empty Category, THEN the System SHALL display an inline error message without using alert()
6. WHEN a user submits valid transaction data, THEN the System SHALL create a new Transaction with unique id and current timestamp
7. WHEN a valid Transaction is created, THEN the System SHALL persist it to localStorage under key "ebv_transactions"
8. WHEN a valid Transaction is created, THEN the System SHALL clear the input form fields

### Requirement 2: Transaction List Display and Management

**User Story:** As a user, I want to view all my transactions in a scrollable list with delete capability, so that I can review and manage my expense history.

#### Acceptance Criteria

1. THE System SHALL display all Transactions in a scrollable list
2. WHEN displaying a Transaction, THE System SHALL show the Item Name, formatted Amount with currency symbol, colored Category badge, and delete button
3. WHEN a user clicks the delete button, THEN the System SHALL display a confirmation dialog before deletion
4. WHEN a user confirms deletion, THEN the System SHALL remove the Transaction from localStorage
5. WHEN a Transaction is deleted, THEN the System SHALL update the displayed list immediately
6. THE System SHALL format Amount values as currency with thousand separators

### Requirement 3: Balance Calculation and Display

**User Story:** As a user, I want to see my total spending automatically calculated, so that I can track my overall expenses without manual calculation.

#### Acceptance Criteria

1. THE System SHALL calculate the total Balance by summing all Transaction amounts
2. WHEN a Transaction is added, THEN the System SHALL recalculate and update the Balance display
3. WHEN a Transaction is deleted, THEN the System SHALL recalculate and update the Balance display
4. THE System SHALL display the Balance in currency format at the top of the page
5. THE Balance display SHALL update automatically without page reload

### Requirement 4: Spending Distribution Chart

**User Story:** As a user, I want to see a pie chart of my spending by category, so that I can visualize where my money goes.

#### Acceptance Criteria

1. THE System SHALL display a pie chart showing spending distribution per Category using Chart.js
2. WHEN Transactions are added or deleted, THEN the System SHALL update the existing chart using chart.update() method
3. THE System SHALL aggregate Transaction amounts by Category for chart data
4. WHEN a Category has no Transactions, THEN the System SHALL exclude it from the chart
5. THE chart SHALL use distinct colors for each Category
6. THE chart SHALL be created once on page load and updated thereafter without re-creating the Chart.js instance

### Requirement 5: Custom Category Management

**User Story:** As a user, I want to add custom categories beyond the defaults, so that I can organize expenses according to my specific needs.

#### Acceptance Criteria

1. THE System SHALL provide default Categories: Food, Transport, Fun
2. THE System SHALL provide a form for adding new custom Categories
3. WHEN a user submits a new Category name, THEN the System SHALL validate it is not empty
4. WHEN a valid Category is added, THEN the System SHALL persist it to localStorage under key "ebv_categories"
5. WHEN a new Category is created, THEN the System SHALL assign it a unique badge color automatically
6. THE System SHALL make custom Categories available in the Transaction input form Category selector
7. THE System SHALL persist custom Categories permanently across browser sessions

### Requirement 6: Monthly Summary View

**User Story:** As a user, I want to view my expenses grouped by month with category breakdowns, so that I can analyze spending patterns over time.

#### Acceptance Criteria

1. THE System SHALL provide a separate section or tab for monthly summary view
2. WHEN displaying monthly summary, THE System SHALL group Transactions by month based on createdAt timestamp
3. WHEN displaying a month group, THE System SHALL show the month label and total spending for that month
4. WHEN displaying a month group, THE System SHALL show category breakdown with amount per Category
5. THE System SHALL sort months in descending chronological order (newest first)
6. WHEN no Transactions exist for a period, THE System SHALL display an appropriate empty state message

### Requirement 7: Transaction Sorting

**User Story:** As a user, I want to sort transactions by different criteria, so that I can find and analyze expenses more easily.

#### Acceptance Criteria

1. THE System SHALL provide a dropdown selector with sorting options: newest, amount ascending, amount descending, category
2. WHEN a user selects "newest", THEN the System SHALL sort Transactions by createdAt in descending order
3. WHEN a user selects "amount ascending", THEN the System SHALL sort Transactions by Amount from lowest to highest
4. WHEN a user selects "amount descending", THEN the System SHALL sort Transactions by Amount from highest to lowest
5. WHEN a user selects "category", THEN the System SHALL sort Transactions alphabetically by Category name
6. WHEN sorting Transactions, THE System SHALL not mutate the original data stored in localStorage
7. THE sorted view SHALL persist during the browser session until user changes sort option

### Requirement 8: Spending Limit and Warning

**User Story:** As a user, I want to set a spending limit and receive visual warnings when exceeded, so that I can stay within my budget.

#### Acceptance Criteria

1. THE System SHALL provide a settings interface for configuring Spending_Limit
2. WHEN a user sets a Spending_Limit, THEN the System SHALL persist it to localStorage under key "ebv_settings"
3. WHEN the total Balance exceeds the Spending_Limit, THEN the System SHALL display a visual warning on the Balance display
4. THE visual warning SHALL use distinctive styling such as red border or banner
5. WHEN the Balance is below or equal to the Spending_Limit, THEN the System SHALL display normal styling without warning
6. THE warning SHALL update automatically when Balance or Spending_Limit changes

### Requirement 9: Theme Toggle with Persistence

**User Story:** As a user, I want to switch between dark and light themes with my preference saved, so that I can use the app comfortably in different lighting conditions.

#### Acceptance Criteria

1. THE System SHALL provide a theme toggle switch in the header
2. WHEN the page loads for the first time, THE System SHALL default to the user's browser prefers-color-scheme setting
3. WHEN a user toggles the theme, THEN the System SHALL switch between light and dark visual themes
4. WHEN a user changes the theme, THEN the System SHALL persist the preference to localStorage under key "ebv_settings"
5. WHEN the page loads, THE System SHALL apply the saved theme preference from localStorage if it exists
6. THE System SHALL implement themes using CSS custom properties with data-theme attribute on html element
7. THE theme change SHALL apply immediately without page reload

### Requirement 10: Data Storage and Retrieval

**User Story:** As a developer, I want consistent data persistence patterns, so that user data is reliably stored and retrieved across sessions.

#### Acceptance Criteria

1. THE System SHALL store Transaction data in localStorage with key "ebv_transactions"
2. THE System SHALL store Category data in localStorage with key "ebv_categories"
3. THE System SHALL store Settings data (theme and Spending_Limit) in localStorage with key "ebv_settings"
4. WHEN storing data, THE System SHALL serialize JavaScript objects to JSON strings
5. WHEN retrieving data, THE System SHALL parse JSON strings back to JavaScript objects
6. WHEN localStorage data is corrupted or invalid, THEN the System SHALL initialize with default values and continue functioning
7. THE System SHALL handle localStorage quota exceeded errors gracefully

### Requirement 11: Technical Implementation Constraints

**User Story:** As a developer, I want clear technical constraints defined, so that the implementation adheres to project requirements and bootcamp learning objectives.

#### Acceptance Criteria

1. THE System SHALL be implemented using HTML, CSS, and Vanilla JavaScript only
2. THE System SHALL NOT use any frontend frameworks such as React, Vue, or Angular
3. THE System SHALL store all data client-side in localStorage with no backend server
4. THE System SHALL be compatible with Chrome, Firefox, Edge, and Safari browsers
5. THE System SHALL use exactly one CSS file located at css/style.css
6. THE System SHALL use exactly one JavaScript file located at js/script.js
7. THE System SHALL use Chart.js library loaded via CDN for chart visualization
8. THE JavaScript file SHALL be organized using comment sections, not multiple separate files
9. THE CSS file SHALL be organized using comment sections, not multiple separate files

### Requirement 12: Visual Design and User Experience

**User Story:** As a user, I want a clean, elegant interface inspired by modern design systems, so that the app is pleasant and easy to use.

#### Acceptance Criteria

1. THE System SHALL implement a visual design inspired by shadcn/ui aesthetic using CSS custom properties only
2. THE System SHALL use a neutral zinc color palette for base colors
3. THE System SHALL use consistent 0.5rem border radius across interactive elements
4. THE System SHALL use subtle shadows for depth and card elevation
5. THE System SHALL provide clear focus rings on interactive elements for keyboard navigation
6. THE System SHALL use clean, readable typography with appropriate hierarchy
7. THE System SHALL provide separate color tokens for light and dark themes via data-theme attribute
8. THE System SHALL define design tokens as CSS custom properties including: --background, --foreground, --card, --border, --primary, --muted, --destructive, --ring
9. THE System SHALL define category-specific color tokens: --food, --transport, --fun

### Requirement 13: Responsive Design

**User Story:** As a user, I want the app to work well on mobile devices, so that I can track expenses on the go.

#### Acceptance Criteria

1. THE System SHALL be fully responsive for mobile viewport sizes
2. THE System SHALL implement appropriate breakpoints for different screen sizes
3. WHEN viewed on mobile, THE System SHALL maintain readability and usability
4. WHEN viewed on mobile, THE System SHALL adjust layout to single-column where appropriate
5. THE System SHALL ensure touch targets are appropriately sized for mobile interaction (minimum 44x44 pixels)
6. THE chart SHALL scale appropriately on different screen sizes

### Requirement 14: UI Component Library

**User Story:** As a developer, I want reusable UI component patterns defined, so that the interface is consistent and maintainable.

#### Acceptance Criteria

1. THE System SHALL implement button variants: primary, outline, destructive, ghost
2. THE System SHALL implement styled input fields consistent with the design system
3. THE System SHALL implement styled select dropdowns consistent with the design system
4. THE System SHALL implement card containers for grouping related content
5. THE System SHALL implement category badge components with different colors per Category
6. THE System SHALL implement a toggle switch component for dark mode control
7. THE System SHALL implement a modal/dialog component for delete confirmation
8. WHERE toast notifications are implemented, THE System SHALL use them for form validation feedback

### Requirement 15: Performance and Loading

**User Story:** As a user, I want the app to load quickly and respond instantly, so that tracking expenses feels effortless.

#### Acceptance Criteria

1. THE System SHALL load and display initial content within 2 seconds on standard broadband connection
2. WHEN a user adds or deletes a Transaction, THE System SHALL update the UI within 100 milliseconds
3. WHEN a user changes sort order, THE System SHALL re-render the list within 100 milliseconds
4. WHEN localStorage operations fail, THE System SHALL handle errors without blocking the UI
5. THE chart update operation SHALL complete within 200 milliseconds of data change
