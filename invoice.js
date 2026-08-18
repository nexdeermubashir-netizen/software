// invoice.js
document.addEventListener('DOMContentLoaded', () => {
    // Make function globally available so it can be called on tab switch or after transaction
    window.renderInvoicesTable = function () {
        let transactions = window.Store.getTransactions();
        const tbody = document.querySelector('#invoices-table tbody');

        if (!tbody) return; // Prevent error if not on right page (though it's single page)

        // Filter by Admin Panel Search if it exists
        const searchInput = document.getElementById('admin-invoice-search');
        if (searchInput && searchInput.value) {
            const query = searchInput.value.toLowerCase().trim();
            const persons = window.Store.getPersons();

            transactions = transactions.filter(tx => {
                const personObj = persons.find(p => p.name === tx.person);
                const personIndex = persons.findIndex(p => p.name === tx.person);
                const personSearchStr = personObj ? `${personIndex + 1} - ${personObj.name}`.toLowerCase() : (tx.person || '').toLowerCase();

                return personSearchStr.includes(query) || (tx.id && tx.id.toLowerCase().includes(query));
            });
        }

        tbody.innerHTML = '';

        if (transactions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No transactions found.</td></tr>';
            return;
        }

        transactions.forEach(tx => {
            let itemName = tx.itemName;
            if (!itemName) {
                const item = window.Store.getItems().find(i => i.id === tx.itemId);
                itemName = item ? item.name : 'Unknown Item';
            }
            const dateObj = new Date(tx.date);

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    ${tx.person || 'N/A'}
                    <br><small style="color: var(--text-secondary); font-size: 11px; font-weight: 400;">${tx.id}</small>
                </td>
                <td>${dateObj.toLocaleDateString()} ${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                <td><span class="badge ${tx.type === 'in' ? 'badge-in' : 'badge-out'}">${tx.type.toUpperCase()}</span></td>
                <td>${itemName}</td>
                <td>${parseFloat(tx.totalAmount).toFixed(2)}</td>
                <td>${parseFloat(tx.remainingAmount).toFixed(2)}</td>
                <td>
                    <button class="action-btn" title="Print Invoice (English)" onclick="printInvoice('${tx.id}', 'en')">
                        <i class='bx bx-printer'></i>
                    </button>
                    <button class="action-btn" title="Print Invoice (Urdu)" onclick="printInvoice('${tx.id}', 'ur')">
                        <strong style="font-size: 14px;">UR</strong>
                    </button>
                    <button class="action-btn" style="color: #25D366;" title="Share via WhatsApp" onclick="shareWhatsApp('${tx.id}')">
                        <i class='bx bxl-whatsapp'></i>
                    </button>
                    <button class="action-btn" title="Copy Invoice" onclick="copyInvoice('${tx.id}')">
                        <i class='bx bx-copy'></i>
                    </button>
                    <button class="action-btn del" title="Delete Invoice" onclick="deleteInvoice('${tx.id}')">
                        <i class='bx bx-trash'></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    };

    // Initial render
    window.renderInvoicesTable();

    // Attach search event listener if on Admin Panel
    const searchInput = document.getElementById('admin-invoice-search');
    if (searchInput) {
        searchInput.addEventListener('input', window.renderInvoicesTable);
    }

    // Auto-print if triggered from another page
    const urlParams = new URLSearchParams(window.location.search);
    const printTxId = urlParams.get('print');
    if (printTxId) {
        // Clear the URL to prevent re-printing on manual refresh
        window.history.replaceState({}, document.title, window.location.pathname);
        const lang = localStorage.getItem('lang') || 'en';
        // Delay slightly to ensure page and translations are fully loaded
        setTimeout(() => {
            if (typeof printInvoice === 'function') {
                printInvoice(printTxId, lang);
            }
        }, 300);
    }
});

function printInvoice(txId, lang = 'en') {
    const transactions = window.Store.getTransactions();
    const tx = transactions.find(t => t.id === txId);

    if (!tx) {
        alert("Transaction not found.");
        return;
    }

    let itemName = tx.itemName;
    if (!itemName) {
        const item = window.Store.getItems().find(i => i.id === tx.itemId);
        itemName = item ? item.name : 'Unknown Item';
    }

    // Set Translations
    const t = {
        title: lang === 'ur' ? "بل / انوائس" : "INVOICE",
        company: "Abdul Samad Quraishi",
        date: lang === 'ur' ? "تاریخ: " : "Date: ",
        person: lang === 'ur' ? "نام: " : "Person: ",
        labelType: lang === 'ur' ? "قسم:" : "Transaction Type:",
        labelItem: lang === 'ur' ? "آئٹم:" : "Item:",
        thDesc: lang === 'ur' ? "تفصیل" : "Description",
        thWeight: lang === 'ur' ? "وزن" : "Weight",
        thRate: lang === 'ur' ? "ریٹ/کلو" : "Rate/Kg",
        thTotal: lang === 'ur' ? "کل رقم" : "Total",
        tdDesc: lang === 'ur' ? "سٹاک ریکارڈ" : "Stock Record",
        labelKg: lang === 'ur' ? "کلو" : "Kg",
        labelPaid: lang === 'ur' ? "ادا شدہ:" : "Paid:",
        labelRem: lang === 'ur' ? "بقایا:" : "Remaining:",
        footer: lang === 'ur' ? "ہمارے ساتھ کاروبار کرنے کا شکریہ!" : "جزاک اللہ",
        typeIn: lang === 'ur' ? "خریداری (Stock In)" : "Stock In (Purchase)",
        typeOut: lang === 'ur' ? "فروخت (Stock Out)" : "Stock Out (Sale)",
        mun: lang === 'ur' ? "من" : "Mun",
        kg: lang === 'ur' ? "کلو" : "Kg",
        gram: lang === 'ur' ? "گرام" : "g",
        ltr: lang === 'ur' ? "لیٹر" : "L",
        ml: lang === 'ur' ? "ملی لیٹر" : "ml"
    };

    // Populate Print Template
    document.getElementById('print-title').textContent = t.title;
    document.getElementById('print-company').textContent = t.company;

    document.getElementById('invoice-date').textContent = t.date + new Date(tx.date).toLocaleString();
    document.getElementById('invoice-person').textContent = t.person + (tx.person || 'N/A');
    document.getElementById('label-type').textContent = t.labelType;
    document.getElementById('invoice-type').textContent = tx.type.toUpperCase() === 'IN' ? t.typeIn : t.typeOut;

    document.getElementById('label-item').textContent = t.labelItem;
    document.getElementById('invoice-item').textContent = itemName;

    document.getElementById('th-desc').textContent = t.thDesc;
    document.getElementById('th-weight').textContent = t.thWeight;
    document.getElementById('th-rate').textContent = t.thRate;
    document.getElementById('th-total').textContent = t.thTotal;

    document.getElementById('td-desc').textContent = t.tdDesc;
    document.getElementById('label-kg').textContent = t.labelKg;

    document.getElementById('label-paid-print').textContent = t.labelPaid;
    document.getElementById('label-rem-print').textContent = t.labelRem;
    document.getElementById('print-footer').textContent = t.footer;

    // Apply RTL for Urdu
    const printArea = document.getElementById('print-area');
    if (lang === 'ur') {
        printArea.style.direction = 'rtl';
        printArea.style.fontFamily = '"Jameel Noori Nastaleeq", "Noto Nastaliq Urdu", Arial, sans-serif';
    } else {
        printArea.style.direction = 'ltr';
        printArea.style.fontFamily = 'inherit';
    }

    let weightStr = [];
    if (tx.weight.mun > 0) weightStr.push(`${tx.weight.mun} ${t.mun}`);
    if (tx.weight.kg > 0) weightStr.push(`${tx.weight.kg} ${t.kg}`);
    if (tx.weight.grams > 0) weightStr.push(`${tx.weight.grams} ${t.gram}`);
    if (tx.weight.ltr > 0) weightStr.push(`${tx.weight.ltr} ${t.ltr}`);
    if (tx.weight.ml > 0) weightStr.push(`${tx.weight.ml} ${t.ml}`);

    if (weightStr.length === 0) weightStr.push(`0 ${t.kg}`);

    document.getElementById('invoice-weight-text').textContent = weightStr.join(', ');
    document.getElementById('invoice-kg-total').textContent = parseFloat(tx.totalKg).toFixed(3);

    document.getElementById('invoice-rate').textContent = parseFloat(tx.ratePerKg).toFixed(2);
    document.getElementById('invoice-total').textContent = parseFloat(tx.totalAmount).toFixed(2);

    document.getElementById('invoice-paid').textContent = parseFloat(tx.paidAmount).toFixed(2);
    document.getElementById('invoice-remaining').textContent = parseFloat(tx.remainingAmount).toFixed(2);

    // Set document title to auto-populate PDF filename
    const originalTitle = document.title;
    document.title = `Invoice-${tx.id}`;

    // Trigger Print
    setTimeout(() => {
        window.print();
        document.title = originalTitle;
    }, 100);
}

function deleteInvoice(txId) {
    if (confirm("Are you sure you want to delete this invoice? This action cannot be undone.")) {
        window.Store.deleteTransaction(txId);
        window.renderInvoicesTable();
        if (typeof updateDashboard === 'function') {
            updateDashboard();
        }
    }
}

window.shareWhatsApp = function (txId) {
    const transactions = window.Store.getTransactions();
    const tx = transactions.find(t => t.id === txId);
    if (!tx) {
        alert("Transaction not found.");
        return;
    }

    let itemName = tx.itemName;
    if (!itemName) {
        const item = window.Store.getItems().find(i => i.id === tx.itemId);
        itemName = item ? item.name : 'Unknown Item';
    }

    const dateObj = new Date(tx.date);
    const dateStr = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const lang = localStorage.getItem('lang') || 'en';

    let message = "";
    if (lang === 'ur') {
        const typeStr = tx.type.toUpperCase() === 'IN' ? "خریداری (Stock In)" : "فروخت (Stock Out)";
        message = `\u200E\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0بسم اللہ الرحمن الرحیم
🏢 *منجانب: Abdul Samad Quraishi*
*موبائل:* 0000000-0300
-----------------------------------
*بل / انوائس: ${tx.id}*
*تاریخ:* ${dateStr}
*نام:* ${tx.person || 'N/A'}
*قسم:* ${typeStr}
*آئٹم:* ${itemName}
*وزن:* ${parseFloat(tx.totalKg).toFixed(3)} کلو
*ریٹ/کلو:* ${parseFloat(tx.ratePerKg).toFixed(2)}
*کل رقم:* ${parseFloat(tx.totalAmount).toFixed(2)}
*ادا شدہ:* ${parseFloat(tx.paidAmount).toFixed(2)}
*بقایا:* ${parseFloat(tx.remainingAmount).toFixed(2)}

ہمارے ساتھ کاروبار کرنے کا شکریہ!`;
    } else {
        const typeStr = tx.type.toUpperCase() === 'IN' ? 'Stock In (Purchase)' : 'Stock Out (Sale)';
        message = `\u200E\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0بسم اللہ الرحمن الرحیم
🏢 *From: Abdul Samad Quraishi*
*Mobile:* 0300-0000000
-----------------------------------
*INVOICE: ${tx.id}*
*Date:* ${dateStr}
*Name:* ${tx.person || 'N/A'}
*Type:* ${typeStr}
*Item:* ${itemName}
*Weight:* ${parseFloat(tx.totalKg).toFixed(3)} Kg
*Rate:* ${parseFloat(tx.ratePerKg).toFixed(2)}
*Total Amount:* ${parseFloat(tx.totalAmount).toFixed(2)}
*Paid:* ${parseFloat(tx.paidAmount).toFixed(2)}
*Remaining:* ${parseFloat(tx.remainingAmount).toFixed(2)}

\u200E\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0جزاک اللہ`;
    }
    const encodedMessage = encodeURIComponent(message);

    // Detect if the user is on a mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    let whatsappUrl;
    if (isMobile) {
        whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    } else {
        // Use WhatsApp Web for desktop
        whatsappUrl = `https://web.whatsapp.com/send?text=${encodedMessage}`;
    }
    // Open WhatsApp in a new tab
    window.open(whatsappUrl, '_blank');
};

window.copyInvoice = function (txId) {
    const transactions = window.Store.getTransactions();
    const tx = transactions.find(t => t.id === txId);
    if (!tx) {
        alert("Transaction not found.");
        return;
    }

    let itemName = tx.itemName;
    if (!itemName) {
        const item = window.Store.getItems().find(i => i.id === tx.itemId);
        itemName = item ? item.name : 'Unknown Item';
    }

    const dateObj = new Date(tx.date);
    const dateStr = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const lang = localStorage.getItem('lang') || 'en';

    let message = "";
    if (lang === 'ur') {
        const typeStr = tx.type.toUpperCase() === 'IN' ? "خریداری (Stock In)" : "فروخت (Stock Out)";
        message = `\u200E\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0بسم اللہ الرحمن الرحیم\n🏢 *منجانب: Abdul Samad Quraishi*\n*موبائل:* 0000000-0300\n-----------------------------------\n*بل / انوائس: ${tx.id}*\n*تاریخ:* ${dateStr}\n*نام:* ${tx.person || 'N/A'}\n*قسم:* ${typeStr}\n*آئٹم:* ${itemName}\n*وزن:* ${parseFloat(tx.totalKg).toFixed(3)} کلو\n*ریٹ/کلو:* ${parseFloat(tx.ratePerKg).toFixed(2)}\n*کل رقم:* ${parseFloat(tx.totalAmount).toFixed(2)}\n*ادا شدہ:* ${parseFloat(tx.paidAmount).toFixed(2)}\n*بقایا:* ${parseFloat(tx.remainingAmount).toFixed(2)}\n\n\u200E\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0جزاک اللہ`;
    } else {
        const typeStr = tx.type.toUpperCase() === 'IN' ? 'Stock In (Purchase)' : 'Stock Out (Sale)';
        message = `\u200E\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0بسم اللہ الرحمن الرحیم\n🏢 *From: Abdul Samad Quraishi*\n*Mobile:* 0300-0000000\n-----------------------------------\n*INVOICE: ${tx.id}*\n*Date:* ${dateStr}\n*Name:* ${tx.person || 'N/A'}\n*Type:* ${typeStr}\n*Item:* ${itemName}\n*Weight:* ${parseFloat(tx.totalKg).toFixed(3)} Kg\n*Rate:* ${parseFloat(tx.ratePerKg).toFixed(2)}\n*Total Amount:* ${parseFloat(tx.totalAmount).toFixed(2)}\n*Paid:* ${parseFloat(tx.paidAmount).toFixed(2)}\n*Remaining:* ${parseFloat(tx.remainingAmount).toFixed(2)}\n\n\u200E\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0جزاک اللہ`;
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(message).then(() => {
            alert("Invoice copied to clipboard!");
        }).catch(err => {
            console.error("Failed to copy:", err);
            alert("Failed to copy invoice.");
        });
    } else {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = message;
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            alert("Invoice copied to clipboard!");
        } catch (err) {
            console.error("Fallback copy failed:", err);
            alert("Failed to copy invoice.");
        }
        document.body.removeChild(textarea);
    }
};
