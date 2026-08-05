const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const orders = (data || []).map(o => ({
      id: o.id,
      customerName: o.customer_name,
      customerPhone: String(o.customer_phone || '').trim(),
      customerLocation: o.customer_location,
      items: o.items,
      total: Number(o.total) || 0,
      status: o.status || 'قيد المراجعة ⏳',
      date: o.created_at
    }));

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(orders)
    };

  } catch (err) {
    console.error(err);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: err.message
      })
    };
  }
};
