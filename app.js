// Cukrářství Madel - Kompletní aplikace, 3-krokový průvodce & Výrobní systém
// Sjednocený systém pro zakázkové dorty i stálou nabídku 114 zákusků
// Běží na Localhost 3000

(function () {
  'use strict';

  // ==========================================
  // 1. DATA & STAV APLIKACE
  // ==========================================
  let products = [];
  let filteredProducts = [];
  let selectedCategory = 'all';
  let activeTag = null;
  let searchQuery = '';
  let currentSort = 'default';

  // Košík vybraných stálých zákusků (localStorage)
  let cart = JSON.parse(localStorage.getItem('madel_inquiry_cart') || '{}');

  // Správa zakázek (pro interní systém / výrobnu)
  let orders = [];

  // Stav 3-krokového průvodce
  let wizardCurrentStep = 1;
  let wizardLastSubmittedOrder = null;

  // DOM Elements - Katalog
  const productsGrid = document.getElementById('products-grid');
  const emptyState = document.getElementById('empty-state');
  const resultsCount = document.getElementById('results-count');
  const searchInput = document.getElementById('search-input');
  const clearSearchBtn = document.getElementById('clear-search-btn');
  const sortSelect = document.getElementById('sort-select');
  const categoryTabsContainer = document.getElementById('category-tabs');
  const resetFiltersBtn = document.getElementById('reset-filters-btn');
  const resetEmptyBtn = document.getElementById('reset-empty-btn');
  const cartBadge = document.getElementById('cart-badge');
  const openCartBtn = document.getElementById('open-cart-btn');

  // DOM Elements - Modal Detail Zákusku
  const productModal = document.getElementById('product-modal');
  const modalContainer = document.getElementById('modal-container');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const modalImg = document.getElementById('modal-img');
  const modalCategory = document.getElementById('modal-category');
  const modalBadgePopular = document.getElementById('modal-badge-popular');
  const modalTitle = document.getElementById('modal-title');
  const modalDesc = document.getElementById('modal-desc');
  const modalAllergens = document.getElementById('modal-allergens');
  const modalTags = document.getElementById('modal-tags');
  const modalQtyVal = document.getElementById('modal-qty-val');
  const modalQtyMinus = document.getElementById('modal-qty-minus');
  const modalQtyPlus = document.getElementById('modal-qty-plus');
  const modalAddCartBtn = document.getElementById('modal-add-cart-btn');
  let activeModalProduct = null;
  let activeModalQty = 1;

  // DOM Elements - Drawer Košíku
  const cartDrawer = document.getElementById('cart-drawer');
  const cartDrawerBackdrop = document.getElementById('cart-drawer-backdrop');
  const closeCartBtn = document.getElementById('close-cart-btn');
  const cartItemsContainer = document.getElementById('cart-items-container');
  const cartDrawerCount = document.getElementById('cart-drawer-count');
  const cartTotalQty = document.getElementById('cart-total-qty');
  const cartCheckoutWizardBtn = document.getElementById('cart-checkout-wizard-btn');
  const sendWhatsappBtn = document.getElementById('send-whatsapp-btn');
  const copyListBtn = document.getElementById('copy-list-btn');

  // DOM Elements - 3-Krokový Průvodce Objednávkou (Wizard)
  const orderWizardModal = document.getElementById('order-wizard-modal');
  const wizardContainer = document.getElementById('wizard-container');
  const closeWizardBtn = document.getElementById('close-wizard-btn');
  const wizBtnPrev = document.getElementById('wiz-btn-prev');
  const wizBtnNext = document.getElementById('wiz-btn-next');
  const stepNode1 = document.getElementById('step-node-1');
  const stepNode2 = document.getElementById('step-node-2');
  const stepNode3 = document.getElementById('step-node-3');

  // Krok 1 prvky
  const wizCustomer = document.getElementById('wiz-customer');
  const wizPhone = document.getElementById('wiz-phone');
  const wizEmail = document.getElementById('wiz-email');

  // Krok 2 prvky
  const wizCakeEnable = document.getElementById('wiz-cake-enable');
  const wizCakeFields = document.getElementById('wiz-cake-fields');
  const wizCakeKind = document.getElementById('wiz-cake-kind');
  const wizCakePortions = document.getElementById('wiz-cake-portions');
  const wizCakeShape = document.getElementById('wiz-cake-shape');
  const wizCakeFloors = document.getElementById('wiz-cake-floors');
  const wizCakeSponge = document.getElementById('wiz-cake-sponge');
  const wizCakeFilling = document.getElementById('wiz-cake-filling');
  const wizCakeCream = document.getElementById('wiz-cake-cream');
  const wizCakeFinish = document.getElementById('wiz-cake-finish');
  const wizCakeDecor = document.getElementById('wiz-cake-decor');
  const wizCakeDiet = document.getElementById('wiz-cake-diet');
  const wizCakeNotes = document.getElementById('wiz-cake-notes');
  const wizDessertsCount = document.getElementById('wiz-desserts-count');
  const wizSelectedDesserts = document.getElementById('wiz-selected-desserts');
  const wizDessertSearch = document.getElementById('wiz-dessert-search');
  const wizDessertResults = document.getElementById('wiz-dessert-results');

  // Krok 3 prvky
  const wizPickupDate = document.getElementById('wiz-pickup-date');
  const wizPickupTime = document.getElementById('wiz-pickup-time');
  const wizNotes = document.getElementById('wiz-notes');
  const wizSummaryContent = document.getElementById('wiz-summary-content');
  const wizSummaryPrice = document.getElementById('wiz-summary-price');

  // Krok 4 prvky (Úspěch)
  const wizSuccessId = document.getElementById('wiz-success-id');
  const wizSuccessWhatsapp = document.getElementById('wiz-success-whatsapp');
  const wizSuccessPrint = document.getElementById('wiz-success-print');
  const wizSuccessClose = document.getElementById('wiz-success-close');

  // Toast
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toast-msg');
  const toastIcon = document.getElementById('toast-icon');
  let toastTimer = null;

  function showToast(msg, icon = '✅') {
    if (toastTimer) clearTimeout(toastTimer);
    toastMsg.textContent = msg;
    toastIcon.textContent = icon;
    toast.classList.add('show');
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  }

  // ==========================================
  // 2. INICIALIZACE KATALOGU (114 ZÁKUSKŮ)
  // ==========================================
  async function initCatalog() {
    try {
      const res = await fetch('products_data.json');
      if (!res.ok) throw new Error('Nelze načíst data katalogu');
      products = await res.json();
      filteredProducts = [...products];

      buildCategoryTabs();
      renderProducts();
      updateCartUI();
      setupCatalogEvents();
    } catch (err) {
      console.error('Chyba při načítání katalogu:', err);
      if (productsGrid) {
        productsGrid.innerHTML = `
          <div class="col-span-full text-center py-12 text-rose-700 bg-rose-50 rounded-2xl p-6">
            <p class="font-bold">Chyba při načítání nabídky produktů.</p>
            <p class="text-xs text-stone-600 mt-1">Ujistěte se, že soubor products_data.json je dostupný.</p>
          </div>
        `;
      }
    }
  }

  function buildCategoryTabs() {
    if (!categoryTabsContainer) return;
    const counts = { all: products.length };
    products.forEach(p => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });

    const categories = [
      { key: 'all', label: 'Všechny zákusky' },
      { key: 'Dorty & Řezy', label: 'Dorty & Řezy' },
      { key: 'Tradiční české zákusky', label: 'Tradiční české' },
      { key: 'Větrníky & Odpalované', label: 'Větrníky & Odpalované' },
      { key: 'Tartaletky & Košíčky', label: 'Tartaletky & Košíčky' },
      { key: 'Pohárky & Nepečené', label: 'Pohárky & Nepečené' },
      { key: 'Cheesecakes', label: 'Cheesecakes' },
      { key: 'Makronky & Mini dezerty', label: 'Makronky & Mini' }
    ];

    categoryTabsContainer.innerHTML = categories.map(cat => {
      const count = counts[cat.key] || 0;
      const isActive = selectedCategory === cat.key;
      return `
        <button 
          data-category="${cat.key}" 
          class="category-tab-btn px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 ${
            isActive 
              ? 'tab-active' 
              : 'bg-[#FAF7F2] text-stone-700 border-[#DCD0C5] hover:bg-[#F0EBE1] hover:border-[#AA821C]'
          }"
        >
          <span>${cat.label}</span>
          <span class="text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-700'}">${count}</span>
        </button>
      `;
    }).join('');

    categoryTabsContainer.querySelectorAll('.category-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedCategory = btn.getAttribute('data-category');
        buildCategoryTabs();
        applyFilters();
      });
    });
  }

  function normalizeStr(str) {
    return (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  function applyFilters() {
    let list = [...products];

    if (selectedCategory !== 'all') {
      list = list.filter(p => p.category === selectedCategory);
    }

    if (activeTag) {
      if (activeTag === 'Bestseller') {
        list = list.filter(p => p.popular);
      } else {
        list = list.filter(p => p.tags && p.tags.includes(activeTag));
      }
    }

    if (searchQuery.trim()) {
      const normQuery = normalizeStr(searchQuery.trim());
      list = list.filter(p => {
        const titleMatch = normalizeStr(p.title).includes(normQuery);
        const tagMatch = p.tags && p.tags.some(t => normalizeStr(t).includes(normQuery));
        const catMatch = normalizeStr(p.category).includes(normQuery);
        return titleMatch || tagMatch || catMatch;
      });
    }

    if (currentSort === 'name-asc') {
      list.sort((a, b) => a.title.localeCompare(b.title, 'cs'));
    } else if (currentSort === 'name-desc') {
      list.sort((a, b) => b.title.localeCompare(a.title, 'cs'));
    } else if (currentSort === 'popular') {
      list.sort((a, b) => (b.popular ? 1 : 0) - (a.popular ? 1 : 0));
    } else {
      list.sort((a, b) => a.id - b.id);
    }

    filteredProducts = list;
    renderProducts();

    const hasFilters = selectedCategory !== 'all' || activeTag !== null || searchQuery.trim() !== '' || currentSort !== 'default';
    if (resetFiltersBtn) {
      if (hasFilters) resetFiltersBtn.classList.remove('hidden');
      else resetFiltersBtn.classList.add('hidden');
    }
  }

  function renderProducts() {
    if (!productsGrid) return;
    resultsCount.textContent = `Zobrazeno ${filteredProducts.length} z ${products.length} zákusků`;

    if (filteredProducts.length === 0) {
      productsGrid.innerHTML = '';
      if (emptyState) emptyState.classList.remove('hidden');
      return;
    }

    if (emptyState) emptyState.classList.add('hidden');

    productsGrid.innerHTML = filteredProducts.map(p => {
      const inCartQty = cart[p.id] ? cart[p.id].qty : 0;
      const imgSrc = p.localImage || p.originalImage;
      const popularBadge = p.popular 
        ? `<span class="absolute top-3 left-3 z-10 text-[10px] font-bold uppercase tracking-wider bg-amber-400 text-stone-900 px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">⭐ Bestseller</span>` 
        : '';

      const cartIndicator = inCartQty > 0
        ? `<span class="text-[11px] font-bold text-[#AA821C] bg-[#F7EEDB] px-2 py-0.5 rounded-full border border-[#C59B27]/40 flex items-center gap-1">✔ V košíku (${inCartQty} ks)</span>`
        : '';

      return `
        <div class="pastry-card rounded-2xl overflow-hidden flex flex-col group" data-id="${p.id}">
          <div class="relative bg-[#FAF7F2] aspect-[4/3] overflow-hidden cursor-pointer open-modal-trigger" data-id="${p.id}">
            ${popularBadge}
            <img 
              src="${imgSrc}" 
              alt="${p.title}" 
              loading="lazy" 
              onerror="this.src='${p.originalImage}'"
              class="w-full h-full object-cover"
            >
            <div class="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span class="bg-white/95 text-[#3B2820] text-xs font-semibold px-3 py-1.5 rounded-full shadow-md flex items-center gap-1 transform translate-y-2 group-hover:translate-y-0 transition-transform">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                Detail zákusku
              </span>
            </div>
          </div>

          <div class="p-4 flex-grow flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between gap-2 mb-1.5">
                <span class="text-[10px] font-semibold uppercase tracking-wider text-[#AA821C]">
                  ${p.category}
                </span>
                ${cartIndicator}
              </div>

              <h3 class="font-serif font-bold text-base text-[#3B2820] group-hover:text-[#AA821C] transition-colors leading-snug cursor-pointer open-modal-trigger" data-id="${p.id}">
                ${p.title}
              </h3>

              <p class="text-xs text-stone-500 line-clamp-2 mt-1 leading-relaxed">
                ${p.description}
              </p>
            </div>

            <div class="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
              <button 
                class="open-modal-trigger text-xs text-stone-500 hover:text-[#3B2820] font-medium py-1 px-2 rounded-lg hover:bg-stone-100 transition" 
                data-id="${p.id}"
              >
                Detail
              </button>

              <button 
                class="quick-add-btn px-3 py-1.5 rounded-xl ${inCartQty > 0 ? 'bg-[#3B2820] text-white hover:bg-[#5A3E31]' : 'btn-primary'} text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 shadow-sm" 
                data-id="${p.id}"
              >
                <span>${inCartQty > 0 ? '+ Přidat další' : '+ Do objednávky'}</span>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    productsGrid.querySelectorAll('.open-modal-trigger').forEach(el => {
      el.addEventListener('click', () => openProductModal(parseInt(el.getAttribute('data-id'), 10)));
    });

    productsGrid.querySelectorAll('.quick-add-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = parseInt(btn.getAttribute('data-id'), 10);
        addToCart(id, 1);
        btn.classList.add('animate-cart-bounce');
        setTimeout(() => btn.classList.remove('animate-cart-bounce'), 350);
      });
    });
  }

  function openProductModal(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;

    activeModalProduct = product;
    activeModalQty = cart[id] ? cart[id].qty : 1;
    if (activeModalQty < 1) activeModalQty = 1;

    modalImg.src = product.localImage || product.originalImage;
    modalImg.onerror = () => { modalImg.src = product.originalImage; };
    modalImg.alt = product.title;
    modalTitle.textContent = product.title;
    modalCategory.textContent = product.category;
    modalDesc.textContent = product.description;

    if (product.popular) modalBadgePopular.classList.remove('hidden');
    else modalBadgePopular.classList.add('hidden');

    modalAllergens.innerHTML = (product.allergens || []).map(a => `
      <span class="inline-block bg-white px-2 py-0.5 rounded border border-stone-200 text-stone-600 font-medium">
        ${a}
      </span>
    `).join('');

    modalTags.innerHTML = (product.tags || []).map(t => `
      <span class="text-[11px] px-2.5 py-0.5 rounded-md badge-tag">
        #${t}
      </span>
    `).join('');

    modalQtyVal.textContent = activeModalQty;

    productModal.classList.remove('hidden');
    setTimeout(() => {
      productModal.classList.remove('opacity-0');
      modalContainer.classList.remove('scale-95');
      modalContainer.classList.add('scale-100');
    }, 10);
    document.body.classList.add('overflow-hidden');
  }

  function closeProductModal() {
    modalContainer.classList.remove('scale-100');
    modalContainer.classList.add('scale-95');
    productModal.classList.add('opacity-0');
    setTimeout(() => {
      productModal.classList.add('hidden');
      document.body.classList.remove('overflow-hidden');
    }, 200);
  }

  function addToCart(id, qty = 1) {
    const product = products.find(p => p.id === id);
    if (!product) return;

    if (!cart[id]) {
      cart[id] = {
        id: product.id,
        title: product.title,
        category: product.category,
        image: product.localImage || product.originalImage,
        qty: 0
      };
    }

    cart[id].qty += qty;
    if (cart[id].qty <= 0) {
      delete cart[id];
    }

    saveCart();
    updateCartUI();
    renderProducts();
    updateWizardDessertsList();

    showToast(`Přidáno do objednávky: ${product.title} (${qty > 0 ? '+' : ''}${qty} ks)`);
  }

  function removeFromCart(id) {
    if (cart[id]) {
      const title = cart[id].title;
      delete cart[id];
      saveCart();
      updateCartUI();
      renderProducts();
      updateWizardDessertsList();
      showToast(`Odebráno z objednávky: ${title}`, '🗑️');
    }
  }

  function saveCart() {
    localStorage.setItem('madel_inquiry_cart', JSON.stringify(cart));
  }

  function updateCartUI() {
    if (!cartBadge) return;
    const items = Object.values(cart);
    const totalQty = items.reduce((acc, item) => acc + item.qty, 0);

    cartBadge.textContent = totalQty;
    if (totalQty > 0) {
      cartBadge.classList.remove('bg-[#3B2820]', 'text-white');
      cartBadge.classList.add('bg-[#AA821C]', 'text-white');
    } else {
      cartBadge.classList.remove('bg-[#AA821C]', 'text-white');
      cartBadge.classList.add('bg-[#3B2820]', 'text-white');
    }

    if (cartDrawerCount) cartDrawerCount.textContent = `${items.length} ${items.length === 1 ? 'položka' : (items.length >= 2 && items.length <= 4 ? 'položky' : 'položek')}`;
    if (cartTotalQty) cartTotalQty.textContent = `${totalQty} ks`;

    if (!cartItemsContainer) return;
    if (items.length === 0) {
      cartItemsContainer.innerHTML = `
        <div class="text-center py-12 text-stone-400">
          <div class="w-16 h-16 mx-auto mb-3 bg-[#FAF7F2] rounded-full flex items-center justify-center text-2xl">
            🍰
          </div>
          <p class="font-serif font-bold text-base text-[#3B2820]">Váš košík je prázdný</p>
          <p class="text-xs text-stone-500 mt-1 max-w-xs mx-auto">
            Vyberte si zákusky ze stálé nabídky nebo si sestavte vlastní zakázkový dort v průvodci.
          </p>
          <button class="mt-4 px-4 py-2 rounded-xl btn-primary text-xs font-bold open-wizard-trigger">
            🎂 Otevřít vlastní objednávku
          </button>
        </div>
      `;
    } else {
      cartItemsContainer.innerHTML = items.map(item => `
        <div class="p-3 bg-[#FAF7F2] rounded-2xl border border-stone-200 flex items-center gap-3">
          <img src="${item.image}" alt="${item.title}" class="w-12 h-12 object-cover rounded-xl shadow-xs shrink-0">
          <div class="flex-grow min-w-0">
            <h4 class="font-serif font-bold text-xs sm:text-sm text-[#3B2820] truncate">${item.title}</h4>
            <span class="text-[10px] text-stone-500">${item.category}</span>
          </div>
          <div class="flex items-center gap-1 bg-white rounded-lg border border-stone-200 px-1 py-0.5 shrink-0">
            <button class="cart-minus-btn w-6 h-6 flex items-center justify-center text-xs text-stone-600 hover:text-black font-bold" data-id="${item.id}">−</button>
            <span class="text-xs font-bold px-1.5 min-w-[20px] text-center">${item.qty}</span>
            <button class="cart-plus-btn w-6 h-6 flex items-center justify-center text-xs text-stone-600 hover:text-black font-bold" data-id="${item.id}">+</button>
          </div>
          <button class="cart-remove-btn text-stone-400 hover:text-rose-600 p-1 transition shrink-0" data-id="${item.id}" title="Odebrat">
            ✕
          </button>
        </div>
      `).join('');

      cartItemsContainer.querySelectorAll('.cart-plus-btn').forEach(b => {
        b.addEventListener('click', () => addToCart(parseInt(b.getAttribute('data-id'), 10), 1));
      });
      cartItemsContainer.querySelectorAll('.cart-minus-btn').forEach(b => {
        b.addEventListener('click', () => addToCart(parseInt(b.getAttribute('data-id'), 10), -1));
      });
      cartItemsContainer.querySelectorAll('.cart-remove-btn').forEach(b => {
        b.addEventListener('click', () => removeFromCart(parseInt(b.getAttribute('data-id'), 10)));
      });
    }

    // Attach trigger to buttons
    document.querySelectorAll('.open-wizard-trigger').forEach(b => {
      b.onclick = () => {
        closeCartDrawer();
        openWizard();
      };
    });
  }

  function openCartDrawer() {
    updateCartUI();
    cartDrawerBackdrop.classList.remove('hidden');
    setTimeout(() => {
      cartDrawerBackdrop.classList.remove('opacity-0');
      cartDrawer.classList.remove('translate-x-full');
    }, 10);
    document.body.classList.add('overflow-hidden');
  }

  function closeCartDrawer() {
    cartDrawer.classList.add('translate-x-full');
    cartDrawerBackdrop.classList.add('opacity-0');
    setTimeout(() => {
      cartDrawerBackdrop.classList.add('hidden');
      document.body.classList.remove('overflow-hidden');
    }, 300);
  }

  function setupCatalogEvents() {
    let debounceTimer;
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        searchQuery = e.target.value;
        if (searchQuery.length > 0) clearSearchBtn.classList.remove('hidden');
        else clearSearchBtn.classList.add('hidden');
        debounceTimer = setTimeout(applyFilters, 150);
      });
    }

    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.classList.add('hidden');
        applyFilters();
        searchInput.focus();
      });
    }

    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        currentSort = e.target.value;
        applyFilters();
      });
    }

    document.querySelectorAll('.tag-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tag = btn.getAttribute('data-tag');
        if (activeTag === tag) {
          activeTag = null;
          btn.classList.remove('bg-[#3B2820]', 'text-white');
          btn.classList.add('badge-tag');
        } else {
          document.querySelectorAll('.tag-filter-btn').forEach(b => {
            b.classList.remove('bg-[#3B2820]', 'text-white');
            b.classList.add('badge-tag');
          });
          activeTag = tag;
          btn.classList.remove('badge-tag');
          btn.classList.add('bg-[#3B2820]', 'text-white');
        }
        applyFilters();
      });
    });

    const resetAction = () => {
      selectedCategory = 'all';
      activeTag = null;
      searchQuery = '';
      currentSort = 'default';
      if (searchInput) searchInput.value = '';
      if (clearSearchBtn) clearSearchBtn.classList.add('hidden');
      if (sortSelect) sortSelect.value = 'default';
      document.querySelectorAll('.tag-filter-btn').forEach(b => {
        b.classList.remove('bg-[#3B2820]', 'text-white');
        b.classList.add('badge-tag');
      });
      buildCategoryTabs();
      applyFilters();
    };

    if (resetFiltersBtn) resetFiltersBtn.addEventListener('click', resetAction);
    if (resetEmptyBtn) resetEmptyBtn.addEventListener('click', resetAction);

    if (closeModalBtn) closeModalBtn.addEventListener('click', closeProductModal);
    if (productModal) {
      productModal.addEventListener('click', (e) => {
        if (e.target === productModal) closeProductModal();
      });
    }

    if (modalQtyPlus) {
      modalQtyPlus.addEventListener('click', () => {
        activeModalQty++;
        modalQtyVal.textContent = activeModalQty;
      });
    }

    if (modalQtyMinus) {
      modalQtyMinus.addEventListener('click', () => {
        if (activeModalQty > 1) {
          activeModalQty--;
          modalQtyVal.textContent = activeModalQty;
        }
      });
    }

    if (modalAddCartBtn) {
      modalAddCartBtn.addEventListener('click', () => {
        if (activeModalProduct) {
          addToCart(activeModalProduct.id, activeModalQty);
          closeProductModal();
        }
      });
    }

    if (openCartBtn) openCartBtn.addEventListener('click', openCartDrawer);
    if (closeCartBtn) closeCartBtn.addEventListener('click', closeCartDrawer);
    if (cartDrawerBackdrop) cartDrawerBackdrop.addEventListener('click', closeCartDrawer);

    if (cartCheckoutWizardBtn) {
      cartCheckoutWizardBtn.addEventListener('click', () => {
        closeCartDrawer();
        openWizard();
      });
    }

    // Buttons triggering the 3-step wizard
    const triggerWizard = () => openWizard();
    ['nav-custom-order-btn', 'header-custom-order-btn', 'hero-custom-order-btn', 'catalog-custom-order-btn', 'banner-custom-order-btn'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.addEventListener('click', triggerWizard);
    });

    if (sendWhatsappBtn) sendWhatsappBtn.addEventListener('click', sendWhatsAppFallback);
    if (copyListBtn) copyListBtn.addEventListener('click', copyListFallback);
  }


  // ========================================================
  // 3. TŘÍKROKOVÝ PRŮVODCE OBJEDNÁVKOU (WIZARD MODAL)
  // ========================================================
  function openWizard() {
    wizardCurrentStep = 1;
    setWizardStep(1);

    // Pre-fill contacts from localStorage if available
    const savedName = localStorage.getItem('madel_cust_name');
    const savedPhone = localStorage.getItem('madel_cust_phone');
    const savedEmail = localStorage.getItem('madel_cust_email');
    if (savedName && !wizCustomer.value) wizCustomer.value = savedName;
    if (savedPhone && !wizPhone.value) wizPhone.value = savedPhone;
    if (savedEmail && !wizEmail.value) wizEmail.value = savedEmail;

    // Default pickup date to tomorrow if empty
    if (!wizPickupDate.value) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      wizPickupDate.value = tomorrow.toISOString().slice(0, 10);
      wizPickupDate.min = new Date().toISOString().slice(0, 10);
    }

    // Render desserts in step 2
    updateWizardDessertsList();

    orderWizardModal.classList.remove('hidden');
    setTimeout(() => {
      orderWizardModal.classList.remove('opacity-0');
      wizardContainer.classList.remove('scale-95');
      wizardContainer.classList.add('scale-100');
    }, 10);
    document.body.classList.add('overflow-hidden');
  }

  function closeWizard() {
    wizardContainer.classList.remove('scale-100');
    wizardContainer.classList.add('scale-95');
    orderWizardModal.classList.add('opacity-0');
    setTimeout(() => {
      orderWizardModal.classList.add('hidden');
      document.body.classList.remove('overflow-hidden');
    }, 250);
  }

  function setWizardStep(step) {
    wizardCurrentStep = step;

    // Toggle step containers
    document.getElementById('wizard-step-1').classList.toggle('hidden', step !== 1);
    document.getElementById('wizard-step-2').classList.toggle('hidden', step !== 2);
    document.getElementById('wizard-step-3').classList.toggle('hidden', step !== 3);
    document.getElementById('wizard-step-4').classList.toggle('hidden', step !== 4);

    // Step Nodes bar state
    [stepNode1, stepNode2, stepNode3].forEach((node, idx) => {
      const num = idx + 1;
      node.classList.remove('active', 'completed');
      if (num === step) {
        node.classList.add('active');
      } else if (num < step) {
        node.classList.add('completed');
      }
    });

    // Nav Footer Buttons state
    const footer = document.getElementById('wizard-nav-footer');
    if (step === 4) {
      footer.classList.add('hidden');
    } else {
      footer.classList.remove('hidden');

      if (step === 1) {
        wizBtnPrev.classList.add('hidden');
        wizBtnNext.innerHTML = `<span>Pokračovat na výběr</span> <span>→</span>`;
      } else if (step === 2) {
        wizBtnPrev.classList.remove('hidden');
        wizBtnPrev.textContent = '← Zpět na zákazníka';
        wizBtnNext.innerHTML = `<span>Pokračovat na vyzvednutí</span> <span>→</span>`;
      } else if (step === 3) {
        wizBtnPrev.classList.remove('hidden');
        wizBtnPrev.textContent = '← Zpět na výběr';
        wizBtnNext.innerHTML = `<span>✔ Závazně odeslat objednávku</span>`;
      }
    }

    // Step specific updates
    if (step === 2) {
      updateWizardDessertsList();
    } else if (step === 3) {
      renderWizardSummary();
    }
  }

  // Handle Wizard Navigation
  function handleWizardNext() {
    if (wizardCurrentStep === 1) {
      // Validate customer inputs
      const customer = wizCustomer.value.trim();
      const phone = wizPhone.value.trim();

      if (!customer) {
        alert('Prosím, zadejte své jméno a příjmení.');
        wizCustomer.focus();
        return;
      }
      if (!phone) {
        alert('Prosím, zadejte telefonní číslo pro potvrzení objednávky.');
        wizPhone.focus();
        return;
      }

      // Persist contact to localStorage
      localStorage.setItem('madel_cust_name', customer);
      localStorage.setItem('madel_cust_phone', phone);
      if (wizEmail.value.trim()) localStorage.setItem('madel_cust_email', wizEmail.value.trim());

      setWizardStep(2);
    } 
    else if (wizardCurrentStep === 2) {
      // Validate that at least custom cake OR regular desserts are selected
      const hasCake = wizCakeEnable.checked;
      const dessertItems = Object.values(cart);
      const totalDesserts = dessertItems.reduce((acc, it) => acc + it.qty, 0);

      if (!hasCake && totalDesserts === 0) {
        alert('Vyberte prosím alespoň zakázkový dort nebo nějaké zákusky ze stálé nabídky.');
        return;
      }

      setWizardStep(3);
    } 
    else if (wizardCurrentStep === 3) {
      // Submit order
      submitWizardOrder();
    }
  }

  function handleWizardPrev() {
    if (wizardCurrentStep > 1) {
      setWizardStep(wizardCurrentStep - 1);
    }
  }

  // Toggle cake options in Step 2
  if (wizCakeEnable) {
    wizCakeEnable.addEventListener('change', () => {
      wizCakeFields.classList.toggle('opacity-40', !wizCakeEnable.checked);
      wizCakeFields.querySelectorAll('input, select, textarea').forEach(el => el.disabled = !wizCakeEnable.checked);
    });
  }

  // Update desserts list in Step 2
  function updateWizardDessertsList() {
    if (!wizSelectedDesserts) return;
    const items = Object.values(cart);
    const totalQty = items.reduce((acc, it) => acc + it.qty, 0);

    if (wizDessertsCount) {
      wizDessertsCount.textContent = `${totalQty} ks v košíku`;
    }

    if (items.length === 0) {
      wizSelectedDesserts.innerHTML = `
        <div class="text-xs text-stone-500 italic py-2">
          Zatím nemáte vybrány žádné klasické zákusky. Níže můžete snadno vyhledat a přidat ze 114 druhů.
        </div>
      `;
    } else {
      wizSelectedDesserts.innerHTML = items.map(it => `
        <div class="p-2.5 bg-[#FAF7F2] rounded-xl border border-stone-200 flex items-center justify-between gap-3 text-xs">
          <div class="flex items-center gap-2.5 min-w-0">
            <img src="${it.image}" alt="${it.title}" class="w-10 h-10 object-cover rounded-lg shrink-0">
            <div class="truncate">
              <strong class="text-stone-800">${it.title}</strong>
              <div class="text-[10px] text-stone-500">${it.category}</div>
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <div class="flex items-center bg-white rounded-lg border border-stone-300 px-1">
              <button type="button" class="wiz-item-minus px-2 py-0.5 text-stone-600 font-bold" data-id="${it.id}">−</button>
              <span class="font-bold px-1 min-w-[18px] text-center">${it.qty}</span>
              <button type="button" class="wiz-item-plus px-2 py-0.5 text-stone-600 font-bold" data-id="${it.id}">+</button>
            </div>
            <button type="button" class="wiz-item-remove text-stone-400 hover:text-rose-600 px-1" data-id="${it.id}">✕</button>
          </div>
        </div>
      `).join('');

      wizSelectedDesserts.querySelectorAll('.wiz-item-plus').forEach(b => {
        b.onclick = () => addToCart(parseInt(b.dataset.id, 10), 1);
      });
      wizSelectedDesserts.querySelectorAll('.wiz-item-minus').forEach(b => {
        b.onclick = () => addToCart(parseInt(b.dataset.id, 10), -1);
      });
      wizSelectedDesserts.querySelectorAll('.wiz-item-remove').forEach(b => {
        b.onclick = () => removeFromCart(parseInt(b.dataset.id, 10));
      });
    }
  }

  // Quick dessert search inside Step 2
  if (wizDessertSearch) {
    wizDessertSearch.addEventListener('input', (e) => {
      const q = normalizeStr(e.target.value.trim());
      if (q.length < 2) {
        wizDessertResults.classList.add('hidden');
        wizDessertResults.innerHTML = '';
        return;
      }

      const matches = products.filter(p => normalizeStr(p.title).includes(q) || (p.tags && p.tags.some(t => normalizeStr(t).includes(q)))).slice(0, 6);
      if (matches.length === 0) {
        wizDessertResults.innerHTML = `<div class="p-2 text-stone-400 italic text-xs">Žádný zákusek neodpovídá výrazu "${e.target.value}"</div>`;
      } else {
        wizDessertResults.innerHTML = matches.map(p => `
          <div class="p-2 bg-white hover:bg-[#F7EEDB] rounded-lg border border-stone-200 flex items-center justify-between gap-2 text-xs transition">
            <div class="flex items-center gap-2 truncate">
              <img src="${p.localImage || p.originalImage}" alt="" class="w-8 h-8 rounded object-cover shrink-0">
              <span class="font-medium text-stone-800 truncate">${p.title}</span>
            </div>
            <button type="button" class="wiz-quick-add px-2.5 py-1 rounded-lg btn-primary text-[11px] font-bold shrink-0" data-id="${p.id}">
              + Přidat
            </button>
          </div>
        `).join('');

        wizDessertResults.querySelectorAll('.wiz-quick-add').forEach(btn => {
          btn.onclick = () => {
            const id = parseInt(btn.dataset.id, 10);
            addToCart(id, 1);
            wizDessertSearch.value = '';
            wizDessertResults.classList.add('hidden');
          };
        });
      }
      wizDessertResults.classList.remove('hidden');
    });
  }

  // Render Step 3 summary breakdown
  function renderWizardSummary() {
    const customer = wizCustomer.value.trim();
    const phone = wizPhone.value.trim();
    const email = wizEmail.value.trim();
    const date = wizPickupDate.value;
    const time = wizPickupTime.value || '10:00';
    const notes = wizNotes.value.trim();

    const hasCake = wizCakeEnable.checked;
    const dessertItems = Object.values(cart);
    const totalDesserts = dessertItems.reduce((acc, it) => acc + it.qty, 0);

    let html = `
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pb-3 border-b border-stone-200">
        <div><strong>Zákazník:</strong> ${customer}</div>
        <div><strong>Telefon:</strong> <span class="text-[#AA821C] font-bold">${phone}</span> ${email ? `(${email})` : ''}</div>
        <div><strong>Termín vyzvednutí:</strong> 📅 ${date ? new Date(date + 'T12:00:00').toLocaleDateString('cs-CZ') : 'Neuvedeno'} v ${time}</div>
        <div><strong>Místo:</strong> Prodejna Dolní Benešov - Zábřeh</div>
      </div>
    `;

    // Cake summary
    if (hasCake) {
      const kind = wizCakeKind.value;
      const portions = wizCakePortions.value || '12';
      const shape = wizCakeShape.value || 'Standard';
      const floors = wizCakeFloors.value || '1';
      const sponge = wizCakeSponge.value;
      const filling = wizCakeFilling.value;
      const cream = wizCakeCream.value;
      const finish = wizCakeFinish.value;
      const decor = wizCakeDecor.value;
      const cakeNotes = wizCakeNotes.value.trim();

      html += `
        <div class="p-3 bg-white rounded-xl border border-stone-200 space-y-1">
          <div class="font-serif font-bold text-sm text-[#3B2820] flex items-center gap-1.5">
            <span>🎂</span> ${kind} dort (${portions} porcí, ${floors} patro/patra)
          </div>
          <div class="text-[11px] text-stone-600">
            • <strong>Korpus:</strong> ${sponge} • <strong>Náplň:</strong> ${filling} ${cream ? `(${cream})` : ''}<br>
            • <strong>Tvar a potah:</strong> ${shape}, ${finish || 'dle domluvy'}<br>
            ${decor ? `• <strong>Dekorace:</strong> ${decor}<br>` : ''}
            ${cakeNotes ? `• <strong>Nápis / přání:</strong> "${cakeNotes}"` : ''}
          </div>
        </div>
      `;
    }

    // Desserts summary
    if (totalDesserts > 0) {
      html += `
        <div class="p-3 bg-white rounded-xl border border-stone-200">
          <div class="font-serif font-bold text-sm text-[#3B2820] mb-2 flex items-center gap-1.5">
            <span>🥐</span> Stálé zákusky (${totalDesserts} ks celkem):
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
            ${dessertItems.map(it => `
              <div class="flex justify-between border-b border-stone-100 py-1">
                <span>${it.title}</span>
                <strong class="text-stone-900">${it.qty} ks</strong>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    if (notes) {
      html += `
        <div class="p-2.5 bg-white/70 rounded-lg border border-stone-200 text-[11px] text-stone-600">
          <strong>Poznámka k objednávce:</strong> ${notes}
        </div>
      `;
    }

    wizSummaryContent.innerHTML = html;

    // Price estimate
    let estPrice = 0;
    if (hasCake) {
      const portions = Number(wizCakePortions.value) || 12;
      estPrice += Math.round(portions * 95); // ~95 Kč/porce poctivého dortu
    }
    if (totalDesserts > 0) {
      estPrice += totalDesserts * 45; // ~45 Kč průměrná cena zákusku
    }
    wizSummaryPrice.textContent = `cca ${estPrice.toLocaleString('cs-CZ')} Kč`;
  }

  // Submit Order to backend API (s automatickým fallbackem pro GitHub Pages)
  async function submitWizardOrder() {
    const customer = wizCustomer.value.trim();
    const phone = wizPhone.value.trim();
    const email = wizEmail.value.trim();
    const date = wizPickupDate.value;
    const time = wizPickupTime.value || '10:00';
    const notes = wizNotes.value.trim();

    const hasCake = wizCakeEnable.checked;
    const dessertItems = Object.values(cart);
    const totalDesserts = dessertItems.reduce((acc, it) => acc + it.qty, 0);

    // Calculate estimated price
    let estPrice = 0;
    if (hasCake) {
      const portions = Number(wizCakePortions.value) || 12;
      estPrice += Math.round(portions * 95);
    }
    if (totalDesserts > 0) {
      estPrice += totalDesserts * 45;
    }

    const cakeNotes = wizCakeNotes.value.trim();
    const fullNotes = [
      cakeNotes ? `Dort: ${cakeNotes}` : '',
      notes ? `Poznámka: ${notes}` : '',
      totalDesserts > 0 ? `Zákusky: ${dessertItems.map(it => `${it.title} (${it.qty}ks)`).join(', ')}` : ''
    ].filter(Boolean).join(' | ');

    const orderData = {
      customer,
      phone,
      email,
      kind: hasCake ? (wizCakeKind.value + (totalDesserts > 0 ? ' + Zákusky' : '')) : 'Výběr zákusků',
      portions: hasCake ? (wizCakePortions.value || '12') : String(totalDesserts),
      shape: hasCake ? (wizCakeShape.value || 'Kulatý') : 'Mix',
      diameter: hasCake ? (wizCakeShape.value || '') : '',
      floors: hasCake ? (wizCakeFloors.value || '1') : '1',
      sponge: hasCake ? wizCakeSponge.value : '—',
      filling: hasCake ? wizCakeFilling.value : '—',
      cream: hasCake ? wizCakeCream.value : '',
      finish: hasCake ? wizCakeFinish.value : '',
      decor: hasCake ? wizCakeDecor.value : '',
      diet: hasCake ? wizCakeDiet.value : 'Standard',
      notes: fullNotes,
      pickup_date: date,
      pickup_time: time,
      price: String(estPrice),
      deposit: '0',
      status: 'Nová',
      cart_items: dessertItems
    };

    try {
      wizBtnNext.disabled = true;
      wizBtnNext.textContent = 'Odesílám...';

      let savedOrder = null;

      // Zkusit Node.js backend
      try {
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderData)
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success) savedOrder = json.data;
        }
      } catch (errApi) {
        // Fallback pro statický hosting jako GitHub Pages
      }

      // Pokud běžíme na GitHub Pages bez Node.js backendu
      if (!savedOrder) {
        savedOrder = {
          id: String(Date.now()).slice(-6),
          ...orderData,
          details: JSON.stringify({
            shape: orderData.shape,
            diameter: orderData.diameter,
            floors: orderData.floors,
            sponge: orderData.sponge,
            cream: orderData.cream,
            filling: orderData.filling,
            finish: orderData.finish,
            diet: orderData.diet,
            decor: orderData.decor,
            notes: orderData.notes
          }),
          created_at: new Date().toISOString()
        };
        orders.unshift(savedOrder);
        localStorage.setItem('madel_static_orders', JSON.stringify(orders));
      }

      wizardLastSubmittedOrder = savedOrder;
      wizSuccessId.textContent = `#${savedOrder.id}`;

      // Obnovit zobrazení
      loadOrders();

      // Vyčistit košík
      cart = {};
      saveCart();
      updateCartUI();
      renderProducts();

      // Zobrazit potvrzení
      setWizardStep(4);
      showToast('Objednávka byla úspěšně přijata do výroby! 🎂', '🎉');

    } catch (err) {
      alert('Chyba při odesílání objednávky: ' + err.message);
    } finally {
      wizBtnNext.disabled = false;
    }
  }

  // Setup Wizard button listeners
  if (closeWizardBtn) closeWizardBtn.addEventListener('click', closeWizard);
  if (wizBtnNext) wizBtnNext.addEventListener('click', handleWizardNext);
  if (wizBtnPrev) wizBtnPrev.addEventListener('click', handleWizardPrev);

  if (orderWizardModal) {
    orderWizardModal.addEventListener('click', (e) => {
      if (e.target === orderWizardModal) closeWizard();
    });
  }

  // Step 4 actions
  if (wizSuccessClose) wizSuccessClose.addEventListener('click', closeWizard);

  if (wizSuccessWhatsapp) {
    wizSuccessWhatsapp.addEventListener('click', () => {
      if (!wizardLastSubmittedOrder) return;
      const o = wizardLastSubmittedOrder;
      let text = `*Objednávka č. #${o.id} - Cukrářství Madel*\n`;
      text += `------------------------------------\n`;
      text += `👤 Zákazník: ${o.customer}\n`;
      text += `📞 Telefon: ${o.phone}\n`;
      text += `📅 Vyzvednutí: ${o.pickup_date} v ${o.pickup_time}\n`;
      text += `🎂 Zakázka: ${o.kind}\n`;
      text += `📝 Detaily: ${o.notes}\n`;
      text += `💰 Předpokládaná cena: ${o.price} Kč\n`;
      const url = `https://api.whatsapp.com/send?phone=420604707646&text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
    });
  }

  if (wizSuccessPrint) {
    wizSuccessPrint.addEventListener('click', () => {
      if (wizardLastSubmittedOrder) {
        printOrder(wizardLastSubmittedOrder.id);
      }
    });
  }


  // ========================================================
  // 4. INTERNÍ MANAGEMENT VÝROBNY & OBJEDNÁVEK
  // ========================================================
  const money = n => (Number(n) || 0).toLocaleString('cs-CZ') + ' Kč';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const dateFmt = s => s ? new Date(s + 'T12:00:00').toLocaleDateString('cs-CZ') : 'Bez data';

  function balance(o) {
    return Math.max(0, Number(o.price || 0) - Number(o.deposit || 0));
  }

  function getStatusClass(status) {
    switch ((status || '').toLowerCase()) {
      case 'nová': return 'ck-status-nova';
      case 'potvrzená': return 'ck-status-potvrzena';
      case 've výrobě': return 'ck-status-vyroba';
      case 'připravená': return 'ck-status-pripravena';
      case 'vydaná': return 'ck-status-vydana';
      case 'zrušená': return 'ck-status-zrusena';
      default: return 'ck-status-nova';
    }
  }

  function card(o) {
    const statusClass = getStatusClass(o.status);
    return `
      <article class="ck-order">
        <div class="ck-ordertop">
          <div>
            <strong>${esc(o.customer)}</strong>
            <div class="ck-meta">
              ${esc(o.kind)} • ${esc(o.portions)} porcí/ks<br>
              📅 <strong>${dateFmt(o.pickup_date)} ${esc(o.pickup_time)}</strong><br>
              ☎ <a href="tel:${esc(o.phone)}" class="text-[#AA821C] hover:underline font-semibold">${esc(o.phone)}</a>
              ${o.email ? ` • ✉️ ${esc(o.email)}` : ''}
              ${o.notes ? `<div class="mt-1 text-xs text-stone-500 italic truncate max-w-md">${esc(o.notes)}</div>` : ''}
            </div>
          </div>
          <span class="ck-pill ${statusClass}">${esc(o.status)}</span>
        </div>
        
        <div class="ck-orderbottom">
          <div>
            <div class="ck-price">${money(o.price)}</div>
            <div class="ck-meta text-xs">Záloha: ${money(o.deposit)} • <strong>Doplatek: ${money(balance(o))}</strong></div>
          </div>
          <div>
            <button class="ck-smallbtn" data-edit="${o.id}">Upravit</button>
            <button class="ck-smallbtn" data-print="${o.id}">🖨️ Tisk</button>
            <button class="ck-smallbtn hover:!bg-red-50 hover:!text-red-700" data-delete="${o.id}">Smazat</button>
          </div>
        </div>
      </article>
    `;
  }

  function bindCards(root) {
    root.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => editOrder(b.dataset.edit));
    root.querySelectorAll('[data-delete]').forEach(b => b.onclick = () => removeOrder(b.dataset.delete));
    root.querySelectorAll('[data-print]').forEach(b => b.onclick = () => printOrder(b.dataset.print));
  }

  function view(name) {
    document.querySelectorAll('.ck-view').forEach(x => x.hidden = true);
    const target = document.getElementById('ck-' + name);
    if (target) target.hidden = false;

    document.querySelectorAll('.ck-tabs button').forEach(b => {
      b.classList.toggle('active', b.dataset.view === name);
    });

    if (name === 'orders') renderOrdersList();
    if (name === 'calendar') renderCalendar();
    if (name === 'prep') renderPrep();
  }

  function renderOrdersList() {
    const q = (document.getElementById('ck-search')?.value || '').toLowerCase();
    const f = document.getElementById('ck-filter')?.value || '';

    const list = orders.filter(o => {
      const matchesFilter = !f || o.status === f;
      const searchPool = [o.customer, o.phone, o.kind, o.email, o.notes].join(' ').toLowerCase();
      const matchesSearch = searchPool.includes(q);
      return matchesFilter && matchesSearch;
    }).sort((a, b) => (a.pickup_date || '').localeCompare(b.pickup_date || ''));

    const container = document.getElementById('ck-orders-list');
    if (container) {
      container.innerHTML = list.length ? list.map(card).join('') : '<div class="ck-empty">Žádné odpovídající objednávky.</div>';
      bindCards(container);
    }
  }

  function renderCalendar() {
    const m = document.getElementById('ck-month')?.value || new Date().toISOString().slice(0, 7);
    const list = orders.filter(o => (o.pickup_date || '').startsWith(m))
      .sort((a, b) => ((a.pickup_date || '') + (a.pickup_time || '')).localeCompare((b.pickup_date || '') + (b.pickup_time || '')));

    const container = document.getElementById('ck-calendar-list');
    if (container) {
      container.innerHTML = list.length ? list.map(card).join('') : '<div class="ck-empty">V tomto měsíci nejsou žádné objednávky.</div>';
      bindCards(container);
    }
  }

  function renderPrep() {
    const list = orders.filter(o => !['Vydaná', 'Zrušená'].includes(o.status))
      .sort((a, b) => (a.pickup_date || '').localeCompare(b.pickup_date || ''));

    const rows = document.getElementById('ck-prep-rows');
    if (!rows) return;

    if (!list.length) {
      rows.innerHTML = '<tr><td colspan="11" class="ck-empty">Žádné aktivní objednávky k přípravě.</td></tr>';
      return;
    }

    rows.innerHTML = list.map(o => {
      let d = {};
      try {
        d = typeof o.details === 'string' ? JSON.parse(o.details || '{}') : (o.details || {});
      } catch (e) {
        d = {};
      }

      const cell = v => esc(v || '—');
      return `
        <tr>
          <td><strong>${dateFmt(o.pickup_date)}</strong><br><small class="text-stone-500">${esc(o.pickup_time)}</small></td>
          <td><strong>${cell(o.customer)}</strong><br><small>${cell(o.phone)}</small></td>
          <td><strong class="text-[#AA821C]">${cell(o.kind)}</strong>${o.portions ? ' • ' + esc(o.portions) + ' porcí/ks' : ''}</td>
          <td>${cell(d.diameter || o.diameter || d.shape || o.shape)}</td>
          <td>${cell(d.finish || o.finish)}</td>
          <td>${cell(d.floors || o.floors)}</td>
          <td>${cell(d.sponge || o.sponge)}</td>
          <td>${cell(d.filling || o.filling)}${d.cream || o.cream ? ' / ' + esc(d.cream || o.cream) : ''}</td>
          <td>${cell(d.decor || o.decor)}</td>
          <td class="text-xs text-stone-600">${cell(o.notes)}</td>
          <td><button class="ck-smallbtn" data-print="${o.id}">🖨️ Tisk</button></td>
        </tr>
      `;
    }).join('');

    bindCards(rows);
  }

  function renderAll() {
    const open = orders.filter(o => !['Vydaná', 'Zrušená'].includes(o.status));
    const countEl = document.getElementById('ck-count');
    const openEl = document.getElementById('ck-open');
    const dueEl = document.getElementById('ck-due');

    if (countEl) countEl.textContent = orders.length;
    if (openEl) openEl.textContent = open.length;
    if (dueEl) dueEl.textContent = money(open.reduce((s, o) => s + balance(o), 0));

    const upcoming = open.filter(o => o.pickup_date)
      .sort((a, b) => a.pickup_date.localeCompare(b.pickup_date))
      .slice(0, 5);

    const upCont = document.getElementById('ck-upcoming');
    if (upCont) {
      upCont.innerHTML = upcoming.length ? upcoming.map(card).join('') : '<div class="ck-empty">Zatím žádné objednávky k vyřízení.</div>';
      bindCards(upCont);
    }

    renderOrdersList();
    renderPrep();
  }

  const DEFAULT_DEMO_ORDERS = [
    {
      id: "1",
      customer: "Lucie Kratochvílová",
      phone: "+420 732 114 892",
      email: "lucie.k@seznam.cz",
      kind: "Svatební",
      portions: "45",
      shape: "Kulatý 3-patrový",
      diameter: "28 / 20 / 14 cm",
      floors: "3",
      sponge: "Vanilka (klasika světlý)",
      cream: "Vanilkové mascarpone",
      filling: "Mascarpone (+ ovoce)",
      finish: "Semi-naked krém",
      diet: "Standard",
      decor: "Živé pivoňky a eukalyptus, zlaté plátky",
      notes: "Nápis: L & M 2026. Vyzvedne svatební koordinátorka dopoledne.",
      pickup_date: "2026-11-14",
      pickup_time: "10:30",
      price: "4800",
      deposit: "2000",
      status: "Ve výrobě"
    },
    {
      id: "2",
      customer: "Tomáš Horák",
      phone: "+420 608 459 231",
      email: "tomas.horak@gmail.com",
      kind: "Narozeninový",
      portions: "16",
      shape: "Kulatý",
      diameter: "24 cm",
      floors: "1",
      sponge: "Belgická čokoláda",
      cream: "Čokoládový ganache",
      filling: "Pařížská náplň (+ marmeláda, ovoce)",
      finish: "Čokoládová poleva se stékáním",
      diet: "Standard",
      decor: "Čerstvé maliny, borůvky, makronky a zápich '50'",
      notes: "Text na tabulce: Všechno nejlepší k 50! Táto",
      pickup_date: "2026-11-15",
      pickup_time: "11:00",
      price: "1850",
      deposit: "1000",
      status: "Potvrzená"
    }
  ];

  async function loadOrders() {
    try {
      const res = await fetch('/api/orders');
      if (!res.ok) throw new Error('API nedostupné');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        orders = json.data;
        renderAll();
        return;
      }
    } catch (err) {
      // Fallback pro statický GitHub Pages hosting
      const local = JSON.parse(localStorage.getItem('madel_static_orders') || 'null');
      orders = local || DEFAULT_DEMO_ORDERS;
      renderAll();
    }
  }

  // Edit order
  function editOrder(id) {
    const o = orders.find(x => String(x.id) === String(id));
    const form = document.getElementById('ck-order-form');
    if (!o || !form) return;

    Object.keys(o).forEach(k => {
      if (form.elements[k]) form.elements[k].value = o[k] ?? '';
    });

    let d = {};
    try {
      d = typeof o.details === 'string' ? JSON.parse(o.details || '{}') : (o.details || {});
    } catch (e) {
      d = {};
    }

    Object.keys(d).forEach(k => {
      if (form.elements[k]) form.elements[k].value = d[k] ?? '';
    });

    document.getElementById('ck-form-title').textContent = `Upravit zakázku #${o.id} – ${o.customer}`;
    updateFormBalance();
    view('form');
  }

  async function removeOrder(id) {
    if (!confirm('Opravdu si přejete smazat tuto zakázku ze systému?')) return;
    try {
      await fetch(`/api/orders?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch (e) {}
    orders = orders.filter(o => String(o.id) !== String(id));
    localStorage.setItem('madel_static_orders', JSON.stringify(orders));
    renderAll();
    showToast('Objednávka byla smazána.', '🗑️');
  }

  function printOrder(id) {
    const o = orders.find(x => String(x.id) === String(id)) || wizardLastSubmittedOrder;
    if (!o) return;

    let d = {};
    try {
      d = typeof o.details === 'string' ? JSON.parse(o.details || '{}') : (o.details || {});
    } catch (e) {
      d = {};
    }

    const w = window.open('', '_blank');
    if (!w) {
      alert('Povolte vyskakovací okna v prohlížeči pro tisk zakázkového listu.');
      return;
    }

    w.document.write(`
      <!DOCTYPE html>
      <html lang="cs">
      <head>
        <meta charset="utf-8">
        <title>Zakázkový list #${o.id} - Cukrářství Madel</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; padding: 30px; color: #222; }
          .header { border-bottom: 2px solid #C59B27; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
          h1 { margin: 0; font-size: 24px; color: #3B2820; }
          .badge { background: #FAF5EB; border: 1px solid #C59B27; padding: 4px 10px; border-radius: 6px; font-weight: bold; font-size: 13px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
          .card { background: #fafafa; border: 1px solid #ddd; padding: 15px; border-radius: 8px; }
          h2 { margin-top: 0; font-size: 16px; border-bottom: 1px solid #eee; padding-bottom: 6px; color: #7B6256; text-transform: uppercase; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          td { padding: 6px 4px; vertical-align: top; border-bottom: 1px solid #eee; font-size: 14px; }
          td:first-child { font-weight: bold; color: #555; width: 35%; }
          .price-box { background: #F7EEDB; border: 1px solid #C59B27; padding: 15px; border-radius: 8px; margin-top: 20px; font-size: 16px; }
          .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 12px; color: #777; text-align: center; }
          @media print { body { padding: 10px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>🍰 Cukrářství Madel – Zakázkový list</h1>
            <small>Dolní Benešov - Zábřeh, Opavská 191 • Tel: +420 604 707 646</small>
          </div>
          <div class="badge">Objednávka #${esc(o.id)} • ${esc(o.status)}</div>
        </div>

        <div class="grid">
          <div class="card">
            <h2>👤 Zákazník</h2>
            <table>
              <tr><td>Jméno:</td><td><strong>${esc(o.customer)}</strong></td></tr>
              <tr><td>Telefon:</td><td>${esc(o.phone)}</td></tr>
              <tr><td>E-mail:</td><td>${esc(o.email || '—')}</td></tr>
            </table>
          </div>

          <div class="card">
            <h2>📅 Vyzvednutí</h2>
            <table>
              <tr><td>Datum:</td><td><strong>${dateFmt(o.pickup_date)}</strong></td></tr>
              <tr><td>Čas:</td><td><strong>${esc(o.pickup_time)}</strong></td></tr>
              <tr><td>Místo:</td><td>Prodejna Cukrářství Madel</td></tr>
            </table>
          </div>
        </div>

        <div class="card">
          <h2>🎂 Specifikace zakázky & dortu</h2>
          <table>
            <tr><td>Druh / popis:</td><td><strong>${esc(o.kind)}</strong></td></tr>
            <tr><td>Počet porcí / ks:</td><td>${esc(o.portions)}</td></tr>
            <tr><td>Korpus:</td><td><strong>${esc(d.sponge || o.sponge || '—')}</strong></td></tr>
            <tr><td>Náplň / krém:</td><td><strong>${esc(d.filling || o.filling || '—')}${d.cream || o.cream ? ' (' + esc(d.cream || o.cream) + ')' : ''}</strong></td></tr>
            <tr><td>Potah a dekorace:</td><td>${esc(d.finish || o.finish || '—')}, ${esc(d.decor || o.decor || '—')}</td></tr>
            <tr><td>Poznámky & nápis:</td><td><strong>${esc(o.notes || '—')}</strong></td></tr>
          </table>
        </div>

        <div class="price-box">
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span>Cena celkem:</span>
            <strong>${money(o.price)}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px; color: #555;">
            <span>Uhrazená záloha:</span>
            <span>${money(o.deposit)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 20px; font-weight: bold; border-top: 1px solid #C59B27; padding-top: 6px;">
            <span>Zbývá doplatit:</span>
            <span style="color: #AA821C;">${money(balance(o))}</span>
          </div>
        </div>

        <div class="footer">
          Vytištěno ze systému Cukrářství Madel • ${new Date().toLocaleString('cs-CZ')}
        </div>

        <script>
          window.onload = () => window.print();
        </script>
      </body>
      </html>
    `);
    w.document.close();
  }

  function updateFormBalance() {
    const form = document.getElementById('ck-order-form');
    if (!form) return;
    const p = Number(form.elements.price?.value) || 0;
    const d = Number(form.elements.deposit?.value) || 0;
    const balEl = document.getElementById('ck-balance');
    if (balEl) balEl.textContent = money(Math.max(0, p - d));
  }

  function setupInternalAppEvents() {
    const app = document.getElementById('cukrarna-app');
    if (!app) return;

    app.querySelectorAll('[data-view]').forEach(b => {
      b.addEventListener('click', () => view(b.dataset.view));
    });

    app.querySelectorAll('[data-goto]').forEach(b => {
      b.addEventListener('click', () => {
        const form = document.getElementById('ck-order-form');
        if (form) form.reset();
        document.getElementById('ck-form-title').textContent = 'Nová objednávka dortu';
        updateFormBalance();
        view('form');
      });
    });

    const form = document.getElementById('ck-order-form');
    if (form) {
      form.elements.price?.addEventListener('input', updateFormBalance);
      form.elements.deposit?.addEventListener('input', updateFormBalance);

      form.onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const data = {};
        fd.forEach((v, k) => data[k] = String(v));

        try {
          const res = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });
          const json = await res.json();
          if (!json.success) throw new Error(json.data?.message || 'Uložení se nezdařilo');

          await loadOrders();
          form.reset();
          view('orders');
          showToast('Zakázka byla uložena do systému! 🎂');
        } catch (err) {
          alert('Chyba: ' + err.message);
        }
      };
    }

    const cancelBtn = document.getElementById('ck-cancel');
    if (cancelBtn) {
      cancelBtn.onclick = () => view('overview');
    }

    const searchInput = document.getElementById('ck-search');
    if (searchInput) searchInput.oninput = renderOrdersList;

    const filterSelect = document.getElementById('ck-filter');
    if (filterSelect) filterSelect.onchange = renderOrdersList;

    const monthInput = document.getElementById('ck-month');
    if (monthInput) {
      monthInput.value = new Date().toISOString().slice(0, 7);
      monthInput.onchange = renderCalendar;
    }

    loadOrders();
  }

  // Fallback helpers for cart actions
  function sendWhatsAppFallback() {
    const items = Object.values(cart);
    if (items.length === 0) return showToast('Nejprve přidejte zákusky do košíku!', '⚠️');
    let text = `*Poptávka zákusků - Cukrářství Madel*\n`;
    items.forEach((it, idx) => {
      text += `${idx + 1}. ${it.title} — ${it.qty} ks\n`;
    });
    window.open(`https://api.whatsapp.com/send?phone=420604707646&text=${encodeURIComponent(text)}`, '_blank');
  }

  function copyListFallback() {
    const items = Object.values(cart);
    if (items.length === 0) return showToast('Košík je prázdný!', '⚠️');
    let text = `Objednávka Cukrářství Madel:\n` + items.map(it => `• ${it.title}: ${it.qty} ks`).join('\n');
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => showToast('Seznam byl zkopírován! 📋'));
    }
  }

  // DOM Ready
  document.addEventListener('DOMContentLoaded', () => {
    initCatalog();
    setupInternalAppEvents();
  });

})();
