// ============================================================
// 🍕 ADMIN.JS - لوحة تحكم الفطيرة الساخنة
// ============================================================


// ============================================================
// 1. حماية لوحة الإدارة
// ============================================================

function checkAuth() {

    if (sessionStorage.getItem("adminAuthed") === "true") {
        return true;
    }

    let password = prompt(
        "الرجاء إدخال كلمة مرور الإدارة لرؤية لوحة التحكم:"
    );

    if (password === "12345") {

        sessionStorage.setItem("adminAuthed", "true");

        return true;

    } else {

        alert("كلمة المرور غير صحيحة!");

        document.body.innerHTML = `
            <h2 style="
                text-align:center;
                color:#ff4d4d;
                margin-top:100px;
                font-family:sans-serif;
            ">
                عذراً، غير مسموح لك بالدخول ⛔
            </h2>
        `;

        return false;
    }
}


// ============================================================
// 2. التنقل بين أقسام الإدارة
// ============================================================

function switchAdminTab(tabName, btnElement) {

    document
        .querySelectorAll('.admin-section')
        .forEach(sec => sec.classList.remove('active'));

    document
        .querySelectorAll('.admin-bottom-nav .nav-item')
        .forEach(btn => btn.classList.remove('active'));


    let targetSection =
        document.getElementById(`section-${tabName}`);

    if (targetSection) {
        targetSection.classList.add('active');
    }


    if (btnElement) {
        btnElement.classList.add('active');
    }


    if (tabName === 'orders') {
        fetchOrders();
    }

    if (tabName === 'support') {
        fetchCustomerSupportMessages(false);
    }

    if (tabName === 'reviews') {
        fetchDeliveryReviews();
    }

    if (tabName === 'settings') {
        fetchAdminProducts();
    }
}


// ============================================================
// 3. زر التحديث
// ============================================================

function refreshCurrentSection() {

    let orders =
        document.getElementById('section-orders');

    let support =
        document.getElementById('section-support');

    let reviews =
        document.getElementById('section-reviews');

    let settings =
        document.getElementById('section-settings');


    if (orders && orders.classList.contains('active')) {

        fetchOrders();

    } else if (support && support.classList.contains('active')) {

        fetchCustomerSupportMessages(false);

    } else if (reviews && reviews.classList.contains('active')) {

        fetchDeliveryReviews();

    } else if (settings && settings.classList.contains('active')) {

        fetchAdminProducts();

    } else {

        alert("✅ تم تحديث البيانات!");

    }
}


// ============================================================
// 4. الطلبات
// ============================================================

function fetchOrders() {

    if (!checkAuth()) return;

    let container =
        document.getElementById("adminOrdersList");

    if (!container) return;

    container.innerHTML = `
        <div class="loading">
            جاري تحديث الطلبات...
        </div>
    `;


    fetch('/.netlify/functions/get-orders')

        .then(response => {

            if (!response.ok) {
                throw new Error("فشل جلب الطلبات");
            }

            return response.json();

        })

        .then(data => {

            let orders =
                Array.isArray(data)
                    ? data
                    : (data.orders || []);

            renderAdminOrders(orders);

        })

        .catch(error => {

            console.error(error);

            container.innerHTML = `
                <div
                    class="loading"
                    style="color:#ff4d4d;"
                >
                    حدث خطأ أثناء جلب الطلبات.
                </div>
            `;

        });
}


// ============================================================
// عرض الطلبات
// ============================================================

function renderAdminOrders(orders) {

    let container =
        document.getElementById("adminOrdersList");

    if (!container) return;


    if (!orders || orders.length === 0) {

        container.innerHTML = `
            <div class="loading">
                لا توجد طلبات واردة حالياً.
            </div>
        `;

        return;
    }


    container.innerHTML = orders.map((o) => {

        let parsedItems = [];

        try {

            parsedItems =
                typeof o.items === 'string'
                    ? JSON.parse(o.items)
                    : (
                        Array.isArray(o.items)
                            ? o.items
                            : []
                    );

        } catch (e) {

            parsedItems = [];

        }


        let itemsHtml =
            parsedItems.map(item => {

                let qty =
                    Number(
                        item.qty ||
                        item.quantity ||
                        1
                    );

                let price =
                    Number(item.price) || 0;

                return `
                    <div style="
                        display:flex;
                        justify-content:space-between;
                        margin-bottom:5px;
                        border-bottom:1px dashed #444;
                        padding-bottom:3px;
                        font-size:13px;
                    ">

                        <span>
                            🍔
                            ${escapeHtml(item.name || 'وجبة')}
                            × ${qty}
                        </span>

                        <span style="color:#ff4d4d;">
                            ${(price * qty).toLocaleString('en-US')}
                            ل.س
                        </span>

                    </div>
                `;

            }).join('');


        let displayId =
            o.id
                ? String(o.id)
                : Date.now().toString();


        let shortId =
            displayId.length >= 6
                ? displayId.slice(-6)
                : displayId;


        let customerName =
            o.customerName ||
            o.customer_name ||
            'غير متوفر';


        let customerPhone =
            o.customerPhone ||
            o.customer_phone ||
            'غير متوفر';


        let customerLocation =
            o.customerLocation ||
            o.customer_location ||
            'غير متوفر';


        return `
            <div class="card-box">

                <div style="
                    display:flex;
                    justify-content:space-between;
                    margin-bottom:10px;
                    border-bottom:1px solid #333;
                    padding-bottom:5px;
                ">

                    <span style="
                        font-weight:bold;
                        color:#ff4d4d;
                    ">
                        طلب #${escapeHtml(shortId)}
                    </span>

                    <span style="
                        color:#aaa;
                        font-size:12px;
                    ">
                        📅
                        ${escapeHtml(
                            o.date ||
                            o.created_at ||
                            'قريباً'
                        )}
                    </span>

                </div>


                <div style="
                    font-size:13px;
                    margin-bottom:10px;
                    line-height:1.8;
                ">

                    <p>
                        <strong>👤 الزبون:</strong>
                        ${escapeHtml(customerName)}
                    </p>

                    <p>
                        <strong>📞 الموبايل:</strong>

                        <a
                            href="tel:${escapeHtml(customerPhone)}"
                            style="
                                color:#ff4d4d;
                                text-decoration:none;
                            "
                        >
                            ${escapeHtml(customerPhone)}
                        </a>
                    </p>

                    <p>
                        <strong>📍 العنوان:</strong>
                        ${escapeHtml(customerLocation)}
                    </p>

                </div>


                <div style="
                    background:#1a1a1a;
                    padding:8px;
                    border-radius:6px;
                    margin-bottom:10px;
                ">

                    <strong style="
                        font-size:12px;
                        color:#aaa;
                        display:block;
                        margin-bottom:4px;
                    ">
                        🛒 الوجبات:
                    </strong>

                    ${itemsHtml}

                </div>


                <div style="
                    display:flex;
                    justify-content:space-between;
                    align-items:center;
                    gap:10px;
                ">

                    <div style="
                        font-weight:bold;
                        color:#ff4d4d;
                        font-size:15px;
                    ">
                        الإجمالي:
                        ${(Number(o.total) || 0)
                            .toLocaleString('en-US')}
                        ل.س
                    </div>


                    <select
                        onchange="
                            updateOrderStatus(
                                '${escapeHtml(displayId)}',
                                this.value
                            )
                        "
                        style="
                            background:#333;
                            color:#fff;
                            border:1px solid #444;
                            padding:6px;
                            border-radius:6px;
                            font-family:'Cairo',sans-serif;
                            font-weight:bold;
                            max-width:190px;
                        "
                    >

                        <option
                            value="قيد المراجعة ⏳"
                            ${o.status === 'قيد المراجعة ⏳'
                                ? 'selected'
                                : ''}
                        >
                            قيد المراجعة ⏳
                        </option>

                        <option
                            value="جاري التجهيز 🔥"
                            ${o.status === 'جاري التجهيز 🔥'
                                ? 'selected'
                                : ''}
                        >
                            جاري التجهيز 🔥
                        </option>

                        <option
                            value="في طريق التوصيل 🛵"
                            ${o.status === 'في طريق التوصيل 🛵'
                                ? 'selected'
                                : ''}
                        >
                            في طريق التوصيل 🛵
                        </option>

                        <option
                            value="تم التوصيل ✅"
                            ${o.status === 'تم التوصيل ✅'
                                ? 'selected'
                                : ''}
                        >
                            تم التوصيل ✅
                        </option>

                        <option
                            value="ملغي ❌"
                            ${o.status === 'ملغي ❌'
                                ? 'selected'
                                : ''}
                        >
                            ملغي ❌
                        </option>

                    </select>

                </div>

            </div>
        `;

    }).join('');
}


// ============================================================
// تحديث حالة الطلب
// ============================================================

function updateOrderStatus(orderId, newStatus) {

    fetch('/.netlify/functions/update-order', {

        method: 'POST',

        headers: {
            'Content-Type': 'application/json'
        },

        body: JSON.stringify({
            orderId: orderId,
            newStatus: newStatus
        })

    })

    .then(res => {

        if (!res.ok) {
            throw new Error("فشل التحديث");
        }

        alert("✅ تم تحديث حالة الطلب بنجاح!");

    })

    .catch(err => {

        console.error(err);

        alert("❌ حدث خطأ أثناء التحديث.");

    });
}


// ============================================================
// 5. خدمة العملاء
// ============================================================

let lastKnownSupportSignature = "";


function fetchCustomerSupportMessages(
    isBackgroundCheck = false
) {

    let container =
        document.getElementById("adminSupportList");

    if (!container) return;


    if (
        !isBackgroundCheck &&
        (
            !container.hasChildNodes() ||
            container.innerHTML.includes('جاري جلب')
        )
    ) {

        container.innerHTML = `
            <div class="loading">
                جاري جلب رسائل العملاء...
            </div>
        `;

    }


    fetch('/.netlify/functions/support-messages')

        .then(res => {

            if (!res.ok) {
                throw new Error("فشل جلب الرسائل");
            }

            return res.json();

        })

        .then(data => {

            let messages =
                Array.isArray(data)
                    ? data
                    : (data.messages || []);


            let lastMessage =
                messages.length > 0
                    ? messages[messages.length - 1]
                    : null;


            let currentSignature =
                messages.length +
                "_" +
                (
                    lastMessage
                        ? (
                            lastMessage.timestamp ||
                            lastMessage.message ||
                            ''
                        )
                        : ''
                );


            if (
                isBackgroundCheck &&
                currentSignature === lastKnownSupportSignature
            ) {

                return;

            }


            lastKnownSupportSignature =
                currentSignature;


            let unreadCount = 0;

            let grouped = {};


            messages.forEach(m => {

                let phone =
                    m.customerPhone ||
                    m.customer_phone ||
                    'unknown';


                if (!grouped[phone]) {

                    grouped[phone] = {

                        name:
                            m.customerName ||
                            m.customer_name ||
                            'عميل',

                        messages: []

                    };

                }


                grouped[phone].messages.push(m);

            });


            Object.keys(grouped).forEach(phone => {

                let clientMsgs =
                    grouped[phone].messages;

                let lastMsg =
                    clientMsgs[clientMsgs.length - 1];


                if (
                    lastMsg &&
                    lastMsg.sender === 'customer'
                ) {

                    unreadCount++;

                }

            });


            let adminBadge =
                document.getElementById(
                    'adminSupportBadge'
                );


            if (adminBadge) {

                if (unreadCount > 0) {

                    adminBadge.style.display =
                        'inline-block';

                    adminBadge.innerText =
                        unreadCount;

                } else {

                    adminBadge.style.display =
                        'none';

                }

            }


            if (messages.length === 0) {

                container.innerHTML = `
                    <div
                        class="card-box"
                        style="
                            text-align:center;
                            color:#aaa;
                        "
                    >
                        لا توجد رسائل دعم فني واردة حالياً
                        من الزبائن.
                    </div>
                `;

                return;
            }


            let savedInputs = {};


            Object.keys(grouped).forEach(phone => {

                let activeInput =
                    document.getElementById(
                        `replyInput_${phone}`
                    );


                if (
                    activeInput &&
                    activeInput.value
                ) {

                    savedInputs[phone] =
                        activeInput.value;

                }

            });


            container.innerHTML =
                Object.keys(grouped).map(phone => {

                    let client =
                        grouped[phone];


                    return `
                        <div
                            class="card-box"
                            style="
                                border-right:4px solid #ff4d4d;
                            "
                        >

                            <div style="
                                display:flex;
                                justify-content:space-between;
                                margin-bottom:8px;
                            ">

                                <strong>
                                    👤
                                    ${escapeHtml(client.name)}
                                    (${escapeHtml(phone)})
                                </strong>

                                <a
                                    href="tel:${escapeHtml(phone)}"
                                    style="
                                        color:#ff4d4d;
                                        font-size:12px;
                                        text-decoration:none;
                                    "
                                >
                                    📞 اتصال
                                </a>

                            </div>


                            <div style="
                                background:#111;
                                padding:10px;
                                border-radius:8px;
                                max-height:150px;
                                overflow-y:auto;
                                margin-bottom:10px;
                                font-size:13px;
                            ">

                                ${client.messages.map(m => `

                                    <div style="
                                        margin-bottom:6px;
                                        text-align:
                                            ${m.sender === 'admin'
                                                ? 'right'
                                                : 'left'};
                                    ">

                                        <span style="
                                            background:
                                                ${m.sender === 'admin'
                                                    ? '#800000'
                                                    : '#333'};
                                            padding:5px 10px;
                                            border-radius:6px;
                                            display:inline-block;
                                            color:#fff;
                                        ">

                                            ${
                                                m.sender === 'admin'
                                                    ? '👑 الإدارة: '
                                                    : '🛒 العميل: '
                                            }

                                            ${escapeHtml(
                                                m.message || ''
                                            )}

                                        </span>

                                    </div>

                                `).join('')}

                            </div>


                            <div style="
                                display:flex;
                                gap:5px;
                            ">

                                <input
                                    type="text"
                                    id="replyInput_${escapeHtml(phone)}"
                                    placeholder="اكتب رد الإدارة..."
                                    style="
                                        flex:1;
                                        padding:8px;
                                        background:#222;
                                        border:1px solid #444;
                                        color:#fff;
                                        border-radius:6px;
                                        font-family:'Cairo',sans-serif;
                                    "
                                >

                                <button
                                    class="btn"
                                    onclick="
                                        sendAdminReply(
                                            '${escapeHtml(phone)}',
                                            '${escapeHtml(client.name)}'
                                        )
                                    "
                                >
                                    إرسال
                                </button>

                            </div>

                        </div>
                    `;

                }).join('');


            Object.keys(savedInputs).forEach(phone => {

                let restoredInput =
                    document.getElementById(
                        `replyInput_${phone}`
                    );


                if (restoredInput) {

                    restoredInput.value =
                        savedInputs[phone];

                }

            });

        })

        .catch(err => {

            console.error(err);

        });
}


// ============================================================
// إرسال رد الإدارة
// ============================================================

function sendAdminReply(
    customerPhone,
    customerName
) {

    let input =
        document.getElementById(
            `replyInput_${customerPhone}`
        );


    if (
        !input ||
        !input.value.trim()
    ) {

        return;

    }


    let payload = {

        customerPhone:
            customerPhone,

        customerName:
            customerName,

        message:
            input.value.trim(),

        sender:
            'admin',

        timestamp:
            new Date().toISOString()

    };


    fetch('/.netlify/functions/support-messages', {

        method: 'POST',

        headers: {
            'Content-Type': 'application/json'
        },

        body: JSON.stringify(payload)

    })

    .then(res => {

        if (!res.ok) {
            throw new Error("فشل إرسال الرد");
        }

        return res.json();

    })

    .then(() => {

        input.value = '';

        fetchCustomerSupportMessages(false);

    })

    .catch(err => {

        console.error(err);

        alert("❌ فشل إرسال الرد");

    });
}


// ============================================================
// 6. التقييمات
// ============================================================

function fetchDeliveryReviews() {

    let container =
        document.getElementById(
            "adminReviewsList"
        );

    if (!container) return;


    container.innerHTML = `
        <div
            class="card-box"
            style="
                text-align:center;
                color:#aaa;
            "
        >
            لا توجد تقييمات توصيل مسجلة حتى الآن.
        </div>
    `;
}


// ============================================================
// 7. حالة المطعم
// ============================================================

function toggleRestaurantStatus(checkbox) {

    let status =
        checkbox.checked
            ? "مغلق"
            : "مفتوح";


    localStorage.setItem(
        "restaurantClosed",
        checkbox.checked
    );


    alert(
        `⚠️ تم تغيير حالة المطعم إلى: ${status}`
    );
}


// ============================================================
// 8. رسالة الإعلان
// ============================================================

function saveAnnouncement() {

    let input =
        document.getElementById(
            "announcementInput"
        );


    if (!input) return;


    let text =
        input.value.trim();


    localStorage.setItem(
        "restaurantAnnouncement",
        text
    );


    alert(
        "📢 تم حفظ رسالة التنبيه بنجاح!"
    );
}


// ============================================================
// 9. 🍕 إدارة المنتجات
// ============================================================


// تحميل المنتجات من Supabase
function fetchAdminProducts() {

    let container =
        document.getElementById(
            "adminProductsList"
        );


    if (!container) return;


    container.innerHTML = `
        <div class="loading">
            جاري تحميل المنتجات...
        </div>
    `;


    fetch('/.netlify/functions/get-products')

        .then(res => {

            if (!res.ok) {
                throw new Error("فشل جلب المنتجات");
            }

            return res.json();

        })

        .then(data => {

            let products =
                Array.isArray(data)
                    ? data
                    : (data.products || []);


            renderAdminProducts(products);

        })

        .catch(err => {

            console.error(err);

            container.innerHTML = `
                <div
                    class="loading"
                    style="color:#ff4d4d;"
                >
                    ❌ فشل تحميل المنتجات.
                    <br>
                    تأكد من إعداد Supabase وNetlify Functions.
                </div>
            `;

        });
}


// ============================================================
// عرض المنتجات
// ============================================================

function renderAdminProducts(products) {

    let container =
        document.getElementById(
            "adminProductsList"
        );


    if (!container) return;


    if (
        !products ||
        products.length === 0
    ) {

        container.innerHTML = `
            <div class="empty-products">
                لا توجد منتجات حالياً.
                <br><br>

                اضغط
                <strong style="color:#ff4d4d;">
                    ＋ إضافة منتج
                </strong>
                لإضافة أول منتج.
            </div>
        `;

        return;
    }


    container.innerHTML =
        products.map(product => {

            let price =
                Number(product.basePrice) || 0;


            let category =
                product.category || 'غير محدد';


            let subcat =
                product.subcat || '';


            let imageCount =
                Array.isArray(product.imgs)
                    ? product.imgs.length
                    : 0;


            return `
                <div
                    class="product-admin-card"
                    data-product-id="${escapeHtml(
                        String(product.id)
                    )}"
                >

                    <div class="product-admin-top">

                        <div class="product-admin-info">

                            <div class="product-admin-name">
                                🍕
                                ${escapeHtml(
                                    product.name ||
                                    'منتج بدون اسم'
                                )}
                            </div>


                            <div class="product-admin-meta">

                                التصنيف:
                                ${escapeHtml(category)}

                                ${
                                    subcat
                                        ? `
                                            <br>
                                            الفرعي:
                                            ${escapeHtml(subcat)}
                                        `
                                        : ''
                                }

                                <br>

                                الصور:
                                ${imageCount}

                            </div>

                        </div>


                        <div class="product-admin-price">

                            ${price.toLocaleString('en-US')}
                            ل.س

                        </div>

                    </div>


                    <div class="product-actions">

                        <button
                            class="edit-product-btn"
                            onclick='editProduct(${safeJson(product)})'
                        >
                            ✏️ تعديل
                        </button>


                        <button
                            class="delete-product-btn"
                            onclick="
                                deleteProduct(
                                    '${escapeHtml(
                                        String(product.id)
                                    )}',
                                    '${escapeHtml(
                                        product.name || ''
                                    )}'
                                )
                            "
                        >
                            🗑️ حذف
                        </button>

                    </div>

                </div>
            `;

        }).join('');
}


// ============================================================
// 10. فتح نافذة إضافة منتج
// ============================================================

function openProductModal() {

    let modal =
        document.getElementById(
            "productModal"
        );


    if (!modal) return;


    document.getElementById(
        "productModalTitle"
    ).innerText =
        "➕ إضافة منتج";


    document.getElementById(
        "productId"
    ).value = '';


    document.getElementById(
        "productName"
    ).value = '';


    document.getElementById(
        "productCategory"
    ).value = 'appetizers';


    document.getElementById(
        "productSubcat"
    ).value = '';


    document.getElementById(
        "productBasePrice"
    ).value = '';


    document.getElementById(
        "productDescription"
    ).value = '';


    document.getElementById(
        "pricesContainer"
    ).innerHTML = '';


    document.getElementById(
        "imagesContainer"
    ).innerHTML = '';


    addImageRow();


    modal.classList.add("show");
}


// ============================================================
// إغلاق النافذة
// ============================================================

function closeProductModal() {

    let modal =
        document.getElementById(
            "productModal"
        );


    if (modal) {
        modal.classList.remove("show");
    }
}


// ============================================================
// 11. تعديل منتج
// ============================================================

function editProduct(product) {

    let modal =
        document.getElementById(
            "productModal"
        );


    if (!modal) return;


    document.getElementById(
        "productModalTitle"
    ).innerText =
        "✏️ تعديل المنتج";


    document.getElementById(
        "productId"
    ).value =
        product.id || '';


    document.getElementById(
        "productName"
    ).value =
        product.name || '';


    document.getElementById(
        "productCategory"
    ).value =
        product.category || 'appetizers';


    document.getElementById(
        "productSubcat"
    ).value =
        product.subcat || '';


    document.getElementById(
        "productBasePrice"
    ).value =
        product.basePrice || '';


    document.getElementById(
        "productDescription"
    ).value =
        product.desc || '';


    // الأسعار

    let pricesContainer =
        document.getElementById(
            "pricesContainer"
        );


    pricesContainer.innerHTML = '';


    if (
        product.prices &&
        typeof product.prices === 'object'
    ) {

        Object.keys(product.prices)
            .forEach(key => {

                addPriceRow(
                    key,
                    product.prices[key]
                );

            });

    }


    // الصور

    let imagesContainer =
        document.getElementById(
            "imagesContainer"
        );


    imagesContainer.innerHTML = '';


    if (
        Array.isArray(product.imgs) &&
        product.imgs.length > 0
    ) {

        product.imgs.forEach(img => {

            addImageRow(img);

        });

    } else {

        addImageRow();

    }


    modal.classList.add("show");
}


// ============================================================
// 12. إضافة صف صورة
// ============================================================

function addImageRow(value = '') {

    let container =
        document.getElementById(
            "imagesContainer"
        );


    if (!container) return;


    let row =
        document.createElement("div");


    row.className =
        "image-row";


    row.innerHTML = `

        <input
            type="text"
            class="form-input product-image-input"
            placeholder="https://example.com/image.jpg"
            value="${escapeHtml(value)}"
        >

        <button
            type="button"
            class="remove-image-btn"
            onclick="this.parentElement.remove()"
        >
            ✕
        </button>

    `;


    container.appendChild(row);
}


// ============================================================
// 13. إضافة سعر إضافي
// ============================================================

function addPriceRow(
    label = '',
    value = ''
) {

    let container =
        document.getElementById(
            "pricesContainer"
        );


    if (!container) return;


    let row =
        document.createElement("div");


    row.className =
        "price-row";


    row.innerHTML = `

        <input
            type="text"
            class="form-input product-price-label"
            placeholder="مثال: كبير"
            value="${escapeHtml(label)}"
        >

        <input
            type="number"
            class="form-input product-price-value"
            placeholder="السعر"
            min="0"
            value="${escapeHtml(value)}"
        >

        <button
            type="button"
            class="remove-price-btn"
            onclick="this.parentElement.remove()"
        >
            ✕
        </button>

    `;


    container.appendChild(row);
}


// ============================================================
// 14. جمع الأسعار
// ============================================================

function collectPrices() {

    let prices = {};


    let labels =
        document.querySelectorAll(
            ".product-price-label"
        );


    let values =
        document.querySelectorAll(
            ".product-price-value"
        );


    labels.forEach((label, index) => {

        let key =
            label.value.trim();


        let value =
            Number(
                values[index]
                    ? values[index].value
                    : 0
            );


        if (key) {

            prices[key] =
                isNaN(value)
                    ? 0
                    : value;

        }

    });


    return Object.keys(prices).length > 0
        ? prices
        : null;
}


// ============================================================
// 15. جمع الصور
// ============================================================

function collectImages() {

    let inputs =
        document.querySelectorAll(
            ".product-image-input"
        );


    let images = [];


    inputs.forEach(input => {

        let value =
            input.value.trim();


        if (value) {
            images.push(value);
        }

    });


    return images;
}


// ============================================================
// 16. حفظ المنتج
// ============================================================

function saveProduct() {

    let id =
        document.getElementById(
            "productId"
        ).value.trim();


    let name =
        document.getElementById(
            "productName"
        ).value.trim();


    let category =
        document.getElementById(
            "productCategory"
        ).value;


    let subcat =
        document.getElementById(
            "productSubcat"
        ).value.trim();


    let basePrice =
        Number(
            document.getElementById(
                "productBasePrice"
            ).value
        );


    let description =
        document.getElementById(
            "productDescription"
        ).value.trim();


    if (!name) {

        alert(
            "⚠️ اكتب اسم المنتج أولاً."
        );

        return;

    }


    if (
        isNaN(basePrice) ||
        basePrice < 0
    ) {

        alert(
            "⚠️ أدخل سعراً صحيحاً."
        );

        return;

    }


    let product = {

        id:
            id || null,

        category:
            category,

        name:
            name,

        basePrice:
            basePrice,

        desc:
            description,

        subcat:
            subcat,

        prices:
            collectPrices(),

        imgs:
            collectImages()

    };


    let saveButton =
        document.querySelector(
            "#productModal .btn-success"
        );


    if (saveButton) {

        saveButton.disabled = true;

        saveButton.innerText =
            "⏳ جاري الحفظ...";

    }


    fetch('/.netlify/functions/save-product', {

        method: 'POST',

        headers: {
            'Content-Type': 'application/json'
        },

        body:
            JSON.stringify(product)

    })

    .then(async response => {

        let data = {};

        try {
            data = await response.json();
        } catch (e) {}


        if (!response.ok) {

            throw new Error(
                data.error ||
                "فشل حفظ المنتج"
            );

        }


        return data;

    })

    .then(() => {

        alert(
            id
                ? "✅ تم تعديل المنتج بنجاح!"
                : "✅ تمت إضافة المنتج بنجاح!"
        );


        closeProductModal();

        fetchAdminProducts();

    })

    .catch(error => {

        console.error(error);

        alert(
            "❌ فشل حفظ المنتج:\n" +
            error.message
        );

    })

    .finally(() => {

        if (saveButton) {

            saveButton.disabled = false;

            saveButton.innerText =
                "💾 حفظ المنتج";

        }

    });
}


// ============================================================
// 17. حذف المنتج
// ============================================================

function deleteProduct(
    productId,
    productName
) {

    let confirmed =
        confirm(
            `⚠️ هل أنت متأكد من حذف المنتج:\n\n${productName}\n\nلا يمكن التراجع عن الحذف.`
        );


    if (!confirmed) {
        return;
    }


    fetch('/.netlify/functions/delete-product', {

        method: 'POST',

        headers: {
            'Content-Type': 'application/json'
        },

        body:
            JSON.stringify({
                id: productId
            })

    })

    .then(async response => {

        let data = {};

        try {
            data = await response.json();
        } catch (e) {}


        if (!response.ok) {

            throw new Error(
                data.error ||
                "فشل حذف المنتج"
            );

        }


        return data;

    })

    .then(() => {

        alert(
            "🗑️ تم حذف المنتج بنجاح!"
        );

        fetchAdminProducts();

    })

    .catch(error => {

        console.error(error);

        alert(
            "❌ فشل حذف المنتج:\n" +
            error.message
        );

    });
}


// ============================================================
// 18. أدوات مساعدة للأمان
// ============================================================

// منع إدخال HTML داخل النصوص
function escapeHtml(value) {

    if (value === null || value === undefined) {
        return '';
    }


    return String(value)

        .replace(/&/g, '&amp;')

        .replace(/</g, '&lt;')

        .replace(/>/g, '&gt;')

        .replace(/"/g, '&quot;')

        .replace(/'/g, '&#039;');
}


// تحويل المنتج إلى JSON آمن داخل onclick
function safeJson(object) {

    return JSON.stringify(object)

        .replace(/\\/g, '\\\\')

        .replace(/'/g, "\\'")

        .replace(/"/g, '&quot;')

        .replace(/\n/g, '\\n')

        .replace(/\r/g, '\\r');

}


// ============================================================
// 19. إغلاق النافذة عند الضغط خارجها
// ============================================================

document.addEventListener(
    "click",
    function(event) {

        let modal =
            document.getElementById(
                "productModal"
            );


        if (
            modal &&
            event.target === modal
        ) {

            closeProductModal();

        }

    }
);


// ============================================================
// 20. التشغيل عند تحميل الصفحة
// ============================================================

window.onload = function() {

    if (!checkAuth()) {
        return;
    }


    // الطلبات

    fetchOrders();


    // فحص رسائل العملاء كل 5 ثواني

    setInterval(() => {

        fetchCustomerSupportMessages(true);

    }, 5000);


    // حالة المطعم

    let isClosed =
        localStorage.getItem(
            "restaurantClosed"
        ) === "true";


    let toggleEl =
        document.getElementById(
            "restaurantStatusToggle"
        );


    if (toggleEl) {
        toggleEl.checked = isClosed;
    }


    // الرسالة المحفوظة

    let savedMsg =
        localStorage.getItem(
            "restaurantAnnouncement"
        );


    let annEl =
        document.getElementById(
            "announcementInput"
        );


    if (
        annEl &&
        savedMsg
    ) {

        annEl.value =
            savedMsg;

    }


    // تحميل المنتجات

    fetchAdminProducts();

};
