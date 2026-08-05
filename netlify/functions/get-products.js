const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase environment variables are not defined.');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      throw error;
    }

    const products = (data || []).map(p => ({
      id: p.id,
      category: p.category,
      name: p.name,
      basePrice: Number(p.base_price) || 0,
      desc: p.description || '',
      subcat: p.subcat || '',
      prices: p.prices || null,
      imgs: Array.isArray(p.imgs) ? p.imgs : []
    }));

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store'
      },
      body: JSON.stringify(products)
    };

  } catch (error) {
    console.error('get-products error:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: error.message
      })
    };
  }
};
