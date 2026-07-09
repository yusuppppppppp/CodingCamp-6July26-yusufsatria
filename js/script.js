/* ============================================
   EXPENSE & BUDGET VISUALIZER
   JavaScript Application Logic
   ============================================ */

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
  { name: 'Food', color: 'hsl(142, 71%, 45%)', isDefault: true },
  { name: 'Transport', color: 'hsl(221, 83%, 53%)', isDefault: true },
  { name: 'Fun', color: 'hsl(280, 65%, 60%)', isDefault: true }
];

const DEFAULT_SETTINGS = {
  theme: 'light',
  spendingLimit: null
};

const CATEGORY_COLOR_MAP = {
  'Food': 'hsl(142, 71%, 45%)',
  'Transport': 'hsl(221, 83%, 53%)',
  'Fun': 'hsl(280, 65%, 60%)'
};

var _catColorCounter = 0;

function initColorCounter() {
  var cats = AppState.getCategories();
  _catColorCounter = cats ? cats.filter(function(c) { return !c.isDefault; }).length : 0;
}

function nextCategoryColor() {
  var hue = (_catColorCounter * 137.508) % 360;
  _catColorCounter++;
  return 'hsl(' + Math.round(hue) + ', 65%, 55%)';
}

function getCategoryColor(name) {
  if (CATEGORY_COLOR_MAP[name]) return CATEGORY_COLOR_MAP[name];
  var categories = AppState.getCategories();
  for (var i = 0; i < categories.length; i++) {
    if (categories[i].name === name && categories[i].color) {
      return categories[i].color;
    }
  }
  return 'hsl(0, 0%, 60%)';
}

function debounce(fn, delay) {
  var timer = null;
  return function() {
    var args = arguments;
    var ctx = this;
    clearTimeout(timer);
    timer = setTimeout(function() {
      fn.apply(ctx, args);
    }, delay);
  };
}

// ============================================
// STATE MANAGEMENT MODULE
// ============================================

const AppState = (function() {
  let transactions = [];
  let categories = [];
  let settings = {};

  return {
    getTransactions: function() {
      return transactions;
    },

    addTransaction: function(transaction) {
      transactions.push(transaction);
    },

    deleteTransaction: function(id) {
      transactions = transactions.filter(function(t) {
        return t.id !== id;
      });
    },

    getCategories: function() {
      return categories;
    },

    addCategory: function(category) {
      categories.push(category);
    },

    getSettings: function() {
      return settings;
    },

    updateSettings: function(partial) {
      settings = Object.assign({}, settings, partial);
    },

    calculateBalance: function() {
      return transactions.reduce(function(sum, t) {
        return sum + t.amount;
      }, 0);
    },

    aggregateByCategory: function() {
      var map = {};
      transactions.forEach(function(t) {
        if (map[t.category]) {
          map[t.category] += t.amount;
        } else {
          map[t.category] = t.amount;
        }
      });
      return map;
    },

    aggregateByMonth: function() {
      var monthMap = {};
      transactions.forEach(function(tx) {
        var date = new Date(tx.createdAt);
        var monthKey = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
        if (!monthMap[monthKey]) {
          monthMap[monthKey] = {
            month: monthKey,
            total: 0,
            byCategory: {}
          };
        }
        var summary = monthMap[monthKey];
        summary.total += tx.amount;
        if (summary.byCategory[tx.category]) {
          summary.byCategory[tx.category] += tx.amount;
        } else {
          summary.byCategory[tx.category] = tx.amount;
        }
      });
      return monthMap;
    },

    initialize: function(loadedTransactions, loadedCategories, loadedSettings) {
      transactions = loadedTransactions || [];
      categories = loadedCategories || [];
      settings = loadedSettings || {};
    }
  };
})();

// ============================================
// STORAGE MODULE
// ============================================

const StorageModule = (function() {
  function load(key) {
    try {
      var item = localStorage.getItem(key);
      if (item === null) return null;
      return JSON.parse(item);
    } catch (error) {
      console.error('Failed to load ' + key + ':', error);
      return null;
    }
  }

  function save(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Failed to save ' + key + ':', error);
      return false;
    }
  }

  return {
    loadTransactions: function() {
      return load(STORAGE_KEYS.TRANSACTIONS);
    },

    saveTransactions: function(transactions) {
      return save(STORAGE_KEYS.TRANSACTIONS, transactions);
    },

    loadCategories: function() {
      return load(STORAGE_KEYS.CATEGORIES);
    },

    saveCategories: function(categories) {
      return save(STORAGE_KEYS.CATEGORIES, categories);
    },

    loadSettings: function() {
      return load(STORAGE_KEYS.SETTINGS);
    },

    saveSettings: function(settings) {
      return save(STORAGE_KEYS.SETTINGS, settings);
    },

    handleError: function(error) {
      console.error('Storage error:', error);
    }
  };
})();

// ============================================
// UI CONTROLLER MODULE
// ============================================

const UIController = (function() {
  let chartInstance = null;
  var _monthKeys = [];
  var _currentMonthIndex = 0;
  var _monthDataCache = {};

  function formatCurrency(amount) {
    return 'Rp ' + Math.round(amount).toLocaleString('id-ID');
  }

  function formatBadge(category) {
    var map = {
      'Food': 'badge-food',
      'Transport': 'badge-transport',
      'Fun': 'badge-fun'
    };
    var cls = map[category] || 'badge-default';
    var color = getCategoryColor(category);
    var bg = color.replace('hsl(', 'hsla(').replace(')', ', 0.15)');
    return '<span class="badge ' + cls + '" style="background-color:' + bg + ';color:' + color + '">' + escapeHtml(category) + '</span>';
  }

  function renderCurrentMonth() {
    var container = document.getElementById('monthlySummary');
    var key = _monthKeys[_currentMonthIndex];
    var m = _monthDataCache[key];
    var prevDisabled = _currentMonthIndex >= _monthKeys.length - 1 ? ' disabled' : '';
    var nextDisabled = _currentMonthIndex <= 0 ? ' disabled' : '';

    var html = '<div class="month-nav">' +
      '<button class="month-nav-btn month-nav-prev"' + prevDisabled + ' aria-label="Previous month">&lt;</button>' +
      '<span class="month-nav-label">' + formatMonthLabel(m.month) + '</span>' +
      '<span class="month-nav-total">' + formatCurrency(m.total) + '</span>' +
      '<button class="month-nav-btn month-nav-next"' + nextDisabled + ' aria-label="Next month">&gt;</button>' +
    '</div>' +
    '<div class="category-breakdown">';
    var catKeys = Object.keys(m.byCategory);
    catKeys.forEach(function(cat) {
      html += '<div class="category-row">' +
        '<span class="category-row-name">' +
          formatBadge(cat) +
        '</span>' +
        '<span class="category-row-amount">' + formatCurrency(m.byCategory[cat]) + '</span>' +
      '</div>';
    });
    html += '</div>';
    container.innerHTML = html;
  }

  function formatMonthLabel(yearMonth) {
    var parts = yearMonth.split('-');
    var year = parseInt(parts[0], 10);
    var month = parseInt(parts[1], 10) - 1;
    var months = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    return months[month] + ' ' + year;
  }

  function sortTransactions(transactions, sortBy) {
    var sorted = transactions.slice();
    switch (sortBy) {
      case 'newest':
        sorted.sort(function(a, b) { return b.createdAt - a.createdAt; });
        break;
      case 'amount-asc':
        sorted.sort(function(a, b) { return a.amount - b.amount; });
        break;
      case 'amount-desc':
        sorted.sort(function(a, b) { return b.amount - a.amount; });
        break;
      case 'category':
        sorted.sort(function(a, b) {
          if (a.category < b.category) return -1;
          if (a.category > b.category) return 1;
          return 0;
        });
        break;
    }
    return sorted;
  }

  return {
    renderTransactions: function(transactions, sortBy) {
      var listEl = document.getElementById('transactionList');
      var sorted = sortTransactions(transactions, sortBy);
      var fragment = document.createDocumentFragment();

      if (sorted.length === 0) {
        listEl.innerHTML = '<p class="empty-state">No transactions yet. Add your first expense above!</p>';
        return;
      }

      sorted.forEach(function(tx) {
        var item = document.createElement('div');
        item.className = 'transaction-item';
        item.setAttribute('role', 'listitem');
        item.innerHTML =
          '<div class="transaction-info">' +
            '<span class="transaction-item-name">' + escapeHtml(tx.itemName) + '</span>' +
            '<div class="transaction-meta">' +
              formatBadge(tx.category) +
              '<span class="transaction-date">' + new Date(tx.createdAt).toLocaleDateString() + '</span>' +
            '</div>' +
          '</div>' +
          '<div class="transaction-actions">' +
            '<span class="transaction-amount">' + formatCurrency(tx.amount) + '</span>' +
            '<button class="btn btn-ghost transaction-delete-btn" data-id="' + tx.id + '" aria-label="Delete transaction">' +
              '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M5.333 4V2.667a1.333 1.333 0 011.334-1.334h2.666a1.333 1.333 0 011.334 1.334V4M12.667 4v9.333a1.333 1.333 0 01-1.334 1.334H4.667a1.333 1.333 0 01-1.334-1.334V4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
            '</button>' +
          '</div>';
        fragment.appendChild(item);
      });

      listEl.innerHTML = '';
      listEl.appendChild(fragment);
    },

    updateBalance: function(balance, limit) {
      var displayEl = document.getElementById('balanceDisplay');
      var warningEl = document.getElementById('balanceWarning');
      var infoEl = document.getElementById('balanceLimitInfo');
      displayEl.textContent = formatCurrency(balance);

      if (limit !== null && limit > 0) {
        infoEl.textContent = 'Limit: ' + formatCurrency(limit);
      } else {
        infoEl.textContent = 'No spending limit set';
      }

      if (limit !== null && limit > 0 && balance > limit) {
        warningEl.style.display = 'block';
        displayEl.classList.add('text-destructive');
      } else {
        warningEl.style.display = 'none';
        displayEl.classList.remove('text-destructive');
      }
    },

    updateChart: function(aggregatedData) {
      if (!chartInstance) return;
      var container = chartInstance.canvas.parentElement;
      var existingMsg = container.querySelector('.chart-empty-msg');
      var labels = Object.keys(aggregatedData);

      if (labels.length === 0) {
        chartInstance.canvas.style.display = 'none';
        if (!existingMsg) {
          var msg = document.createElement('p');
          msg.className = 'chart-empty-msg';
          msg.textContent = 'No expenses yet. Add transactions to see your spending distribution.';
          container.appendChild(msg);
        }
        return;
      }

      chartInstance.canvas.style.display = '';
      if (existingMsg) existingMsg.remove();

      try {
        var data = labels.map(function(l) { return aggregatedData[l]; });
        var colors = labels.map(function(l) { return getCategoryColor(l); });

        chartInstance.data.labels = labels;
        chartInstance.data.datasets[0].data = data;
        chartInstance.data.datasets[0].backgroundColor = colors;
        chartInstance.update();
      } catch (error) {
        console.error('Failed to update chart:', error);
      }
    },

    renderCategoryOptions: function(categories) {
      var select = document.getElementById('category');
      select.innerHTML = '<option value="">Select category</option>';
      categories.forEach(function(cat) {
        var opt = document.createElement('option');
        opt.value = cat.name;
        opt.textContent = cat.name;
        select.appendChild(opt);
      });
    },

    renderMonthSummary: function(monthData) {
      var container = document.getElementById('monthlySummary');
      _monthKeys = Object.keys(monthData).sort().reverse();
      _monthDataCache = monthData;

      if (_monthKeys.length === 0) {
        container.innerHTML = '<p class="empty-state">No data available. Start adding transactions to see monthly summaries.</p>';
        return;
      }

      if (_currentMonthIndex >= _monthKeys.length) {
        _currentMonthIndex = 0;
      }

      renderCurrentMonth();

      container.querySelector('.month-nav-prev').addEventListener('click', function() {
        if (_currentMonthIndex < _monthKeys.length - 1) {
          _currentMonthIndex++;
          renderCurrentMonth();
        }
      });

      container.querySelector('.month-nav-next').addEventListener('click', function() {
        if (_currentMonthIndex > 0) {
          _currentMonthIndex--;
          renderCurrentMonth();
        }
      });
    },

    showValidationError: function(fieldName, message) {
      var errorEl = document.getElementById(fieldName + '-error');
      var inputEl = document.getElementById(fieldName);
      if (errorEl) {
        errorEl.textContent = message;
        errorEl.classList.add('visible');
      }
      if (inputEl) {
        inputEl.classList.add('input-error');
      }
    },

    clearValidationErrors: function() {
      document.querySelectorAll('.error-message').forEach(function(el) {
        el.textContent = '';
        el.classList.remove('visible');
      });
      document.querySelectorAll('.input-error').forEach(function(el) {
        el.classList.remove('input-error');
      });
    },

    showDeleteConfirmation: function(transactionId) {
      return new Promise(function(resolve) {
        var modal = document.getElementById('deleteModal');
        var confirmBtn = document.getElementById('modalConfirm');
        var cancelBtn = document.getElementById('modalCancel');

        modal.style.display = 'flex';
        confirmBtn.focus();

        function onKeydown(e) {
          if (e.key === 'Escape') {
            cleanup();
            resolve(false);
          }
        }

        function onOverlayClick(e) {
          if (e.target === modal) {
            cleanup();
            resolve(false);
          }
        }

        function cleanup() {
          confirmBtn.removeEventListener('click', onConfirm);
          cancelBtn.removeEventListener('click', onCancel);
          document.removeEventListener('keydown', onKeydown);
          modal.removeEventListener('click', onOverlayClick);
          modal.style.display = 'none';
        }

        function onConfirm() {
          cleanup();
          resolve(true);
        }

        function onCancel() {
          cleanup();
          resolve(false);
        }

        document.addEventListener('keydown', onKeydown);
        modal.addEventListener('click', onOverlayClick);
        confirmBtn.addEventListener('click', onConfirm);
        cancelBtn.addEventListener('click', onCancel);
      });
    },

    initChart: function() {
      try {
        var ctx = document.getElementById('expenseChart');
        if (!ctx) {
          console.error('Chart canvas element not found');
          return;
        }
        ctx = ctx.getContext('2d');
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
            maintainAspectRatio: true,
            plugins: {
              legend: {
                position: 'bottom'
              }
            }
          }
        });
      } catch (error) {
        console.error('Failed to initialize Chart.js:', error);
      }
    }
  };
})();

function escapeHtml(str) {
  var div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

// ============================================
// EVENT HANDLERS MODULE
// ============================================

const EventHandlers = (function() {
  var currentSortBy = 'newest';

  function validateTransactionForm(data) {
    var errors = {};
    if (!data.itemName || !data.itemName.trim()) {
      errors.itemName = 'Item name is required';
    }
    if (!data.amount || parseFloat(data.amount) <= 0) {
      errors.amount = 'Amount must be greater than zero';
    }
    if (!data.category) {
      errors.category = 'Please select a category';
    }
    return errors;
  }

  function createTransaction(itemName, amount, category) {
    return {
      id: crypto.randomUUID(),
      itemName: itemName.trim(),
      amount: parseFloat(amount),
      category: category,
      createdAt: Date.now()
    };
  }

  function handleTransactionSubmit(e) {
    e.preventDefault();
    UIController.clearValidationErrors();

    var form = e.target;
    var formData = {
      itemName: form.itemName.value,
      amount: form.amount.value,
      category: form.category.value
    };

    var errors = validateTransactionForm(formData);
    if (Object.keys(errors).length > 0) {
      for (var field in errors) {
        UIController.showValidationError(field, errors[field]);
      }
      return;
    }

    var transaction = createTransaction(formData.itemName, formData.amount, formData.category);
    AppState.addTransaction(transaction);
    StorageModule.saveTransactions(AppState.getTransactions());
    form.reset();
    renderAll();
  }

  function handleDeleteClick(e) {
    var btn = e.target.closest('.transaction-delete-btn');
    if (!btn) return;
    var id = btn.getAttribute('data-id');
    if (!id) return;

    UIController.showDeleteConfirmation(id).then(function(confirmed) {
      if (confirmed) {
        AppState.deleteTransaction(id);
        StorageModule.saveTransactions(AppState.getTransactions());
        renderAll();
      }
    });
  }

  function handleThemeToggle() {
    var html = document.documentElement;
    var current = html.getAttribute('data-theme');
    var next = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    AppState.updateSettings({ theme: next });
    StorageModule.saveSettings(AppState.getSettings());
    var toggle = document.getElementById('themeToggle');
    toggle.setAttribute('aria-checked', next === 'dark');
    toggle.classList.toggle('active', next === 'dark');
  }

  function handleSortChange() {
    var select = document.getElementById('sortBy');
    currentSortBy = select.value;
    UIController.renderTransactions(AppState.getTransactions(), currentSortBy);
  }

  function handleCategorySubmit(e) {
    e.preventDefault();
    var input = document.getElementById('newCategory');
    var name = input.value.trim();
    var errorEl = document.getElementById('newCategory-error');

    if (!name) {
      errorEl.textContent = 'Category name is required';
      errorEl.classList.add('visible');
      return;
    }

    errorEl.textContent = '';
    errorEl.classList.remove('visible');

    AppState.addCategory({
      name: name,
      color: nextCategoryColor(),
      isDefault: false
    });
    StorageModule.saveCategories(AppState.getCategories());
    UIController.renderCategoryOptions(AppState.getCategories());
    input.value = '';
  }

  function handleSettingsSubmit(e) {
    e.preventDefault();
    var input = document.getElementById('spendingLimit');
    var val = input.value.trim();
    var limit = val ? parseFloat(val) : null;

    AppState.updateSettings({ spendingLimit: limit });
    StorageModule.saveSettings(AppState.getSettings());
    input.value = '';
    lastDataSignature = '';
    UIController.updateBalance(AppState.calculateBalance(), limit);
  }

  var lastDataSignature = '';

  function getDataSignature() {
    var txs = AppState.getTransactions();
    var limit = AppState.getSettings().spendingLimit;
    return txs.map(function(t) { return t.id + ':' + t.amount + ':' + t.category; }).join('|') + '|sort:' + currentSortBy + '|limit:' + limit;
  }

  function renderAll() {
    var signature = getDataSignature();
    if (signature === lastDataSignature) return;
    lastDataSignature = signature;

    var transactions = AppState.getTransactions();
    var settings = AppState.getSettings();
    var balance = AppState.calculateBalance();
    var byCategory = AppState.aggregateByCategory();
    var byMonth = AppState.aggregateByMonth();

    UIController.renderTransactions(transactions, currentSortBy);
    UIController.updateBalance(balance, settings.spendingLimit || null);
    UIController.updateChart(byCategory);
    UIController.renderMonthSummary(byMonth);
  }

  return {
    bindFormSubmit: function() {
      var form = document.getElementById('transactionForm');
      form.addEventListener('submit', handleTransactionSubmit);
    },

    bindDeleteButtons: function() {
      var list = document.getElementById('transactionList');
      list.addEventListener('click', handleDeleteClick);
    },

    bindThemeToggle: function() {
      var toggle = document.getElementById('themeToggle');
      toggle.addEventListener('click', handleThemeToggle);
    },

    bindSortChange: function() {
      var select = document.getElementById('sortBy');
      select.addEventListener('change', handleSortChange);
    },

    bindCategoryForm: function() {
      var form = document.getElementById('categoryForm');
      form.addEventListener('submit', handleCategorySubmit);
    },

    bindSettingsForm: function() {
      var form = document.getElementById('settingsForm');
      form.addEventListener('submit', handleSettingsSubmit);
    },

    bindAll: function() {
      EventHandlers.bindFormSubmit();
      EventHandlers.bindDeleteButtons();
      EventHandlers.bindThemeToggle();
      EventHandlers.bindSortChange();
      EventHandlers.bindCategoryForm();
      EventHandlers.bindSettingsForm();
    },

    renderAll: renderAll
  };
})();

// ============================================
// INITIALIZATION
// ============================================

function detectPreferredTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function init() {
  var transactions = StorageModule.loadTransactions() || [];
  var categories = StorageModule.loadCategories() || DEFAULT_CATEGORIES.slice();
  var settings = StorageModule.loadSettings() || Object.assign({}, DEFAULT_SETTINGS, { theme: detectPreferredTheme() });

  AppState.initialize(transactions, categories, settings);
  initColorCounter();

  var theme = settings.theme || detectPreferredTheme();
  document.documentElement.setAttribute('data-theme', theme);
  var toggle = document.getElementById('themeToggle');
  toggle.setAttribute('aria-checked', theme === 'dark');
  toggle.classList.toggle('active', theme === 'dark');

  UIController.initChart();
  UIController.renderCategoryOptions(AppState.getCategories());

  EventHandlers.bindAll();
  EventHandlers.renderAll();
}

// Run on DOMContentLoaded
document.addEventListener('DOMContentLoaded', init);
