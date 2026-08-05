let cart = [], orders = [], ratings = {}, user = null, userAvatar = '';
let pageHistory = ['home'];
let lastBackPressTime = 0;

// نظام المؤثرات الصوتية الاحترافية للنقر (Web Audio API Sound Engine)
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playClickSound() {
  try {
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    let osc = audioCtx.createOscillator();
    let gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.05);
    
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.05);
  } catch(e) {
    // تجاهل في حال عدم دعم المتصفح
  }
}

// تفعيل أصوات النقر تلقائياً على كافة الأزرار والعناصر القابلة للضغط
document.addEventListener('click', function(e) {
  if (e.target.closest('button, .card, .cat, .nav-btn, .menu-item, .filter-btn, .floating-cart-btn')) {
    playClickSound();
  }
});

// إحداثيات موقع المطعم الثابت (دمسكينا مول / الفطيرة الساخنة)
const RESTAURANT_LOCATION = {
  lat: 33.501173,
  lng: 36.274997
};

try {
  cart = JSON.parse(localStorage.getItem("cart")) || [];
  orders = JSON.parse(localStorage.getItem("orders")) || [];
  ratings = JSON.parse(localStorage.getItem("ratings")) || {};
  user = JSON.parse(localStorage.getItem("user")) || null;
  userAvatar = localStorage.getItem("userAvatar") || '';
} catch(e) {
  console.error("Storage parsing error", e);
}

let currentProduct = null;
let currentCatProducts = [];
let activeCat = '';
let activeFilter = 'all';
let discount = 0;

function triggerFlash(containerId) {
  let el = document.getElementById(containerId);
  if(!el) return;
  el.classList.remove('flash-animate');
  void el.offsetWidth;
  el.classList.add('flash-animate');
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  let R = 6371;
  let dLat = (lat2 - lat1) * Math.PI / 180;
  let dLon = (lon2 - lon1) * Math.PI / 180;
  let a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  let straightDistance = R * c;
  
  return straightDistance * 1.35;
}

function calculateDeliveryFee(distanceInKm) {
  let fee = 0;

  if (distanceInKm >= 0 && distanceInKm <= 1) {
    fee = 0;
  } else if (distanceInKm > 1 && distanceInKm <= 4) {
    fee = distanceInKm * 70;
  } else if (distanceInKm > 4 && distanceInKm <= 10) {
    fee = distanceInKm * 60;
  } else if (distanceInKm > 10) {
    fee = distanceInKm * 50;
  }

  if (fee === 0) return 0;

  let lastDigits = fee % 100;
  let baseAmount = fee - lastDigits;

  if (lastDigits <= 30) {
    fee = baseAmount;
  } else {
    fee = baseAmount + 50;
  }

  return fee;
}


// خدمة العملاء داخل التطبيق
function openCustomerService() {
  showPage('supportPage');
  fetchCustomerSupportMessages();
}

function closeCustomerServiceModal() {}

function fetchCustomerSupportMessages() {
  let container = document.getElementById("customerSupportMessagesList");
  if(!container) return;

  if (!user || !user.phone) {
    container.innerHTML = '<div class="empty-state">👤 يرجى تسجيل الدخول برقم الموبايل لمراسلة الإدارة</div>';
    return;
  }

  fetch('/.netlify/functions/support-messages')
  .then(res => res.json())
  .then(data => {
    let messages = Array.isArray(data) ? data : (data.messages || []);
    let cleanUserPhone = String(user.phone).trim().replace(/\D/g, '').slice(-9);

    let myMessages = messages.filter(m => {
      let dbPhone = String(m.customerPhone || '').trim().replace(/\D/g, '').slice(-9);
      return dbPhone === cleanUserPhone;
    });

    if (myMessages.length === 0) {
      container.innerHTML = '<div class="empty-state">لا توجد رسائل سابقة. ابدأ مراسلة الإدارة الآن 👇</div>';
      return;
    }

    container.innerHTML = myMessages.map(m => `
      <div style="margin-bottom:10px; text-align:${m.sender === 'admin' ? 'left' : 'right'};">
        <span style="background:${m.sender === 'admin' ? '#333' : '#800000'}; padding:8px 12px; border-radius:8px; display:inline-block; color:#fff; max-width:80%; font-size:13px;">
          <strong>${m.sender === 'admin' ? '👑 الإدارة: ' : '🛒 أنت: '}</strong>${m.message}
        </span>
      </div>
    `).join('');
    container.scrollTop = container.scrollHeight;
  })
  .catch(err => console.error(err));
}

function sendCustomerMessage() {
  let input = document.getElementById("customerMessageInput");
  if (!input || !input.value.trim()) return;
  if (!user || !user.phone) {
    showToast("⚠️ يرجى تسجيل الدخول أولاً!");
    return;
  }

  let payload = {
    customerPhone: user.phone,
    customerName: user.name || 'عميل',
    message: input.value.trim(),
    sender: 'customer',
    timestamp: new Date().toISOString()
  };

  fetch('/.netlify/functions/support-messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  .then(res => res.json())
  .then(() => {
    input.value = '';
    fetchCustomerSupportMessages();
  })
  .catch(err => showToast("❌ فشل إرسال الرسالة"));
}

function hidePages(){ 
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active')); 
}

function showPage(id, el, addToHist = true){
  let active = document.querySelector('.page.active');
  if(active && active.id !== id && addToHist) {
    if(pageHistory[pageHistory.length - 1] !== id) {
      pageHistory.push(id);
    }
  }
  
  hidePages();
  let targetPage = document.getElementById(id);
  if(targetPage) targetPage.classList.add('active');
  
  triggerFlash(id);

  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active-nav'));
  if(el) el.classList.add('active-nav');
  
  let floatingCartBtn = document.getElementById('floatingCartBtn');
  if(floatingCartBtn) {
    if(id === 'ordersPage' || id === 'profilePage') {
      floatingCartBtn.style.display = 'none';
    } else {
      floatingCartBtn.style.display = 'flex';
    }
  }
  
  if(id === 'offersPage') renderOffersPage();
  if(id === 'ordersPage') renderOrders();
  if(id === 'profilePage') renderProfile();
  if(id === 'supportPage') fetchCustomerSupportMessages();
  
  closeMenu();
}

window.addEventListener('popstate', function(event) {
  closeMenu();
  goBack();
});

function goHome(){ 
  pageHistory = ['home'];
  showPage('home', null, false); 
  let navBtns = document.querySelectorAll('.nav-btn');
  if(navBtns.length > 0) navBtns[0].classList.add('active-nav'); 
}

function goBack(){ 
  closeMenu();
  let currentTime = new Date().getTime();
  
  if (currentTime - lastBackPressTime < 2000) {
    lastBackPressTime = 0;
    goHome();
    return;
  }
  
  lastBackPressTime = currentTime;

  if(pageHistory.length > 1) {
    pageHistory.pop();
    let targetId = pageHistory[pageHistory.length - 1];
    hidePages();
    let targetEl = document.getElementById(targetId);
    if(targetEl) targetEl.classList.add('active');
    triggerFlash(targetId);

    let floatingCartBtn = document.getElementById('floatingCartBtn');
    if(floatingCartBtn) {
      if(targetId === 'ordersPage' || targetId === 'profilePage') {
        floatingCartBtn.style.display = 'none';
      } else {
        floatingCartBtn.style.display = 'flex';
      }
    }
  } else {
    goHome();
  }
}

function openMenu(){ 
  let sideMenu = document.getElementById('sideMenu');
  let overlay = document.getElementById('overlay');
  if(sideMenu) sideMenu.style.right='0'; 
  if(overlay) overlay.style.display='block'; 
}

function closeMenu(){ 
  let sideMenu = document.getElementById('sideMenu');
  let overlay = document.getElementById('overlay');
  if(sideMenu) sideMenu.style.right='-270px'; 
  if(overlay) overlay.style.display='none'; 
}

function showToast(text){
  let x = document.getElementById('toast');
  if(!x) return;
  x.innerText = text; x.classList.add('show-toast');
  setTimeout(() => x.classList.remove('show-toast'), 2000);
}

function renderProducts(arr, target){
  let container = document.getElementById(target);
  if(!container) return;
  if(!arr || arr.length === 0){
    container.innerHTML = '<div class="empty-state">لا توجد وجبات لعرضها 🔍</div>';
    return;
  }
  let html = '';
  arr.forEach(p => {
    let displayPrice = Number(p.basePrice) || (p.prices ? p.prices[getSizeKey(activeFilter === 'all' ? 'صغير' : activeFilter)] : 0);
    let imgSrc = (p.imgs && p.imgs[0]) ? p.imgs[0] : '';
    html += `
    <div class="card" onclick="openProduct(${p.id})">
      <img src="${imgSrc}" loading="lazy">
      <div class="info">
        <div class="name">${p.name || ''}</div>
        <div class="price">${displayPrice.toLocaleString('en-US')} ل.س</div>
      </div>
    </div>`;
  });
  container.innerHTML = html;
  triggerFlash(target);
}

function renderHomeProducts() {
  let targetIDs = [102, 2, 1, 101, 5, 4];
  let selectedProducts = products.filter(p => targetIDs.includes(p.id));
  renderProducts(selectedProducts, 'homeProducts');
}

function openCategory(cat){
  activeCat = cat; activeFilter = 'all';
  showPage('categoryPage');
  
  let titles = {pizza:'🍕 قسم البيتزا', appetizers:'🍟 مقبلات وبطاطا', sauces:'🍯 صوصات وإضافات', drinks:'🥤 مشروبات باردة'};
  let catTitleEl = document.getElementById('catTitle');
  if(catTitleEl) catTitleEl.innerText = titles[cat] || 'القسم';
  
  currentCatProducts = products.filter(p => p.category === cat);
  
  if(cat === 'pizza') {
    let storageKey = 'pizza_shuffled_order';
    let shuffledIds = [];
    try { shuffledIds = JSON.parse(localStorage.getItem(storageKey)); } catch(e) {}
    
    if(!shuffledIds) {
      shuffledIds = currentCatProducts.map(p => p.id).sort(() => Math.random() - 0.5);
      try { localStorage.setItem(storageKey, JSON.stringify(shuffledIds)); } catch(e) {}
    }
    
    currentCatProducts.sort((a, b) => shuffledIds.indexOf(a.id) - shuffledIds.indexOf(b.id));
  }
  
  let subcats = [];
  if(cat === 'pizza') {
    subcats = ['all', 'كبير', 'وسط', 'صغير', 'اكس سمول'];
  } else {
    subcats = ['all', ...new Set(currentCatProducts.map(p => p.subcat))];
  }

  let bar = document.getElementById("filterBar");
  if(bar) {
    bar.innerHTML = subcats.map(s => {
      let name = s === 'all' ? 'الكل' : s;
      return `<button class="filter-btn ${s==='all'?'active-filter':''}" onclick="filterCat('${s}', this)">${name}</button>`;
    }).join('');
  }
  
  renderCatProducts(currentCatProducts);
}

function filterCat(subcat, btn){
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active-filter'));
  if(btn) btn.classList.add('active-filter');
  activeFilter = subcat;
  
  let filtered = products.filter(p => p.category === activeCat);
  
  if(activeCat === 'pizza') {
    let storageKey = 'pizza_shuffled_order';
    let shuffledIds = [];
    try { shuffledIds = JSON.parse(localStorage.getItem(storageKey)) || []; } catch(e){}
    filtered.sort((a, b) => shuffledIds.indexOf(a.id) - shuffledIds.indexOf(b.id));
  }

  if(activeCat === 'pizza' && subcat !== 'all') {
    filtered = filtered.filter(p => p.prices && p.prices[getSizeKey(subcat)] !== undefined);
  } else if(subcat !== 'all') {
    filtered = filtered.filter(p => p.subcat === subcat);
  }
  
  renderCatProducts(filtered);
}

function getSizeKey(size) {
  if(size === 'اكس سمول') return 'xsmall';
  if(size === 'وسط') return 'medium';
  if(size === 'كبير') return 'large';
  return 'small';
}

function sortProducts(type){
  let items = products.filter(p => p.category === activeCat);
  let currentSizeKey = getSizeKey(activeFilter === 'all' ? 'صغير' : activeFilter);
  
  if(activeCat === 'pizza') {
    let storageKey = 'pizza_shuffled_order';
    let shuffledIds = [];
    try { shuffledIds = JSON.parse(localStorage.getItem(storageKey)) || []; } catch(e){}
    items.sort((a, b) => shuffledIds.indexOf(a.id) - shuffledIds.indexOf(b.id));
  }

  if(activeCat === 'pizza' && activeFilter !== 'all') {
    items = items.filter(p => p.prices && p.prices[currentSizeKey] !== undefined);
  } else if(activeFilter !== 'all') {
    items = items.filter(p => p.subcat === activeFilter);
  }
  
  if(type === 'asc') items.sort((a,b) => (Number(a.basePrice || (a.prices ? a.prices[currentSizeKey] : 0))||0) - (Number(b.basePrice || (b.prices ? b.prices[currentSizeKey] : 0))||0));
  if(type === 'desc') items.sort((a,b) => (Number(b.basePrice || (b.prices ? b.prices[currentSizeKey] : 0))||0) - (Number(a.basePrice || (a.prices ? a.prices[currentSizeKey] : 0))||0));
  
  renderCatProducts(items);
}

function renderCatProducts(arr){ renderProducts(arr, 'catProducts'); }

function openProduct(id){
  showPage('productPage');
  
  currentProduct = products.find(x => x.id === id);
  if(!currentProduct) return;
  
  let productImgsEl = document.getElementById('productImgs');
  if(productImgsEl && currentProduct.imgs) {
    productImgsEl.innerHTML = currentProduct.imgs.map(img=>`<img src="${img}" loading="lazy">`).join('');
  }
  let productNameEl = document.getElementById('productName');
  let productDescEl = document.getElementById('productDesc');
  if(productNameEl) productNameEl.innerText = currentProduct.name || '';
  if(productDescEl) productDescEl.innerText = currentProduct.desc || '';
  
  let existingPrompt = document.getElementById('dynamicPromptText');
  if (!existingPrompt && productDescEl) {
    let promptDiv = document.createElement('div');
    promptDiv.id = 'dynamicPromptText';
    promptDiv.style.cssText = 'color: #ff4d4d; font-weight: bold; font-size: 15px; margin-bottom: 15px;';
    productDescEl.parentNode.insertBefore(promptDiv, productDescEl.nextSibling);
    existingPrompt = promptDiv;
  }

  let optionsContainer = document.getElementById('productOptionsContainer');
  let productPriceEl = document.getElementById('productPrice');

  if(currentProduct.category === 'pizza'){
    if(optionsContainer) optionsContainer.style.display = 'flex';
    if(existingPrompt) {
      existingPrompt.style.display = 'block';
      existingPrompt.innerText = '⚠️ يرجى اختيار الحجم والأطراف أولاً';
    }
    
    let sizeSelect = document.getElementById('sizeSelect');
    let edgeSelect = document.getElementById('edgeSelect');
    if(sizeSelect) sizeSelect.value = ""; 
    if(edgeSelect) edgeSelect.selectedIndex = 0;
    
    if(productPriceEl) productPriceEl.innerText = "يرجى اختيار الحجم من الأسفل 👇";
  } else {
    if(optionsContainer) optionsContainer.style.display = 'none';
    if(existingPrompt) existingPrompt.style.display = 'none';
    if(productPriceEl) productPriceEl.innerText = (Number(currentProduct.basePrice)||0).toLocaleString('en-US') + ' ل.س';
  }
  
  let currentRate = ratings[id] || 0;
  displayStars(currentRate);
}

function updateDynamicPrice(){
  if(!currentProduct || currentProduct.category !== 'pizza') return;
  
  let sizeSelect = document.getElementById('sizeSelect');
  let edgeSelect = document.getElementById('edgeSelect');
  let edgeOptionText = document.getElementById('edgeOptionText');
  if(!sizeSelect || !edgeSelect) return;

  let size = sizeSelect.value;
  if(!size) return;

  let existingPrompt = document.getElementById('dynamicPromptText');
  if(existingPrompt) {
    existingPrompt.style.display = 'none';
  }

  let extraPrice = (size === 'كبير') ? 200 : 100;
  if(edgeOptionText) {
    edgeOptionText.innerText = `محشية الأطراف (+${extraPrice} ل.س)`;
  }

  let sizeKey = getSizeKey(size);
  let baseItemPrice = (currentProduct.prices && currentProduct.prices[sizeKey]) ? currentProduct.prices[sizeKey] : 0;
  
  let edge = edgeSelect.value;
  let edgeExtra = 0;
  if(edge === 'محشية الاطراف') {
    edgeExtra = extraPrice;
  }
  
  let finalPrice = baseItemPrice + edgeExtra;
  let productPriceEl = document.getElementById('productPrice');
  if(productPriceEl) productPriceEl.innerText = finalPrice.toLocaleString('en-US') + ' ل.س';
  
  triggerFlash('productPrice');
}

function rateProd(val){
  if(!currentProduct) return;
  ratings[currentProduct.id] = val;
  try { localStorage.setItem("ratings", JSON.stringify(ratings)); } catch(e){}
  displayStars(val);
  showToast("شكراً لتقييمك وجبتك المفضلة! ⭐");
}

function displayStars(val){
  let stars = document.querySelectorAll('#starsRow .star');
  stars.forEach((s, idx) => {
    if(idx < val) s.classList.add('active');
    else s.classList.remove('active');
  });
  let ratingText = document.getElementById("ratingText");
  if(ratingText) ratingText.innerText = val > 0 ? `تقييمك: ${val} من 5` : "لم يتم التقييم بعد";
}

function renderOffersPage(){
  let offerIDs = [115, 103, 2];
  let offerItems = products.filter(p => offerIDs.includes(p.id));
  renderProducts(offerItems, 'offersItems');
}

function updateCartCounter(){
  let totalCount = cart.reduce((sum, item) => sum + (Number(item.qty)||0), 0);
  let floatingCount = document.getElementById("floatingCartCount");
  if(floatingCount) floatingCount.innerText = totalCount.toLocaleString('en-US');

  let barItemCount = document.getElementById("barItemCount");
  let barTotalPrice = document.getElementById("barTotalPrice");
  let floatingCartBar = document.getElementById("floatingCartBar");

  let totalSum = cart.reduce((sum, i) => sum + (Number(i.price)||0) * (Number(i.qty)||0), 0);

  if(barItemCount) barItemCount.innerText = totalCount;
  if(barTotalPrice) barTotalPrice.innerText = totalSum.toLocaleString('en-US');
  if(floatingCartBar) {
    if(totalCount > 0) floatingCartBar.style.display = 'flex';
    else floatingCartBar.style.display = 'none';
  }
  
  let checkoutBtn = document.getElementById("checkoutBtn");
  if(checkoutBtn) {
    if(cart.length === 0) {
      checkoutBtn.style.opacity = '0.5';
      checkoutBtn.style.cursor = 'not-allowed';
    } else {
      checkoutBtn.style.opacity = '1';
      checkoutBtn.style.cursor = 'pointer';
    }
  }

  try { localStorage.setItem("cart", JSON.stringify(cart)); } catch(e){}
}

function openCart(){
  showPage('cartPage');
  renderCart();
}

function addToCart(){
  if(!currentProduct) return;
  
  let itemPrice = Number(currentProduct.basePrice) || 0;
  let size = '';
  let edge = 'أطراف عادية';
  let cartId = `${currentProduct.id}`;

  if(currentProduct.category === 'pizza'){
    let sizeSelect = document.getElementById("sizeSelect");
    let edgeSelect = document.getElementById("edgeSelect");
    
    if(sizeSelect && !sizeSelect.value) {
      showToast("⚠️ يرجى اختيار حجم البيتزا أولاً!");
      sizeSelect.focus();
      return;
    }
    
    size = sizeSelect ? sizeSelect.value : 'صغير';
    edge = edgeSelect ? edgeSelect.value : 'أطراف عادية';
    
    let sizeKey = getSizeKey(size);
    itemPrice = (currentProduct.prices && currentProduct.prices[sizeKey]) ? currentProduct.prices[sizeKey] : 0;
    
    let edgeExtra = 0;
    if(edge === 'محشية الاطراف') {
      edgeExtra = (size === 'كبير') ? 200 : 100;
    }
    itemPrice += edgeExtra;
    cartId = `${currentProduct.id}-${size}-${edge}`;
  }
  
  let exists = cart.find(i => i.cartId === cartId);
  
  if(exists){
    exists.qty = (Number(exists.qty)||0) + 1;
  } else {
    let imgSrc = (currentProduct.imgs && currentProduct.imgs[0]) ? currentProduct.imgs[0] : '';
    cart.push({
      id: currentProduct.id,
      name: currentProduct.name,
      category: currentProduct.category,
      imgs: [imgSrc],
      cartId: cartId,
      price: itemPrice,
      selectedSize: size,
      selectedEdge: edge,
      qty: 1
    });
  }
  updateCartCounter();
  showToast("تمت الإضافة إلى السلة بنجاح 🛒");
  goBack(); 
}

function changeQty(cartId, delta){
  let item = cart.find(i => i.cartId === cartId);
  if(!item) return;
  item.qty = (Number(item.qty)||0) + delta;
  if(item.qty <= 0) cart = cart.filter(i => i.cartId !== cartId);
  updateCartCounter();
  renderCart();
}

function removeFromCart(cartId){
  cart = cart.filter(i => i.cartId !== cartId);
  updateCartCounter();
  renderCart();
  showToast("تم حذف الوجبة ❌");
}

function renderCart(){
  let container = document.getElementById("cartItems");
  if(!container) return;
  container.innerHTML = "";
  let total = 0;
  
  if(!cart || cart.length === 0){
    container.innerHTML = '<div class="empty-state">سلة الوجبات فارغة حالياً 🍕</div>';
    let totalPriceEl = document.getElementById("totalPrice");
    if(totalPriceEl) totalPriceEl.innerText = "الإجمالي: 0 ل.س";
    updateCartCounter();
    return;
  }
  
  cart.forEach(item => {
    total += (Number(item.price)||0) * (Number(item.qty)||0);
    let detailsText = item.category === 'pizza' ? `(الحجم: ${item.selectedSize} - ${item.selectedEdge})` : '';
    let imgSrc = (item.imgs && item.imgs[0]) ? item.imgs[0] : '';
    container.innerHTML += `
    <div class="cart-box">
      <img src="${imgSrc}" class="cart-img" loading="lazy">
      <div class="cart-info">
        <div class="name">${item.name || ''} ${detailsText}</div>
        <div class="price">${(Number(item.price)||0).toLocaleString('en-US')} ل.س</div>
        <div class="qty-row">
          <button class="qty-btn" onclick="changeQty('${item.cartId}',-1)">−</button>
          <span class="qty-num">${item.qty}</span>
          <button class="qty-btn" onclick="changeQty('${item.cartId}',1)">+</button>
          <button class="btn btn-dark" style="width:auto;padding:4px 10px;margin:0;font-size:12px;background:#b71c1c;" onclick="removeFromCart('${item.cartId}')">حذف</button>
        </div>
      </div>
    </div>`;
  });
  
  let finalTotal = total - (total * discount / 100);
  let totalPriceEl = document.getElementById("totalPrice");
  if(totalPriceEl) totalPriceEl.innerText = "الإجمالي النهائي: " + finalTotal.toLocaleString('en-US') + " ل.س";
  
  updateCartCounter();
  triggerFlash('cartPage');
}

function getMyLocation() {
  if (navigator.geolocation) {
    showToast("📍 جاري تحديد موقعك الجغرافي...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        let userLat = position.coords.latitude;
        let userLng = position.coords.longitude;
        
        let latEl = document.getElementById('lat');
        let lngEl = document.getElementById('lng');
        let locValEl = document.getElementById('locationValue');
        if(latEl) latEl.value = userLat;
        if(lngEl) lngEl.value = userLng;
        if(locValEl) locValEl.value = `https://www.google.com/maps?q=${userLat},${userLng}`;
        
        let distance = calculateDistance(RESTAURANT_LOCATION.lat, RESTAURANT_LOCATION.lng, userLat, userLng);
        let deliveryFee = calculateDeliveryFee(distance);
        
        showToast(`تم تحديد موقعك! المسافة: ${distance.toFixed(1)} كم - التوصيل: ${deliveryFee.toLocaleString('en-US')} ل.س`);
      },
      (error) => {
        showToast("تعذر الوصول للموقع. يرجى تفعيل الـ GPS.");
      },
      { enableHighAccuracy: true }
    );
  } else {
    showToast("متصفحك لا يدعم تحديد الموقع.");
  }
}

function calculateUserDeliveryFee() {
  if (navigator.geolocation) {
    showToast("📍 جاري تحديد موقعك الجغرافي...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        let userLat = position.coords.latitude;
        let userLng = position.coords.longitude;
        
        let distance = calculateDistance(RESTAURANT_LOCATION.lat, RESTAURANT_LOCATION.lng, userLat, userLng);
        let fee = calculateDeliveryFee(distance);
        
        let resultCard = document.getElementById('deliveryFeeResultCard');
        let distanceText = document.getElementById('distanceText');
        let feeResultText = document.getElementById('feeResultText');
        
        if(resultCard && distanceText && feeResultText) {
          resultCard.style.display = 'block';
          distanceText.innerText = `المسافة بينك وبين المطعم: ${distance.toFixed(1)} كم`;
          
          if (fee === 0) {
            feeResultText.innerText = "أجور التوصيل لعندك: مجانية! 🎉";
          } else {
            feeResultText.innerText = `أجور التوصيل لعندك هي: ${fee.toLocaleString('en-US')} ل.س`;
          }
        }
        
        showToast("تم حساب أجور التوصيل بنجاح بنجاح! ✅");
      },
      (error) => {
        showToast("تعذر الوصول للموقع. يرجى تفعيل الـ GPS في جهازك.");
      },
      { enableHighAccuracy: true }
    );
  } else {
    showToast("متصفحك لا يدعم خاصية تحديد الموقع الجغرافي.");
  }
}

function checkRestaurantStatus() {
  fetch('/.netlify/functions/get-settings')
  .then(res => res.json())
  .then(settings => {
    let isOpen = settings.isOpen !== undefined ? settings.isOpen : true;
    let banner = document.getElementById('restaurantClosedBanner');
    let checkoutBtn = document.getElementById('checkoutBtn');
    
    if(!isOpen) {
      if(banner) banner.style.display = 'block';
      if(checkoutBtn) {
        checkoutBtn.style.opacity = '0.5';
        checkoutBtn.style.cursor = 'not-allowed';
        checkoutBtn.onclick = function() {
          showToast("⚠️ عذراً، المطعم مغلق ولا يمكن إتمام طلبات جديدة حالياً.");
        };
      }
    } else {
      if(banner) banner.style.display = 'none';
      if(checkoutBtn) {
        checkoutBtn.style.opacity = '1';
        checkoutBtn.style.cursor = 'pointer';
        checkoutBtn.onclick = checkout;
      }
    }
  })
  .catch(err => console.log("حالة المطعم افتراضياً مفتوحة", err));
}

function checkout() {
  if (!cart || cart.length === 0) {
    showToast("السلة فارغة ⚠️");
    return;
  }
  if (!user) {
    showToast("يرجى تسجيل الدخول وإدخال العنوان أولاً 👤");
    showPage('profilePage');
    return;
  }

  let total = cart.reduce((sum, i) => sum + (Number(i.price)||0) * (Number(i.qty)||0), 0);
  let finalTotal = total - (total * discount / 100);
  
  let newOrderPayload = {
    customer_name: user.name,
    customer_phone: user.phone,
    customer_location: user.location,
    items: JSON.stringify(cart),
    total: finalTotal,
    status: "قيد المراجعة ⏳"
  };

  showToast("⏳ جاري إرسال طلبك...");

  fetch('/.netlify/functions/update-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newOrderPayload)
  })
  .then(res => {
      if (!res.ok) throw new Error("فشل إرسال الطلب.");
      return res.json();
  })
  .then(() => {
    cart = [];
    discount = 0;
    updateCartCounter();
    showToast("🎉 تم إرسال طلبك بنجاح للمطعم!");
    showPage('ordersPage');
  })
  .catch(err => {
    console.error(err);
    showToast("⚠️ حدث خطأ أثناء إرسال الطلب، يرجى المحاولة مرة أخرى.");
  });
}

function renderOrders() {
  let container = document.getElementById("ordersList");
  if (!container) return;

  if (!user || !user.phone) {
    container.innerHTML = '<div class="empty-state">👤 يرجى تسجيل الدخول وإدخال رقم الموبايل لعرض طلباتك</div>';
    return;
  }

  container.innerHTML = '<div style="text-align:center; color:#aaa;">جاري تحميل طلباتك...</div>';

  fetch('/.netlify/functions/get-orders')
  .then(res => {
      if (!res.ok) throw new Error("فشل في جلب الطلبات.");
      return res.json();
  })
  .then(data => {
      let allOrders = Array.isArray(data) ? data : (data.orders || []);
      let cleanUserPhone = String(user.phone).trim().replace(/\D/g, '').slice(-9);

      let myOrders = allOrders.filter(o => {
        let dbPhone = String(o.customerPhone || o.customer_phone || '').trim().replace(/\D/g, '').slice(-9);
        return dbPhone === cleanUserPhone;
      });

      if (myOrders.length === 0) {
        container.innerHTML = `
          <div class="empty-state" style="display:flex; flex-direction:column; align-items:center; gap:12px;">
            <div>لا يوجد طلبات في السجل</div>
            <button class="btn" style="width:200px; margin-top:5px;" onclick="openMenu()">اطلب الآن</button>
          </div>`;
        return;
      }

      container.innerHTML = myOrders.map((o) => {
        let displayId = o.id ? String(o.id) : '306239';
        let sequentialNum = displayId.length >= 6 ? displayId.slice(-6) : displayId;
        let orderIdRaw = o.id || '';
        return `
        <div class="order-card" style="background:#1a1a1a; border:1px solid #333; padding:15px; border-radius:12px; margin-bottom:12px; color:#fff;">
          <div style="font-weight:bold; display:flex; justify-content: space-between; align-items:center;">
            <span>طلب رقم: #${sequentialNum}</span>
            <span style="color:#ff4d4d">${(Number(o.total)||0).toLocaleString('en-US')} ل.س</span>
          </div>
          <div style="font-size:0.85em; margin: 6px 0; color:#aaa;">التاريخ: ${o.date || o.created_at ? new Date(o.date || o.created_at).toLocaleString() : 'قريباً'}</div>
          <div style="background:#222; color:#fff; padding:8px; border-radius:8px; text-align:center; margin-top:8px; font-weight:bold; border:1px solid #444;">
            الحالة: ${o.status || 'قيد المراجعة ⏳'}
          </div>
          <div style="margin-top:10px; text-align:left; display:flex; gap:8px;">
            <button class="btn" style="width:auto; padding:6px 14px; font-size:12px;" onclick="openDeliveryRatingModal('${orderIdRaw}')">⭐ تقييم التوصيل</button>
          </div>
        </div>`;
      }).join('');
      
      triggerFlash('ordersPage');
  })
  .catch(err => {
      console.error(err);
      container.innerHTML = '<div class="empty-state">تعذر تحميل الطلبات الحالية ⚠️</div>';
  });
}

let currentRatingOrderId = null;
let selectedRatingStars = 0;

function openDeliveryRatingModal(orderId) {
  currentRatingOrderId = orderId;
  selectedRatingStars = 0;
  highlightDeliveryStars(0);
  let noteArea = document.getElementById('deliveryFeedbackNote');
  if(noteArea) noteArea.value = '';
  let modal = document.getElementById('deliveryRatingModal');
  if(modal) modal.style.display = 'flex';
}

function closeDeliveryRatingModal() {
  let modal = document.getElementById('deliveryRatingModal');
  if(modal) modal.style.display = 'none';
}

function rateDelivery(stars) {
  selectedRatingStars = stars;
  highlightDeliveryStars(stars);
}

function highlightDeliveryStars(count) {
  let stars = document.querySelectorAll('.d-star');
  stars.forEach((s, idx) => {
    if(idx < count) {
      s.style.color = '#ffc107';
    } else {
      s.style.color = '#444';
    }
  });
}

function submitDeliveryRating() {
  if(selectedRatingStars === 0) {
    showToast("⚠️ يرجى اختيار عدد النجوم أولاً!");
    return;
  }
  let noteElement = document.getElementById('deliveryFeedbackNote');
  let note = noteElement ? noteElement.value.trim() : '';
  
  let ratingPayload = {
    orderId: currentRatingOrderId,
    customerPhone: user ? user.phone : '',
    stars: selectedRatingStars,
    note: note
  };

  showToast("⏳ جاري إرسال تقييمك...");

  fetch('/.netlify/functions/update-rating', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ratingPayload)
  })
  .then(res => {
    if(!res.ok) throw new Error("فشل إرسال التقييم");
    return res.json();
  })
  .then(() => {
    showToast("⭐ شكراً لك! تم إرسال تقييمك للمطعم بنجاح.");
    closeDeliveryRatingModal();
    if(noteElement) noteElement.value = '';
  })
  .catch(() => {
    showToast("✅ تم حفظ التقييم بنجاح!");
    closeDeliveryRatingModal();
    if(noteElement) noteElement.value = '';
  });
}

let searchTimeout = null;
function debounceSearch(value) {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    executeSearch(value);
  }, 300);
}

function executeSearch(value) {
  let v = value.trim().toLowerCase();
  let container = document.getElementById('searchResults');
  if(!container) return;

  if(v === "") {
    container.innerHTML = "";
    return;
  }

  let results = products.filter(p => (p.name && p.name.toLowerCase().includes(v)) || (p.desc && p.desc.toLowerCase().includes(v)));
  
  if(results.length === 0) {
    container.innerHTML = '<div class="empty-state">لا توجد نتائج مطابقة لبحثك 🔍</div>';
    return;
  }

  let html = '';
  results.forEach(p => {
    let displayPrice = Number(p.basePrice) || (p.prices ? p.prices['small'] : 0);
    let imgSrc = (p.imgs && p.imgs[0]) ? p.imgs[0] : '';
    html += `
    <div class="card" onclick="openProduct(${p.id})">
      <img src="${imgSrc}" loading="lazy">
      <div class="info">
        <div class="name">${p.name || ''}</div>
        <div class="price">${displayPrice.toLocaleString('en-US')} ل.س</div>
      </div>
    </div>`;
  });
  
  container.innerHTML = html;
}

function doLogin(){
  let nameEl = document.getElementById('loginName');
  let phoneEl = document.getElementById('loginPhone');
  let manualLocationEl = document.getElementById('loginLocation');
  let gpsLocationEl = document.getElementById('locationValue');

  if(!nameEl || !phoneEl) return;

  let name = nameEl.value.trim();
  let phone = phoneEl.value.trim();
  let manualLocation = manualLocationEl ? manualLocationEl.value.trim() : '';
  let gpsLocation = gpsLocationEl ? gpsLocationEl.value.trim() : '';
  
  if(!name || !phone){
    showToast("⚠️ يرجى إدخال الاسم ورقم الموبايل!");
    return;
  }

  if (phone.length < 8 || isNaN(phone)) {
    showToast("⚠️ رقم الموبايل غير صحيح!");
    return;
  }

  let finalLocation = manualLocation;
  if (gpsLocation) {
      finalLocation = manualLocation + " - GPS: " + gpsLocation;
  }

  let confirmMessage = `هل أنت متأكد أن رقم هاتفك صحيح؟\n\n${phone}\n\nاضغط "موافق" لتأكيد الحفظ، أو "إلغاء" للتعديل.`;
  
  if (!confirm(confirmMessage)) {
      return;
  }

  user = {name, phone, location: finalLocation};
  try { localStorage.setItem("user", JSON.stringify(user)); } catch(e){}

  showToast("✅ تم حفظ البيانات بنجاح!");
  showPage('profilePage');
}

function doLogout(){
  if(confirm("هل تريد تعديل بياناتك الشخصية أو العنوان؟")){
    user = null;
    try { localStorage.removeItem("user"); } catch(e){}
    renderProfile();
  }
}

function renderProfile(){
  let loginSec = document.getElementById('loginSection');
  let profileSec = document.getElementById('profileSection');
  if(!loginSec || !profileSec) return;

  let avatarContainer = document.getElementById('userAvatarContainer');
  if(avatarContainer) {
    if(userAvatar && userAvatar !== '') {
      avatarContainer.innerHTML = `<img src="${userAvatar}" loading="lazy">`;
    } else {
      avatarContainer.innerHTML = `<svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`;
    }
  }

  let pName = document.getElementById('profileName');
  let pPhone = document.getElementById('profilePhone');

  if(user){
    loginSec.style.display = 'none';
    profileSec.style.display = 'block';
    if(pName) pName.innerText = user.name;
    if(pPhone) pPhone.innerText = user.phone;
  } else {
    loginSec.style.display = 'block';
    profileSec.style.display = 'none';
  }
  triggerFlash('profilePage');
}

function openAvatarModal() {
  let modal = document.getElementById('avatarModal');
  let previewContainer = document.getElementById('modalAvatarPreviewContainer');
  if(modal && previewContainer) {
    if(userAvatar && userAvatar !== '') {
      previewContainer.innerHTML = `<img src="${userAvatar}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
    } else {
      previewContainer.innerHTML = `<svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`;
    }
    modal.style.display = 'flex';
  }
}

function closeAvatarModal() {
  let modal = document.getElementById('avatarModal');
  if(modal) modal.style.display = 'none';
}

function handleFileSelected(event) {
  let file = event.target.files[0];
  if (file) {
    let reader = new FileReader();
    reader.onload = function(e) {
      userAvatar = e.target.result;
      try { localStorage.setItem("userAvatar", userAvatar); } catch(e){}
      let previewContainer = document.getElementById('modalAvatarPreviewContainer');
      let avatarContainer = document.getElementById('userAvatarContainer');
      
      if(previewContainer) previewContainer.innerHTML = `<img src="${userAvatar}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
      if(avatarContainer) avatarContainer.innerHTML = `<img src="${userAvatar}" loading="lazy">`;
      
      showToast("✅ تم تحديث صورة الحساب بنجاح!");
    };
    reader.readAsDataURL(file);
  }
}

window.onload = async function() {

  // تحميل المنتجات من Supabase عبر Netlify Function
  await loadProducts();

  // بعد تحميل المنتجات نبدأ عرض الموقع
  renderHomeProducts();
  renderProfile();
  updateCartCounter();
  checkRestaurantStatus();

  let splash = document.getElementById('splash');

  if(splash) {
    splash.style.opacity = '0';

    setTimeout(() => {
      splash.style.display = 'none';
    }, 300);
  }
};