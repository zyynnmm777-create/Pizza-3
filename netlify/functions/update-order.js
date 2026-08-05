const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method Not Allowed' })
      };
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const body = JSON.parse(event.body || '{}');

    const id = body.id || body.orderId;
    const status = body.status || body.newStatus;

    // =========================
    // تحديث حالة طلب موجود
    // =========================
    if (id && status) {

      const { data, error } = await supabase
        .from('orders')
        .update({
          status: status
        })
        .eq('id', Number(id))
        .select()
        .single();

      if (error) throw error;

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: true,
          order: data
        })
      };
    }

    // =========================
    // إضافة طلب جديد
    // =========================

    const customerName =
      body.customer_name ||
      body.customerName ||
      '';

    const customerPhone =
      body.customer_phone ||
      body.customerPhone ||
      '';

    const customerLocation =
      body.customer_location ||
      body.customerLocation ||
      '';

    let items = body.items;

    // إذا جاءت كسلسلة JSON نحولها إلى Array
    if (typeof items === 'string') {
      try {
        items = JSON.parse(items);
      } catch {
        items = [];
      }
    }

    const total = Number(body.total) || 0;

    if (!customerName || !customerPhone || !customerLocation) {
      throw new Error('بيانات العميل ناقصة.');
    }

    const { data, error } = await supabase
      .from('orders')
      .insert([{
        customer_name: customerName,
        customer_phone: String(customerPhone),
        customer_location: customerLocation,
        items: items || [],
        total: total,
        status: body.status || 'قيد المراجعة ⏳'
      }])
      .select()
      .single();

    if (error) throw error;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        order: data
      })
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
