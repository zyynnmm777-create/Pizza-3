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

  // السماح فقط بـ POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Method Not Allowed'
      })
    };
  }

  try {

    // ============================================================
    // الاتصال بـ Supabase
    // ============================================================

    const supabaseUrl =
      process.env.SUPABASE_URL;

    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        'Supabase environment variables are not defined.'
      );
    }

    const supabase = createClient(
      supabaseUrl,
      supabaseKey
    );


    // ============================================================
    // قراءة البيانات القادمة من admin.js
    // ============================================================

    let body = {};

    try {

      body = JSON.parse(
        event.body || '{}'
      );

    } catch (error) {

      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'بيانات الطلب غير صالحة.'
        })
      };

    }


    // ============================================================
    // البيانات الأساسية
    // ============================================================

    const id =
      body.id !== undefined &&
      body.id !== null &&
      body.id !== ''
        ? Number(body.id)
        : null;


    const name =
      String(body.name || '').trim();


    const category =
      String(body.category || '').trim();


    const subcat =
      String(body.subcat || '').trim();


    const description =
      String(body.desc || '').trim();


    const basePrice =
      Number(body.basePrice);


    // ============================================================
    // التحقق من البيانات
    // ============================================================

    if (!name) {

      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'اسم المنتج مطلوب.'
        })
      };

    }


    if (!category) {

      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'تصنيف المنتج مطلوب.'
        })
      };

    }


    if (
      Number.isNaN(basePrice) ||
      basePrice < 0
    ) {

      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'سعر المنتج غير صالح.'
        })
      };

    }


    // ============================================================
    // الأسعار الإضافية
    // ============================================================

    let prices = null;

    if (
      body.prices &&
      typeof body.prices === 'object' &&
      !Array.isArray(body.prices)
    ) {

      prices = body.prices;

    }


    // ============================================================
    // الصور
    // ============================================================

    let imgs = [];

    if (Array.isArray(body.imgs)) {

      imgs = body.imgs
        .map(img => String(img).trim())
        .filter(img => img !== '');

    }


    // ============================================================
    // تجهيز بيانات المنتج
    // ============================================================

    const productData = {

      name: name,

      category: category,

      base_price: basePrice,

      description: description,

      subcat: subcat,

      prices: prices,

      imgs: imgs

    };


    // ============================================================
    // إذا كان هناك ID → تعديل المنتج
    // ============================================================

    if (id !== null) {

      const {
        data,
        error
      } = await supabase

        .from('products')

        .update(productData)

        .eq('id', id)

        .select()

        .single();


      if (error) {
        throw error;
      }


      if (!data) {

        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'المنتج المطلوب غير موجود.'
          })
        };

      }


      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({

          success: true,

          action: 'updated',

          message:
            'تم تعديل المنتج بنجاح.',

          product: data

        })
      };

    }


    // ============================================================
    // إذا لم يوجد ID → إضافة منتج جديد
    // ============================================================

    const {
      data,
      error
    } = await supabase

      .from('products')

      .insert([productData])

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

        action: 'created',

        message:
          'تمت إضافة المنتج بنجاح.',

        product: data

      })
    };


  } catch (error) {

    console.error(
      'save-product error:',
      error
    );


    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({

        success: false,

        error:
          error.message ||
          'حدث خطأ أثناء حفظ المنتج.'

      })
    };

  }

};
