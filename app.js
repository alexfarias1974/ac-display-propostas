// Application State & Configuration
let supabaseClient = null;
let isMockMode = true; // Default to mockup mode if Supabase credentials are not set
let isSignUpMode = false;
let currentUser = null;

// Conversion factors for leasing
let LEASING_FACTORS = {
  ti: {
    "12": 0.0791,
    "24": 0.0719,
    "36": 0.0654,
    "48": 0.0556
  },
  impressao: {
    "12": 0.0990,
    "24": 0.0900,
    "36": 0.0820,
    "48": 0.0740
  }
};

let SALE_FACTOR = parseFloat(localStorage.getItem('factor_sale')) || 2.04;

// Mock Database for local testing when Supabase is not connected
const MOCK_DB = {
  products: JSON.parse(localStorage.getItem('mock_products')) || [
    { id: '1', nome: 'Totem AC Display ISD 43"', preco: 3890.00 },
    { id: '2', nome: 'Totem AC Display MBM 55"', preco: 5120.00 },
    { id: '3', nome: 'Painel de LED Outdoor P3.91', preco: 14500.00 }
  ],
  saveProducts() {
    localStorage.setItem('mock_products', JSON.stringify(this.products));
  }
};

// Toast Notifications Helper
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✓' : '✗'}</span>
    <div>${message}</div>
  `;
  container.appendChild(toast);

  // Automatically remove toast after 4 seconds
  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s forwards reverse cubic-bezier(0.16, 1, 0.3, 1)';
    toast.addEventListener('animationend', () => toast.remove());
  }, 4000);
}

// Navigation Router
function navigate(viewId) {
  const views = ['view-auth', 'view-dashboard', 'view-products', 'view-proposals', 'view-settings'];
  views.forEach(id => {
    const el = document.getElementById(id);
    if (id === `view-${viewId}`) {
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  });

  // Load products list if navigating to product page or proposals page
  if (viewId === 'products' || viewId === 'proposals') {
    loadProducts();
  }

  // Pre-load settings inputs
  if (viewId === 'settings') {
    loadConfiguredFactors();
  }

  // Set proposal counter next badge on page title
  if (viewId === 'proposals') {
    const nextNum = getProposalCounter() + 1;
    const formattedNext = String(nextNum).padStart(4, '0');
    const titleEl = document.querySelector('#view-proposals .page-title');
    if (titleEl) {
      titleEl.innerHTML = `Criar Proposta <span style="font-size: 0.9rem; font-weight: normal; color: var(--magenta); margin-left: 10px;">(Próximo Nº: ${formattedNext})</span>`;
    }
  }
}

// Initialize Supabase Client
function initSupabase() {
  const url = localStorage.getItem('supabase_url');
  const anonKey = localStorage.getItem('supabase_anon_key');

  if (url && anonKey) {
    try {
      supabaseClient = window.supabase.createClient(url, anonKey);
      isMockMode = false;
      console.log("Supabase inicializado com sucesso.");
      
      // Update config inputs
      document.getElementById('supabase-url').value = url;
      document.getElementById('supabase-anon-key').value = anonKey;

      // Listen for Auth changes
      supabaseClient.auth.onAuthStateChange((event, session) => {
        if (session) {
          currentUser = session.user;
          document.getElementById('display-user-email').textContent = currentUser.email;
          navigate('dashboard');
        } else {
          currentUser = null;
          navigate('auth');
        }
      });
    } catch (err) {
      console.error("Erro ao inicializar Supabase, mudando para Modo Demonstração:", err);
      isMockMode = true;
      showToast("Erro nas chaves do Supabase. Entrando em Modo Demonstração.", "error");
    }
  } else {
    isMockMode = true;
    console.log("Sem chaves do Supabase. Executando em Modo Demonstração local.");
  }
}

// Auth State Toggle (Login <-> Cadastro)
function toggleAuthMode() {
  isSignUpMode = !isSignUpMode;
  const title = document.getElementById('auth-title');
  const subtitle = document.getElementById('auth-subtitle');
  const submitBtn = document.getElementById('btn-auth-submit');
  const switchText = document.getElementById('auth-switch-text');
  const switchLink = document.getElementById('auth-switch-link');

  if (isSignUpMode) {
    title.textContent = 'Criar Conta';
    subtitle.textContent = 'Cadastre-se rapidamente com e-mail e senha';
    submitBtn.textContent = 'Registrar-se';
    switchText.textContent = 'Já possui uma conta?';
    switchLink.textContent = 'Fazer Login';
  } else {
    title.textContent = 'Fazer Login';
    subtitle.textContent = 'Insira suas credenciais para continuar';
    submitBtn.textContent = 'Entrar';
    switchText.textContent = 'Não tem uma conta?';
    switchLink.textContent = 'Cadastre-se';
  }
}

// Handle Login or Register Form
async function handleAuthSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('auth-email').value;
  const password = document.getElementById('auth-password').value;
  const submitBtn = document.getElementById('btn-auth-submit');
  const originalText = submitBtn.textContent;

  submitBtn.disabled = true;
  submitBtn.innerHTML = `<span class="spinner"></span> Processando...`;

  if (isMockMode) {
    // Local Mock Authentication
    setTimeout(() => {
      currentUser = { email: email, id: 'mock-user-123' };
      document.getElementById('display-user-email').textContent = currentUser.email;
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
      showToast("Autenticado com sucesso (Modo de Demonstração Local)", "success");
      navigate('dashboard');
    }, 1000);
    return;
  }

  // Supabase Authentication
  try {
    if (isSignUpMode) {
      const { data, error } = await supabaseClient.auth.signUp({ email, password });
      if (error) throw error;
      showToast("Cadastro realizado! Confirme o e-mail se necessário.", "success");
      if (data.user) {
        currentUser = data.user;
        document.getElementById('display-user-email').textContent = currentUser.email;
        navigate('dashboard');
      }
    } else {
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) throw error;
      showToast("Login efetuado com sucesso!", "success");
      currentUser = data.user;
      document.getElementById('display-user-email').textContent = currentUser.email;
      navigate('dashboard');
    }
  } catch (error) {
    showToast(error.message || "Erro durante autenticação", "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}

// Google Auth Trigger
async function handleGoogleLogin() {
  if (isMockMode) {
    currentUser = { email: 'gmail.usuario@gmail.com', id: 'mock-user-google' };
    document.getElementById('display-user-email').textContent = currentUser.email;
    showToast("Autenticado via Google (Modo de Demonstração)", "success");
    navigate('dashboard');
    return;
  }

  try {
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
    });
    if (error) throw error;
  } catch (error) {
    showToast(error.message || "Erro no login social do Google", "error");
  }
}

// Logout Action
async function handleLogout() {
  if (!isMockMode && supabaseClient) {
    await supabaseClient.auth.signOut();
  }
  currentUser = null;
  showToast("Sessão encerrada.", "success");
  navigate('auth');
}

// Save Supabase Settings and Leasing Factors
function handleSettingsSubmit(e) {
  e.preventDefault();
  const url = document.getElementById('supabase-url').value.trim();
  const anonKey = document.getElementById('supabase-anon-key').value.trim();

  if (url && anonKey) {
    localStorage.setItem('supabase_url', url);
    localStorage.setItem('supabase_anon_key', anonKey);
    initSupabase();
  } else {
    localStorage.removeItem('supabase_url');
    localStorage.removeItem('supabase_anon_key');
    supabaseClient = null;
    isMockMode = true;
  }

  // Save lease factors
  const newTi = {
    "12": parseFloat(document.getElementById('factor-ti-12m').value) || 0.0791,
    "24": parseFloat(document.getElementById('factor-ti-24m').value) || 0.0719,
    "36": parseFloat(document.getElementById('factor-ti-36m').value) || 0.0654,
    "48": parseFloat(document.getElementById('factor-ti-48m').value) || 0.0556
  };

  const newImp = {
    "12": parseFloat(document.getElementById('factor-imp-12m').value) || 0.0990,
    "24": parseFloat(document.getElementById('factor-imp-24m').value) || 0.0900,
    "36": parseFloat(document.getElementById('factor-imp-36m').value) || 0.0820,
    "48": parseFloat(document.getElementById('factor-imp-48m').value) || 0.0740
  };

  const newSaleFactor = parseFloat(document.getElementById('factor-sale').value) || 2.04;

  localStorage.setItem('factors_ti', JSON.stringify(newTi));
  localStorage.setItem('factors_imp', JSON.stringify(newImp));
  localStorage.setItem('factor_sale', newSaleFactor.toString());
  
  LEASING_FACTORS.ti = newTi;
  LEASING_FACTORS.impressao = newImp;
  SALE_FACTOR = newSaleFactor;

  showToast("Configurações salvas com sucesso!", "success");
  navigate('dashboard');
}

// Load factors from localStorage or use defaults
function loadConfiguredFactors() {
  const storedTi = localStorage.getItem('factors_ti');
  const storedImp = localStorage.getItem('factors_imp');
  const storedSale = localStorage.getItem('factor_sale');

  const defaultTi = { "12": 0.0791, "24": 0.0719, "36": 0.0654, "48": 0.0556 };
  const defaultImp = { "12": 0.0990, "24": 0.0900, "36": 0.0820, "48": 0.0740 };

  if (storedTi) {
    LEASING_FACTORS.ti = { ...defaultTi, ...JSON.parse(storedTi) };
  } else {
    LEASING_FACTORS.ti = { ...defaultTi };
  }

  if (storedImp) {
    LEASING_FACTORS.impressao = { ...defaultImp, ...JSON.parse(storedImp) };
  } else {
    LEASING_FACTORS.impressao = { ...defaultImp };
  }

  if (storedSale) {
    SALE_FACTOR = parseFloat(storedSale);
  }

  const inputs = [
    { id: 'factor-ti-12m', val: LEASING_FACTORS.ti["12"] },
    { id: 'factor-ti-24m', val: LEASING_FACTORS.ti["24"] },
    { id: 'factor-ti-36m', val: LEASING_FACTORS.ti["36"] },
    { id: 'factor-ti-48m', val: LEASING_FACTORS.ti["48"] },
    
    { id: 'factor-imp-12m', val: LEASING_FACTORS.impressao["12"] },
    { id: 'factor-imp-24m', val: LEASING_FACTORS.impressao["24"] },
    { id: 'factor-imp-36m', val: LEASING_FACTORS.impressao["36"] },
    { id: 'factor-imp-48m', val: LEASING_FACTORS.impressao["48"] },

    { id: 'factor-sale', val: SALE_FACTOR }
  ];

  inputs.forEach(item => {
    const el = document.getElementById(item.id);
    if (el) {
      el.value = item.val;
    }
  });
}

// Caches all products for proposal search filter
let allProducts = [];

// Load Products
async function loadProducts() {
  // Check if elements exist since we can navigate to proposals page and table body might not be on screen
  const tableBody = document.getElementById('products-table-body');
  if (tableBody) {
    tableBody.innerHTML = `<tr><td colspan="2" class="text-center"><span class="spinner"></span> Carregando...</td></tr>`;
  }

  if (isMockMode) {
    allProducts = MOCK_DB.products;
    if (tableBody) renderProductsTable(MOCK_DB.products);
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from('produtos')
      .select('*')
      .order('nome', { ascending: true });

    if (error) throw error;
    
    allProducts = data;
    if (tableBody) {
      if (data.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="2" class="text-center" style="color: var(--text-secondary);">Nenhum produto cadastrado no momento.</td></tr>`;
      } else {
        renderProductsTable(data);
      }
    }
  } catch (error) {
    showToast("Erro ao carregar do Supabase: " + error.message, "error");
    if (tableBody) {
      tableBody.innerHTML = `<tr><td colspan="2" class="text-center" style="color: var(--magenta);">Erro ao conectar com o banco. Veja Configurações.</td></tr>`;
    }
  }
}

// Render Table Row Helper
function renderProductsTable(products) {
  const tableBody = document.getElementById('products-table-body');
  tableBody.innerHTML = '';

  products.forEach(p => {
    const tr = document.createElement('tr');
    const formattedPrice = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.preco);
    tr.innerHTML = `
      <td>${p.nome}</td>
      <td style="text-align: right; font-weight: 600; color: var(--blue);">${formattedPrice}</td>
    `;
    tableBody.appendChild(tr);
  });
}

// Add Single Product Manually
async function handleProductSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('prod-name').value;
  const price = parseFloat(document.getElementById('prod-price').value);

  if (isNaN(price) || price < 0) {
    showToast("Por favor, insira um preço válido.", "error");
    return;
  }

  const productData = { nome: name, preco: price };

  if (isMockMode) {
    productData.id = Date.now().toString();
    MOCK_DB.products.push(productData);
    MOCK_DB.saveProducts();
    showToast(`Produto "${name}" adicionado com sucesso!`, "success");
    document.getElementById('product-form').reset();
    loadProducts();
    return;
  }

  try {
    const { error } = await supabaseClient.from('produtos').insert([
      { ...productData, user_id: currentUser?.id }
    ]);

    if (error) throw error;

    showToast(`Produto "${name}" cadastrado no Supabase!`, "success");
    document.getElementById('product-form').reset();
    loadProducts();
  } catch (error) {
    showToast("Erro ao cadastrar produto: " + error.message, "error");
  }
}

// Read Spreadsheet & Process Data (Excel/CSV)
function processSpreadsheet(file) {
  const reader = new FileReader();

  reader.onload = async function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // Convert to JSON
      const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (json.length < 2) {
        showToast("A planilha parece estar vazia ou sem cabeçalhos.", "error");
        return;
      }

      // Map Headers to identify product name and price
      const headers = json[0].map(h => String(h).toLowerCase().trim());
      
      // Look for name column index
      const nameKeywords = ['produto', 'nome', 'product', 'name', 'descrição', 'descricao'];
      const priceKeywords = ['preço', 'preco', 'price', 'valor', 'value', 'custo'];

      let nameColIdx = headers.findIndex(h => nameKeywords.some(kw => h.includes(kw)));
      let priceColIdx = headers.findIndex(h => priceKeywords.some(kw => h.includes(kw)));

      // Fallback: If not found by keywords, assume 1st col = name, 2nd col = price
      if (nameColIdx === -1) nameColIdx = 0;
      if (priceColIdx === -1) priceColIdx = 1;

      const newProducts = [];
      for (let i = 1; i < json.length; i++) {
        const row = json[i];
        if (row.length === 0 || !row[nameColIdx]) continue; // Skip empty rows

        const rawPrice = row[priceColIdx];
        // Parse float from rawPrice (handles string formats with R$ or commas)
        let cleanPrice = 0;
        if (rawPrice !== undefined && rawPrice !== null) {
          if (typeof rawPrice === 'number') {
            cleanPrice = rawPrice;
          } else {
            const cleanStr = String(rawPrice).replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
            cleanPrice = parseFloat(cleanStr);
          }
        }

        newProducts.push({
          nome: String(row[nameColIdx]).trim(),
          preco: isNaN(cleanPrice) ? 0 : cleanPrice
        });
      }

      if (newProducts.length === 0) {
        showToast("Nenhum produto válido encontrado na planilha.", "error");
        return;
      }

      // Bulk Insert into Database
      if (isMockMode) {
        newProducts.forEach(p => {
          p.id = (Date.now() + Math.random()).toString();
          MOCK_DB.products.push(p);
        });
        MOCK_DB.saveProducts();
        showToast(`${newProducts.length} produtos importados com sucesso!`, "success");
        loadProducts();
      } else {
        // Insert to Supabase
        const supabaseData = newProducts.map(p => ({
          nome: p.nome,
          preco: p.preco,
          user_id: currentUser?.id
        }));

        const { error } = await supabaseClient.from('produtos').insert(supabaseData);
        if (error) throw error;
        showToast(`${newProducts.length} produtos cadastrados no Supabase!`, "success");
        loadProducts();
      }

      // Reset file input UI
      const dropzone = document.getElementById('dropzone');
      dropzone.classList.remove('dragover');
      document.getElementById('file-info-container').classList.add('hidden');

    } catch (error) {
      showToast("Erro ao processar planilha: " + error.message, "error");
    }
  };

  reader.readAsArrayBuffer(file);
}

// Setup Event Listeners
function setupEvents() {
  const safeBind = (id, event, handler) => {
    const el = document.getElementById(id);
    if (!el) {
      console.error(`Erro: Elemento com ID "${id}" não foi encontrado no HTML.`);
      throw new Error(`Elemento com ID "${id}" não foi encontrado no HTML.`);
    }
    el.addEventListener(event, handler);
  };

  // Routing Switches
  safeBind('auth-switch-link', 'click', (e) => {
    e.preventDefault();
    toggleAuthMode();
  });

  // Auth Submit
  safeBind('auth-form', 'submit', handleAuthSubmit);
  safeBind('btn-google-login', 'click', handleGoogleLogin);
  safeBind('btn-logout', 'click', handleLogout);

  // Settings Submit
  safeBind('settings-form', 'submit', handleSettingsSubmit);

  // Manual Product Submit
  safeBind('product-form', 'submit', handleProductSubmit);
  safeBind('btn-refresh-products', 'click', loadProducts);

  // Dashboard Nav Links
  safeBind('card-products', 'click', () => navigate('products'));
  safeBind('card-proposals', 'click', () => navigate('proposals'));
  safeBind('card-settings', 'click', () => navigate('settings'));

  // Drag and Drop implementation
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('file-input');
  const btnSelectFile = document.getElementById('btn-select-file');

  if (!dropzone || !fileInput || !btnSelectFile) {
    throw new Error('Componentes da área de importação de planilha não foram encontrados no HTML.');
  }

  btnSelectFile.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      const file = e.target.files[0];
      displayFileInfo(file);
      processSpreadsheet(file);
    }
  });

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      displayFileInfo(file);
      processSpreadsheet(file);
    }
  });

  // Initialize Proposal Events
  try {
    setupProposalEvents();
  } catch (error) {
    console.error("Erro ao configurar eventos de proposta:", error);
  }
}

// Display File Metadata in UI
function displayFileInfo(file) {
  const container = document.getElementById('file-info-container');
  if (container) {
    container.classList.remove('hidden');
    container.innerHTML = `
      <div class="file-info">
        <span>📄</span>
        <div style="flex: 1; text-align: left;">
          <div style="font-weight: 600;">${file.name}</div>
          <div style="font-size: 0.75rem; color: var(--text-secondary);">${(file.size / 1024).toFixed(1)} KB</div>
        </div>
      </div>
    `;
  }
}

// Proposal Counter Helpers
function getProposalCounter() {
  const userKey = currentUser ? (currentUser.email || currentUser.id) : 'default';
  return parseInt(localStorage.getItem('proposal_counter_' + userKey)) || 0;
}

function incrementProposalCounter() {
  const userKey = currentUser ? (currentUser.email || currentUser.id) : 'default';
  const current = getProposalCounter();
  const nextVal = current + 1;
  localStorage.setItem('proposal_counter_' + userKey, nextVal.toString());
  return nextVal;
}

// Proposal Search Filter & Form Handling
let currentProposalItems = [];

function setupProposalEvents() {
  const searchInput = document.getElementById('prop-product-search');
  const resultsDiv = document.getElementById('prop-product-results');
  const selectedIdInput = document.getElementById('prop-selected-product-id');
  const qtyInput = document.getElementById('prop-quantity');
  const btnAddItem = document.getElementById('btn-add-item');
  const itemsBody = document.getElementById('proposal-items-body');
  const proposalForm = document.getElementById('proposal-form');

  if (!searchInput || !resultsDiv || !selectedIdInput || !qtyInput || !btnAddItem || !itemsBody || !proposalForm) return;

  // Calculate and display monthly lease values based on active factors and items
  function updateLeasingSimulation() {
    const resultsSection = document.getElementById('simulation-results-section');
    const cardsContainer = document.getElementById('simulation-results-cards');
    
    if (!resultsSection || !cardsContainer) return;

    if (currentProposalItems.length === 0) {
      resultsSection.classList.add('hidden');
      return;
    }

    const totalCost = currentProposalItems.reduce((sum, item) => sum + (item.preco * item.qty), 0);
    const isImpSelected = document.getElementById('switch-factor-type').checked;
    const isSaleEnabled = document.getElementById('switch-sale-enabled').checked;
    
    // Update factor labels styles to highlight the active factor
    const labelTi = document.getElementById('label-factor-ti');
    const labelImp = document.getElementById('label-factor-imp');
    if (labelTi && labelImp) {
      if (isImpSelected) {
        labelTi.style.opacity = '0.5';
        labelTi.style.fontWeight = 'normal';
        labelTi.style.color = 'var(--text-primary)';
        labelImp.style.opacity = '1';
        labelImp.style.fontWeight = '700';
        labelImp.style.color = 'var(--blue)';
      } else {
        labelImp.style.opacity = '0.5';
        labelImp.style.fontWeight = 'normal';
        labelImp.style.color = 'var(--text-primary)';
        labelTi.style.opacity = '1';
        labelTi.style.fontWeight = '700';
        labelTi.style.color = 'var(--blue)';
      }
    }

    const factors = isImpSelected ? LEASING_FACTORS.impressao : LEASING_FACTORS.ti;
    
    // Check which terms are active
    const terms = [
      { key: "12", id: "switch-12m", name: "12 Meses" },
      { key: "24", id: "switch-24m", name: "24 Meses" },
      { key: "36", id: "switch-36m", name: "36 Meses" },
      { key: "48", id: "switch-48m", name: "48 Meses" }
    ];

    cardsContainer.innerHTML = '';
    let hasActiveTerm = false;

    // 1. Direct Sale Option Card
    if (isSaleEnabled) {
      hasActiveTerm = true;
      const saleCost = totalCost * SALE_FACTOR;
      const saleCostFormatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(saleCost);
      const card = document.createElement('div');
      card.className = 'simulation-value-card';
      card.style.borderColor = 'var(--magenta)';
      card.innerHTML = `
        <span class="sim-term" style="color: var(--magenta);">Venda Direta</span>
        <span class="sim-price" style="background: linear-gradient(135deg, var(--magenta) 0%, #ff66b2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">${saleCostFormatted}</span>
        <span style="font-size: 0.75rem; color: var(--text-secondary);">Fator: ${SALE_FACTOR.toFixed(2)}</span>
      `;
      cardsContainer.appendChild(card);
    }

    // 2. Leasing Terms Cards
    terms.forEach(term => {
      const isChecked = document.getElementById(term.id).checked;
      if (isChecked) {
        hasActiveTerm = true;
        const factorValue = factors[term.key] || 0;
        const monthlyCost = totalCost * factorValue;
        const monthlyCostFormatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(monthlyCost);

        const card = document.createElement('div');
        card.className = 'simulation-value-card';
        card.innerHTML = `
          <span class="sim-term">${term.name}</span>
          <span class="sim-price">${monthlyCostFormatted}</span>
          <span style="font-size: 0.75rem; color: var(--text-secondary);">Fator: ${factorValue.toFixed(4)}</span>
        `;
        cardsContainer.appendChild(card);
      }
    });

    if (hasActiveTerm) {
      resultsSection.classList.remove('hidden');
    } else {
      resultsSection.classList.add('hidden');
    }
  }

  // Render Added Items Table (3 Columns: Name, Qty, Actions)
  function renderProposalItems() {
    itemsBody.innerHTML = '';

    if (currentProposalItems.length === 0) {
      itemsBody.innerHTML = `
        <tr>
          <td colspan="3" class="text-center" style="color: var(--text-secondary); padding: 20px;">
            Nenhum produto adicionado à proposta.
          </td>
        </tr>
      `;
      updateLeasingSimulation();
      return;
    }

    currentProposalItems.forEach((item, index) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${item.nome}</td>
        <td style="text-align: center;">${item.qty}</td>
        <td style="text-align: center;">
          <button type="button" class="btn-edit-item" data-index="${index}">Editar</button>
          <button type="button" class="btn-delete-item" data-index="${index}">Excluir</button>
        </td>
      `;
      itemsBody.appendChild(tr);
    });

    updateLeasingSimulation();
  }

  // Edit & Remove Item Handlers
  itemsBody.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-delete-item')) {
      const index = parseInt(e.target.dataset.index);
      const removedItem = currentProposalItems[index];
      currentProposalItems.splice(index, 1);
      renderProposalItems();
      showToast(`Produto "${removedItem.nome}" removido.`, "success");
    } else if (e.target.classList.contains('btn-edit-item')) {
      const index = parseInt(e.target.dataset.index);
      const item = currentProposalItems[index];
      const newQtyInput = prompt(`Editar quantidade para "${item.nome}":`, item.qty);
      if (newQtyInput === null) return;
      const newQty = parseInt(newQtyInput);
      if (isNaN(newQty) || newQty < 1) {
        showToast("Por favor, insira uma quantidade válida.", "error");
        return;
      }
      item.qty = newQty;
      renderProposalItems();
      showToast(`Quantidade de "${item.nome}" atualizada para ${newQty}.`, "success");
    }
  });

  // Add Item to Proposal
  btnAddItem.addEventListener('click', () => {
    const selectedId = selectedIdInput.value;
    const searchVal = searchInput.value.trim();
    const qty = parseInt(qtyInput.value);

    if (isNaN(qty) || qty < 1) {
      showToast("Por favor, insira uma quantidade válida.", "error");
      return;
    }

    // Find the product in allProducts
    let product = null;
    if (selectedId) {
      product = allProducts.find(p => p.id === selectedId);
    }
    
    // Fallback search by exact name if ID is missing (e.g. typed without clicking)
    if (!product && searchVal) {
      product = allProducts.find(p => p.nome.toLowerCase() === searchVal.toLowerCase());
    }

    if (!product) {
      showToast("Por favor, selecione um produto válido da lista.", "error");
      return;
    }

    // Check if product already added, if so, increase quantity
    const existingIndex = currentProposalItems.findIndex(item => item.id === product.id);
    if (existingIndex > -1) {
      currentProposalItems[existingIndex].qty += qty;
    } else {
      currentProposalItems.push({
        id: product.id,
        nome: product.nome,
        preco: product.preco,
        qty: qty
      });
    }

    renderProposalItems();
    showToast(`Adicionado: ${qty}x "${product.nome}"`, "success");

    // Clear inputs
    searchInput.value = '';
    selectedIdInput.value = '';
    qtyInput.value = 1;
  });

  // Show all products or filter on focus/click
  searchInput.addEventListener('focus', () => {
    const query = searchInput.value.toLowerCase().trim();
    const filtered = query 
      ? allProducts.filter(p => p.nome.toLowerCase().includes(query))
      : allProducts;

    if (filtered.length === 0) {
      resultsDiv.innerHTML = `<div class="search-item" style="color: var(--text-secondary); cursor: default;">Nenhum produto encontrado</div>`;
    } else {
      resultsDiv.innerHTML = filtered.map(p => `
        <div class="search-item" data-id="${p.id}" data-name="${p.nome}" data-price="${p.preco}">
          ${p.nome}
        </div>
      `).join('');
    }
    resultsDiv.classList.remove('hidden');
  });

  // Filter products on typing
  searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase().trim();
    const filtered = allProducts.filter(p => p.nome.toLowerCase().includes(query));

    if (filtered.length === 0) {
      resultsDiv.innerHTML = `<div class="search-item" style="color: var(--text-secondary); cursor: default;">Nenhum produto encontrado</div>`;
    } else {
      resultsDiv.innerHTML = filtered.map(p => `
        <div class="search-item" data-id="${p.id}" data-name="${p.nome}" data-price="${p.preco}">
          ${p.nome}
        </div>
      `).join('');
    }
    resultsDiv.classList.remove('hidden');
  });

  // Select item from dropdown
  resultsDiv.addEventListener('click', (e) => {
    const item = e.target.closest('.search-item');
    if (item && item.dataset.id) {
      searchInput.value = item.dataset.name;
      selectedIdInput.value = item.dataset.id;
      resultsDiv.classList.add('hidden');
      showToast(`Produto selecionado: ${item.dataset.name}`, "success");
    }
  });

  // Hide dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !resultsDiv.contains(e.target)) {
      resultsDiv.classList.add('hidden');
    }
  });

  // Listeners for simulation configuration updates
  document.getElementById('switch-factor-type').addEventListener('change', updateLeasingSimulation);
  document.getElementById('switch-sale-enabled').addEventListener('change', updateLeasingSimulation);
  document.getElementById('switch-12m').addEventListener('change', updateLeasingSimulation);
  document.getElementById('switch-24m').addEventListener('change', updateLeasingSimulation);
  document.getElementById('switch-36m').addEventListener('change', updateLeasingSimulation);
  document.getElementById('switch-48m').addEventListener('change', updateLeasingSimulation);

  // Handle Proposal Submission
  proposalForm.addEventListener('submit', (e) => {
    e.preventDefault();

    if (currentProposalItems.length === 0) {
      showToast("Adicione pelo menos um produto à proposta.", "error");
      return;
    }

    const client = document.getElementById('prop-client-name').value.trim();
    const cnpj = document.getElementById('prop-cnpj').value.trim();
    const service = document.getElementById('prop-service').value.trim();

    // Get checked contract terms
    const terms = [];
    if (document.getElementById('switch-12m').checked) terms.push("12 meses");
    if (document.getElementById('switch-24m').checked) terms.push("24 meses");
    if (document.getElementById('switch-36m').checked) terms.push("36 meses");
    if (document.getElementById('switch-48m').checked) terms.push("48 meses");

    const isSaleEnabled = document.getElementById('switch-sale-enabled').checked;
    if (isSaleEnabled) {
      terms.push("venda direta");
    }

    if (terms.length === 0) {
      showToast("Selecione pelo menos uma opção de comercialização.", "error");
      return;
    }

    // Increment Counter
    const newNum = incrementProposalCounter();
    const formattedNum = String(newNum).padStart(4, '0');
    const dateStr = new Date().toLocaleDateString('pt-BR');

    // Update Counter badge live
    const nextNum = newNum + 1;
    const formattedNext = String(nextNum).padStart(4, '0');
    const titleEl = document.querySelector('#view-proposals .page-title');
    if (titleEl) {
      titleEl.innerHTML = `Criar Proposta <span style="font-size: 0.9rem; font-weight: normal; color: var(--magenta); margin-left: 10px;">(Próximo Nº: ${formattedNext})</span>`;
    }

    // Calculate Prices
    const totalCost = currentProposalItems.reduce((sum, item) => sum + (item.preco * item.qty), 0);
    const isImpSelected = document.getElementById('switch-factor-type').checked;
    const leaseFactors = isImpSelected ? LEASING_FACTORS.impressao : LEASING_FACTORS.ti;
    const factorTypeName = isImpSelected ? "Fator Impressão" : "Fator TI";

    // Build items rows
    const itemsRows = currentProposalItems.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e0e0e0; font-size: 11pt; color: #333;">${item.nome}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e0e0e0; text-align: center; font-size: 11pt; color: #333; font-weight: 600;">${item.qty}</td>
      </tr>
    `).join('');

    // Build Pricing Options
    let pricingHTML = '';
    
    if (isSaleEnabled) {
      const saleCost = totalCost * SALE_FACTOR;
      const saleCostFormatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(saleCost);
      pricingHTML += `
        <div style="margin-bottom: 20px; padding: 15px; background-color: #fcf0f7; border-left: 4px solid #ff007f; border-radius: 4px;">
          <h4 style="margin: 0 0 5px 0; font-size: 11pt; color: #ff007f; text-transform: uppercase; letter-spacing: 0.5px;">Opção de Venda Direta (Aquisição)</h4>
          <span style="font-size: 20pt; font-weight: 800; color: #0a1128;">${saleCostFormatted}</span>
          <span style="font-size: 9pt; color: #666; display: block; margin-top: 5px;">* Pagamento único. Equipamentos tornam-se de propriedade do cliente.</span>
        </div>
      `;
    }

    // Leasing options
    const activeTerms = [];
    const checkableTerms = [
      { key: "12", id: "switch-12m", name: "12 Meses" },
      { key: "24", id: "switch-24m", name: "24 Meses" },
      { key: "36", id: "switch-36m", name: "36 Meses" },
      { key: "48", id: "switch-48m", name: "48 Meses" }
    ];
    
    checkableTerms.forEach(term => {
      if (document.getElementById(term.id).checked) {
        const factorValue = leaseFactors[term.key] || 0;
        const monthlyCost = totalCost * factorValue;
        const monthlyCostFormatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(monthlyCost);
        activeTerms.push({ name: term.name, val: monthlyCostFormatted });
      }
    });

    if (activeTerms.length > 0) {
      const leaseRows = activeTerms.map(t => `
        <div style="flex: 1; min-width: 120px; padding: 12px; background-color: #f0faff; border-top: 4px solid #00f0ff; border-radius: 4px; text-align: center;">
          <span style="font-size: 9pt; color: #666; text-transform: uppercase; font-weight: 700;">${t.name}</span>
          <span style="display: block; font-size: 14pt; font-weight: 800; color: #0a1128; margin-top: 5px;">${t.val}</span>
          <span style="font-size: 8pt; color: #0088cc;">/ mês</span>
        </div>
      `).join('');

      pricingHTML += `
        <div style="margin-bottom: 20px; padding: 15px; background-color: #fafbfc; border: 1px solid #e0e0e0; border-radius: 4px;">
          <h4 style="margin: 0 0 10px 0; font-size: 11pt; color: #0088cc; text-transform: uppercase; letter-spacing: 0.5px;">Opção de Locação Mensal (Outsourcing)</h4>
          <div style="display: flex; gap: 15px; flex-wrap: wrap;">
            ${leaseRows}
          </div>
          <span style="font-size: 9pt; color: #666; display: block; margin-top: 10px;">* Valores mensais fixos. Inclui suporte, substituição rápida de equipamentos (SLA) e assistência técnica integral durante a vigência do contrato.</span>
        </div>
      `;
    }

    // PDF Main Template
    const pdfTemplate = `
      <div style="font-family: 'Helvetica Neue', 'Helvetica', 'Arial', sans-serif; padding: 10px 40px 40px 40px; color: #0a1128; max-width: 800px; margin: 0 auto; background-color: #ffffff; box-sizing: border-box;">
        <!-- Header -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
          <tr>
            <td style="vertical-align: middle;">
              <img src="logo.png" style="height: 190px; object-fit: contain; display: block;">
            </td>
            <td style="text-align: right; vertical-align: middle;">
              <div style="font-size: 12px; text-transform: uppercase; font-weight: 700; color: #666; letter-spacing: 0.5px;">Proposta Comercial</div>
              <div style="font-size: 18px; font-weight: 800; color: #ff007f; margin-top: 2px;">Nº ${formattedNum}</div>
              <div style="font-size: 10px; color: #888; margin-top: 2px;">Emissão: ${dateStr}</div>
            </td>
          </tr>
        </table>

        <div style="border-top: 2px solid #0a1128; margin-bottom: 15px;"></div>

        <!-- Customer Section -->
        <h3 style="font-size: 12pt; text-transform: uppercase; color: #0a1128; margin-bottom: 10px; font-weight: 800; letter-spacing: 0.5px;">Dados do Cliente</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; background-color: #fafbfc; border-radius: 4px; border: 1px solid #e0e0e0;">
          <tr>
            <td style="padding: 12px; font-size: 10pt; color: #555; width: 120px; font-weight: 700; border-bottom: 1px solid #e0e0e0;">Cliente:</td>
            <td style="padding: 12px; font-size: 10pt; color: #0a1128; border-bottom: 1px solid #e0e0e0; font-weight: 600;">${client}</td>
          </tr>
          <tr>
            <td style="padding: 12px; font-size: 10pt; color: #555; font-weight: 700; border-bottom: 1px solid #e0e0e0;">CNPJ:</td>
            <td style="padding: 12px; font-size: 10pt; color: #0a1128; border-bottom: 1px solid #e0e0e0;">${cnpj}</td>
          </tr>
          <tr>
            <td style="padding: 12px; font-size: 10pt; color: #555; font-weight: 700;">Serviço:</td>
            <td style="padding: 12px; font-size: 10pt; color: #0a1128; font-style: italic;">${service}</td>
          </tr>
        </table>

        <!-- Scope Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 35px;">
          <thead>
            <tr style="border-bottom: 2px solid #0a1128; color: #0a1128;">
              <th style="padding: 12px 10px; text-align: left; font-size: 13pt; font-weight: 800;">Produto / Descrição</th>
              <th style="padding: 12px 10px; text-align: center; font-size: 13pt; font-weight: 800; width: 100px;">Qtd</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <!-- Commercial Conditions Section -->
        <h3 style="font-size: 12pt; text-transform: uppercase; color: #0a1128; margin-bottom: 15px; font-weight: 800; letter-spacing: 0.5px;">Condições Comerciais Propostas</h3>
        ${pricingHTML}

        <!-- General Conditions -->
        <h3 style="font-size: 10pt; text-transform: uppercase; color: #0a1128; margin-top: 30px; margin-bottom: 8px; font-weight: 800; letter-spacing: 0.5px;">Observações e Condições Gerais</h3>
        <ul style="font-size: 9pt; color: #555; line-height: 1.5; margin: 0 0 40px 0; padding-left: 20px;">
          <li>Validade desta proposta: 10 (dez) dias corridos a contar da data de emissão.</li>
          <li>Prazo de entrega e início da operação: a combinar conforme cronograma técnico da contratada.</li>
          <li>Para a opção de locação, a manutenção corretiva e preventiva está integralmente coberta por nossa equipe, sem custos adicionais.</li>
          <li>O fornecimento de infraestrutura elétrica e pontos de rede necessários no local da instalação é de responsabilidade do cliente contratante.</li>
        </ul>

        <!-- Signatures -->
        <table style="width: 100%; margin-top: 60px; border-collapse: collapse;">
          <tr>
            <td style="width: 45%; text-align: center; vertical-align: top;">
              <div style="border-top: 1px solid #888; width: 80%; margin: 0 auto 5px auto;"></div>
              <div style="font-size: 9pt; font-weight: 700; color: #0a1128;">AC DISPLAY</div>
              <div style="font-size: 8pt; color: #666;">Departamento Comercial</div>
            </td>
            <td style="width: 10%;"></td>
            <td style="width: 45%; text-align: center; vertical-align: top;">
              <div style="border-top: 1px solid #888; width: 80%; margin: 0 auto 5px auto;"></div>
              <div style="font-size: 9pt; font-weight: 700; color: #0a1128;">De Acordo: ${client}</div>
              <div style="font-size: 8pt; color: #666;">Assinatura e Carimbo (Responsável)</div>
            </td>
          </tr>
        </table>
      </div>
    `;

    // html2pdf options
    const opt = {
      margin:       [2, 10, 10, 10],
      filename:     `proposta_ACDisplay_N${formattedNum}_${client.replace(/\s+/g, '_')}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = pdfTemplate;
    // Append off-screen so layout calculations can run properly, preventing blank images/broken DOM
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '-9999px';
    document.body.appendChild(tempDiv);
    
    showToast("Gerando PDF da proposta comercial...", "success");

    html2pdf().set(opt).from(tempDiv).save().then(() => {
      showToast(`Proposta Nº ${formattedNum} gerada com sucesso!`, "success");
    }).catch(err => {
      console.error(err);
      showToast("Erro ao gerar arquivo PDF.", "error");
    }).finally(() => {
      // Remove temporary element
      tempDiv.remove();
      // Remove any leftover html2pdf container overlays that block page clicks
      document.querySelectorAll('.html2pdf__container').forEach(el => el.remove());
      // Force pointer-events back to auto on body/document to prevent lockups
      document.body.style.pointerEvents = 'auto';
      document.documentElement.style.pointerEvents = 'auto';
    });
  });
}

// Expose navigate globally
window.navigate = navigate;

// Startup
document.addEventListener('DOMContentLoaded', () => {
  console.log("DOM totalmente carregado. Inicializando scripts...");
  try {
    loadConfiguredFactors();
    setupEvents();
    console.log("Eventos e fatores de locação configurados.");
  } catch (error) {
    console.error("Erro ao configurar eventos e fatores:", error);
  }

  try {
    initSupabase();
    console.log("Supabase inicializado/verificado.");
  } catch (error) {
    console.error("Erro ao inicializar Supabase:", error);
    isMockMode = true;
  }
});
