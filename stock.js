// stock.js
document.addEventListener('DOMContentLoaded', () => {
    // Populate dropdown
    window.populateStockItemSelect = function(filterQuery = '') {
        const items = window.Store.getItems();
        const dataList = document.getElementById('stock-item-list');
        if (!dataList) return;
        
        dataList.innerHTML = '';
        const val = filterQuery.trim().toLowerCase();
        const isNum = /^\d+$/.test(val);

        items.forEach((item, index) => {
            const idStr = String(index + 1);
            const nameLower = item.name.toLowerCase();
            const fullStr = `${idStr} - ${item.name}`;
            
            let shouldInclude = false;
            if (!val) {
                shouldInclude = true;
            } else if (isNum) {
                if (idStr === val || nameLower.includes(val)) {
                    shouldInclude = true;
                }
            } else {
                if (fullStr.toLowerCase().includes(val)) {
                    shouldInclude = true;
                }
            }

            if (shouldInclude) {
                const option = document.createElement('option');
                option.value = fullStr;
                dataList.appendChild(option);
            }
        });
    };
    
    window.populatePersonSelect = function() {
        const persons = window.Store.getPersons();
        const dataList = document.getElementById('person-name-list');
        if (!dataList) return;
        
        dataList.innerHTML = '';
        persons.forEach((person, index) => {
            const option = document.createElement('option');
            option.value = `${index + 1} - ${person.name}`;
            dataList.appendChild(option);
        });
    };

    // Initial populate
    window.populateStockItemSelect();

    const stockItemInput = document.getElementById('stock-item');
    if (stockItemInput) {
        stockItemInput.addEventListener('input', function(e) {
            window.populateStockItemSelect(this.value);
        });
    }
    window.populatePersonSelect();

    window.currentCart = [];

    const itemSelect = document.getElementById('stock-item');
    const stockDisplay = document.getElementById('current-stock-display');
    const stockVal = document.getElementById('current-stock-val');

    window.updateCurrentStockDisplay = function() {
        const items = window.Store.getItems();
        const itemInputValue = itemSelect.value.trim();
        let itemId = null;

        if (itemInputValue) {
            const match = itemInputValue.match(/^(\d+)/);
            if (match) {
                const index = parseInt(match[1]) - 1;
                if (items[index]) itemId = items[index].id;
            } else {
                const foundItem = items.find(i => i.name.toLowerCase() === itemInputValue.toLowerCase());
                if (foundItem) itemId = foundItem.id;
            }
        }

        if (!itemId) {
            stockDisplay.style.display = 'none';
            return;
        }

        const transactions = window.Store.getTransactions();
        let totalIn = 0;
        let totalOut = 0;

        transactions.forEach(tx => {
            // Support both old and new schema
            const txItems = tx.items || [tx];
            txItems.forEach(txi => {
                if (txi.itemId === itemId) {
                    if (tx.type === 'in') totalIn += parseFloat(txi.totalKg) || 0;
                    else if (tx.type === 'out') totalOut += parseFloat(txi.totalKg) || 0;
                }
            });
        });

        const currentStock = totalIn - totalOut;
        stockVal.textContent = currentStock.toFixed(3);
        stockDisplay.style.display = 'flex';
    };

    itemSelect.addEventListener('input', window.updateCurrentStockDisplay);
    itemSelect.addEventListener('change', window.updateCurrentStockDisplay);

    const qtyInput = document.getElementById('transaction-qty');
    const unitSelect = document.getElementById('transaction-unit');
    const totalKgDisplay = document.getElementById('calc-total-kg');
    
    // Financials Logic
    const rateInput = document.getElementById('rate-per-kg');
    const itemTotalAmountSpan = document.getElementById('item-total-amount');

    function calculateTotalWeight() {
        const qty = parseFloat(qtyInput.value) || 0;
        const unit = unitSelect.value;
        let totalKg = 0;

        if (unit === 'mun') totalKg = qty * 40;
        else if (unit === 'kg') totalKg = qty;
        else if (unit === 'gram') totalKg = qty / 1000;
        else if (unit === 'ltr') totalKg = qty;
        else if (unit === 'ml') totalKg = qty / 1000;
        else if (unit === 'amount') totalKg = qty;
        
        totalKgDisplay.textContent = totalKg.toFixed(3);
        updateUnitLabels();
        return totalKg;
    }

    function updateUnitLabels() {
        const unit = unitSelect.value;
        const currentStockUnit = document.getElementById('current-stock-unit');
        const calcUnitSuffix = document.getElementById('calc-unit-suffix');
        const rateUnitSuffix = document.getElementById('rate-unit-suffix');
        
        let displayUnit = '(Kg)';
        let perUnit = '(Per Kg)';

        if (unit === 'ltr' || unit === 'ml') {
            displayUnit = '(Liters)';
            perUnit = '(Per Liter)';
        } else if (unit === 'amount') {
            displayUnit = '(Pcs)';
            perUnit = '(Per Pcs)';
        }

        const lang = localStorage.getItem('lang') || 'en';
        if (lang === 'ur') {
            if (unit === 'ltr' || unit === 'ml') {
                displayUnit = '(لیٹر)';
                perUnit = '(فی لیٹر)';
            } else if (unit === 'amount') {
                displayUnit = '(تعداد)';
                perUnit = '(فی تعداد)';
            } else {
                displayUnit = '(کلوگرام)';
                perUnit = '(فی کلوگرام)';
            }
        }

        if (currentStockUnit) currentStockUnit.textContent = displayUnit;
        if (calcUnitSuffix) calcUnitSuffix.textContent = displayUnit;
        if (rateUnitSuffix) rateUnitSuffix.textContent = perUnit;
    }

    function calculateFinancials() {
        const totalKg = calculateTotalWeight();
        const rate = parseFloat(rateInput.value) || 0;
        const freightInput = document.getElementById('freight-charges');
        const freight = freightInput ? (parseFloat(freightInput.value) || 0) : 0;
        const totalAmount = (totalKg * rate) + freight;
        if (itemTotalAmountSpan) itemTotalAmountSpan.textContent = totalAmount.toFixed(2);
    }

    // Attach Event Listeners for Live Calculation
    const freightInputEl = document.getElementById('freight-charges');
    [qtyInput, rateInput, freightInputEl].forEach(input => {
        if(input) input.addEventListener('input', calculateFinancials);
    });
    if(unitSelect) {
        unitSelect.addEventListener('change', () => {
            calculateFinancials();
            updateUnitLabels();
            window.updateCurrentStockDisplay();
        });
    }

    // Cart Logic
    const btnAddToCart = document.getElementById('btn-add-to-cart');
    const cartTableBody = document.querySelector('#cart-table tbody');
    const grandTotalInput = document.getElementById('total-amount');
    const paidInput = document.getElementById('amount-paid');
    const remainingInput = document.getElementById('amount-remaining');

    const cartTotalInput = document.getElementById('cart-total');
    const previousBalanceInput = document.getElementById('previous-balance');
    const personNameInput = document.getElementById('person-name');

    window.updateCheckoutFinancials = function(e) {
        let cartTotal = 0;
        window.currentCart.forEach(item => { cartTotal += parseFloat(item.totalAmount); });
        
        if (cartTotalInput) cartTotalInput.value = cartTotal.toFixed(2);

        // Get Previous Balance
        let prevBalance = 0;
        if (personNameInput && personNameInput.value.trim() !== '') {
            let pName = personNameInput.value.trim();
            const matchWithDash = pName.match(/^\d+\s*-\s*(.+)/);
            if (matchWithDash) {
                pName = matchWithDash[1].trim();
            }
            
            // Search all transactions for this person (excluding current editing transaction)
            const transactions = window.Store.getTransactions();
            let totalT = 0, totalP = 0;
            transactions.forEach(t => {
                if (t.person === pName && t.id !== window.editingTxId) {
                    totalT += parseFloat(t.totalAmount) || 0;
                    totalP += parseFloat(t.paidAmount) || 0;
                }
            });
            prevBalance = totalT - totalP;
        }

        if (previousBalanceInput) previousBalanceInput.value = prevBalance.toFixed(2);

        let grandTotal = cartTotal + prevBalance;
        grandTotalInput.value = grandTotal.toFixed(2);

        if (e && e.target !== paidInput && window.currentCart.length > 0) {
            paidInput.value = grandTotal.toFixed(2);
        } else if (window.currentCart.length === 0) {
            paidInput.value = prevBalance > 0 ? prevBalance.toFixed(2) : '0';
        }

        const paid = parseFloat(paidInput.value) || 0;
        const remaining = grandTotal - paid;
        remainingInput.value = remaining.toFixed(2);
    };

    if (personNameInput) {
        personNameInput.addEventListener('input', window.updateCheckoutFinancials);
        personNameInput.addEventListener('change', window.updateCheckoutFinancials);
    }

    if (paidInput) paidInput.addEventListener('input', window.updateCheckoutFinancials);

    window.renderCart = function() {
        cartTableBody.innerHTML = '';
        if (window.currentCart.length === 0) {
            const lang = localStorage.getItem('lang') || 'en';
            const msg = lang === 'ur' ? 'فہرست خالی ہے۔ اوپر آئٹمز شامل کریں۔' : 'No items added yet. Add items above.';
            cartTableBody.innerHTML = `<tr id="cart-empty-row"><td colspan="5" style="text-align: center; padding: 24px; color: var(--text-secondary);">${msg}</td></tr>`;
        } else {
            window.currentCart.forEach((item, index) => {
                let displayUnit = item.unit;
                if (localStorage.getItem('lang') === 'ur') {
                    if (displayUnit === 'amount') displayUnit = 'تعداد';
                    else if (displayUnit === 'ltr') displayUnit = 'لیٹر';
                    else if (displayUnit === 'ml') displayUnit = 'ملی لیٹر';
                    else if (displayUnit === 'kg') displayUnit = 'کلو';
                    else if (displayUnit === 'gram') displayUnit = 'گرام';
                    else if (displayUnit === 'mun') displayUnit = 'من';
                }

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${item.itemName}</td>
                    <td>${item.qty} <small>${displayUnit}</small></td>
                    <td>${item.ratePerKg}</td>
                    <td>${item.totalAmount.toFixed(2)}</td>
                    <td>
                        <button type="button" class="action-btn del" onclick="window.removeFromCart(${index})">
                            <i class='bx bx-trash'></i>
                        </button>
                    </td>
                `;
                cartTableBody.appendChild(tr);
            });
        }
        window.updateCheckoutFinancials();
    };

    window.removeFromCart = function(index) {
        window.currentCart.splice(index, 1);
        window.renderCart();
    };

    if (btnAddToCart) {
        btnAddToCart.addEventListener('click', () => {
            const itemInputValue = itemSelect.value.trim();
            const items = window.Store.getItems();
            let itemId = null;
            let itemName = 'Unknown Item';

            if (itemInputValue) {
                const match = itemInputValue.match(/^(\d+)/);
                if (match) {
                    const index = parseInt(match[1]) - 1;
                    if (items[index]) {
                        itemId = items[index].id;
                        itemName = items[index].name;
                    }
                } else {
                    const foundItem = items.find(i => i.name.toLowerCase() === itemInputValue.toLowerCase());
                    if (foundItem) {
                        itemId = foundItem.id;
                        itemName = foundItem.name;
                    }
                }
            }

            const freightInput = document.getElementById('freight-charges');
            const freight = freightInput ? (parseFloat(freightInput.value) || 0) : 0;

            if (!itemId) {
                if (!itemInputValue && freight > 0) {
                    itemId = 'FREIGHT-CHARGE';
                    const lang = localStorage.getItem('lang') || 'en';
                    itemName = lang === 'ur' ? 'فریٹ چارجز' : 'Freight Charges';
                } else {
                    alert("Please select a valid item from the list.");
                    return;
                }
            }

            let qty = parseFloat(qtyInput.value) || 0;
            let unit = unitSelect.value;
            const rate = parseFloat(rateInput.value) || 0;
            const totalKg = calculateTotalWeight();
            
            if (itemId === 'FREIGHT-CHARGE') {
                qty = 1;
                unit = 'amount';
            } else if (totalKg <= 0) {
                alert("Quantity must be greater than 0.");
                return;
            }

            let mun = 0, kg = 0, grams = 0, ltr = 0, ml = 0;
            if (unit === 'mun') mun = qty;
            else if (unit === 'kg') kg = qty;
            else if (unit === 'gram') grams = qty;
            else if (unit === 'ltr') ltr = qty;
            else if (unit === 'ml') ml = qty;

            const totalAmount = (totalKg * rate) + freight;

            const cartItem = {
                itemId,
                itemName,
                qty,
                unit,
                weight: { mun, kg, grams, ltr, ml },
                totalKg,
                ratePerKg: rate,
                freight: freight,
                totalAmount
            };

            window.currentCart.push(cartItem);
            window.renderCart();

            // Clear inputs for next item
            itemSelect.value = '';
            qtyInput.value = '';
            rateInput.value = '';
            if (freightInput) freightInput.value = '0';
            calculateFinancials();
            window.updateCurrentStockDisplay();
        });
    }

    // Form Submission
    const stockForm = document.getElementById('stock-form');
    stockForm.addEventListener('submit', (e) => {
        e.preventDefault();

        if (window.currentCart.length === 0) {
            alert("Please add at least one item to the list before saving.");
            return;
        }

        const type = document.getElementById('transaction-type').value;
        const personInputValue = document.getElementById('person-name').value.trim();
        
        let personName = personInputValue;
        const persons = window.Store.getPersons();
        if (personInputValue) {
            const matchNumOnly = personInputValue.match(/^(\d+)$/);
            const matchWithDash = personInputValue.match(/^(\d+)\s*-\s*(.+)/);
            
            if (matchNumOnly) {
                const index = parseInt(matchNumOnly[1]) - 1;
                if (persons[index]) personName = persons[index].name;
            } else if (matchWithDash) {
                const index = parseInt(matchWithDash[1]) - 1;
                if (persons[index]) {
                    personName = persons[index].name;
                } else {
                    personName = matchWithDash[2].trim();
                }
            }
        }
        
        if (!personName) {
            alert("Please enter a person name.");
            return;
        }

        // Add person to registry if new
        window.Store.addPerson(personName);
        window.populatePersonSelect();

        const grandTotal = parseFloat(grandTotalInput.value) || 0;
        
        let cartTotal = 0;
        window.currentCart.forEach(item => { cartTotal += parseFloat(item.totalAmount); });

        const previousBalanceInput = document.getElementById('previous-balance');
        const prevBalance = previousBalanceInput ? (parseFloat(previousBalanceInput.value) || 0) : 0;

        const paid = parseFloat(paidInput.value) || 0;
        const remaining = grandTotal - paid;

        // Construct multi-item transaction
        const tx = {
            type: type,
            person: personName,
            items: window.currentCart, // Store the array of items
            totalAmount: cartTotal,      // Strict cart total so global math doesn't double count!
            previousBalance: prevBalance, // Saved so invoice generation knows about it
            grandTotal: grandTotal,       // Saved for easy access
            paidAmount: paid,
            remainingAmount: remaining
        };

        // For backward compatibility on simple views, set top level itemName to a summary
        const itemNames = window.currentCart.map(i => i.itemName);
        tx.itemName = itemNames.length > 2 ? `${itemNames.slice(0,2).join(', ')}... (+${itemNames.length-2} more)` : itemNames.join(', ');
        // Set top level itemId to the first item just in case
        tx.itemId = window.currentCart[0].itemId; 
        
        // Sum totalKg for backward compatibility
        tx.totalKg = window.currentCart.reduce((sum, i) => sum + i.totalKg, 0);

        if (window.editingTxId) {
            window.Store.updateTransaction(window.editingTxId, tx);
            alert(`Transaction updated successfully!`);
            window.editingTxId = null;
            
            // Restore button text
            const submitBtn = document.querySelector('#stock-form button[type="submit"]');
            if (submitBtn) {
                const lang = localStorage.getItem('lang') || 'en';
                submitBtn.innerHTML = lang === 'ur' ? 'ٹرانزیکشن محفوظ کریں' : 'Save Transaction';
            }
        } else {
            window.Store.addTransaction(tx);
            alert(`Transaction saved successfully!`);
        }
        
        // Reset form
        stockForm.reset();
        window.currentCart = [];
        window.renderCart();
        window.updateCurrentStockDisplay();

        if (typeof updateDashboard === 'function') updateDashboard();
        if (typeof renderInvoicesTable === 'function') renderInvoicesTable();
    });

    // Check for editing state from invoices page
    const editingTxId = sessionStorage.getItem('editingTxId');
    if (editingTxId) {
        sessionStorage.removeItem('editingTxId');
        
        const transactions = window.Store.getTransactions();
        const tx = transactions.find(t => t.id === editingTxId);
        
        if (tx) {
            window.editingTxId = editingTxId;
            window.currentCart = tx.items || [tx];
            
            document.getElementById('transaction-type').value = tx.type;
            document.getElementById('person-name').value = tx.person;
            
            const paidInput = document.getElementById('amount-paid');
            if (paidInput) {
                paidInput.value = parseFloat(tx.paidAmount).toFixed(2);
            }
            
            if (typeof window.renderCart === 'function') {
                window.renderCart();
            }
            
            const submitBtn = document.querySelector('#stock-form button[type="submit"]');
            if (submitBtn) {
                const lang = localStorage.getItem('lang') || 'en';
                submitBtn.innerHTML = lang === 'ur' ? '<i class="bx bx-save"></i> ٹرانزیکشن اپ ڈیٹ کریں' : '<i class="bx bx-save"></i> Update Transaction';
            }
        }
    }
});
