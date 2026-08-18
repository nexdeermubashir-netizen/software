// admin.js
document.addEventListener('DOMContentLoaded', () => {
    // Admin Login Logic
    const loginSection = document.getElementById('admin-login-section');
    const mainContent = document.getElementById('admin-main-content');
    const loginForm = document.getElementById('admin-login-form');
    const loginError = document.getElementById('login-error');

    let isAuthenticated = true; // Default true if no login form present

    if (loginSection && mainContent && loginForm) {
        if (sessionStorage.getItem('admin_authenticated') === 'true') {
            loginSection.style.display = 'none';
            mainContent.style.display = 'block';
        } else {
            isAuthenticated = false;
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const email = document.getElementById('login-email').value.trim();
                const pwd = document.getElementById('login-password').value.trim();

                if (email === 'nexdeer.mubashir@gmail.com' && pwd === 'nexdeer123') {
                    sessionStorage.setItem('admin_authenticated', 'true');
                    loginSection.style.display = 'none';
                    mainContent.style.display = 'block';
                    loginError.style.display = 'none';
                    isAuthenticated = true;
                    if (document.getElementById('items-table')) {
                        renderItemsTable();
                        if (typeof renderOutstandingBalances === 'function') renderOutstandingBalances();
                    }
                } else {
                    loginError.style.display = 'block';
                }
            });
        }
    }

    const addItemForm = document.getElementById('add-item-form');
    
    // Load initial items if we are on the items page and authenticated
    if (isAuthenticated && document.getElementById('items-table')) {
        renderItemsTable();
        if (typeof renderOutstandingBalances === 'function') renderOutstandingBalances();
    }

    if (addItemForm) {
        addItemForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const input = document.getElementById('item-name');
            const itemName = input.value.trim();

            if (itemName) {
                window.Store.addItem(itemName);
                input.value = '';
                if (document.getElementById('items-table')) {
                    renderItemsTable();
                    if (typeof renderOutstandingBalances === 'function') renderOutstandingBalances();
                }
                if (window.populateStockItemSelect) window.populateStockItemSelect();
            }
        });
    }
});

function renderItemsTable() {
    const items = window.Store.getItems();
    const tbody = document.querySelector('#items-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const transactions = window.Store.getTransactions();

    if (items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No items added yet.</td></tr>';
        return;
    }

    const itemTotals = {};
    let overallIn = 0;
    let overallOut = 0;
    let overallRem = 0;

    let overallProfit = 0;
    let weekProfit = 0;
    let monthProfit = 0;

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    items.forEach(item => {
        itemTotals[item.id] = { in: 0, out: 0 };
    });

    transactions.forEach(tx => {
        if (tx.type === 'in') {
            overallIn += parseFloat(tx.totalKg) || 0;
            if (itemTotals[tx.itemId]) itemTotals[tx.itemId].in += parseFloat(tx.totalKg) || 0;
        } else if (tx.type === 'out') {
            overallOut += parseFloat(tx.totalKg) || 0;
            if (itemTotals[tx.itemId]) itemTotals[tx.itemId].out += parseFloat(tx.totalKg) || 0;
        }
        
        const tAmt = parseFloat(tx.totalAmount) || 0;
        const pAmt = parseFloat(tx.paidAmount) || 0;
        overallRem += (tAmt - pAmt);

        // Profit Calculation
        const txDate = new Date(tx.date);
        let profitContribution = 0;
        if (tx.type === 'out') {
            profitContribution = tAmt;
        } else if (tx.type === 'in') {
            profitContribution = -tAmt;
        }

        overallProfit += profitContribution;
        if (txDate >= oneWeekAgo) weekProfit += profitContribution;
        if (txDate >= oneMonthAgo) monthProfit += profitContribution;
    });

    // Update Dashboard Cards
    const elItems = document.getElementById('admin-stat-items');
    const elIn = document.getElementById('admin-stat-in');
    const elOut = document.getElementById('admin-stat-out');
    const elRem = document.getElementById('admin-stat-rem');
    
    const elProfitWeek = document.getElementById('admin-stat-profit-week');
    const elProfitMonth = document.getElementById('admin-stat-profit-month');
    const elProfitOverall = document.getElementById('admin-stat-profit-overall');
    
    if (elItems) elItems.textContent = items.length;
    if (elIn) elIn.textContent = overallIn.toFixed(2);
    if (elOut) elOut.textContent = overallOut.toFixed(2);
    if (elRem) elRem.textContent = overallRem.toFixed(2);

    if (elProfitWeek) elProfitWeek.textContent = weekProfit.toFixed(2);
    if (elProfitMonth) elProfitMonth.textContent = monthProfit.toFixed(2);
    if (elProfitOverall) elProfitOverall.textContent = overallProfit.toFixed(2);

    items.forEach((item, index) => {
        const stats = itemTotals[item.id];
        const currentStock = stats.in - stats.out;
        
        // Find common unit for display (fallback to Kg if mixed)
        let displayUnit = 'Kg';
        const itemTxs = transactions.filter(t => t.itemId === item.id);
        if (itemTxs.length > 0) {
            const firstUnit = itemTxs[0].unit;
            const allSame = itemTxs.every(t => t.unit === firstUnit);
            if (allSame) {
                if (firstUnit === 'amount') displayUnit = 'Pcs';
                else if (firstUnit === 'ltr' || firstUnit === 'ml') displayUnit = 'Liters';
            } else {
                displayUnit = 'Mixed';
            }
        }

        const tr = document.createElement('tr');
        
        const tdName = document.createElement('td');
        tdName.textContent = `${index + 1} - ${item.name}`;
        
        const tdIn = document.createElement('td');
        tdIn.innerHTML = `<span style="color: var(--success); font-weight: 500;">${stats.in.toFixed(2)}</span> <small style="color: var(--text-secondary);">${displayUnit}</small>`;
        
        const tdOut = document.createElement('td');
        tdOut.innerHTML = `<span style="color: var(--danger); font-weight: 500;">${stats.out.toFixed(2)}</span> <small style="color: var(--text-secondary);">${displayUnit}</small>`;
        
        const tdCurrent = document.createElement('td');
        tdCurrent.innerHTML = `<strong>${currentStock.toFixed(2)}</strong> <small style="color: var(--text-secondary);">${displayUnit}</small>`;
        
        const tdAction = document.createElement('td');
        
        const btnEdit = document.createElement('button');
        btnEdit.className = 'action-btn edit';
        btnEdit.innerHTML = "<i class='bx bx-edit'></i>";
        btnEdit.title = "Edit Item";
        btnEdit.style.marginRight = "8px";
        btnEdit.onclick = () => {
            showEditModal(item, (newName) => {
                window.Store.updateItem(item.id, newName);
                renderItemsTable();
                if (window.populateStockItemSelect) window.populateStockItemSelect();
            });
        };

        const btnDelete = document.createElement('button');
        btnDelete.className = 'action-btn del';
        btnDelete.innerHTML = "<i class='bx bx-trash'></i>";
        btnDelete.title = "Delete Item";
        btnDelete.onclick = () => {
            if (confirm(`Are you sure you want to delete "${item.name}"?`)) {
                window.Store.deleteItem(item.id);
                renderItemsTable();
                if (window.populateStockItemSelect) window.populateStockItemSelect();
            }
        };

        tdAction.appendChild(btnEdit);
        tdAction.appendChild(btnDelete);
        tr.appendChild(tdName);
        tr.appendChild(tdIn);
        tr.appendChild(tdOut);
        tr.appendChild(tdCurrent);
        tr.appendChild(tdAction);
        tbody.appendChild(tr);
    });
}

function showEditModal(item, onConfirm) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    
    const content = document.createElement('div');
    content.className = 'modal-content';
    
    const title = document.createElement('div');
    title.className = 'modal-title';
    title.textContent = `Edit Item`;
    
    const label = document.createElement('div');
    label.style.marginBottom = '8px';
    label.style.color = 'var(--text-secondary)';
    label.style.fontSize = '0.9rem';
    label.textContent = `Enter new name for "${item.name}":`;
    
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'modal-input';
    input.value = item.name;
    
    const actions = document.createElement('div');
    actions.className = 'modal-actions';
    
    const btnCancel = document.createElement('button');
    btnCancel.className = 'modal-btn cancel';
    btnCancel.textContent = 'Cancel';
    
    const btnConfirm = document.createElement('button');
    btnConfirm.className = 'modal-btn confirm';
    btnConfirm.textContent = 'OK';
    
    actions.appendChild(btnCancel);
    actions.appendChild(btnConfirm);
    
    content.appendChild(title);
    content.appendChild(label);
    content.appendChild(input);
    content.appendChild(actions);
    overlay.appendChild(content);
    
    document.body.appendChild(overlay);
    
    input.focus();
    input.select();
    
    const closeModal = () => {
        if (document.body.contains(overlay)) {
            document.body.removeChild(overlay);
        }
    };
    
    btnCancel.onclick = closeModal;
    overlay.onmousedown = (e) => {
        if (e.target === overlay) closeModal();
    };
    
    const handleConfirm = () => {
        const newName = input.value;
        if (newName && newName.trim() !== '' && newName !== item.name) {
            onConfirm(newName.trim());
        }
        closeModal();
    };
    
    btnConfirm.onclick = handleConfirm;
    input.onkeydown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleConfirm();
        }
        if (e.key === 'Escape') closeModal();
    };
}

let currentBalanceSearchQuery = '';

document.addEventListener('DOMContentLoaded', () => {
    const balSearch = document.getElementById('admin-balance-search');
    if (balSearch) {
        balSearch.addEventListener('input', (e) => {
            currentBalanceSearchQuery = e.target.value.toLowerCase();
            renderOutstandingBalances();
        });
    }
});

function renderOutstandingBalances() {
    const transactions = window.Store.getTransactions();
    const tbody = document.querySelector('#outstanding-balances-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    const balances = {};
    
    transactions.forEach(tx => {
        if (!tx.person) return;
        if (!balances[tx.person]) {
            balances[tx.person] = 0;
        }
        const totalAmt = parseFloat(tx.totalAmount) || 0;
        const paidAmt = parseFloat(tx.paidAmount) || 0;
        balances[tx.person] += (totalAmt - paidAmt);
    });
    
    const personsList = window.Store.getPersons();
    
    let personsWithBalance = Object.entries(balances)
        .filter(([person, bal]) => bal > 0.01) // ignore tiny floating point errors
        .map(([person, bal]) => {
            const index = personsList.findIndex(p => p.name === person);
            const code = index !== -1 ? (index + 1).toString() : '';
            return { person, bal, code };
        });

    if (currentBalanceSearchQuery) {
        personsWithBalance = personsWithBalance.filter(item => {
            return item.person.toLowerCase().includes(currentBalanceSearchQuery) || 
                   item.code.includes(currentBalanceSearchQuery);
        });
    }
    
    personsWithBalance.sort((a, b) => b.bal - a.bal);
        
    if (personsWithBalance.length === 0) {
        tbody.innerHTML = '<tr><td colspan="2" style="text-align: center; color: var(--text-secondary);">No outstanding balances.</td></tr>';
        return;
    }
    
    personsWithBalance.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${item.code ? item.code + ' - ' : ''}${item.person}</strong></td>
            <td style="color: var(--danger); font-weight: 700;">${item.bal.toFixed(2)}</td>
        `;
        tbody.appendChild(tr);
    });
}
