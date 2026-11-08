// ==========================================================================
// CUKRÁŘSTVÍ MADEL - KOMPLETNÍ OBJEDNÁVKOVÝ & VÝROBNÍ SYSTÉM 2.0
// DOLNÍ BENEŠOV - ZÁBŘEH
// ==========================================================================

(function () {
  'use strict';

  // ------------------------------------------------------------------------
  // 1. GLOBÁLNÍ STAV APLIKACE & UŽIVATELSKÁ RELACE
  // ------------------------------------------------------------------------
  let allProducts = [];
  let allOrders = [];
  let calendarCapacities = {};
  
  // Uživatelská relace (Uloženo v localStorage)
  let currentUser = JSON.parse(localStorage.getItem('madel_current_user') || 'null') || {
    role: 'customer', // 'customer' | 'prodavačka' | 'admin' | 'cukrářka'
    name: 'Zákazník z webu',
    username: null
  };

  // Režim dotazníku: 'customer' (zákazník) nebo 'clerk' (prodavačka)
  let currentFormMode = currentUser.role === 'customer' ? 'customer' : 'clerk';

  // Vybrané zákusky v dotazníku (Pole objektů: { id, name, qty })
  let orderDessertItems = [];

  // Kalendář stav
  let calCurrentYear = 2026;
  let calCurrentMonth = 10; // 0-indexed, 10 = Listopad (November)
  let selectedPickupDate = '';
  let isRecaptchaVerified = false;
  let uploadedCakeImageUrl = '';

  // ------------------------------------------------------------------------
  // 2. DOM ELEMENTY
  // ------------------------------------------------------------------------
  // Navigace & Strany
  const navTabs = document.querySelectorAll('.sys-nav-tab');
  const staffOnlyTabs = document.querySelectorAll('.staff-only-tab');
  const brandLogoBtn = document.getElementById('brand-logo-btn');
  const sysPages = document.querySelectorAll('.sys-page');
  const tabPendingBadge = document.getElementById('tab-pending-badge');
  const authToggleBtn = document.getElementById('auth-toggle-btn');
  const currentUserNameEl = document.getElementById('current-user-name');
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toast-msg');
  const toastIcon = document.getElementById('toast-icon');

  // Strana 1: Objednávkový dotazník
  const modeSwitcherContainer = document.getElementById('mode-switcher-container');
  const modeCustomerBtn = document.getElementById('mode-customer-btn');
  const modeClerkBtn = document.getElementById('mode-clerk-btn');
  const clerkModeBanner = document.getElementById('clerk-mode-banner');
  const clerkPriceField = document.getElementById('clerk-price-field');
  const formMainHeading = document.getElementById('form-main-heading');
  const formSubHeading = document.getElementById('form-sub-heading');
  const orderMainForm = document.getElementById('order-main-form');
  const orderSuccessScreen = document.getElementById('order-success-screen');
  const successOrderNum = document.getElementById('success-order-num');
  const successNewOrderBtn = document.getElementById('success-new-order-btn');

  // Formulářová pole
  const formCustomer = document.getElementById('form-customer');
  const formPhone = document.getElementById('form-phone');
  const formEmail = document.getElementById('form-email');
  const formPrice = document.getElementById('form-price');
  const productTypeRadios = document.querySelectorAll('input[name="product_type"]');
  const sectionDessertsBox = document.getElementById('section-desserts-box');
  const sectionCakeBox = document.getElementById('section-cake-box');

  // Zákusky v dotazníku
  const dessertsItemsList = document.getElementById('desserts-items-list');
  const dessertsTotalSummary = document.getElementById('desserts-total-summary');
  const dessertSearchInput = document.getElementById('dessert-search-input');
  const dessertDropdownResults = document.getElementById('dessert-dropdown-results');
  const dessertQtyInput = document.getElementById('dessert-qty-input');
  const addDessertBtn = document.getElementById('add-dessert-btn');

  // Dortová pole
  const cakePortions = document.getElementById('cake-portions');
  const cakeShape = document.getElementById('cake-shape');
  const cakeSponge = document.getElementById('cake-sponge');
  const cakeFilling = document.getElementById('cake-filling');
  const cakeFinish = document.getElementById('cake-finish');
  const cakeEdiblePaper = document.getElementById('cake-edible-paper');
  const ediblePaperConditional = document.getElementById('edible-paper-conditional');
  const cakeEdibleStyle = document.getElementById('cake-edible-style');
  const cakeImageFile = document.getElementById('cake-image-file');
  const cakeImagePreviewContainer = document.getElementById('cake-image-preview-container');
  const cakeImagePreview = document.getElementById('cake-image-preview');
  const cakeDiet = document.getElementById('cake-diet');
  const cakeDecor = document.getElementById('cake-decor');
  const cakeDescription = document.getElementById('cake-description');

  // Kalendář
  const calMonthTitle = document.getElementById('cal-month-title');
  const calDaysGrid = document.getElementById('cal-days-grid');
  const calPrevMonthBtn = document.getElementById('cal-prev-month');
  const calNextMonthBtn = document.getElementById('cal-next-month');
  const calAlertBox = document.getElementById('cal-alert-box');
  const selectedDateInput = document.getElementById('selected-date-input');
  const selectedTimeInput = document.getElementById('selected-time-input');
  const recaptchaSection = document.getElementById('recaptcha-section');
  const recaptchaCheck = document.getElementById('recaptcha-check');
  const recaptchaError = document.getElementById('recaptcha-error');
  const submitOrderBtn = document.getElementById('submit-order-btn');

  // Strana 2: Databáze
  const dbRefreshBtn = document.getElementById('db-refresh-btn');
  const dbNewOrderGoto = document.getElementById('db-new-order-goto');
  const filterStatus = document.getElementById('filter-status');
  const filterPickupDate = document.getElementById('filter-pickup-date');
  const filterEmployee = document.getElementById('filter-employee');
  const filterDiet = document.getElementById('filter-diet');
  const filterSearch = document.getElementById('filter-search');
  const dbResetFilters = document.getElementById('db-reset-filters');
  const dbResultsCount = document.getElementById('db-results-count');
  const dbOrdersContainer = document.getElementById('db-orders-container');

  // Strana 3: Rozpis zákusků
  const prepWeekSelect = document.getElementById('prep-week-select');
  const printDessertsBtn = document.getElementById('print-desserts-btn');
  const prepDessertsRows = document.getElementById('prep-desserts-rows');
  const prepTotalTypes = document.getElementById('prep-total-types');
  const prepTotalPieces = document.getElementById('prep-total-pieces');

  // Strana 4: Rozpis dortů
  const prepCakesWeekSelect = document.getElementById('prep-cakes-week-select');
  const printCakesBtn = document.getElementById('print-cakes-btn');
  const prepCakesRows = document.getElementById('prep-cakes-rows');
  const prepTotalCakes = document.getElementById('prep-total-cakes');

  // Strana 5: Katalog
  const catSearch = document.getElementById('cat-search');
  const catTags = document.getElementById('cat-tags');
  const catCountBadge = document.getElementById('cat-count-badge');
  const catalogGrid = document.getElementById('catalog-grid');

  // Modály
  const loginModal = document.getElementById('login-modal');
  const closeLoginBtn = document.getElementById('close-login-btn');
  const loginUserSelect = document.getElementById('login-user-select');
  const loginPinInput = document.getElementById('login-pin-input');
  const loginSubmitBtn = document.getElementById('login-submit-btn');
  const loginErrorMsg = document.getElementById('login-error-msg');

  const historyModal = document.getElementById('history-modal');
  const closeHistoryBtn = document.getElementById('close-history-btn');
  const historyModalTitle = document.getElementById('history-modal-title');
  const historyModalContent = document.getElementById('history-modal-content');

  // ------------------------------------------------------------------------
  // 3. POMOCNÉ FUNKCE
  // ------------------------------------------------------------------------
  function showToast(msg, icon = '✅', duration = 3500) {
    if (!toast) return;
    toastMsg.textContent = msg;
    toastIcon.textContent = icon;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, duration);
  }

  function formatCzechDate(dateStr) {
    if (!dateStr) return '—';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parseInt(parts[2], 10)}.${parseInt(parts[1], 10)}.${parts[0]}`;
    }
    return dateStr;
  }

  function getDayNameCzech(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T12:00:00');
    const days = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'];
    return days[d.getDay()] || '';
  }

  function getStatusBadgeHtml(status) {
    const s = (status || 'nevyřízeno').toLowerCase();
    switch (s) {
      case 'nevyřízeno':
        return `<span class="status-badge status-nevyrizeno">⏳ nevyřízeno</span>`;
      case 'platné':
        return `<span class="status-badge status-platne">✓ platné</span>`;
      case 'vyzvednuté':
        return `<span class="status-badge status-vyzvednute">📦 vyzvednuté</span>`;
      case 'neplatné':
        return `<span class="status-badge status-neplatne">✕ neplatné</span>`;
      case 'nevyzvednuté':
        return `<span class="status-badge status-nevyzvednute">⚠️ nevyzvednuté</span>`;
      default:
        return `<span class="status-badge status-nevyrizeno">${escapeHtml(status)}</span>`;
    }
  }

  function escapeHtml(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ------------------------------------------------------------------------
  // 4. AUTENTIZACE & UŽIVATELSKÁ OPRÁVNĚNÍ
  // ------------------------------------------------------------------------
  function updateAuthUI() {
    if (currentUser.role === 'customer') {
      currentUserNameEl.textContent = 'Zákazník z webu';
      currentUserNameEl.className = 'font-bold text-white bg-white/10 px-2.5 py-0.5 rounded-full border border-white/20';
      authToggleBtn.textContent = 'Přihlásit personál';

      // Zákazník vidí pouze 1 (Dotazník) a Katalog (Mainpage) dle zadání:
      staffOnlyTabs.forEach(tab => tab.classList.add('hidden'));
      if (modeSwitcherContainer) modeSwitcherContainer.classList.add('hidden');

      // Pokud byl uživatel na interní straně, přesměrovat na katalog
      const activeTab = document.querySelector('.sys-nav-tab.active');
      if (activeTab && ['page-2', 'page-3', 'page-4'].includes(activeTab.dataset.page)) {
        showPage('page-catalog');
      }
    } else {
      let roleLabel = 'Prodavačka';
      let badgeClass = 'bg-amber-600/30 border-amber-400 text-amber-200';
      if (currentUser.role === 'admin') {
        roleLabel = 'Admin';
        badgeClass = 'bg-rose-600/30 border-rose-400 text-rose-200';
      } else if (currentUser.role === 'cukrářka') {
        roleLabel = 'Cukrářka';
        badgeClass = 'bg-blue-600/30 border-blue-400 text-blue-200';
      }
      currentUserNameEl.textContent = `${currentUser.name} (${roleLabel})`;
      currentUserNameEl.className = `font-bold px-2.5 py-0.5 rounded-full border ${badgeClass}`;
      authToggleBtn.textContent = 'Odhlásit se';

      // Přihlášený personál vidí všechny interní strany (Databáze, Rozpis zákusků, Rozpis dortů)
      staffOnlyTabs.forEach(tab => tab.classList.remove('hidden'));
      if (modeSwitcherContainer) modeSwitcherContainer.classList.remove('hidden');
    }

    // Nastavení výchozího režimu dotazníku dle role
    if (currentUser.role === 'prodavačka' || currentUser.role === 'admin') {
      setFormMode('clerk');
    } else {
      setFormMode('customer');
    }

    // Aktualizace databáze a akčních tlačítek
    renderOrdersList();
  }

  function setFormMode(mode) {
    currentFormMode = mode;
    const reqStars = document.querySelectorAll('.req-star');
    const cakeReqStars = document.querySelectorAll('.cake-req-star');

    if (mode === 'clerk') {
      modeClerkBtn.className = 'px-3.5 py-2 rounded-xl bg-[#3B2820] text-white shadow-xs transition';
      modeCustomerBtn.className = 'px-3.5 py-2 rounded-xl text-stone-600 hover:text-black hover:bg-stone-200 transition';
      clerkModeBanner.classList.remove('hidden');
      clerkPriceField.classList.remove('hidden');
      recaptchaSection.classList.add('hidden');
      formMainHeading.textContent = 'Objednávka na prodejně (Prodavačka)';
      formSubHeading.textContent = 'Režim pro personál: všechny položky jsou nepovinné, cena je interní a zakázka je okamžitě zařazena jako PLATNÉ.';
      submitOrderBtn.innerHTML = `<span>Uložit jako PLATNOU zakázku</span><span>✓</span>`;
      
      // Prodejní režim: položky jsou nepovinné
      reqStars.forEach(s => s.classList.add('hidden'));
      cakeReqStars.forEach(s => s.classList.add('hidden'));
      formCustomer.removeAttribute('required');
      formPhone.removeAttribute('required');
      selectedDateInput.removeAttribute('required');
      selectedTimeInput.removeAttribute('required');
    } else {
      modeCustomerBtn.className = 'px-3.5 py-2 rounded-xl bg-[#3B2820] text-white shadow-xs transition';
      modeClerkBtn.className = 'px-3.5 py-2 rounded-xl text-stone-600 hover:text-black hover:bg-stone-200 transition flex items-center gap-1.5';
      clerkModeBanner.classList.add('hidden');
      clerkPriceField.classList.add('hidden');
      recaptchaSection.classList.remove('hidden');
      formMainHeading.textContent = 'Objednávkový dotazník';
      formSubHeading.textContent = 'Vyplňte prosím údaje pro objednání dortu nebo zákusků.';
      submitOrderBtn.innerHTML = `<span>Nezávazně objednat</span><span>→</span>`;

      // Zákaznický režim: povinné položky dle zadání
      reqStars.forEach(s => s.classList.remove('hidden'));
      cakeReqStars.forEach(s => s.classList.remove('hidden'));
      formCustomer.setAttribute('required', 'required');
      formPhone.setAttribute('required', 'required');
      selectedDateInput.setAttribute('required', 'required');
      selectedTimeInput.setAttribute('required', 'required');
    }
  }

  modeCustomerBtn.addEventListener('click', () => setFormMode('customer'));
  modeClerkBtn.addEventListener('click', () => {
    if (currentUser.role === 'customer') {
      // Zákazník se snaží přepnout na režim prodavačky -> vyzvat k přihlášení
      openLoginModal();
    } else {
      setFormMode('clerk');
    }
  });

  // Přihlašovací okno
  function openLoginModal() {
    loginModal.classList.remove('hidden');
    setTimeout(() => loginModal.classList.remove('opacity-0'), 10);
    loginPinInput.value = '';
    loginErrorMsg.classList.add('hidden');
    loginPinInput.focus();
  }

  function closeLoginModal() {
    loginModal.classList.add('opacity-0');
    setTimeout(() => loginModal.classList.add('hidden'), 200);
  }

  authToggleBtn.addEventListener('click', () => {
    if (currentUser.role === 'customer') {
      openLoginModal();
    } else {
      // Odhlášení
      currentUser = {
        role: 'customer',
        name: 'Zákazník z webu',
        username: null
      };
      localStorage.removeItem('madel_current_user');
      updateAuthUI();
      showToast('Byli jste odhlášeni. Systém je v režimu zákazníka.', 'ℹ️');
    }
  });

  closeLoginBtn.addEventListener('click', closeLoginModal);
  loginModal.addEventListener('click', (e) => {
    if (e.target === loginModal) closeLoginModal();
  });

  loginSubmitBtn.addEventListener('click', handleLogin);
  loginPinInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleLogin();
  });

  async function handleLogin() {
    const username = loginUserSelect.value;
    const pin = loginPinInput.value.trim();

    if (!pin) {
      loginErrorMsg.textContent = 'Zadejte prosím PIN kód.';
      loginErrorMsg.classList.remove('hidden');
      return;
    }

    try {
      let loggedUser = null;
      try {
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, pin })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.user) {
            loggedUser = data.user;
          }
        }
      } catch (e) {
        // Fallback pro statický GitHub Pages hosting
      }

      // Offline / GitHub Pages ověření PINů
      if (!loggedUser) {
        const localPins = {
          'ester': { pin: '1111', name: 'Ester', role: 'prodavačka' },
          'lucie': { pin: '2222', name: 'Lucie', role: 'prodavačka' },
          'marie': { pin: '3333', name: 'Marie', role: 'cukrářka' },
          'admin': { pin: '1234', name: 'Radka Magerová', role: 'admin' }
        };
        const target = localPins[username.toLowerCase()];
        if (target && target.pin === pin) {
          loggedUser = { id: username, username, name: target.name, role: target.role };
        }
      }

      if (loggedUser) {
        currentUser = {
          id: loggedUser.id || username,
          username: loggedUser.username || username,
          name: loggedUser.name,
          role: loggedUser.role
        };
        localStorage.setItem('madel_current_user', JSON.stringify(currentUser));
        closeLoginModal();
        updateAuthUI();
        showToast(`Přihlášen(a): ${currentUser.name} (${currentUser.role})`, '👋');
      } else {
        loginErrorMsg.textContent = 'Chybný PIN kód.';
        loginErrorMsg.classList.remove('hidden');
      }
    } catch (err) {
      loginErrorMsg.textContent = 'Chyba připojení k serveru.';
      loginErrorMsg.classList.remove('hidden');
    }
  }

  // ------------------------------------------------------------------------
  // 5. NAVIGACE MEZI STRANAMI SYSTÉMU
  // ------------------------------------------------------------------------
  function showPage(targetPageId) {
    sysPages.forEach(p => {
      if (p.id === targetPageId) {
        p.classList.remove('hidden');
      } else {
        p.classList.add('hidden');
      }
    });

    navTabs.forEach(t => {
      if (t.dataset.page === targetPageId) {
        t.classList.add('active');
      } else {
        t.classList.remove('active');
      }
    });

    // Akce při přechodu na stranu
    if (targetPageId === 'page-2') {
      loadOrders();
    } else if (targetPageId === 'page-3') {
      renderDessertsPreparationSheet();
    } else if (targetPageId === 'page-4') {
      renderCakesPreparationSheet();
    } else if (targetPageId === 'page-catalog') {
      renderCatalog();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      showPage(tab.dataset.page);
    });
  });

  // Odkazy "Otevřít objednávkový dotazník"
  document.querySelectorAll('.goto-order-btn').forEach(btn => {
    btn.addEventListener('click', () => showPage('page-1'));
  });
  if (dbNewOrderGoto) {
    dbNewOrderGoto.addEventListener('click', () => showPage('page-1'));
  }
  if (brandLogoBtn) {
    brandLogoBtn.addEventListener('click', (e) => {
      e.preventDefault();
      showPage('page-catalog');
    });
  }

  // ------------------------------------------------------------------------
  // 6. STRANA 1: FORMULÁŘ & INTERAKTIVITA
  // ------------------------------------------------------------------------
  // A) Přepínání typu výrobku (dort / zakusek / kombinace)
  productTypeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      const val = e.target.value;
      if (val === 'dort') {
        sectionCakeBox.classList.remove('hidden');
        sectionDessertsBox.classList.add('hidden');
      } else if (val === 'zakusek') {
        sectionCakeBox.classList.add('hidden');
        sectionDessertsBox.classList.remove('hidden');
      } else { // kombinace
        sectionCakeBox.classList.remove('hidden');
        sectionDessertsBox.classList.remove('hidden');
      }
    });
  });

  // B) Jedlý papír ANO / NE toggle
  cakeEdiblePaper.addEventListener('change', () => {
    if (cakeEdiblePaper.value === 'ano') {
      ediblePaperConditional.classList.remove('hidden');
    } else {
      ediblePaperConditional.classList.add('hidden');
    }
  });

  // C) Vložení obrázku dortu (JPG / PNG)
  cakeImageFile.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function (evt) {
      const base64Data = evt.target.result;
      cakeImagePreview.src = base64Data;
      cakeImagePreviewContainer.classList.remove('hidden');

      // Automatické odeslání na server pro uložení
      try {
        const res = await fetch('/api/upload-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64Data, filename: file.name })
        });
        const d = await res.json();
        if (d.success && d.url) {
          uploadedCakeImageUrl = d.url;
        } else {
          uploadedCakeImageUrl = base64Data; // fallback
        }
      } catch (err) {
        uploadedCakeImageUrl = base64Data;
      }
    };
    reader.readAsDataURL(file);
  });

  // D) Zákusky: Vyhledávání a přidávání ze 114 stálých druhů
  dessertSearchInput.addEventListener('input', () => {
    const q = dessertSearchInput.value.trim().toLowerCase();
    if (!q) {
      dessertDropdownResults.classList.add('hidden');
      dessertDropdownResults.innerHTML = '';
      return;
    }

    const matches = allProducts.filter(p => 
      p.title.toLowerCase().includes(q) || 
      (p.category && p.category.toLowerCase().includes(q))
    ).slice(0, 10);

    if (matches.length === 0) {
      dessertDropdownResults.innerHTML = `<div class="p-3 text-xs text-stone-500 text-center">Žádný zákusek neodpovídá zadání</div>`;
      dessertDropdownResults.classList.remove('hidden');
      return;
    }

    dessertDropdownResults.innerHTML = matches.map(p => `
      <div class="p-2.5 hover:bg-[#FAF7F2] cursor-pointer flex items-center justify-between border-b border-stone-100 last:border-0 select-dessert-item" data-id="${p.id}" data-title="${escapeHtml(p.title)}">
        <div class="flex items-center gap-2">
          <img src="${p.localImage || 'images/logo-madel.png'}" class="w-8 h-8 rounded-lg object-cover" onerror="this.onerror=null; this.src='images/logo-madel.png';">
          <div>
            <span class="font-bold text-xs text-[#3B2820] block">${escapeHtml(p.title)}</span>
            <span class="text-[10px] text-stone-500">${escapeHtml(p.category || 'Zákusek')}</span>
          </div>
        </div>
        <span class="text-xs text-[#AA821C] font-semibold">Vybrat +</span>
      </div>
    `).join('');

    dessertDropdownResults.classList.remove('hidden');

    // Kliknutí na položku v dropdownu
    dessertDropdownResults.querySelectorAll('.select-dessert-item').forEach(el => {
      el.addEventListener('click', () => {
        const id = parseInt(el.dataset.id, 10);
        const title = el.dataset.title;
        dessertSearchInput.value = title;
        dessertSearchInput.dataset.selectedId = id;
        dessertDropdownResults.classList.add('hidden');
        dessertQtyInput.focus();
      });
    });
  });

  // Zavřít dropdown při kliknutí mimo
  document.addEventListener('click', (e) => {
    if (!dessertSearchInput.contains(e.target) && !dessertDropdownResults.contains(e.target)) {
      dessertDropdownResults.classList.add('hidden');
    }
  });

  // Tlačítko "+ Přidat" zákusek do seznamu
  addDessertBtn.addEventListener('click', () => {
    const name = dessertSearchInput.value.trim();
    const qty = parseInt(dessertQtyInput.value, 10) || 1;
    const selectedId = dessertSearchInput.dataset.selectedId || null;

    if (!name) {
      dessertSearchInput.focus();
      showToast('Zadejte nebo vyberte prosím zákusek ze seznamu.', '⚠️');
      return;
    }

    addDessertItemToOrder(name, qty, selectedId);
    dessertSearchInput.value = '';
    dessertSearchInput.removeAttribute('data-selected-id');
    dessertQtyInput.value = '10';
  });

  function addDessertItemToOrder(name, qty, id = null) {
    const existing = orderDessertItems.find(item => item.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      existing.qty += qty;
    } else {
      orderDessertItems.push({
        id: id || Math.floor(Math.random() * 1000) + 200,
        name: name,
        qty: qty
      });
    }
    renderOrderDessertsList();
    showToast(`Přidáno: ${qty}x ${name}`, '🥐');
  }

  function renderOrderDessertsList() {
    if (orderDessertItems.length === 0) {
      dessertsItemsList.innerHTML = `
        <div class="p-3 text-center text-xs text-stone-400 italic bg-white rounded-xl border border-dashed border-stone-200">
          Zatím jste nepřidali žádný zákusek. Vyberte zákusek a množství výše.
        </div>
      `;
      dessertsTotalSummary.textContent = '0 položek';
      return;
    }

    let totalPieces = 0;
    dessertsItemsList.innerHTML = orderDessertItems.map((item, idx) => {
      totalPieces += item.qty;
      return `
        <div class="flex items-center justify-between p-2.5 bg-white rounded-xl border border-stone-200 shadow-2xs">
          <div class="flex items-center gap-2">
            <span class="w-6 h-6 rounded-full bg-[#FAF7F2] text-[#AA821C] text-xs font-bold flex items-center justify-center">
              ${idx + 1}
            </span>
            <span class="font-bold text-xs text-[#3B2820]">${escapeHtml(item.name)}</span>
          </div>
          <div class="flex items-center gap-3">
            <div class="flex items-center border border-stone-200 rounded-lg overflow-hidden bg-stone-50">
              <button type="button" class="px-2 py-1 text-xs hover:bg-stone-200" onclick="window.changeDessertQty(${idx}, -1)">-</button>
              <span class="px-3 py-1 font-bold text-xs">${item.qty} ks</span>
              <button type="button" class="px-2 py-1 text-xs hover:bg-stone-200" onclick="window.changeDessertQty(${idx}, 1)">+</button>
            </div>
            <button type="button" class="text-rose-500 hover:text-rose-700 text-xs px-2" onclick="window.removeDessertItem(${idx})" title="Odebrat">
              ✕
            </button>
          </div>
        </div>
      `;
    }).join('');

    dessertsTotalSummary.textContent = `${orderDessertItems.length} druhů (${totalPieces} ks)`;
  }

  // Globální exposice pro onclick v řádcích
  window.changeDessertQty = function (idx, delta) {
    if (orderDessertItems[idx]) {
      orderDessertItems[idx].qty += delta;
      if (orderDessertItems[idx].qty <= 0) {
        orderDessertItems.splice(idx, 1);
      }
      renderOrderDessertsList();
    }
  };

  window.removeDessertItem = function (idx) {
    if (orderDessertItems[idx]) {
      orderDessertItems.splice(idx, 1);
      renderOrderDessertsList();
    }
  };

  // E) Interaktivní Kalendář (Zelená / Žlutá / Červená dle specifikace)
  const MONTH_NAMES = [
    'Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen',
    'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec'
  ];

  async function loadCalendarCapacities() {
    try {
      let loaded = false;
      try {
        const res = await fetch('/api/calendar-capacity');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data) {
            calendarCapacities = data.data;
            loaded = true;
          }
        }
      } catch (e) {}

      if (!loaded) {
        // Fallback pro GitHub Pages
        const resJson = await fetch('calendar_capacity.json');
        if (resJson.ok) {
          calendarCapacities = await resJson.json();
        }
      }
    } catch (e) {
      console.warn('Nelze načíst calendar-capacity:', e);
    }
    renderCalendar();
  }

  function renderCalendar() {
    calMonthTitle.textContent = `${MONTH_NAMES[calCurrentMonth]} ${calCurrentYear}`;
    calDaysGrid.innerHTML = '';

    const firstDayOfMonth = new Date(calCurrentYear, calCurrentMonth, 1);
    const lastDayOfMonth = new Date(calCurrentYear, calCurrentMonth + 1, 0);
    const totalDays = lastDayOfMonth.getDate();

    // Den v týdnu pro 1. den měsíce (0 = Po, 6 = Ne v ČR)
    let startDay = firstDayOfMonth.getDay() - 1;
    if (startDay < 0) startDay = 6;

    // Prázdná pole před 1. dnem
    for (let i = 0; i < startDay; i++) {
      const emptyCell = document.createElement('div');
      emptyCell.className = 'cal-day-cell cal-day-muted';
      calDaysGrid.appendChild(emptyCell);
    }

    // Buňky pro dny v měsíci
    for (let day = 1; day <= totalDays; day++) {
      const cell = document.createElement('div');
      const dayDate = new Date(calCurrentYear, calCurrentMonth, day);
      const dayOfWeek = dayDate.getDay(); // 0 = Ne, 1 = Po, ...
      const dateStr = `${calCurrentYear}-${String(calCurrentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      cell.textContent = day;
      cell.dataset.date = dateStr;

      // PONDĚLÍ JE ZAVŘENO (dle otevírací doby cukrárny)
      if (dayOfWeek === 1) {
        cell.className = 'cal-day-cell cal-day-muted';
        cell.title = 'V pondělí máme zavřeno';
      } else {
        // Zjištění barvy termínu: zelená, žlutá, červená
        const customStatus = calendarCapacities[dateStr];
        let colorClass = 'cal-day-green';
        let statusTitle = 'Volný termín';

        if (customStatus === 'red') {
          colorClass = 'cal-day-red';
          statusTitle = 'Termín obsazen';
        } else if (customStatus === 'yellow') {
          colorClass = 'cal-day-yellow';
          statusTitle = 'Vysoké vytížení';
        }

        cell.className = `cal-day-cell ${colorClass}`;
        cell.title = `${formatCzechDate(dateStr)}: ${statusTitle}`;

        if (dateStr === selectedPickupDate) {
          cell.classList.add('selected');
        }

        cell.addEventListener('click', () => handleCalendarDayClick(dateStr, customStatus));
      }

      calDaysGrid.appendChild(cell);
    }
  }

  calPrevMonthBtn.addEventListener('click', () => {
    calCurrentMonth--;
    if (calCurrentMonth < 0) {
      calCurrentMonth = 11;
      calCurrentYear--;
    }
    renderCalendar();
  });

  calNextMonthBtn.addEventListener('click', () => {
    calCurrentMonth++;
    if (calCurrentMonth > 11) {
      calCurrentMonth = 0;
      calCurrentYear++;
    }
    renderCalendar();
  });

  function handleCalendarDayClick(dateStr, capacityStatus) {
    selectedPickupDate = dateStr;
    selectedDateInput.value = dateStr;

    // Aktualizace vizuálního výběru
    document.querySelectorAll('.cal-day-cell').forEach(c => {
      if (c.dataset.date === dateStr) {
        c.classList.add('selected');
      } else {
        c.classList.remove('selected');
      }
    });

    // PŘESNÉ CHOVÁNÍ DLE ZADÁNÍ:
    // - zelené: všechny ty, které nejsou červené ani žluté
    // - žluté: po zakliknutí zákazníkem "upozornění: na tento termín máme zaznamenáno velké množství objednávek, je možné, že Vám nebude vyhověno"
    // - červené: po zakliknutí: "omlouváme se, ale na tento termín již objednávky na dorty nepřijímáme." Po zadání červeného termínu zákazníka nepustí tlačítko "nezávazně objednat"

    if (capacityStatus === 'red') {
      calAlertBox.className = 'p-4 rounded-xl text-xs font-semibold mb-4 bg-rose-50 border border-rose-300 text-rose-900 block';
      calAlertBox.innerHTML = `
        <div class="flex items-center gap-2">
          <span class="text-lg">🚫</span>
          <div>
            <strong>Omlouváme se, ale na tento termín již objednávky na dorty nepřijímáme.</strong>
            <p class="mt-0.5 text-[11px] text-rose-700">Kapacita výrobny na tento den je zcela vyčerpána. Zvolte prosím jiný volný (zelený) termín.</p>
          </div>
        </div>
      `;

      if (currentFormMode === 'customer') {
        submitOrderBtn.disabled = true;
        submitOrderBtn.classList.add('opacity-50', 'cursor-not-allowed');
        submitOrderBtn.title = 'Na červený termín nelze odeslat objednávku.';
      } else {
        // Prodavačka může v nouzi uložit, ale je varována
        submitOrderBtn.disabled = false;
        submitOrderBtn.classList.remove('opacity-50', 'cursor-not-allowed');
      }
    } else if (capacityStatus === 'yellow') {
      calAlertBox.className = 'p-4 rounded-xl text-xs font-semibold mb-4 bg-amber-50 border border-amber-300 text-amber-900 block';
      calAlertBox.innerHTML = `
        <div class="flex items-center gap-2">
          <span class="text-lg">⚠️</span>
          <div>
            <strong>Upozornění: na tento termín máme zaznamenáno velké množství objednávek, je možné, že Vám nebude vyhověno.</strong>
            <p class="mt-0.5 text-[11px] text-amber-800">Po odeslání objednávky Vás budeme kontaktovat s potvrzením výrobní kapacity.</p>
          </div>
        </div>
      `;
      submitOrderBtn.disabled = false;
      submitOrderBtn.classList.remove('opacity-50', 'cursor-not-allowed');
      submitOrderBtn.title = '';
    } else {
      // Zelený termín
      calAlertBox.className = 'hidden';
      calAlertBox.innerHTML = '';
      submitOrderBtn.disabled = false;
      submitOrderBtn.classList.remove('opacity-50', 'cursor-not-allowed');
      submitOrderBtn.title = '';
    }
  }

  // F) reCAPTCHA Mock UI
  recaptchaCheck.addEventListener('click', () => {
    isRecaptchaVerified = !isRecaptchaVerified;
    if (isRecaptchaVerified) {
      recaptchaCheck.classList.add('checked');
      recaptchaCheck.innerHTML = '✓';
      recaptchaError.classList.add('hidden');
    } else {
      recaptchaCheck.classList.remove('checked');
      recaptchaCheck.innerHTML = '';
    }
  });

  // G) ODESLÁNÍ FORMULÁŘE
  orderMainForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // 1. Validace reCAPTCHA v zákaznickém režimu
    if (currentFormMode === 'customer' && !isRecaptchaVerified) {
      recaptchaError.classList.remove('hidden');
      recaptchaSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // 2. Kontrola červeného termínu v zákaznickém režimu
    if (currentFormMode === 'customer' && calendarCapacities[selectedDateInput.value] === 'red') {
      showToast('Na vybraný červený termín již nelze objednávku odeslat.', '🚫');
      return;
    }

    // 3. Sestavení dat objednávky
    const productType = document.querySelector('input[name="product_type"]:checked').value;
    const hasCake = productType === 'dort' || productType === 'kombinace';
    const hasDesserts = productType === 'zakusek' || productType === 'kombinace';

    // Kontrola, zda zákazník zadal aspoň zákusek nebo dort
    if (hasDesserts && orderDessertItems.length === 0 && !hasCake) {
      showToast('Vyberte prosím alespoň jeden zákusek do objednávky.', '⚠️');
      sectionDessertsBox.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    let cakePayload = null;
    if (hasCake) {
      cakePayload = {
        portions: cakePortions.value,
        shape: cakeShape.value,
        sponge: cakeSponge.value,
        filling: cakeFilling.value,
        finish: cakeFinish.value,
        edible_paper: cakeEdiblePaper.value,
        edible_paper_style: cakeEdiblePaper.value === 'ano' ? (cakeEdibleStyle.value.trim() || 'Dle domluvy') : '',
        diet: cakeDiet.value,
        decor: cakeDecor.value.trim(),
        description: cakeDescription.value.trim(),
        image_url: uploadedCakeImageUrl || ''
      };
    }

    const payload = {
      customer: formCustomer.value.trim() || 'Zákazník',
      phone: formPhone.value.trim(),
      email: formEmail.value.trim(),
      order_type: productType,
      desserts: hasDesserts ? orderDessertItems : [],
      cake: cakePayload,
      pickup_date: selectedDateInput.value,
      pickup_time: selectedTimeInput.value || '10:00',
      price: currentFormMode === 'clerk' ? (formPrice.value.trim() || '0') : '0',
      created_by_customer: currentFormMode === 'customer',
      employee_name: currentUser.role !== 'customer' ? currentUser.name : 'Zákazník z webu',
      employee_role: currentUser.role !== 'customer' ? currentUser.role : 'customer'
    };

    submitOrderBtn.disabled = true;
    submitOrderBtn.innerHTML = `<span>Odesílám...</span>`;

    let savedOrder = null;

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Employee-Role': currentUser.role,
          'X-Employee-Name': currentUser.name
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          savedOrder = data.data;
        }
      }
    } catch (err) {
      // Offline / GitHub Pages režim
    }

    // Pokud backend neběží (GitHub Pages), uložit lokálně do localStorage
    if (!savedOrder) {
      const orderId = String(Date.now()).slice(-6);
      savedOrder = {
        ...payload,
        id: orderId,
        status: currentFormMode === 'clerk' ? 'platné' : 'nevyřízeno',
        created_at: new Date().toISOString(),
        history: [
          {
            employee: currentUser.name || 'Zákazník z webu',
            timestamp: new Date().toLocaleString('cs-CZ'),
            change_text: `Objednávka založena přes web se stavem "${currentFormMode === 'clerk' ? 'platné' : 'nevyřízeno'}"`
          }
        ]
      };
      const localOrders = JSON.parse(localStorage.getItem('madel_local_orders') || '[]');
      localOrders.unshift(savedOrder);
      localStorage.setItem('madel_local_orders', JSON.stringify(localOrders));
      allOrders.unshift(savedOrder);
    }

    if (savedOrder) {
      if (currentFormMode === 'customer') {
        // Zákaznická verze: Zobrazit děkovnou obrazovku dle specifikace
        orderMainForm.classList.add('hidden');
        orderSuccessScreen.classList.remove('hidden');
        successOrderNum.textContent = `#${savedOrder.id}`;
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        // Verze pro prodavačky: Uloženo rovnou jako platné -> toast & přechod do databáze
        showToast(`Zakázka #${savedOrder.id} byla uložena jako PLATNÉ!`, '✅');
        resetOrderForm();
        showPage('page-2');
      }

      loadOrders();
    }

    submitOrderBtn.disabled = false;
    submitOrderBtn.innerHTML = currentFormMode === 'clerk'
      ? `<span>Uložit jako PLATNOU zakázku</span><span>✓</span>`
      : `<span>Nezávazně objednat</span><span>→</span>`;
  });

  // Tlačítko na děkovné obrazovce: Zadat další objednávku
  successNewOrderBtn.addEventListener('click', () => {
    resetOrderForm();
    orderSuccessScreen.classList.add('hidden');
    orderMainForm.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  function resetOrderForm() {
    orderMainForm.reset();
    orderDessertItems = [];
    renderOrderDessertsList();
    cakeImagePreviewContainer.classList.add('hidden');
    cakeImagePreview.src = '';
    uploadedCakeImageUrl = '';
    ediblePaperConditional.classList.add('hidden');
    isRecaptchaVerified = false;
    recaptchaCheck.classList.remove('checked');
    recaptchaCheck.innerHTML = '';
    calAlertBox.classList.add('hidden');
    calAlertBox.innerHTML = '';
    selectedPickupDate = '';
    renderCalendar();
  }

  // ------------------------------------------------------------------------
  // 7. STRANA 2: DATABÁZE VŠECH OBJEDNÁVEK
  // ------------------------------------------------------------------------
  async function loadOrders() {
    try {
      dbResultsCount.textContent = 'Načítám objednávky...';
      let fetched = false;

      try {
        const res = await fetch('/api/orders');
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.data)) {
            allOrders = data.data;
            fetched = true;
          }
        }
      } catch (e) {
        // Offline / GitHub Pages
      }

      if (!fetched) {
        // Fallback pro statický GitHub Pages hosting
        try {
          const resJson = await fetch('orders.json');
          if (resJson.ok) {
            const staticOrders = await resJson.json();
            const localOrders = JSON.parse(localStorage.getItem('madel_local_orders') || '[]');
            allOrders = [...localOrders, ...staticOrders];
          }
        } catch (err) {}
      }

      renderOrdersList();
      updatePendingTabBadge();
    } catch (e) {
      dbResultsCount.textContent = 'Chyba načítání zakázek';
    }
  }

  function updatePendingTabBadge() {
    const pendingCount = allOrders.filter(o => o.status === 'nevyřízeno').length;
    if (pendingCount > 0) {
      tabPendingBadge.textContent = pendingCount;
      tabPendingBadge.classList.remove('hidden');
    } else {
      tabPendingBadge.classList.add('hidden');
    }
  }

  function renderOrdersList() {
    const statusVal = filterStatus.value.trim().toLowerCase();
    const pickupDateVal = filterPickupDate.value;
    const employeeVal = filterEmployee.value;
    const dietVal = filterDiet.value.toLowerCase();
    const searchVal = filterSearch.value.trim().toLowerCase();

    // Filtrování zakázek dle zadání
    const filtered = allOrders.filter(order => {
      // 1. Filtr dle stavu
      if (statusVal && (order.status || '').toLowerCase() !== statusVal) {
        return false;
      }

      // 2. Filtr dle data vyzvednutí
      if (pickupDateVal && order.pickup_date !== pickupDateVal) {
        return false;
      }

      // 3. Filtr dle zaměstnance
      if (employeeVal) {
        const creator = (order.created_by || '').toLowerCase();
        if (!creator.includes(employeeVal.toLowerCase())) {
          return false;
        }
      }

      // 4. Filtr dle alergenů / diety
      if (dietVal) {
        const cakeDiet = order.cake && order.cake.diet ? order.cake.diet.toLowerCase() : '';
        if (!cakeDiet.includes(dietVal)) {
          return false;
        }
      }

      // 5. Textové vyhledávání (Jméno, telefon, email, id)
      if (searchVal) {
        const hay = `${order.id} ${order.customer} ${order.phone} ${order.email} ${order.cake ? order.cake.description : ''}`.toLowerCase();
        if (!hay.includes(searchVal)) {
          return false;
        }
      }

      return true;
    });

    dbResultsCount.textContent = `Nalezeno ${filtered.length} zakázek`;

    if (filtered.length === 0) {
      dbOrdersContainer.innerHTML = `
        <div class="p-8 text-center bg-white rounded-3xl border border-stone-200">
          <span class="text-3xl block mb-2">🔍</span>
          <p class="font-bold text-stone-700">Žádné objednávky neodpovídají zadaným filtrům.</p>
          <button class="mt-3 text-xs text-[#AA821C] underline font-bold" onclick="document.getElementById('db-reset-filters').click()">
            Zrušit filtry
          </button>
        </div>
      `;
      return;
    }

    dbOrdersContainer.innerHTML = filtered.map(order => renderOrderCardHtml(order)).join('');
    attachOrderCardEvents();
  }

  function renderOrderCardHtml(order) {
    const isAdmin = currentUser.role === 'admin';
    const isStaff = currentUser.role === 'prodavačka' || isAdmin;
    const isPastryChef = currentUser.role === 'cukrářka';

    // Výrobní souhrn dortu
    let cakeHtml = '';
    if (order.cake) {
      const c = order.cake;
      cakeHtml = `
        <div class="p-3 bg-[#FAF7F2] rounded-xl border border-stone-200 text-xs mt-2">
          <div class="flex items-center justify-between mb-1">
            <strong class="text-[#3B2820] flex items-center gap-1.5">
              <span>🎂</span> Dort: ${escapeHtml(c.portions)} porcí (${escapeHtml(c.shape)})
            </strong>
            ${c.diet && c.diet !== 'Standard' ? `<span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">${escapeHtml(c.diet)}</span>` : ''}
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-stone-600">
            <div><span class="text-stone-400">Korpus:</span> <strong>${escapeHtml(c.sponge)}</strong></div>
            <div><span class="text-stone-400">Náplň:</span> <strong>${escapeHtml(c.filling)}</strong></div>
            <div><span class="text-stone-400">Povrch:</span> <strong>${escapeHtml(c.finish)}</strong></div>
            <div><span class="text-stone-400">Jedlý papír:</span> <strong>${c.edible_paper === 'ano' ? `ANO (${escapeHtml(c.edible_paper_style)})` : 'NE'}</strong></div>
          </div>
          ${c.decor ? `<div class="mt-1 text-[11px]"><span class="text-stone-400">Dekorace:</span> ${escapeHtml(c.decor)}</div>` : ''}
          ${c.description ? `<div class="mt-1 text-[11px] bg-white p-2 rounded border border-stone-200 italic text-stone-700">„${escapeHtml(c.description)}“</div>` : ''}
          ${c.image_url ? `
            <div class="mt-2 flex items-center gap-2">
              <span class="text-[10px] font-bold text-stone-500">Předloha:</span>
              <a href="${c.image_url}" target="_blank" class="text-xs text-[#AA821C] font-semibold underline flex items-center gap-1">
                📷 Zobrazit referenční foto
              </a>
            </div>
          ` : ''}
        </div>
      `;
    }

    // Výrobní souhrn zákusků
    let dessertsHtml = '';
    if (order.desserts && order.desserts.length > 0) {
      dessertsHtml = `
        <div class="p-3 bg-[#FAF7F2] rounded-xl border border-stone-200 text-xs mt-2">
          <strong class="text-[#3B2820] block mb-1">🥐 Stálé zákusky (${order.desserts.length} druhů):</strong>
          <div class="flex flex-wrap gap-1.5">
            ${order.desserts.map(d => `
              <span class="px-2.5 py-1 bg-white border border-stone-200 rounded-lg text-xs font-bold text-[#3B2820]">
                ${escapeHtml(d.name)}: <span class="text-[#AA821C]">${d.qty} ks</span>
              </span>
            `).join('')}
          </div>
        </div>
      `;
    }

    // Poslední auditní záznam
    let auditNote = '';
    if (order.history && order.history.length > 0) {
      const last = order.history[0];
      auditNote = `
        <div class="text-[11px] text-stone-500 bg-stone-50 px-3 py-1.5 rounded-lg border border-stone-200 flex items-center justify-between mt-3">
          <span>🕒 <strong>Audit:</strong> ${escapeHtml(last.change_text)}</span>
          <button class="text-[#AA821C] underline font-bold view-history-btn ml-2" data-order-id="${order.id}">Celá historie (${order.history.length})</button>
        </div>
      `;
    }

    // Tlačítka akcí dle role uživatele:
    // - admin: schválit/zamítnout nevyřízené, označit vyzvednuté, upravit, smazat
    // - prodavačka: nemůže mazat, nemůže schválit nevyřízené, může měnit platné na vyzvednuté, upravit
    // - cukrářka: read-only náhled
    let actionButtonsHtml = '';
    if (!isPastryChef && currentUser.role !== 'customer') {
      let statusButtons = '';

      // Schvalování nevyřízených zakázek (POUZE ADMIN dle zadání)
      if (order.status === 'nevyřízeno') {
        if (isAdmin) {
          statusButtons += `
            <button class="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs action-approve-btn" data-order-id="${order.id}">
              ✓ Schválit (Platné)
            </button>
            <button class="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs action-reject-btn" data-order-id="${order.id}">
              ✕ Zamítnout (Neplatné)
            </button>
          `;
        } else {
          statusButtons += `
            <span class="text-xs text-purple-700 font-bold bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
              ⏳ Čeká na schválení adminem
            </span>
          `;
        }
      } else if (order.status === 'platné') {
        // Platné zakázky může označit jako vyzvednuté prodavačka i admin
        statusButtons += `
          <button class="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs action-pickup-btn" data-order-id="${order.id}">
            📦 Označit jako vyzvednuté
          </button>
        `;
      }

      // Úprava objednávky (Audit stopa se zaznamená)
      const editBtn = `
        <button class="px-3 py-1.5 rounded-xl btn-secondary text-xs font-bold action-edit-btn" data-order-id="${order.id}">
          ✏️ Upravit
        </button>
      `;

      // Smazání (POUZE ADMIN dle specifikace)
      const deleteBtn = isAdmin ? `
        <button class="px-3 py-1.5 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 text-xs font-bold action-delete-btn" data-order-id="${order.id}">
          🗑️ Smazat
        </button>
      ` : '';

      actionButtonsHtml = `
        <div class="flex flex-wrap items-center gap-2 pt-3 border-t border-stone-100">
          ${statusButtons}
          ${editBtn}
          ${deleteBtn}
        </div>
      `;
    }

    return `
      <div class="bg-white rounded-2xl p-5 border border-stone-200 shadow-2xs hover:shadow-xs transition space-y-3">
        <!-- Card Header -->
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-stone-100">
          <div class="flex items-center gap-2.5">
            <span class="font-serif font-bold text-lg text-[#3B2820]">#${order.id}</span>
            ${getStatusBadgeHtml(order.status)}
            <span class="text-xs text-stone-500 font-medium">| Zadal: <strong>${escapeHtml(order.created_by || 'Zákazník z webu')}</strong></span>
          </div>
          <div class="text-right">
            <div class="text-xs text-stone-500">Termín vyzvednutí:</div>
            <div class="font-bold text-sm text-[#3B2820]">
              📅 ${getDayNameCzech(order.pickup_date)} ${formatCzechDate(order.pickup_date)} v ${escapeHtml(order.pickup_time || '10:00')}
            </div>
          </div>
        </div>

        <!-- Customer & Price details -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <span class="text-stone-400 block">Zákazník:</span>
            <strong class="text-stone-800 text-sm">${escapeHtml(order.customer)}</strong>
          </div>
          <div>
            <span class="text-stone-400 block">Kontakt:</span>
            <span class="text-stone-800 font-bold">${escapeHtml(order.phone)}</span>
            ${order.email ? `<span class="text-stone-500 block text-[11px]">${escapeHtml(order.email)}</span>` : ''}
          </div>
          <div>
            <span class="text-stone-400 block">Cena objednávky:</span>
            <strong class="text-[#AA821C] text-sm">${order.price ? `${order.price} Kč` : 'Nezadána'}</strong>
          </div>
        </div>

        <!-- Cake & Desserts details -->
        ${cakeHtml}
        ${dessertsHtml}
        ${auditNote}

        <!-- Actions -->
        ${actionButtonsHtml}
      </div>
    `;
  }

  function attachOrderCardEvents() {
    // 1. Schválení adminem (nevyřízeno -> platné)
    document.querySelectorAll('.action-approve-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.orderId;
        await updateOrderStatus(id, 'platné', 'Schváleno administrátorem');
      });
    });

    // 2. Zamítnutí adminem (nevyřízeno -> neplatné)
    document.querySelectorAll('.action-reject-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.orderId;
        await updateOrderStatus(id, 'neplatné', 'Zamítnuto administrátorem');
      });
    });

    // 3. Označení jako vyzvednuté
    document.querySelectorAll('.action-pickup-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.orderId;
        await updateOrderStatus(id, 'vyzvednuté', 'Předáno zákazníkovi na prodejně');
      });
    });

    // 4. Úprava zakázky
    document.querySelectorAll('.action-edit-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.orderId;
        promptEditOrder(id);
      });
    });

    // 5. Smazání (pouze admin)
    document.querySelectorAll('.action-delete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.orderId;
        if (confirm(`Opravdu si přejete smazat zakázku #${id}? Tato akce je nevratná.`)) {
          await deleteOrder(id);
        }
      });
    });

    // 6. Zobrazení historie změn (Audit modal)
    document.querySelectorAll('.view-history-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.orderId;
        openAuditHistoryModal(id);
      });
    });
  }

  async function updateOrderStatus(orderId, newStatus, reason) {
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Employee-Role': currentUser.role,
          'X-Employee-Name': currentUser.name
        },
        body: JSON.stringify({
          id: orderId,
          status: newStatus,
          change_note: reason,
          employee_name: currentUser.name,
          employee_role: currentUser.role
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Stav zakázky #${orderId} změněn na "${newStatus}"`, '✓');
        loadOrders();
      } else {
        showToast(data.message || 'Chyba změny stavu.', '❌');
      }
    } catch (e) {
      showToast('Chyba komunikace se serverem.', '❌');
    }
  }

  async function promptEditOrder(orderId) {
    const order = allOrders.find(o => String(o.id) === String(orderId));
    if (!order) return;

    const newCustomer = prompt('Upravit jméno zákazníka:', order.customer);
    if (newCustomer === null) return;

    const newPhone = prompt('Upravit telefon zákazníka:', order.phone);
    if (newPhone === null) return;

    const newPrice = prompt('Upravit cenu objednávky (Kč):', order.price || '0');
    if (newPrice === null) return;

    const changeReason = prompt('Důvod úpravy (zaznamená se do auditní stopy):', 'Změna údajů na přání zákazníka');
    if (changeReason === null) return;

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Employee-Role': currentUser.role,
          'X-Employee-Name': currentUser.name
        },
        body: JSON.stringify({
          id: orderId,
          customer: newCustomer.trim() || order.customer,
          phone: newPhone.trim() || order.phone,
          price: newPrice.trim(),
          change_note: changeReason,
          employee_name: currentUser.name,
          employee_role: currentUser.role
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Zakázka #${orderId} byla úspěšně upravena.`, '✏️');
        loadOrders();
      } else {
        showToast(data.message || 'Chyba při ukládání úprav.', '❌');
      }
    } catch (e) {
      showToast('Chyba komunikace se serverem.', '❌');
    }
  }

  async function deleteOrder(orderId) {
    try {
      const res = await fetch(`/api/orders?id=${orderId}`, {
        method: 'DELETE',
        headers: {
          'X-Employee-Role': currentUser.role,
          'X-Employee-Name': currentUser.name
        }
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Zakázka #${orderId} byla smazána.`, '🗑️');
        loadOrders();
      } else {
        showToast(data.message || 'Chyba při mazání.', '❌');
      }
    } catch (e) {
      showToast('Chyba komunikace se serverem.', '❌');
    }
  }

  // Modál historie změn (Auditní stopa)
  function openAuditHistoryModal(orderId) {
    const order = allOrders.find(o => String(o.id) === String(orderId));
    if (!order) return;

    historyModalTitle.textContent = `Historie změn zakázky #${order.id} (${escapeHtml(order.customer)})`;
    const hist = order.history || [];

    if (hist.length === 0) {
      historyModalContent.innerHTML = `<p class="text-stone-400 italic">Žádné dřívější úpravy nebyly zaznamenány.</p>`;
    } else {
      historyModalContent.innerHTML = hist.map(h => `
        <div class="audit-entry">
          <div class="flex items-center justify-between text-[11px] text-stone-500 mb-0.5">
            <strong class="text-[#3B2820]">${escapeHtml(h.employee || 'Systém')}</strong>
            <span>${escapeHtml(h.timestamp)}</span>
          </div>
          <p class="text-stone-700 font-medium">${escapeHtml(h.change_text)}</p>
        </div>
      `).join('');
    }

    historyModal.classList.remove('hidden');
    setTimeout(() => historyModal.classList.remove('opacity-0'), 10);
  }

  function closeAuditHistoryModal() {
    historyModal.classList.add('opacity-0');
    setTimeout(() => historyModal.classList.add('hidden'), 200);
  }

  closeHistoryBtn.addEventListener('click', closeAuditHistoryModal);
  historyModal.addEventListener('click', (e) => {
    if (e.target === historyModal) closeAuditHistoryModal();
  });

  // Filtry databáze - event listeners
  [filterStatus, filterPickupDate, filterEmployee, filterDiet, filterSearch].forEach(el => {
    el.addEventListener('input', renderOrdersList);
    el.addEventListener('change', renderOrdersList);
  });

  dbResetFilters.addEventListener('click', () => {
    filterStatus.value = '';
    filterPickupDate.value = '';
    filterEmployee.value = '';
    filterDiet.value = '';
    filterSearch.value = '';
    renderOrdersList();
  });

  dbRefreshBtn.addEventListener('click', () => {
    loadOrders();
    showToast('Databáze obnovena.', '🔄');
  });

  // ------------------------------------------------------------------------
  // 8. STRANA 3: ROZPIS ZÁKUSKŮ (VÝROBNÍ LIST PRO CUKRÁŘKY - A4 TISK)
  // ------------------------------------------------------------------------
  prepWeekSelect.addEventListener('change', renderDessertsPreparationSheet);
  printDessertsBtn.addEventListener('click', () => {
    updatePrintTimestamps();
    window.print();
  });

  function renderDessertsPreparationSheet() {
    const period = prepWeekSelect.value;
    // Vyfiltrovat platné objednávky (ty, které je potřeba upéct!)
    const validOrders = allOrders.filter(o => o.status === 'platné' && o.desserts && o.desserts.length > 0);

    // Agregace zákusků podle ID / názvu
    const aggregated = {};

    validOrders.forEach(o => {
      o.desserts.forEach(item => {
        const key = item.name;
        if (!aggregated[key]) {
          // Najít kategorii z katalogu
          const prodInfo = allProducts.find(p => p.title.toLowerCase() === item.name.toLowerCase());
          aggregated[key] = {
            id: item.id,
            name: item.name,
            category: prodInfo ? prodInfo.category : 'Zákusek',
            totalQty: 0,
            breakdown: []
          };
        }
        aggregated[key].totalQty += item.qty;
        aggregated[key].breakdown.push({
          orderId: o.id,
          pickupDate: o.pickup_date,
          pickupTime: o.pickup_time,
          customer: o.customer,
          qty: item.qty
        });
      });
    });

    // Seřadit SESTUPNĚ dle celkového množství (jak specifikováno v zadání)
    const sortedList = Object.values(aggregated).sort((a, b) => b.totalQty - a.totalQty);

    let sumTotalPieces = 0;
    sortedList.forEach(item => { sumTotalPieces += item.totalQty; });

    prepTotalTypes.textContent = sortedList.length;
    prepTotalPieces.textContent = `${sumTotalPieces} ks`;

    if (sortedList.length === 0) {
      prepDessertsRows.innerHTML = `
        <tr>
          <td colspan="5" class="py-8 text-center text-stone-400 italic">
            Žádné platné objednávky zákusků k výrobě.
          </td>
        </tr>
      `;
      return;
    }

    prepDessertsRows.innerHTML = sortedList.map((item, idx) => {
      const breakdownText = item.breakdown.map(b => 
        `<span class="inline-block bg-stone-50 border border-stone-200 px-1.5 py-0.5 rounded text-[10px] mr-1 mb-1">
          <strong>${getDayNameCzech(b.pickupDate)} ${formatCzechDate(b.pickupDate)}:</strong> ${b.qty} ks (#${b.orderId} ${escapeHtml(b.customer)})
        </span>`
      ).join('');

      return `
        <tr class="hover:bg-[#FAF7F2] transition">
          <td class="py-2.5 px-3 text-center font-bold text-stone-400">${idx + 1}</td>
          <td class="py-2.5 px-3 font-bold text-[#3B2820] text-sm">${escapeHtml(item.name)}</td>
          <td class="py-2.5 px-3 text-stone-500">${escapeHtml(item.category)}</td>
          <td class="py-2.5 px-3 text-right font-bold text-base text-[#AA821C]">${item.totalQty} ks</td>
          <td class="py-2.5 px-3">${breakdownText}</td>
        </tr>
      `;
    }).join('');
  }

  // ------------------------------------------------------------------------
  // 9. STRANA 4: ROZPIS DORTŮ (CHRONOLOGICKÝ PŘEHLED PRO CUKRÁŘKY - A4 TISK)
  // ------------------------------------------------------------------------
  prepCakesWeekSelect.addEventListener('change', renderCakesPreparationSheet);
  printCakesBtn.addEventListener('click', () => {
    updatePrintTimestamps();
    window.print();
  });

  function renderCakesPreparationSheet() {
    // Filtrovat pouze platné objednávky s dortem
    const validCakeOrders = allOrders.filter(o => o.status === 'platné' && o.cake);

    // Seřadit CHRONOLOGICKY podle data a času vyzvednutí (dle zadání)
    validCakeOrders.sort((a, b) => {
      const dtA = `${a.pickup_date || '9999'}T${a.pickup_time || '10:00'}`;
      const dtB = `${b.pickup_date || '9999'}T${b.pickup_time || '10:00'}`;
      return dtA.localeCompare(dtB);
    });

    prepTotalCakes.textContent = validCakeOrders.length;

    if (validCakeOrders.length === 0) {
      prepCakesRows.innerHTML = `
        <tr>
          <td colspan="6" class="py-8 text-center text-stone-400 italic">
            Žádné platné dorty k výrobě pro zvolené období.
          </td>
        </tr>
      `;
      return;
    }

    prepCakesRows.innerHTML = validCakeOrders.map(o => {
      const c = o.cake;
      const cakeSummary = `
        <strong>${escapeHtml(c.portions)} porcí, ${escapeHtml(c.shape)}</strong><br>
        <span class="text-stone-500">Korpus:</span> ${escapeHtml(c.sponge)}<br>
        <span class="text-stone-500">Náplň:</span> ${escapeHtml(c.filling)}<br>
        <span class="text-stone-500">Potah:</span> ${escapeHtml(c.finish)}
        ${c.diet && c.diet !== 'Standard' ? `<br><span class="text-emerald-700 font-bold">Dieta: ${escapeHtml(c.diet)}</span>` : ''}
      `;

      const decorSummary = `
        ${c.edible_paper === 'ano' ? `<strong class="text-blue-700">Jedlý papír:</strong> ${escapeHtml(c.edible_paper_style)}<br>` : ''}
        ${c.decor ? `<span>Dekorace:</span> ${escapeHtml(c.decor)}` : 'Klasická dekorace'}
      `;

      return `
        <tr class="hover:bg-[#FAF7F2] transition align-top">
          <td class="py-3 px-3 whitespace-nowrap">
            <strong class="text-[#3B2820] text-sm">${getDayNameCzech(o.pickup_date)} ${formatCzechDate(o.pickup_date)}</strong><br>
            <span class="text-stone-500 font-bold">${escapeHtml(o.pickup_time || '10:00')} hod.</span><br>
            <span class="text-[10px] text-stone-400">Zakázka #${o.id}</span>
          </td>
          <td class="py-3 px-3">
            <strong class="text-sm text-[#3B2820]">${escapeHtml(o.customer)}</strong><br>
            <span class="text-stone-600 font-medium">${escapeHtml(o.phone)}</span>
          </td>
          <td class="py-3 px-3 text-[11px] leading-relaxed">
            ${cakeSummary}
          </td>
          <td class="py-3 px-3 text-[11px] leading-relaxed">
            ${decorSummary}
          </td>
          <td class="py-3 px-3 text-[11px] italic text-stone-700 max-w-xs">
            ${c.description ? `„${escapeHtml(c.description)}“` : '<span class="text-stone-400">Bez zvláštního nápisu</span>'}
            ${c.image_url ? `<div class="mt-1"><a href="${c.image_url}" target="_blank" class="text-xs text-[#AA821C] font-bold underline">📷 Foto předlohy</a></div>` : ''}
          </td>
          <td class="py-3 px-3 text-right font-bold text-sm text-[#AA821C] whitespace-nowrap">
            ${o.price ? `${o.price} Kč` : '—'}
          </td>
        </tr>
      `;
    }).join('');
  }

  function updatePrintTimestamps() {
    const now = new Date();
    const d = String(now.getDate()).padStart(2, '0');
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const y = now.getFullYear();
    const h = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const str = `${d}.${m}.${y} ${h}:${min}`;

    document.querySelectorAll('.print-timestamp').forEach(el => {
      el.textContent = str;
    });
  }

  // ------------------------------------------------------------------------
  // 10. STRANA 5: STÁLÝ KATALOG 114 ZÁKUSKŮ
  // ------------------------------------------------------------------------
  let selectedCatalogCategory = 'all';

  async function loadProducts() {
    try {
      const res = await fetch('products_data.json');
      allProducts = await res.json();
      renderCatalogCategoryTags();
      renderCatalog();
    } catch (e) {
      console.warn('Nelze načíst products_data.json:', e);
    }
  }

  function renderCatalogCategoryTags() {
    const categories = ['Všechny', ...new Set(allProducts.map(p => p.category).filter(Boolean))];
    catTags.innerHTML = categories.map(cat => `
      <button class="px-3 py-1.5 rounded-xl border border-stone-200 text-xs font-semibold ${cat === 'Všechny' ? 'bg-[#3B2820] text-white border-[#3B2820]' : 'bg-[#FAF7F2] text-stone-700 hover:bg-stone-200'} transition cat-tag-btn" data-category="${cat}">
        ${escapeHtml(cat)}
      </button>
    `).join('');

    catTags.querySelectorAll('.cat-tag-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        catTags.querySelectorAll('.cat-tag-btn').forEach(b => {
          b.className = 'px-3 py-1.5 rounded-xl border border-stone-200 text-xs font-semibold bg-[#FAF7F2] text-stone-700 hover:bg-stone-200 transition cat-tag-btn';
        });
        btn.className = 'px-3 py-1.5 rounded-xl border border-[#3B2820] text-xs font-semibold bg-[#3B2820] text-white transition cat-tag-btn';
        selectedCatalogCategory = btn.dataset.category;
        renderCatalog();
      });
    });
  }

  function renderCatalog() {
    const query = catSearch.value.trim().toLowerCase();
    const filtered = allProducts.filter(p => {
      if (selectedCatalogCategory !== 'Všechny' && selectedCatalogCategory !== 'all' && p.category !== selectedCatalogCategory) {
        return false;
      }
      if (query && !p.title.toLowerCase().includes(query) && !(p.description || '').toLowerCase().includes(query)) {
        return false;
      }
      return true;
    });

    catCountBadge.textContent = `Zobrazeno ${filtered.length} z ${allProducts.length} zákusků`;

    if (filtered.length === 0) {
      catalogGrid.innerHTML = `
        <div class="col-span-full py-12 text-center bg-white rounded-3xl border border-stone-200">
          <p class="font-bold text-stone-700">Nenalezen žádný zákusek.</p>
        </div>
      `;
      return;
    }

    catalogGrid.innerHTML = filtered.map(p => `
      <div class="pastry-card rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between">
        <div>
          <div class="h-44 w-full overflow-hidden bg-stone-100 relative">
            <img src="${p.localImage || 'images/logo-madel.png'}" alt="${escapeHtml(p.title)}" class="w-full h-full object-cover" onerror="this.onerror=null; this.src='images/logo-madel.png';">
            <span class="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/90 text-stone-700 shadow-xs">
              ${escapeHtml(p.category || 'Zákusek')}
            </span>
          </div>
          <div class="p-4">
            <h4 class="font-serif font-bold text-base text-[#3B2820] mb-1">${escapeHtml(p.title)}</h4>
            <p class="text-xs text-stone-500 line-clamp-2 mb-3">${escapeHtml(p.description || 'Poctivý řemeslný zákusek z prémiových surovin.')}</p>
            ${p.allergens && p.allergens.length ? `
              <div class="text-[10px] text-stone-400">
                Alergeny: ${p.allergens.map(a => a.split(' ')[0]).join(', ')}
              </div>
            ` : ''}
          </div>
        </div>
        <div class="p-4 pt-0">
          <button type="button" class="w-full py-2 px-3 rounded-xl btn-primary text-xs font-bold flex items-center justify-center gap-1.5 add-to-form-btn" data-id="${p.id}" data-title="${escapeHtml(p.title)}">
            <span>+</span> Přidat do objednávky
          </button>
        </div>
      </div>
    `).join('');

    // Rychlé tlačítko pro přidání z katalogu přímo do objednávkového dotazníku
    catalogGrid.querySelectorAll('.add-to-form-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id, 10);
        const title = btn.dataset.title;
        
        // Povolit sekci zákusků
        const combiRadio = document.querySelector('input[name="product_type"][value="kombinace"]');
        const zakusekRadio = document.querySelector('input[name="product_type"][value="zakusek"]');
        const currentType = document.querySelector('input[name="product_type"]:checked').value;
        
        if (currentType === 'dort') {
          combiRadio.checked = true;
          sectionCakeBox.classList.remove('hidden');
          sectionDessertsBox.classList.remove('hidden');
        } else {
          sectionDessertsBox.classList.remove('hidden');
        }

        addDessertItemToOrder(title, 10, id);
        showPage('page-1');
        sectionDessertsBox.scrollIntoView({ behavior: 'smooth' });
      });
    });
  }

  catSearch.addEventListener('input', renderCatalog);

  // ------------------------------------------------------------------------
  // 11. INICIALIZACE APLIKACE PŘI NAČTENÍ
  // ------------------------------------------------------------------------
  async function init() {
    updateAuthUI();
    await loadProducts();
    await loadCalendarCapacities();
    await loadOrders();

    // Hlavní stránka (Mainpage) je Katalog zákusků dle zadání
    showPage('page-catalog');

    // Výchozí datum na příští sobotu (klasický svatební / oslavový termín v listopadu 2026)
    selectedDateInput.value = '2026-11-14';
    selectedPickupDate = '2026-11-14';
    renderCalendar();

    console.log('🍰 Cukrářství Madel - Hlavní strana (katalog) a objednávkový systém připraveny.');
  }

  // Spuštění
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
