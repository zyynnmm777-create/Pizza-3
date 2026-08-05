const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({
          error: 'Method Not Allowed'
        })
      };
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const body = JSON.parse(event.body || '{}');

    const orderId = Number(body.orderId);
    const stars = Number(body.stars);
    const note = body.note || '';
    const customerPhone = String(body.customerPhone || '').trim();

    if (!orderId) {
      throw new Error('رقم الطلب غير موجود.');
    }

    if (stars < 1 || stars > 5) {
      throw new Error('التقييم يجب أن يكون بين 1 و5.');
    }

    // نتأكد أن الطلب موجود
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, customer_name, customer_phone')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      throw new Error('الطلب غير موجود.');
    }

    // حماية بسيطة: التأكد أن رقم الهاتف صاحب الطلب
    const dbPhone = String(order.customer_phone || '')
      .replace(/\D/g, '')
      .slice(-9);

    const userPhone = customerPhone
      .replace(/\D/g, '')
      .slice(-9);

    if (!dbPhone || dbPhone !== userPhone) {
      throw new Error('لا يمكنك تقييم هذا الطلب.');
    }

    // إضافة التقييم
    const { data, error } = await supabase
      .from('ratings')
      .insert([{
        order_id: orderId,
        customer_name: order.customer_name,
        stars: stars,
        note: note
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
        rating: data
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
