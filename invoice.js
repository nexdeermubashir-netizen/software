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
                    <button class="action-btn" title="Edit Invoice" onclick="editInvoice('${tx.id}')">
                        <i class='bx bx-edit'></i>
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

function printInvoice(txId, lang = 'en', triggerPrint = true) {
    const transactions = window.Store.getTransactions();
    const tx = transactions.find(t => t.id === txId);

    if (!tx) {
        alert("Transaction not found.");
        return;
    }

    let itemName = tx.itemName || 'Multiple Items';

    // Set Translations
    const t = {
        title: lang === 'ur' ? "بل / انوائس" : "INVOICE",
        company: "Wanda Material Invoice",
        date: lang === 'ur' ? "تاریخ: " : "Date: ",
        person: lang === 'ur' ? "نام: " : "Person: ",
        labelType: lang === 'ur' ? "قسم:" : "Transaction Type:",
        thDesc: lang === 'ur' ? "تفصیل" : "Description",
        thWeight: lang === 'ur' ? "وزن" : "Weight",
        thRate: lang === 'ur' ? "ریٹ/کلو" : "Rate/Unit",
        thTotal: lang === 'ur' ? "کل رقم" : "Total",
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

    document.getElementById('th-desc').textContent = t.thDesc;
    document.getElementById('th-weight').textContent = t.thWeight;
    document.getElementById('th-rate').textContent = t.thRate;
    document.getElementById('th-total').textContent = t.thTotal;

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

    const printBody = document.getElementById('print-body');
    printBody.innerHTML = '';

    const txItems = tx.items || [tx];
    txItems.forEach(item => {
        let displayQty = item.qty !== undefined ? item.qty : parseFloat(item.totalKg || 0);
        let displayUnit = item.unit || 'kg';
        let weightStr = [];
        
        let unitLabel = t.kg;
        if (displayUnit === 'mun') unitLabel = t.mun;
        else if (displayUnit === 'kg') unitLabel = t.kg;
        else if (displayUnit === 'gram') unitLabel = t.gram;
        else if (displayUnit === 'ltr') unitLabel = t.ltr;
        else if (displayUnit === 'ml') unitLabel = t.ml;
        else if (displayUnit === 'amount') unitLabel = lang === 'ur' ? 'تعداد' : 'Pcs';
        
        if (item.qty !== undefined && item.unit) {
            weightStr.push(`${displayQty} ${unitLabel}`);
        } else if (item.weight) {
            // Old format fallback
            if (item.weight.mun > 0) weightStr.push(`${item.weight.mun} ${t.mun}`);
            if (item.weight.kg > 0) weightStr.push(`${item.weight.kg} ${t.kg}`);
            if (item.weight.grams > 0) weightStr.push(`${item.weight.grams} ${t.gram}`);
            if (item.weight.ltr > 0) weightStr.push(`${item.weight.ltr} ${t.ltr}`);
            if (item.weight.ml > 0) weightStr.push(`${item.weight.ml} ${t.ml}`);
        }
        
        if (weightStr.length === 0) weightStr.push(`${parseFloat(item.totalKg || 0).toFixed(3)} ${t.kg}`);

        let secondColHtml = '';
        if (item.itemName && item.itemName.toLowerCase().includes('freight')) {
            secondColHtml = '-';
        } else {
            secondColHtml = `
                <div>${weightStr.join(', ')}</div>
                <div style="font-size: 0.8em; color: #555;">(${parseFloat(item.totalKg || 0).toFixed(3)} ${t.labelKg})</div>
            `;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.itemName || 'Unknown Item'}</td>
            <td>${secondColHtml}</td>
            <td>${parseFloat(item.ratePerKg || 0).toFixed(2)}</td>
            <td>${parseFloat(item.totalAmount || 0).toFixed(2)}</td>
        `;
        printBody.appendChild(tr);
    });

    // If previousBalance exists, show it. Otherwise hide the rows.
    const hasPrevBalance = tx.previousBalance !== undefined && tx.previousBalance !== 0;
    
    const labelItemsTotal = document.getElementById('label-items-total-print');
    const labelPrevBal = document.getElementById('label-prev-bal-print');
    const labelGrandTotal = document.getElementById('label-grand-total-print');

    if (labelItemsTotal) labelItemsTotal.textContent = lang === 'ur' ? 'آئٹمز کل رقم:' : 'Items Total:';
    if (labelPrevBal) labelPrevBal.textContent = lang === 'ur' ? 'پچھلا بقایا:' : 'Previous Balance:';
    if (labelGrandTotal) labelGrandTotal.textContent = lang === 'ur' ? 'کل رقم (Grand Total):' : 'Grand Total:';

    const itemsTotalVal = tx.totalAmount;
    const prevBalVal = tx.previousBalance || 0;
    const grandTotalVal = tx.grandTotal !== undefined ? tx.grandTotal : itemsTotalVal;

    const rowPrevBal = document.getElementById('prev-balance-row');
    const rowGrandTotal = document.getElementById('grand-total-row');

    if (rowPrevBal && rowGrandTotal) {
        if (hasPrevBalance) {
            rowPrevBal.style.display = 'block';
            rowGrandTotal.style.display = 'block';
            if (labelItemsTotal) labelItemsTotal.textContent = lang === 'ur' ? 'آئٹمز کل رقم:' : 'Items Total:';
        } else {
            rowPrevBal.style.display = 'none';
            rowGrandTotal.style.display = 'none';
            if (labelItemsTotal) labelItemsTotal.textContent = lang === 'ur' ? 'کل رقم:' : 'Total Amount:';
        }
    }

    const itemsTotalEl = document.getElementById('invoice-items-total');
    if (itemsTotalEl) itemsTotalEl.textContent = parseFloat(itemsTotalVal).toFixed(2);

    const prevBalEl = document.getElementById('invoice-prev-bal');
    if (prevBalEl) prevBalEl.textContent = parseFloat(prevBalVal).toFixed(2);

    const grandTotalEl = document.getElementById('invoice-grand-total');
    if (grandTotalEl) grandTotalEl.textContent = parseFloat(grandTotalVal).toFixed(2);

    document.getElementById('invoice-paid').textContent = parseFloat(tx.paidAmount).toFixed(2);
    document.getElementById('invoice-remaining').textContent = parseFloat(tx.remainingAmount).toFixed(2);

    // Set document title to auto-populate PDF filename
    const originalTitle = document.title;
    document.title = `Invoice-${tx.id}`;

    // Trigger Print
    if (triggerPrint) {
        setTimeout(() => {
            window.print();
            document.title = originalTitle;
        }, 100);
    } else {
        document.title = originalTitle;
    }
}

window.editInvoice = function(txId) {
    const transactions = window.Store.getTransactions();
    const tx = transactions.find(t => t.id === txId);
    if (!tx) {
        alert("Transaction not found.");
        return;
    }

    // Save editing state to session storage
    sessionStorage.setItem('editingTxId', txId);
    
    // Redirect to Dashboard (index.html)
    window.location.href = 'index.html';
};

function deleteInvoice(txId) {
    if (confirm("Are you sure you want to delete this invoice? This action cannot be undone.")) {
        window.Store.deleteTransaction(txId);
        window.renderInvoicesTable();
        if (typeof updateDashboard === 'function') {
            updateDashboard();
        }
    }
}

window.shareWhatsApp = async function (txId) {
    if (typeof html2canvas === 'undefined') {
        alert("Image rendering library is not loaded. Please ensure you have internet connection.");
        return;
    }

    const transactions = window.Store.getTransactions();
    const tx = transactions.find(t => t.id === txId);
    if (!tx) {
        alert("Transaction not found.");
        return;
    }

    const lang = localStorage.getItem('lang') || 'en';
    
    // Populate the print area
    printInvoice(txId, lang, false);

    const printArea = document.getElementById('print-area');
    
    // Temporarily show the print area to capture it
    const originalDisplay = printArea.style.display;
    const originalPosition = printArea.style.position;
    const originalTop = printArea.style.top;
    const originalZIndex = printArea.style.zIndex;

    printArea.classList.remove('print-only');
    printArea.style.display = 'block';
    printArea.style.position = 'absolute';
    printArea.style.top = '-9999px';
    printArea.style.zIndex = '-1';
    printArea.style.background = '#ffffff';

    try {
        // Capture image
        const canvas = await html2canvas(printArea, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
        
        // Restore styles
        printArea.classList.add('print-only');
        printArea.style.display = originalDisplay;
        printArea.style.position = originalPosition;
        printArea.style.top = originalTop;
        printArea.style.zIndex = originalZIndex;

        // Convert to blob
        canvas.toBlob(async function(blob) {
            if (!blob) {
                alert("Failed to generate image.");
                return;
            }

            const fileName = `Invoice-${tx.id}.png`;
            const file = new File([blob], fileName, { type: 'image/png' });

            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

            // Web Share API support check - ONLY use on Mobile to prevent Windows Desktop Share Drawer
            if (isMobile && navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({
                        files: [file],
                        title: fileName
                    });
                    return; // Successfully shared natively
                } catch (err) {
                    console.log("Share failed or was cancelled:", err);
                }
            }
            
            // Fallback for Desktop or unsupported browsers
            // Download the image
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            // Copy to clipboard if supported
            if (navigator.clipboard && navigator.clipboard.write) {
                try {
                    const clipboardItem = new ClipboardItem({ 'image/png': blob });
                    await navigator.clipboard.write([clipboardItem]);
                    alert("Invoice image downloaded and copied to your clipboard!");
                } catch (err) {
                    console.log("Clipboard write failed:", err);
                    alert("Invoice image downloaded successfully!");
                }
            } else {
                alert("Invoice image downloaded successfully!");
            }
        }, 'image/png');
    } catch (err) {
        console.error("html2canvas error:", err);
        alert("Failed to generate invoice image.");
        // Ensure cleanup
        printArea.classList.add('print-only');
        printArea.style.display = originalDisplay;
        printArea.style.position = originalPosition;
        printArea.style.top = originalTop;
        printArea.style.zIndex = originalZIndex;
    }
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
    
    const txItems = tx.items || [tx];
    let itemsListUrdu = txItems.map((item, i) => `${i+1}. ${item.itemName} | ${parseFloat(item.totalKg).toFixed(3)} کلو | ریٹ: ${parseFloat(item.ratePerKg).toFixed(2)} | کل: ${parseFloat(item.totalAmount).toFixed(2)}`).join('\n');
    let itemsListEn = txItems.map((item, i) => `${i+1}. ${item.itemName} | ${parseFloat(item.totalKg).toFixed(3)} Kg | Rate: ${parseFloat(item.ratePerKg).toFixed(2)} | Total: ${parseFloat(item.totalAmount).toFixed(2)}`).join('\n');

    if (lang === 'ur') {
        const typeStr = tx.type.toUpperCase() === 'IN' ? "خریداری (Stock In)" : "فروخت (Stock Out)";
        message = `\u200E\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0بسم اللہ الرحمن الرحیم\n🏢 *منجانب: Wanda Material Invoice*\n-----------------------------------\n*بل / انوائس: ${tx.id}*\n*تاریخ:* ${dateStr}\n*نام:* ${tx.person || 'N/A'}\n*قسم:* ${typeStr}\n-----------------------------------\n*آئٹمز:*\n${itemsListUrdu}\n-----------------------------------\n*کل رقم:* ${parseFloat(tx.totalAmount).toFixed(2)}\n*ادا شدہ:* ${parseFloat(tx.paidAmount).toFixed(2)}\n*بقایا:* ${parseFloat(tx.remainingAmount).toFixed(2)}\n\n\u200E\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0جزاک اللہ`;
    } else {
        const typeStr = tx.type.toUpperCase() === 'IN' ? 'Stock In (Purchase)' : 'Stock Out (Sale)';
        message = `\u200E\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0بسم اللہ الرحمن الرحیم\n🏢 *From: Wanda Material Invoice*\n-----------------------------------\n*INVOICE: ${tx.id}*\n*Date:* ${dateStr}\n*Name:* ${tx.person || 'N/A'}\n*Type:* ${typeStr}\n-----------------------------------\n*Items:*\n${itemsListEn}\n-----------------------------------\n*Total Amount:* ${parseFloat(tx.totalAmount).toFixed(2)}\n*Paid:* ${parseFloat(tx.paidAmount).toFixed(2)}\n*Remaining:* ${parseFloat(tx.remainingAmount).toFixed(2)}\n\n\u200E\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0جزاک اللہ`;
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
