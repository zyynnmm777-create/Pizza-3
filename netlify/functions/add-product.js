const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // السماح بطلب OPTIONS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        error: 'Method Not Allowed'
      })
    };
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase environment variables are not defined.');
    }

    const supabase = createClient(
      supabaseUrl,
      supabaseKey
    );

    const body = JSON.parse(event.body || '{}');

    const name = String(body.name || '').trim();
    const category = String(body.category || '').trim();

    if (!name) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'اسم المنتج مطلوب.'
        })
      };
    }

    if (!category) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'تصنيف المنتج مطلوب.'
        })
      };
    }

    const product = {
      name: name,
      category: category,
      base_price: Number(body.basePrice) || 0,
      description: String(body.desc || ''),
      subcat: String(body.subcat || ''),
      prices: body.prices || null,
      imgs: Array.isArray(body.imgs) ? body.imgs : []
    };

    const { data, error } = await supabase
      .from('products')
      .insert([product])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'تمت إضافة المنتج بنجاح.',
        product: data
      })
    };

  } catch (error) {
    console.error('add-product error:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message || 'حدث خطأ أثناء إضافة المنتج.'
      })
    };
  }
};
