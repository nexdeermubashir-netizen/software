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

    // Current Stock Logic
    const itemSelect = document.getElementById('stock-item');
    const stockDisplay = document.getElementById('current-stock-display');
    const stockVal = document.getElementById('current-stock-val');

    window.updateCurrentStockDisplay = function() {
        const items = window.Store.getItems();
        const itemInputValue = itemSelect.value.trim();
        let itemId = null;

        if (itemInputValue) {
            // Check if input starts with a number
            const match = itemInputValue.match(/^(\d+)/);
            if (match) {
                const index = parseInt(match[1]) - 1;
                if (items[index]) {
                    itemId = items[index].id;
                }
            } else {
                // Check by exact name match
                const foundItem = items.find(i => i.name.toLowerCase() === itemInputValue.toLowerCase());
                if (foundItem) {
                    itemId = foundItem.id;
                }
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
            if (tx.itemId === itemId) {
                if (tx.type === 'in') {
                    totalIn += parseFloat(tx.totalKg) || 0;
                } else if (tx.type === 'out') {
                    totalOut += parseFloat(tx.totalKg) || 0;
                }
            }
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
    const totalAmountInput = document.getElementById('total-amount');
    const paidInput = document.getElementById('amount-paid');
    const remainingInput = document.getElementById('amount-remaining');

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

    function calculateFinancials(e) {
        const totalKg = calculateTotalWeight();
        const rate = parseFloat(rateInput.value) || 0;
        const totalAmount = totalKg * rate;
        totalAmountInput.value = totalAmount.toFixed(2);

        // Auto-fill Amount Paid if the change wasn't manually typing in the paid input
        if (e && e.target !== paidInput) {
            paidInput.value = totalAmount.toFixed(2);
        }

        const paid = parseFloat(paidInput.value) || 0;
        const remaining = totalAmount - paid;
        remainingInput.value = remaining.toFixed(2);
    }

    // Attach Event Listeners for Live Calculation
    [qtyInput, rateInput, paidInput].forEach(input => {
        input.addEventListener('input', calculateFinancials);
    });
    unitSelect.addEventListener('change', () => {
        calculateFinancials();
        updateUnitLabels();
    });

    // Also update current stock when unit changes, as it modifies suffix
    unitSelect.addEventListener('change', window.updateCurrentStockDisplay);

    // Form Submission
    const stockForm = document.getElementById('stock-form');
    stockForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const type = document.getElementById('transaction-type').value;
        const personInputValue = document.getElementById('person-name').value.trim();
        
        // Resolve Person (allow entering number or string)
        let personName = personInputValue;
        const persons = window.Store.getPersons();
        if (personInputValue) {
            const matchNumOnly = personInputValue.match(/^(\d+)$/);
            const matchWithDash = personInputValue.match(/^(\d+)\s*-\s*(.+)/);
            
            if (matchNumOnly) {
                const index = parseInt(matchNumOnly[1]) - 1;
                if (persons[index]) {
                    personName = persons[index].name;
                }
            } else if (matchWithDash) {
                const index = parseInt(matchWithDash[1]) - 1;
                if (persons[index]) {
                    personName = persons[index].name;
                } else {
                    personName = matchWithDash[2].trim();
                }
            }
        }
        
        // Add person to registry if new
        if (personName) {
            window.Store.addPerson(personName);
            window.populatePersonSelect();
        }
        
        const itemSelect = document.getElementById('stock-item');
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
        
        if (!itemId) {
            alert("Please select a valid item from the list.");
            return;
        }
        if (!personName) {
            alert("Please enter a person name.");
            return;
        }

        const qty = parseFloat(qtyInput.value) || 0;
        const unit = unitSelect.value;
        
        let mun = 0, kg = 0, grams = 0, ltr = 0, ml = 0;
        if (unit === 'mun') mun = qty;
        else if (unit === 'kg') kg = qty;
        else if (unit === 'gram') grams = qty;
        else if (unit === 'ltr') ltr = qty;
        else if (unit === 'ml') ml = qty;

        const totalKg = calculateTotalWeight();

        const rate = parseFloat(rateInput.value) || 0;
        const totalAmount = parseFloat(totalAmountInput.value) || 0;
        const paid = parseFloat(paidInput.value) || 0;
        const remaining = parseFloat(remainingInput.value) || 0;

        if (totalKg <= 0) {
            alert("Total weight must be greater than 0.");
            return;
        }

        const tx = {
            type: type,
            person: personName,
            itemId: itemId,
            itemName, // Save name directly in transaction
            unit: unit,
            weight: { mun, kg, grams, ltr, ml },
            totalKg,
            ratePerKg: rate,
            totalAmount,
            paidAmount: paid,
            remainingAmount: remaining
        };

        window.Store.addTransaction(tx);
        
        alert(`Transaction saved successfully!`);
        
        // Reset form except item and type if wanted, but full reset is cleaner
        stockForm.reset();
        calculateFinancials(); // reset displays
        window.updateCurrentStockDisplay(); // hide stock display after reset

        // If dashboard function exists, trigger update
        if (typeof updateDashboard === 'function') {
            updateDashboard();
        }
        if (typeof renderInvoicesTable === 'function') {
            renderInvoicesTable();
        }
    });
});
