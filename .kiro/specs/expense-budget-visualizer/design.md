# Design Document: Expense & Budget Visualizer

## Overview

The Expense & Budget Visualizer is a client-side web application built entirely with vanilla JavaScript, HTML, and CSS. The application uses browser localStorage as its persistence layer and Chart.js for data visualization. The architecture follows a modular pattern using IIFE (Immediately Invoked Function Expressions) to organize code into logical sections within a single JavaScript file.

### Key Design Decisions

1. **Single-file architecture**: All JavaScript code resides in `js/script.js` organized by comment sections, all CSS in `css/style.css` organized by comment sections per bootcamp requirements
2. **No framework dependency**: Pure vanilla JavaScript to meet learning objectives
3. **localStorage-first**: All data persists client-side with no backend server
4. **Chart.js integration**: Single chart instance created on load and updated dynamically
5. **Design token system**: CSS custom properties provide theme switching capability
6. **Component-based CSS**: Reusable UI component classes inspired by shadcn/ui aesthetic

## Architecture

### High-Level Structure

```
┌─────────────────────────────────────────────┐
│           User Interface (HTML/CSS)          │
│  - Input forms                               │
│  - Transaction list                          │
│  - Balance display                           │
│  - Chart canvas                              │
│  - Settings modal                            │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│         Application Layer (JS)              │
│  ┌──────────────────────────────────────┐  │
│  │     State Management Module          │  │
│  │  - transactions []                   │  │
│  │  - categories []                     │  │
│  │  - settings {}                       │  │
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │     Storage Module                   │  │
│  │  - loadData()                        │  │
│  │  - saveData()                        │  │
│  │  - handleErrors()                    │  │
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │     UI Controller Module             │  │
│  │  - renderTransactions()              │  │
│  │  - updateBalance()                   │  │
│  │  - updateChart()                     │  │
│  │  - showValidationError()             │  │
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │     Event Handlers Module            │  │
│  │  - onFormSubmit()                    │  │
│  │  - onDeleteClick()                   │  │
│  │  - onThemeToggle()                   │  │
│  │  - onSortChange()                    │  │
│  └──────────────────────────────────────┘  │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│      Browser APIs & External Libraries       │
│  - localStorage                              │
│  - Chart.js (CDN)                            │
│  - DOM API                                   │
└─────────────────────────────────────────────┘
```

### Module Organization Pattern

The JavaScript file is organized using the Revealing Module Pattern with IIFE sections:

```javascript
// ============================================
// STATE MANAGEMENT
// ============================================
const AppState = (function() {
  let transactions = [];
  let categories = [];
  let settings = {};
  
  return {
    getTransactions: () => transactions,
    addTransaction: (transaction) => { /* ... */ },
    // ... public API
  };
})();

// ============================================
// STORAGE MODULE
// ============================================
const StorageModule = (function() {
  const KEYS = {
    TRANSACTIONS: 'ebv_transactions',
    CATEGORIES: 'ebv_categories',
    SETTINGS: 'ebv_settings'
  };
  
  return {
    load: (key) => { /* ... */ },
    save: (key, data) => { /* ... */ },
    // ... public API
  };
})();

// Each section encapsulates related functionality
```

## Components and Interfaces

### 1. State Management Module

**Responsibilities:**
- Maintain in-memory application state
- Provide controlled access to state data
- Notify UI when state changes

**Public API:**
```javascript
AppState = {
  // Transaction operations
  getTransactions(): Transaction[]
  addTransaction(transaction: Transaction): void
  deleteTransaction(id: string): void
  
  // Category operations
  getCategories(): Category[]
  addCategory(category: Category): void
  
  // Settings operations
  getSettings(): Settings
  updateSettings(partial: Partial<Settings>): void
  
  // Computed values
  calculateBalance(): number
  aggregateByCategory(): Map<string, number>
  aggregateByMonth(): Map<string, MonthSummary>
}
```

### 2. Storage Module

**Responsibilities:**
- Interface with localStorage
- Handle JSON serialization/deserialization
- Error recovery for corrupted data
- Quota exceeded handling

**Public API:**
```javascript
StorageModule = {
  loadTransactions(): Transaction[] | null
  saveTransactions(transactions: Transaction[]): boolean
  
  loadCategories(): Category[] | null
  saveCategories(categories: Category[]): boolean
  
  loadSettings(): Settings | null
  saveSettings(settings: Settings): boolean
  
  handleError(error: Error): void
}
```

**Error Handling Strategy:**
- Try-catch blocks around all `JSON.parse()` calls
- Return null on parse errors, allowing caller to use defaults
- Log errors to console for debugging
- Graceful degradation: if storage fails, app continues with in-memory state

**Implementation Pattern:**
```javascript
load(key) {
  try {
    const item = localStorage.getItem(key);
    if (item === null) return null;
    return JSON.parse(item);
  } catch (error) {
    console.error(`Failed to load ${key}:`, error);
    return null;
  }
}

save(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    if (error.name === 'QuotaExceededError') {
      console.error('localStorage quota exceeded');
      // Display user-facing warning
    }
    console.error(`Failed to save ${key}:`, error);
    return false;
  }
}
```

### 3. UI Controller Module

**Responsibilities:**
- Render state to DOM
- Update UI elements in response to state changes
- Manage Chart.js instance

**Public API:**
```javascript
UIController = {
  renderTransactions(transactions: Transaction[], sortBy: string): void
  updateBalance(balance: number, limit: number): void
  updateChart(aggregatedData: Map<string, number>): void
  renderCategoryOptions(categories: Category[]): void
  renderMonthSummary(monthData: Map<string, MonthSummary>): void
  showValidationError(fieldName: string, message: string): void
  clearValidationErrors(): void
  showDeleteConfirmation(transactionId: string): void
}
```

**Chart.js Integration Pattern:**

The chart is created once during initialization and updated thereafter using the `chart.update()` method:

```javascript
let chartInstance = null;

function initChart() {
  const ctx = document.getElementById('expenseChart').getContext('2d');
  chartInstance = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: [],
      datasets: [{
        data: [],
        backgroundColor: []
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true
    }
  });
}

function updateChart(categoryData) {
  if (!chartInstance) return;
  
  const labels = Array.from(categoryData.keys());
  const data = Array.from(categoryData.values());
  const colors = labels.map(cat => getCategoryColor(cat));
  
  chartInstance.data.labels = labels;
  chartInstance.data.datasets[0].data = data;
  chartInstance.data.datasets[0].backgroundColor = colors;
  
  chartInstance.update(); // Triggers smooth animation to new values
}
```

**Key principle:** Never call `new Chart()` after initialization—always use `chart.update()` to modify existing instance. This prevents memory leaks and provides smooth transitions between data states.

### 4. Event Handlers Module

**Responsibilities:**
- Bind DOM events to handler functions
- Coordinate between user actions, state updates, and UI rendering
- Form validation

**Public API:**
```javascript
EventHandlers = {
  bindFormSubmit(): void
  bindDeleteButtons(): void
  bindThemeToggle(): void
  bindSortChange(): void
  bindCategoryForm(): void
  bindSettingsForm(): void
  
  // Internal handlers (not exposed)
  handleTransactionSubmit(event): void
  handleDeleteTransaction(id: string): void
  handleThemeToggle(): void
  handleSortChange(sortBy: string): void
}
```

**Form Validation Pattern:**

Validation displays inline errors below form fields without using `alert()`:

```javascript
function validateTransactionForm(formData) {
  const errors = {};
  
  if (!formData.itemName.trim()) {
    errors.itemName = 'Item name is required';
  }
  
  if (!formData.amount || formData.amount <= 0) {
    errors.amount = 'Amount must be greater than zero';
  }
  
  if (!formData.category) {
    errors.category = 'Please select a category';
  }
  
  return errors;
}

function displayValidationErrors(errors) {
  clearValidationErrors();
  
  for (const [field, message] of Object.entries(errors)) {
    const errorElement = document.getElementById(`${field}-error`);
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.classList.add('error-visible');
    }
  }
}
```

### 5. Initialization Module

**Responsibilities:**
- Bootstrap the application
- Load persisted data from localStorage
- Initialize default categories if needed
- Apply saved theme preference
- Create Chart.js instance
- Bind event handlers
- Render initial UI

**Initialization Flow:**
```javascript
function init() {
  // 1. Load data from localStorage
  const transactions = StorageModule.loadTransactions() || [];
  const categories = StorageModule.loadCategories() || getDefaultCategories();
  const settings = StorageModule.loadSettings() || getDefaultSettings();
  
  // 2. Initialize state
  AppState.initialize(transactions, categories, settings);
  
  // 3. Apply theme
  applyTheme(settings.theme || detectPreferredTheme());
  
  // 4. Initialize Chart.js
  initChart();
  
  // 5. Bind event handlers
  EventHandlers.bindAll();
  
  // 6. Render initial UI
  UIController.renderAll();
}

// Run on DOMContentLoaded
document.addEventListener('DOMContentLoaded', init);
```

## Data Models

### Transaction Model

```javascript
interface Transaction {
  id: string;           // UUID v4 generated via crypto.randomUUID()
  itemName: string;     // User-provided expense description
  amount: number;       // Positive number, stored as float
  category: string;     // Reference to Category name
  createdAt: number;    // Unix timestamp (Date.now())
}
```

**Generation:**
```javascript
function createTransaction(itemName, amount, category) {
  return {
    id: crypto.randomUUID(),
    itemName: itemName.trim(),
    amount: parseFloat(amount),
    category: category,
    createdAt: Date.now()
  };
}
```

**Constraints:**
- `id` must be unique
- `itemName` must not be empty after trimming
- `amount` must be positive
- `category` must exist in categories array
- `createdAt` is immutable

### Category Model

```javascript
interface Category {
  name: string;         // Unique identifier and display name
  color: string;        // CSS custom property reference (e.g., 'var(--food)')
  isDefault: boolean;   // True for Food, Transport, Fun
}
```

**Default Categories:**
```javascript
const DEFAULT_CATEGORIES = [
  { name: 'Food', color: 'var(--food)', isDefault: true },
  { name: 'Transport', color: 'var(--transport)', isDefault: true },
  { name: 'Fun', color: 'var(--fun)', isDefault: true }
];
```

**Color Assignment for Custom Categories:**

Custom categories receive colors from a predefined palette cycling through hsl values:

```javascript
const CUSTOM_CATEGORY_COLORS = [
  'hsl(280, 65%, 60%)',  // Purple
  'hsl(160, 65%, 50%)',  // Teal
  'hsl(30, 85%, 60%)',   // Orange
  'hsl(200, 70%, 55%)',  // Blue
  'hsl(340, 75%, 60%)',  // Pink
  'hsl(90, 55%, 50%)'    // Green
];

let colorIndex = 0;

function assignColorToCategory() {
  const color = CUSTOM_CATEGORY_COLORS[colorIndex % CUSTOM_CATEGORY_COLORS.length];
  colorIndex++;
  return color;
}
```

### Settings Model

```javascript
interface Settings {
  theme: 'light' | 'dark';  // Current theme preference
  spendingLimit: number | null;  // Null means no limit set
}
```

**Default Settings:**
```javascript
const DEFAULT_SETTINGS = {
  theme: detectPreferredTheme(), // Based on prefers-color-scheme
  spendingLimit: null
};

function detectPreferredTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches 
    ? 'dark' 
    : 'light';
}
```

### MonthSummary Model (Computed)

```javascript
interface MonthSummary {
  month: string;        // Format: 'YYYY-MM'
  label: string;        // Display format: 'January 2024'
  total: number;        // Sum of all transactions in month
  byCategory: Map<string, number>;  // Category name -> amount
}
```

**Aggregation Logic:**
```javascript
function aggregateByMonth(transactions) {
  const monthMap = new Map();
  
  transactions.forEach(tx => {
    const date = new Date(tx.createdAt);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, {
        month: monthKey,
        label: formatMonthLabel(date),
        total: 0,
        byCategory: new Map()
      });
    }
    
    const summary = monthMap.get(monthKey);
    summary.total += tx.amount;
    
    const catTotal = summary.byCategory.get(tx.category) || 0;
    summary.byCategory.set(tx.category, catTotal + tx.amount);
  });
  
  // Sort by month descending
  return new Map([...monthMap.entries()].sort((a, b) => b[0].localeCompare(a[0])));
}
```

## CSS Design System

### Design Tokens (CSS Custom Properties)

The design system uses CSS custom properties for theming, defined at the `:root` level with overrides via `[data-theme="dark"]`:

```css
:root {
  /* Color palette - Light theme */
  --background: 0 0% 100%;
  --foreground: 240 10% 3.9%;
  --card: 0 0% 100%;
  --card-foreground: 240 10% 3.9%;
  --border: 240 5.9% 90%;
  --input: 240 5.9% 90%;
  
  --primary: 240 5.9% 10%;
  --primary-foreground: 0 0% 98%;
  
  --muted: 240 4.8% 95.9%;
  --muted-foreground: 240 3.8% 46.1%;
  
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 0 0% 98%;
  
  --ring: 240 5.9% 10%;
  
  /* Category colors */
  --food: 142 71% 45%;
  --transport: 221 83% 53%;
  --fun: 280 65% 60%;
  
  /* Spacing */
  --radius: 0.5rem;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
}

[data-theme="dark"] {
  --background: 240 10% 3.9%;
  --foreground: 0 0% 98%;
  --card: 240 10% 7%;
  --card-foreground: 0 0% 98%;
  --border: 240 3.7% 15.9%;
  --input: 240 3.7% 15.9%;
  
  --primary: 0 0% 98%;
  --primary-foreground: 240 5.9% 10%;
  
  --muted: 240 3.7% 15.9%;
  --muted-foreground: 240 5% 64.9%;
  
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 0 0% 98%;
  
  --ring: 240 4.9% 83.9%;
}
```

**Usage Pattern:**
```css
.card {
  background-color: hsl(var(--card));
  color: hsl(var(--card-foreground));
  border: 1px solid hsl(var(--border));
  border-radius: var(--radius);
  box-shadow: var(--shadow-md);
}
```

### Component Classes

#### Button Variants

```css
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1rem;
  border-radius: var(--radius);
  font-weight: 500;
  transition: all 0.2s;
  cursor: pointer;
  border: 1px solid transparent;
}

.btn-primary {
  background-color: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
}

.btn-primary:hover {
  background-color: hsl(var(--primary) / 0.9);
}

.btn-outline {
  border-color: hsl(var(--border));
  background-color: transparent;
}

.btn-outline:hover {
  background-color: hsl(var(--muted));
}

.btn-destructive {
  background-color: hsl(var(--destructive));
  color: hsl(var(--destructive-foreground));
}

.btn-ghost {
  background-color: transparent;
}

.btn-ghost:hover {
  background-color: hsl(var(--muted));
}
```

#### Input Fields

```css
.input {
  display: flex;
  width: 100%;
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius);
  border: 1px solid hsl(var(--input));
  background-color: transparent;
  color: hsl(var(--foreground));
  font-size: 0.875rem;
  transition: border-color 0.2s;
}

.input:focus {
  outline: none;
  border-color: hsl(var(--ring));
  box-shadow: 0 0 0 2px hsl(var(--ring) / 0.2);
}

.input-error {
  border-color: hsl(var(--destructive));
}
```

#### Card Containers

```css
.card {
  background-color: hsl(var(--card));
  color: hsl(var(--card-foreground));
  border: 1px solid hsl(var(--border));
  border-radius: var(--radius);
  padding: 1.5rem;
  box-shadow: var(--shadow-md);
}

.card-header {
  margin-bottom: 1rem;
}

.card-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: hsl(var(--foreground));
}

.card-content {
  /* Content area */
}
```

#### Category Badges

```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  border-radius: calc(var(--radius) * 0.75);
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
}

.badge-food {
  background-color: hsl(var(--food) / 0.1);
  color: hsl(var(--food));
}

.badge-transport {
  background-color: hsl(var(--transport) / 0.1);
  color: hsl(var(--transport));
}

.badge-fun {
  background-color: hsl(var(--fun) / 0.1);
  color: hsl(var(--fun));
}
```

#### Toggle Switch

```css
.toggle {
  position: relative;
  width: 44px;
  height: 24px;
  background-color: hsl(var(--muted));
  border-radius: 12px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.toggle.active {
  background-color: hsl(var(--primary));
}

.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  background-color: white;
  border-radius: 50%;
  transition: transform 0.2s;
}

.toggle.active .toggle-thumb {
  transform: translateX(20px);
}
```

#### Modal/Dialog

```css
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}

.modal {
  background-color: hsl(var(--card));
  border-radius: var(--radius);
  padding: 1.5rem;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1);
}

.modal-header {
  margin-bottom: 1rem;
}

.modal-title {
  font-size: 1.125rem;
  font-weight: 600;
}

.modal-footer {
  margin-top: 1.5rem;
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}
```

### Responsive Design

```css
/* Mobile-first approach */
.container {
  width: 100%;
  padding: 1rem;
}

@media (min-width: 640px) {
  .container {
    max-width: 640px;
    margin: 0 auto;
  }
}

@media (min-width: 768px) {
  .container {
    max-width: 768px;
  }
  
  .grid-2col {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }
}

@media (min-width: 1024px) {
  .container {
    max-width: 1024px;
  }
}

/* Touch targets on mobile */
.btn, .input, .toggle {
  min-height: 44px;  /* iOS minimum touch target */
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

The Expense & Budget Visualizer contains several pure functional components suitable for property-based testing: validation logic, data aggregation, sorting algorithms, and formatting functions. While UI rendering and localStorage interactions are better tested with integration tests, the core business logic benefits from property-based verification.

### Property 1: Validation Rejects Whitespace-Only Item Names

*For any* string composed entirely of whitespace characters (spaces, tabs, newlines), the transaction validation function SHALL reject it and return an error indicating the item name is required.

**Validates: Requirements 1.2**

### Property 2: Validation Rejects Non-Positive Amounts

*For any* number less than or equal to zero (including negative numbers and zero), the transaction validation function SHALL reject it and return an error indicating the amount must be positive.

**Validates: Requirements 1.4**

### Property 3: Transaction Creation Produces Unique IDs

*For any* two valid transaction creation operations performed sequentially, the generated transaction IDs SHALL be distinct from each other.

**Validates: Requirements 1.6**

### Property 4: Transaction Rendering Contains Required Information

*For any* valid transaction object, the rendered HTML string SHALL contain the item name, the formatted amount with currency symbol, a category badge, and a delete button element.

**Validates: Requirements 2.2**

### Property 5: Currency Formatting Includes Symbol and Separators

*For any* positive number, the currency formatting function SHALL return a string containing a currency symbol and thousand separators for values >= 1000.

**Validates: Requirements 2.6**

### Property 6: Balance Calculation Equals Sum of Amounts

*For any* array of valid transactions, the calculated balance SHALL equal the sum of all transaction amounts.

**Validates: Requirements 3.1**

### Property 7: Category Aggregation Produces Correct Totals

*For any* array of valid transactions, when aggregated by category, the sum of all category totals SHALL equal the total balance, and each category total SHALL equal the sum of amounts for transactions in that category.

**Validates: Requirements 4.3**

### Property 8: Empty Categories Excluded from Aggregation

*For any* aggregated category data, all categories with zero total amount SHALL be excluded from the result set.

**Validates: Requirements 4.4**

### Property 9: Distinct Colors Assigned to Categories

*For any* array of category names, the color assignment function SHALL produce a unique color value for each category.

**Validates: Requirements 4.5**

### Property 10: Category Name Validation Rejects Whitespace

*For any* string composed entirely of whitespace characters, the category validation function SHALL reject it and return an error indicating the category name is required.

**Validates: Requirements 5.3**

### Property 11: Month Grouping Produces Correct Groupings

*For any* array of transactions with various createdAt timestamps, when grouped by month, all transactions with timestamps in the same calendar month SHALL appear in the same group, and no transactions from different months SHALL appear in the same group.

**Validates: Requirements 6.2**

### Property 12: Monthly Total Equals Sum of Month Transactions

*For any* month group in the monthly summary, the month total SHALL equal the sum of all transaction amounts for that month.

**Validates: Requirements 6.3**

### Property 13: Monthly Category Breakdown Totals Match Month Total

*For any* month group with category breakdown, the sum of all category amounts SHALL equal the month total.

**Validates: Requirements 6.4**

### Property 14: Months Sorted in Descending Chronological Order

*For any* array of month summary objects, when sorted, each month's date SHALL be greater than or equal to the next month's date (newest first).

**Validates: Requirements 6.5**

### Property 15: Sort by Newest Maintains Descending Timestamp Order

*For any* array of transactions sorted by newest, for every adjacent pair of transactions, the first transaction's createdAt SHALL be greater than or equal to the second transaction's createdAt.

**Validates: Requirements 7.2**

### Property 16: Sort by Amount Ascending Maintains Ascending Order

*For any* array of transactions sorted by amount ascending, for every adjacent pair of transactions, the first transaction's amount SHALL be less than or equal to the second transaction's amount.

**Validates: Requirements 7.3**

### Property 17: Sort by Amount Descending Maintains Descending Order

*For any* array of transactions sorted by amount descending, for every adjacent pair of transactions, the first transaction's amount SHALL be greater than or equal to the second transaction's amount.

**Validates: Requirements 7.4**

### Property 18: Sort by Category Maintains Alphabetical Order

*For any* array of transactions sorted by category, for every adjacent pair of transactions, the first transaction's category name SHALL be lexicographically less than or equal to the second transaction's category name.

**Validates: Requirements 7.5**

### Property 19: Sorting Does Not Mutate Original Data

*For any* transaction array stored in localStorage, performing a sort operation SHALL NOT modify the stored data, and subsequent reads from localStorage SHALL return the original unsorted order.

**Validates: Requirements 7.6**

### Property 20: Warning Displays When Balance Exceeds Limit

*For any* balance value and spending limit where the balance is strictly greater than the limit, the warning display logic SHALL return true (indicating warning should be shown).

**Validates: Requirements 8.3**

### Property 21: No Warning When Balance Within Limit

*For any* balance value and spending limit where the balance is less than or equal to the limit, the warning display logic SHALL return false (indicating warning should not be shown).

**Validates: Requirements 8.5**

### Property 22: JSON Serialization Round-Trip Preserves Data

*For any* valid JavaScript object (transaction, category, or settings), serializing it to JSON then deserializing it back SHALL produce an object equivalent to the original.

**Validates: Requirements 10.4, 10.5**

## Error Handling

### localStorage Error Handling Strategy

The application implements defensive error handling around all localStorage operations:

**1. JSON Parse Errors:**
```javascript
function loadFromStorage(key) {
  try {
    const item = localStorage.getItem(key);
    if (item === null) return null;
    return JSON.parse(item);
  } catch (error) {
    console.error(`Failed to parse ${key} from localStorage:`, error);
    // Return null to trigger default value initialization
    return null;
  }
}
```

**2. Quota Exceeded Errors:**
```javascript
function saveToStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    if (error.name === 'QuotaExceededError') {
      console.error('localStorage quota exceeded');
      displayUserWarning('Storage limit reached. Some data may not be saved.');
    } else {
      console.error(`Failed to save ${key} to localStorage:`, error);
    }
    return false;
  }
}
```

**3. Corrupted Data Recovery:**

When localStorage returns corrupted or invalid data, the application falls back to default values:

```javascript
function initialize() {
  const transactions = loadFromStorage('ebv_transactions') || [];
  const categories = loadFromStorage('ebv_categories') || DEFAULT_CATEGORIES;
  const settings = loadFromStorage('ebv_settings') || DEFAULT_SETTINGS;
  
  AppState.initialize(transactions, categories, settings);
}
```

**4. Missing localStorage Support:**

For environments where localStorage is unavailable (private browsing modes, certain browsers):

```javascript
function isLocalStorageAvailable() {
  try {
    const test = '__localStorage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (error) {
    return false;
  }
}

// In initialization
if (!isLocalStorageAvailable()) {
  console.warn('localStorage not available. Data will not persist.');
  // Continue with in-memory state only
}
```

### Form Validation Error Display

Validation errors are displayed inline below form fields using dedicated error message elements:

**HTML Structure:**
```html
<div class="form-field">
  <label for="itemName">Item Name</label>
  <input type="text" id="itemName" class="input" />
  <span id="itemName-error" class="error-message"></span>
</div>
```

**Error Display Logic:**
```javascript
function displayValidationErrors(errors) {
  // Clear previous errors
  document.querySelectorAll('.error-message').forEach(el => {
    el.textContent = '';
    el.classList.remove('visible');
  });
  
  // Display new errors
  for (const [field, message] of Object.entries(errors)) {
    const errorEl = document.getElementById(`${field}-error`);
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.add('visible');
    }
    
    const inputEl = document.getElementById(field);
    if (inputEl) {
      inputEl.classList.add('input-error');
    }
  }
}

function clearValidationErrors() {
  document.querySelectorAll('.error-message').forEach(el => {
    el.textContent = '';
    el.classList.remove('visible');
  });
  
  document.querySelectorAll('.input-error').forEach(el => {
    el.classList.remove('input-error');
  });
}
```

### Chart.js Error Handling

Protect against Chart.js errors during initialization and updates:

```javascript
function initChart() {
  try {
    const ctx = document.getElementById('expenseChart').getContext('2d');
    if (!ctx) {
      console.error('Chart canvas element not found');
      return null;
    }
    
    chartInstance = new Chart(ctx, {
      type: 'pie',
      data: { labels: [], datasets: [{ data: [], backgroundColor: [] }] },
      options: { responsive: true, maintainAspectRatio: true }
    });
    
    return chartInstance;
  } catch (error) {
    console.error('Failed to initialize Chart.js:', error);
    return null;
  }
}

function updateChart(categoryData) {
  if (!chartInstance) {
    console.warn('Chart not initialized, skipping update');
    return;
  }
  
  try {
    const labels = Array.from(categoryData.keys());
    const data = Array.from(categoryData.values());
    const colors = labels.map(cat => getCategoryColor(cat));
    
    chartInstance.data.labels = labels;
    chartInstance.data.datasets[0].data = data;
    chartInstance.data.datasets[0].backgroundColor = colors;
    
    chartInstance.update();
  } catch (error) {
    console.error('Failed to update chart:', error);
  }
}
```

### Delete Confirmation Dialog

Prevent accidental deletion with a modal confirmation:

```javascript
function showDeleteConfirmation(transactionId) {
  return new Promise((resolve) => {
    const modal = document.getElementById('deleteModal');
    const confirmBtn = document.getElementById('confirmDelete');
    const cancelBtn = document.getElementById('cancelDelete');
    
    modal.classList.add('visible');
    
    const handleConfirm = () => {
      cleanup();
      resolve(true);
    };
    
    const handleCancel = () => {
      cleanup();
      resolve(false);
    };
    
    const cleanup = () => {
      confirmBtn.removeEventListener('click', handleConfirm);
      cancelBtn.removeEventListener('click', handleCancel);
      modal.classList.remove('visible');
    };
    
    confirmBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', handleCancel);
  });
}

// Usage
async function handleDelete(transactionId) {
  const confirmed = await showDeleteConfirmation(transactionId);
  if (confirmed) {
    AppState.deleteTransaction(transactionId);
    StorageModule.saveTransactions(AppState.getTransactions());
    UIController.renderAll();
  }
}
```

## Testing Strategy

The Expense & Budget Visualizer requires a dual testing approach combining property-based tests for pure business logic with integration tests for UI and browser API interactions.

### Testing Categories

**1. Property-Based Tests (Unit Tests with PBT Library)**

Use a property-based testing library (fast-check for JavaScript) to verify universal properties:

- **Validation Functions**: Test validation rejects all invalid inputs (Properties 1, 2, 10)
- **Data Aggregation**: Test balance calculation, category aggregation, month grouping (Properties 6, 7, 8, 11, 12, 13)
- **Sorting Algorithms**: Test all sort orders maintain correct invariants (Properties 15-19)
- **Formatting Functions**: Test currency formatting, transaction rendering (Properties 4, 5)
- **Comparison Logic**: Test spending limit warning logic (Properties 20, 21)
- **Serialization**: Test JSON round-trip preserves data (Property 22)

Each property test MUST:
- Run minimum 100 iterations with randomized inputs
- Reference the design property number in a comment
- Tag format: `// Feature: expense-budget-visualizer, Property X: [property text]`

**2. Integration Tests**

Test UI interactions, localStorage persistence, and Chart.js integration:

- Form submission creates and displays transactions
- Delete button removes transactions from UI and storage
- Theme toggle switches themes and persists preference
- Chart updates when data changes
- localStorage keys are correct
- Corrupted localStorage data recovers gracefully

**3. Manual Testing**

- Responsive design across mobile, tablet, desktop viewports
- Touch target sizes on mobile devices
- Theme appearance in light and dark modes
- Accessibility: keyboard navigation, focus indicators
- Performance: UI responsiveness under typical usage

### Test Organization

Tests are organized by module matching the application structure:

```
tests/
├── validation.test.js         # Properties 1, 2, 10
├── aggregation.test.js        # Properties 6, 7, 8, 11, 12, 13
├── sorting.test.js            # Properties 15-19
├── formatting.test.js         # Properties 4, 5
├── comparison.test.js         # Properties 20, 21
├── serialization.test.js      # Property 22
├── ui-integration.test.js     # UI interaction tests
├── storage-integration.test.js # localStorage tests
└── chart-integration.test.js   # Chart.js tests
```

### Property-Based Testing Library Setup

For JavaScript, use [fast-check](https://github.com/dubzzz/fast-check):

```javascript
import fc from 'fast-check';

// Example property test
describe('Transaction Validation', () => {
  // Feature: expense-budget-visualizer, Property 1: Validation Rejects Whitespace-Only Item Names
  test('rejects whitespace-only item names', () => {
    fc.assert(
      fc.property(
        fc.stringOf(fc.constantFrom(' ', '\t', '\n')),
        (whitespaceString) => {
          const errors = validateTransactionForm({
            itemName: whitespaceString,
            amount: 100,
            category: 'Food'
          });
          
          expect(errors.itemName).toBeDefined();
          expect(errors.itemName).toContain('required');
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Testing Configuration

**Minimum test coverage targets:**
- Unit tests (property-based): 80% coverage of pure functions
- Integration tests: Cover all user workflows
- All 22 correctness properties must have corresponding property tests

**Performance testing:**
- Balance calculation < 100ms for 1000 transactions
- Chart update < 200ms
- UI updates < 100ms after state changes

### Continuous Testing

During development:
1. Run unit tests (including property tests) on every file save
2. Run integration tests before committing
3. Manually test responsive design at mobile, tablet, desktop breakpoints
4. Verify accessibility with keyboard-only navigation

## Implementation Notes

### File Structure

```
expense-budget-visualizer/
├── index.html                 # Main HTML file
├── css/
│   └── style.css             # Single CSS file with comment sections
├── js/
│   └── script.js             # Single JS file with IIFE modules
└── tests/                    # Test files (separate from source)
    ├── validation.test.js
    ├── aggregation.test.js
    └── ...
```

### CSS File Organization

The `css/style.css` file is organized with comment sections:

```css
/* ============================================
   DESIGN TOKENS
   ============================================ */
:root { /* ... */ }

/* ============================================
   RESET AND BASE STYLES
   ============================================ */
*, *::before, *::after { /* ... */ }

/* ============================================
   LAYOUT COMPONENTS
   ============================================ */
.container { /* ... */ }

/* ============================================
   UI COMPONENTS - BUTTONS
   ============================================ */
.btn { /* ... */ }

/* ============================================
   UI COMPONENTS - FORMS
   ============================================ */
.input { /* ... */ }

/* ============================================
   UI COMPONENTS - CARDS
   ============================================ */
.card { /* ... */ }

/* ============================================
   TRANSACTION LIST
   ============================================ */
.transaction-list { /* ... */ }

/* ============================================
   CHART CONTAINER
   ============================================ */
.chart-container { /* ... */ }

/* ============================================
   MODAL/DIALOG
   ============================================ */
.modal-overlay { /* ... */ }

/* ============================================
   UTILITIES
   ============================================ */
.hidden { /* ... */ }

/* ============================================
   RESPONSIVE DESIGN
   ============================================ */
@media (min-width: 640px) { /* ... */ }
```

### JavaScript File Organization

The `js/script.js` file is organized with IIFE modules marked by comment sections:

```javascript
'use strict';

// ============================================
// CONSTANTS
// ============================================
const STORAGE_KEYS = {
  TRANSACTIONS: 'ebv_transactions',
  CATEGORIES: 'ebv_categories',
  SETTINGS: 'ebv_settings'
};

const DEFAULT_CATEGORIES = [
  { name: 'Food', color: 'var(--food)', isDefault: true },
  { name: 'Transport', color: 'var(--transport)', isDefault: true },
  { name: 'Fun', color: 'var(--fun)', isDefault: true }
];

// ============================================
// STATE MANAGEMENT MODULE
// ============================================
const AppState = (function() {
  // Private state
  let transactions = [];
  let categories = [];
  let settings = {};
  
  // Public API
  return {
    initialize(txs, cats, sets) { /* ... */ },
    getTransactions() { /* ... */ },
    addTransaction(tx) { /* ... */ },
    // ...
  };
})();

// ============================================
// STORAGE MODULE
// ============================================
const StorageModule = (function() {
  // Private helpers
  function safeJSONParse(str) { /* ... */ }
  
  // Public API
  return {
    loadTransactions() { /* ... */ },
    saveTransactions(txs) { /* ... */ },
    // ...
  };
})();

// ============================================
// UI CONTROLLER MODULE
// ============================================
const UIController = (function() {
  // Private variables
  let chartInstance = null;
  
  // Private helpers
  function formatCurrency(amount) { /* ... */ }
  
  // Public API
  return {
    renderTransactions(txs) { /* ... */ },
    updateBalance(balance, limit) { /* ... */ },
    // ...
  };
})();

// ============================================
// EVENT HANDLERS MODULE
// ============================================
const EventHandlers = (function() {
  // Private handlers
  function handleTransactionSubmit(event) { /* ... */ }
  
  // Public API
  return {
    bindAll() { /* ... */ },
  };
})();

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', function() {
  // Bootstrap application
  const transactions = StorageModule.loadTransactions() || [];
  const categories = StorageModule.loadCategories() || DEFAULT_CATEGORIES;
  const settings = StorageModule.loadSettings() || { theme: 'light', spendingLimit: null };
  
  AppState.initialize(transactions, categories, settings);
  
  // Apply theme
  const savedTheme = settings.theme || detectPreferredTheme();
  document.documentElement.setAttribute('data-theme', savedTheme);
  
  // Initialize chart
  UIController.initChart();
  
  // Bind events
  EventHandlers.bindAll();
  
  // Initial render
  UIController.renderAll();
});
```

### Browser Compatibility

Target browsers per Requirements 11.4:
- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)

**Polyfills/Fallbacks Needed:**
- None required for target browsers
- `crypto.randomUUID()` is supported in all target browsers
- Chart.js supports all target browsers

### Performance Optimization

**1. Debounce expensive operations:**

```javascript
function debounce(func, delay) {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

// Usage: debounce chart updates if triggered rapidly
const debouncedChartUpdate = debounce((data) => {
  UIController.updateChart(data);
}, 100);
```

**2. Avoid unnecessary re-renders:**

```javascript
// Only re-render if data actually changed
let lastRenderedData = null;

function renderTransactions(transactions) {
  const dataSignature = JSON.stringify(transactions.map(t => t.id));
  if (dataSignature === lastRenderedData) return;
  
  lastRenderedData = dataSignature;
  // Proceed with render
}
```

**3. Use document fragments for batch DOM updates:**

```javascript
function renderTransactionList(transactions) {
  const fragment = document.createDocumentFragment();
  
  transactions.forEach(tx => {
    const li = createTransactionElement(tx);
    fragment.appendChild(li);
  });
  
  const list = document.getElementById('transactionList');
  list.innerHTML = '';
  list.appendChild(fragment); // Single reflow
}
```

### Accessibility Considerations

**1. Semantic HTML:**
- Use `<button>` for interactive elements (not `<div>` with click handlers)
- Use `<label>` for form inputs with `for` attribute
- Use appropriate heading hierarchy (`<h1>`, `<h2>`, etc.)

**2. Keyboard Navigation:**
- All interactive elements must be keyboard accessible
- Implement logical tab order
- Provide visible focus indicators via CSS

**3. ARIA Attributes:**
- Add `aria-label` to icon-only buttons
- Use `aria-live` for dynamic content updates (balance, chart)
- Add `role="dialog"` and `aria-modal="true"` to modal

**4. Color Contrast:**
- Ensure all text meets WCAG AA contrast ratios (4.5:1 for normal text)
- Don't rely solely on color to convey information

### Future Enhancements (Out of Scope)

These features are not part of the current requirements but could be considered for future versions:

- Export data to CSV/JSON
- Import transactions from CSV
- Budget allocation by category
- Recurring transaction templates
- Multi-currency support
- Data sync across devices via backend
- Advanced filtering (date ranges, amount ranges)
- Custom reports and analytics
- Transaction notes/descriptions
- Receipt photo attachments

## Summary

This design document provides a comprehensive blueprint for implementing the Expense & Budget Visualizer as a vanilla JavaScript application. The architecture follows a modular IIFE pattern within a single JavaScript file, uses localStorage for persistence, and integrates Chart.js for visualization. The CSS design system uses custom properties for theming, and the component library provides reusable UI patterns inspired by shadcn/ui.

The design prioritizes correctness through 22 testable properties covering validation, aggregation, sorting, and formatting logic. Error handling ensures graceful degradation when localStorage is unavailable or data is corrupted. The testing strategy combines property-based tests (100+ iterations per property) with integration tests for UI and browser API interactions.

All requirements from the requirements document are addressed through specific architectural decisions, component designs, and correctness properties that will guide implementation and testing.
