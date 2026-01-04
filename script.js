const NEW_DENOMS = [500, 200, 100, 50, 25, 10];
const OLD_DENOMS = [5000, 2000, 1000, 500];
let activeTab = 'new';

// دالة التنسيق
function formatNumber(val) {
    if (!val) return "0";
    let clean = val.toString().replace(/[^\d.]/g, "");
    let parts = clean.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
}

function getRawValue(id) {
    return Math.round(parseFloat(document.getElementById(id).value.replace(/,/g, "")) || 0);
}

function handleMainInput(source) {
    const oldInp = document.getElementById('oldAmount');
    const newInp = document.getElementById('newAmount');
    
    if (source === 'old') {
        let valOld = getRawValue('oldAmount');
        newInp.value = formatNumber(valOld / 100);
        oldInp.value = formatNumber(oldInp.value);
    } else {
        let valNew = parseFloat(newInp.value.replace(/,/g, "")) || 0;
        oldInp.value = formatNumber(Math.round(valNew * 100));
        newInp.value = formatNumber(newInp.value);
    }
    renderUI();
    calculateChange();
}

function setTab(tab) {
    activeTab = tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    renderUI();
}

// دالة التوزيع الدقيق (تعتمد على الطرح المباشر من المبلغ القديم)
function distributeAccurate(amountInOld, denoms, isNewCurrency) {
    let result = [];
    let remaining = amountInOld;

    denoms.forEach(d => {
        // قيمة الورقة الواحدة معبر عنها بالقديم
        let denomValueInOld = isNewCurrency ? d * 100 : d;
        
        let count = Math.floor(remaining / denomValueInOld);
        if (count > 0) {
            result.push({ val: d, count: count, type: isNewCurrency ? 'new' : 'old' });
            remaining -= count * denomValueInOld;
        }
    });
    return { bills: result, leftover: remaining };
}

function renderUI() {
    const totalOld = getRawValue('oldAmount');
    const grid = document.getElementById('paymentDisplay');
    grid.innerHTML = "";
    if (totalOld <= 0) return;

    let finalBills = [];

    if (activeTab === 'new') {
        finalBills = distributeAccurate(totalOld, NEW_DENOMS, true).bills;
    } else if (activeTab === 'old') {
        finalBills = distributeAccurate(totalOld, OLD_DENOMS, false).bills;
    } else {
        // --- الدفع المختلط المصحح ---
        // نأخذ 70% من المبلغ لندفعه بالقديم (بشرط يكون من مضاعفات الـ 500)
        let preferredOldAmount = Math.floor((totalOld * 0.7) / 500) * 500;
        let oldPart = distributeAccurate(preferredOldAmount, OLD_DENOMS, false);
        
        // المتبقي الحقيقي يتم تغطيته بالجديد
        let remainingToCover = totalOld - preferredOldAmount;
        let newPart = distributeAccurate(remainingToCover, NEW_DENOMS, true);
        
        // إذا بقي أي ليرة (بسبب فواصل التحويل)، نغطيها بأصغر فئة قديمة
        let finalLeftover = newPart.leftover;
        let extraOld = [];
        if (finalLeftover > 0) {
            extraOld = distributeAccurate(finalLeftover, [500], false).bills;
            // إذا كان المبلغ أقل حتى من 500، نظهر تنبيه بسيط أو نعتبرها 1 ورقة 500 متممة
            if (extraOld.length === 0 && finalLeftover > 0) extraOld.push({val: 500, count: 1, type: 'old'});
        }

        finalBills = [...oldPart.bills, ...newPart.bills, ...extraOld];
    }

    finalBills.forEach(b => grid.innerHTML += createBillCard(b));
}

function createBillCard(b) {
    const imgPath = `images/${b.type}_${b.val}.png`;
    return `
        <div class="bill-card">
            <img src="${imgPath}" onerror="this.src='https://via.placeholder.com/400x200?text=${b.val}'">
            <div class="bill-footer">
                ${b.count} قطع × ${formatNumber(b.val)} ${b.type === 'new' ? 'جديد' : 'قديم'}
            </div>
        </div>
    `;
}

function calculateChange() {
    const totalOld = getRawValue('oldAmount');
    const paidNew = parseFloat(document.getElementById('customerPaid').value.replace(/,/g, "")) || 0;
    const paidInOld = Math.round(paidNew * 100);
    const area = document.getElementById('changeResult');

    if (paidNew <= 0) return;

    if (paidInOld < totalOld) {
        area.innerHTML = `<p style="color:red; font-weight:bold;">المبلغ غير كافٍ</p>`;
    } else if (paidInOld === totalOld) {
        area.innerHTML = `<span class="change-summary">المبلغ دقيق 👍</span>`;
    } else {
        let changeOld = paidInOld - totalOld;
        let html = `<span class="change-summary">الباقي للزبون: ${formatNumber(changeOld / 100)} ل.س</span><div class="modern-grid">`;
        
        // الباقي يفضل دائماً بالجديد
        let changeDist = distributeAccurate(changeOld, NEW_DENOMS, true);
        changeDist.bills.forEach(b => html += createBillCard(b));
        
        // إذا بقي فكة أقل من 10 ليرات جديدة، نرجعها بورقة 500 قديم
        if (changeDist.leftover > 0) {
            html += createBillCard({ val: 500, count: 1, type: 'old' });
        }
        area.innerHTML = html + "</div>";
    }
}