let products = [];

const COUPONS = {
  'PIZZA10': 10,
  'HOT20': 20,
  'WELCOME15': 15
};

const RESTAURANT_PHONE = '963996190223';

async function loadProducts() {
  try {
    const response = await fetch('/.netlify/functions/get-products');

    if (!response.ok) {
      throw new Error('فشل تحميل المنتجات');
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error('بيانات المنتجات غير صحيحة');
    }

    products = data;

    console.log('✅ تم تحميل المنتجات:', products.length);

    return products;

  } catch (error) {
    console.error('❌ خطأ في تحميل المنتجات:', error);

    products = [];

    return [];
  }
}