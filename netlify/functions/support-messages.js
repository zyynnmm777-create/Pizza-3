const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // =========================
    // إرسال رسالة
    // =========================
    if (event.httpMethod === 'POST') {

      const body = JSON.parse(event.body || '{}');

      const { data, error } = await supabase
        .from('support_messages')
        .insert([{
          customer_phone: String(body.customerPhone || ''),
          customer_name: body.customerName || 'عميل',
          message: body.message || '',
          sender: body.sender || 'customer'
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
          message: data
        })
      };
    }

    // =========================
    // جلب الرسائل
    // =========================
    if (event.httpMethod === 'GET') {

      const phone =
        event.queryStringParameters?.phone || null;

      let query = supabase
        .from('support_messages')
        .select('*')
        .order('created_at', {
          ascending: true
        });

      if (phone) {
        query = query.eq(
          'customer_phone',
          String(phone)
        );
      }

      const { data, error } = await query;

      if (error) throw error;

      const messages = (data || []).map(m => ({
        id: m.id,
        customerPhone: m.customer_phone,
        customerName: m.customer_name,
        message: m.message,
        sender: m.sender,
        timestamp: m.created_at
      }));

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(messages)
      };
    }

    return {
      statusCode: 405,
      body: JSON.stringify({
        error: 'Method Not Allowed'
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
