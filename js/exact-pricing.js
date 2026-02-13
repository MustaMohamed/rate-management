/* --- APP ENGINE (EXACT PRICING) --- */

function init() {
    if (typeof initStore === 'function') {
        initStore();
        // Force exact mode for this view
        store.pricingModel = 'exact';
    } else {
        return;
    }

    // Render Views
    renderRoomsTable();
    renderRatesTable();
    // renderBasePriceMatrix(); // Renamed/Recurposed
    renderMatrix();

    updateStats();
}

// Stats & Utils
function updateStats() {
    if (store) {
        document.getElementById('stat-plans').innerText = store.rates.length;
        document.getElementById('stat-rooms').innerText = store.rooms.length;
    }
}

/* --- VIEW NAVIGATION --- */
function switchView(viewName, element) {
    // Hide all views
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    document.getElementById('view-' + viewName).classList.add('active');

    // Update Nav State
    if (element) {
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        element.classList.add('active');
    } else {
        // If no element is passed, try to find it by viewName
        const navItems = document.querySelectorAll('.nav-item');
        const indexMap = {
            dashboard: 0,
            rooms: 1,
            rates: 2,
            matrix: 3
        };
        // removed levels: 3 as per user request
        if (indexMap[viewName] !== undefined) {
            document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
            // Safety: ensure nav item exists
            const idx = indexMap[viewName];
            if (navItems[idx]) navItems[idx].classList.add('active');
        }
    }

    // Update Title
    const titles = {
        dashboard: 'Overview (Exact Pricing)',
        rooms: 'Room Type Configuration',
        rates: 'Rate Plan Management',
        matrix: 'Rate Grid & Inventory'
    };
    document.getElementById('pageTitle').innerText = titles[viewName] || 'Enterprise Rate Manager';

    // Render Views based on the active view
    renderRoomsTable();
    renderRatesTable();
    // renderBasePriceMatrix(); // Kept if relevant to Plans, but removed if Levels related
    renderMatrix();


    // Update Stats
    updateStats();
}

/* --- ROOM MANAGMENT --- */
// Reuse existing renderRoomsTable, openRoomModal, saveRoom, deleteRoom from app.js? 
// Since we duplicated the file, they are already here. keeping them as is.

function renderRoomsTable() {
    const tbody = document.getElementById('roomsTableBody');
    tbody.innerHTML = '';
    store.rooms.forEach((room, idx) => {
        const cluster = store.clusters ? store.clusters.find(c => c.id === (room.cluster || 'c1')) : { name: '-' };
        const clusterName = cluster ? cluster.name : '-';
        const bgColor = cluster && cluster.color ? cluster.color : '#f1f5f9';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span class="badge badge-gray">${room.code}</span></td>
            <td><span style="font-size:11px; text-transform:uppercase; font-weight:700; color:#475569; background-color:${bgColor}; padding:4px 8px; border-radius:4px;">${clusterName}</span></td>
            <td><strong>${room.name}</strong></td>
            <td>-</td>
            <td>
                <button class="btn btn-outline" style="padding:4px 8px; font-size:12px; color:var(--danger); border-color:var(--danger);" onclick="deleteRoom(${idx})">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    updateStats();
}

function openRoomModal() {
    const select = document.getElementById('m_room_cluster');
    select.innerHTML = '';
    if (store.clusters) {
        store.clusters.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.innerText = c.name;
            select.appendChild(opt);
        });
    }
    document.getElementById('roomModal').style.display = 'flex';
}

function saveRoom() {
    const name = document.getElementById('m_room_name').value;
    const code = document.getElementById('m_room_code').value;
    const clusterId = document.getElementById('m_room_cluster').value;

    if (name && code) {
        store.rooms.push({
            id: 'r' + Date.now(),
            code,
            name,
            cluster: clusterId,
            options: [{ id: 'o_def_1', name: 'Standard', delta: 0 }]
        });
        saveStore();
        renderRoomsTable();
        renderBasePriceMatrix();
        renderMatrix();
        closeModal('roomModal');
    }
}

function deleteRoom(idx) {
    store.rooms.splice(idx, 1);
    saveStore();
    renderRoomsTable();
    renderBasePriceMatrix();
    renderMatrix();
}


/* --- RATE PLAN CONFIGURATION (EXACT) --- */
function renderRatesTable() {
    const tbody = document.getElementById('ratesTableBody');
    tbody.innerHTML = '';

    // Clean up header for exact mode
    const tableHeader = document.querySelector('#ratesTable thead tr');
    if (tableHeader) {
        const headers = tableHeader.querySelectorAll('th');
        if (headers[3]) headers[3].innerText = 'Model';
    }

    store.rates.forEach((rate, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${rate.code}</strong></td>
            <td>${rate.name}</td>
            <td>Fixed / Exact</td>
            <td><span class="badge badge-gray">Manual Pricing</span></td>
            <td>
                <button class="btn btn-outline" style="padding:4px 8px; font-size:12px; color:var(--danger); border-color:var(--danger);" onclick="deleteRate(${idx})">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    updateStats();
}

function openRateModal() {
    document.getElementById('m_rate_name').value = '';
    document.getElementById('m_rate_code').value = '';
    // Exact mode doesn't sidebar derivation options
    document.getElementById('derivationOptions').style.display = 'none';
    document.getElementById('rateModal').style.display = 'flex';
}

function saveRate() {
    const name = document.getElementById('m_rate_name').value;
    const code = document.getElementById('m_rate_code').value;

    if (!name || !code) return;

    const newRate = {
        id: 'p' + Date.now(),
        name,
        code,
        type: 'exact', // Custom type for this logic
        basePrices: {}, // Replaces supplements
        overrides: {},
        optionOverrides: {}
    };

    store.rates.push(newRate);
    saveStore();
    renderRatesTable();
    renderBasePriceMatrix();
    renderMatrix();
    closeModal('rateModal');
}

function deleteRate(idx) {
    store.rates.splice(idx, 1);
    saveStore();
    renderRatesTable();
    renderBasePriceMatrix();
    renderMatrix();
}


/* --- BASE PRICE CONFIGURATION (Replacing Supplement Matrix) --- */
function renderBasePriceMatrix() {
    const thead = document.getElementById('suppMatrixHead');
    const tbody = document.getElementById('suppMatrixBody');

    // Rename Header in DOM if possible, or assume user knows
    const cardTitle = document.querySelector('#view-rates .card:nth-child(2) .card-title');
    if (cardTitle) cardTitle.innerText = "Base Price Configuration";
    const cardDesc = document.querySelector('#view-rates .card:nth-child(2) .card-header div:last-child');
    if (cardDesc) cardDesc.innerText = "Set the default (base) price for each room type per rate plan.";

    // HEADERS
    let headerHtml = '<th style="min-width:150px;">Room Type / Rate Plan</th>';
    store.rates.forEach(rate => {
        headerHtml += `<th style="text-align:center; min-width:120px;">${rate.name}</th>`;
    });
    thead.innerHTML = headerHtml;

    // BODY
    tbody.innerHTML = '';

    store.clusters.forEach(cluster => {
        const clusterRooms = store.rooms.filter(r => (r.cluster || 'c1') === cluster.id);
        if (clusterRooms.length === 0) return;

        const bgColor = cluster.color || '#f1f5f9';
        tbody.innerHTML += `<tr style="background:${bgColor}; border-top:2px solid #e2e8f0; border-bottom:1px solid #e2e8f0;">
            <td colspan="${store.rates.length + 1}" style="font-size:11px; font-weight:700; color:#475569; text-transform:uppercase; letter-spacing:0.5px; padding:8px 12px;">
                ${cluster.name} Cluster
            </td>
        </tr>`;

        clusterRooms.forEach(room => {
            let roomRowHtml = `<td style="font-weight:bold;">${room.name}</td>`;

            store.rates.forEach(rate => {
                // Get Base Price
                const price = (rate.basePrices && rate.basePrices[room.id] !== undefined) ? rate.basePrices[room.id] : '';

                roomRowHtml += `<td style="text-align:center;">
                    <input type="number" class="matrix-input" style="width:80px;" 
                           placeholder="0" value="${price}"
                           onchange="updateBasePrice('${rate.id}', '${room.id}', this.value)">
                </td>`;
            });

            const tr = document.createElement('tr');
            if (cluster.color) tr.style.backgroundColor = cluster.color;
            tr.innerHTML = roomRowHtml;
            tbody.appendChild(tr);

            // OPTION ROWS
            if (room.options && room.options.length > 0) {
                room.options.forEach(opt => {
                    let optRowHtml = `<td style="padding-left:30px; font-size:12px; color:#475569;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span>↳ ${opt.name}</span>
                        </div>
                     </td>`;

                    store.rates.forEach(rate => {
                        // Check for configured option price
                        const key = `${room.id}_${opt.id}`;
                        const val = (rate.optionPrices && rate.optionPrices[key] !== undefined) ? rate.optionPrices[key] : '';

                        // Determine placeholder
                        let placeholder = '0';

                        const style = val !== '' ? 'font-weight:bold; border-color:#3b82f6;' : 'border-color:#e2e8f0;';

                        optRowHtml += `<td style="text-align:center;">
                            <input type="number" class="matrix-input" style="width:80px; font-size:11px; ${style}" 
                                   placeholder="${placeholder}" value="${val}"
                                   onchange="updateOptionBasePrice('${rate.id}', '${room.id}', '${opt.id}', this.value)">
                         </td>`;
                    });

                    const optTr = document.createElement('tr');
                    if (cluster.color) optTr.style.backgroundColor = cluster.color;
                    optTr.innerHTML = optRowHtml;
                    tbody.appendChild(optTr);
                });
            }
        });
    });
}

function updateBasePrice(rateId, roomId, value) {
    const rate = store.rates.find(r => r.id === rateId);
    if (!rate) return;
    if (!rate.basePrices) rate.basePrices = {};

    if (value === '') {
        delete rate.basePrices[roomId];
    } else {
        rate.basePrices[roomId] = parseFloat(value);
    }
    saveStore();
    renderBasePriceMatrix();
    renderMatrix();
}

function updateOptionBasePrice(rateId, roomId, optId, value) {
    const rate = store.rates.find(r => r.id === rateId);
    if (!rate) return;
    if (!rate.optionPrices) rate.optionPrices = {};

    const key = `${roomId}_${optId}`;
    if (value === '') {
        delete rate.optionPrices[key];
    } else {
        rate.optionPrices[key] = parseFloat(value);
    }
    saveStore();
    renderBasePriceMatrix();
    renderMatrix();
}


/* --- RATE MATRIX SIMULATION (EXACT) --- */
function renderMatrix() {
    const thead = document.getElementById('matrixThead');
    const tbody = document.getElementById('matrixTbody');

    // 1. HEADERS (DATES)
    let headerHtml = '<th style="min-width:200px;">Rate Product</th>';
    store.days.forEach(day => {
        headerHtml += `<th style="text-align:center; min-width:80px;">${day.date}</th>`;
    });
    thead.innerHTML = headerHtml;

    // 2. BODY
    tbody.innerHTML = '';

    // No Global Anchor Row in Exact Mode

    // PRODUCT GRID
    store.rates.forEach(rate => {
        // Rate Header
        tbody.innerHTML += `<tr style="background:#f1f5f9;"><td colspan="${store.days.length + 1}" style="font-size:12px; font-weight:bold; letter-spacing:0.5px; text-transform:uppercase; color:#4f46e5; padding-top:16px; border-bottom: 1px solid #e2e8f0;">
            ${rate.name} 
            <div style="font-size:10px; opacity:0.6; font-weight:normal;">${rate.code}</div>
        </td></tr>`;

        // Clusters
        const clusters = store.clusters || [{ id: 'c1', name: 'Default' }];
        clusters.forEach(cluster => {
            const clusterRooms = store.rooms.filter(r => (r.cluster || 'c1') === cluster.id);
            if (clusterRooms.length === 0) return;

            const bgColor = cluster.color || '#fff';
            tbody.innerHTML += `<tr>
                <td colspan="${store.days.length + 1}" style="font-size:11px; font-weight:600; color:#475569; background:${bgColor}; padding:6px 12px; border-bottom:1px solid #cbd5e1; padding-left:24px;">
                    ${cluster.name} Cluster
                </td>
            </tr>`;

            clusterRooms.forEach(room => {
                let roomRowHtml = `<td style="border-right:1px solid #cbd5e1;">
                    <div style="padding-left:12px; font-weight:700; color:#334155; font-size:12px;">${room.name}</div>
                </td>`;

                store.days.forEach(day => {
                    const dateKey = day.date;

                    // Logic: Base Price (from config) OR Override (from grid)
                    let val = 0;

                    // 1. Check Daily Override
                    const overrideKey = `${room.id}_${dateKey}`;
                    const hasOverride = rate.overrides && rate.overrides[overrideKey] !== undefined;

                    if (hasOverride) {
                        val = rate.overrides[overrideKey];
                    } else {
                        // 2. Fallback to Rate Plan Base Price
                        val = (rate.basePrices && rate.basePrices[room.id] !== undefined) ? rate.basePrices[room.id] : 0;
                    }

                    let inputStyle = 'width:60px; text-align:right; padding:4px; border:1px solid #cbd5e1; background:#fff; font-size:11px; border-radius:4px;';
                    let indicator = '';

                    if (hasOverride) {
                        inputStyle = 'width:60px; text-align:right; padding:4px; border:1px solid #ef4444; background:#fef2f2; color:#b91c1c; font-weight:bold; border-radius:4px;';
                        // Add X button to clear override
                        indicator = `<div title="Clear Override" 
                                          onclick="updateCalculatedPrice('${rate.id}', '${room.id}', '${dateKey}', '')"
                                          style="font-size:10px; color:#ef4444; position:absolute; top:0; right:0px; cursor:pointer; background:#fff; border:1px solid #ef4444; border-radius:50%; width:14px; height:14px; display:flex; align-items:center; justify-content:center; z-index:10;">×</div>`;
                    }

                    roomRowHtml += `<td style="text-align:center; position:relative;">
                        ${indicator}
                        <input type="number" 
                               value="${val}"
                               onchange="updateCalculatedPrice('${rate.id}', '${room.id}', '${dateKey}', this.value)"
                               style="${inputStyle}"
                        >
                    </td>`;
                });
                tbody.innerHTML += `<tr style="background:${cluster.color}; border-top:1px solid #cbd5e1;">${roomRowHtml}</tr>`;

                // Options
                const options = room.options || [];
                options.forEach(opt => {
                    let optRowHtml = `<td style="padding-left:32px; font-size:11px; color:#475569; border-right:1px solid #cbd5e1;">
                        <div style="display:flex; justify-content:space-between;">
                            <span>↳ ${opt.name}</span>
                        </div>
                     </td>`;

                    store.days.forEach(day => {
                        const dateKey = day.date;
                        let finalVal = 0;

                        // Check Option Override (Daily)
                        const optOverrideKey = `${room.id}_${opt.id}_${dateKey}`;
                        const isOptOverridden = rate.optionOverrides && rate.optionOverrides[optOverrideKey] !== undefined;

                        if (isOptOverridden) {
                            finalVal = rate.optionOverrides[optOverrideKey];
                        } else {
                            // Check Rate Plan Configured Option Price
                            const optConfigKey = `${room.id}_${opt.id}`;
                            const hasConfigPrice = rate.optionPrices && rate.optionPrices[optConfigKey] !== undefined;

                            if (hasConfigPrice) {
                                finalVal = rate.optionPrices[optConfigKey];
                            } else {
                                // NO FALLBACK CALCULATION anymore
                                finalVal = 0;
                            }
                        }

                        let cellStyle = 'width:60px; text-align:right; padding:4px; border:1px solid transparent; background:transparent; font-size:11px; color:#64748b; border:1px solid #e2e8f0;';
                        let optIndicator = '';

                        if (isOptOverridden) {
                            cellStyle = 'width:60px; text-align:right; padding:4px; border:1px solid #f59e0b; background:#fffbeb; color:#b45309; font-weight:bold; border-radius:4px;';
                            optIndicator = `<div title="Clear Option Override" 
                                                 onclick="updateOptionOverride('${rate.id}', '${room.id}', '${opt.id}', '${dateKey}', '')"
                                                 style="font-size:10px; color:#f59e0b; position:absolute; top:-6px; right:0px; cursor:pointer; background:#fff; border:1px solid #f59e0b; border-radius:50%; width:14px; height:14px; display:flex; align-items:center; justify-content:center; z-index:10;">×</div>`;
                        }

                        optRowHtml += `<td style="text-align:center; position:relative;">
                            ${optIndicator}
                            <input type="number" 
                                   value="${finalVal}"
                                   onchange="updateOptionOverride('${rate.id}', '${room.id}', '${opt.id}', '${dateKey}', this.value)"
                                   style="${cellStyle}"
                            >
                        </td>`;
                    });
                    tbody.innerHTML += `<tr style="background:${cluster.color}; border-bottom:1px solid #f1f5f9;">${optRowHtml}</tr>`;
                });
            });
        });
    });
}

/* --- RATE LEVEL LOGIC REMOVED --- */
// (This section has been removed as per user request to drop Rate Levels from Exact Model)

// Override Handler Wrapper
function updateCalculatedPrice(rateId, roomId, date, val) {
    // In Exact Mode, this is strictly a manual override or clearing it
    const rate = store.rates.find(r => r.id === rateId);
    if (!rate) return;
    if (!rate.overrides) rate.overrides = {};

    const key = `${roomId}_${date}`;
    if (val === '') {
        delete rate.overrides[key];
    } else {
        rate.overrides[key] = parseFloat(val);
    }
    saveStore();
    renderMatrix();
}

// Option Override
function updateOptionOverride(rateId, roomId, optId, date, val) {
    const rate = store.rates.find(r => r.id === rateId);
    if (!rate) return;
    if (!rate.optionOverrides) rate.optionOverrides = {};
    const key = `${roomId}_${optId}_${date}`;
    if (val === '') delete rate.optionOverrides[key];
    else rate.optionOverrides[key] = parseFloat(val);
    saveStore();
    renderMatrix();
}

// Utils
function closeModal(id) { document.getElementById(id).style.display = 'none'; }


/* --- RATE MATRIX SIMULATION (EXACT) --- */
/* --- RATE MATRIX SIMULATION (EXACT) --- */
function renderMatrix() {
    const thead = document.getElementById('matrixThead');
    const tbody = document.getElementById('matrixTbody');

    // 1. HEADERS (DATES)
    let headerHtml = '<th style="min-width:200px;">Rate Product</th>';
    store.days.forEach(day => {
        headerHtml += `<th style="text-align:center; min-width:80px;">${day.date}</th>`;
    });
    thead.innerHTML = headerHtml;

    // 2. BODY
    tbody.innerHTML = '';

    // PRODUCT GRID
    store.rates.forEach(rate => {
        // Rate Header
        tbody.innerHTML += `<tr style="background:#f1f5f9;"><td colspan="${store.days.length + 1}" style="font-size:12px; font-weight:bold; letter-spacing:0.5px; text-transform:uppercase; color:#4f46e5; padding-top:16px; border-bottom: 1px solid #e2e8f0;">
            ${rate.name} 
            <div style="font-size:10px; opacity:0.6; font-weight:normal;">${rate.code}</div>
        </td></tr>`;

        // Clusters
        const clusters = store.clusters || [{ id: 'c1', name: 'Default' }];
        clusters.forEach(cluster => {
            const clusterRooms = store.rooms.filter(r => (r.cluster || 'c1') === cluster.id);
            if (clusterRooms.length === 0) return;

            const bgColor = cluster.color || '#fff';
            tbody.innerHTML += `<tr>
                <td colspan="${store.days.length + 1}" style="font-size:11px; font-weight:600; color:#475569; background:${bgColor}; padding:6px 12px; border-bottom:1px solid #cbd5e1; padding-left:24px;">
                    ${cluster.name} Cluster
                </td>
            </tr>`;

            clusterRooms.forEach(room => {
                let roomRowHtml = `<td style="border-right:1px solid #cbd5e1;">
                    <div style="padding-left:12px; font-weight:700; color:#334155; font-size:12px;">${room.name}</div>
                </td>`;

                store.days.forEach(day => {
                    const dateKey = day.date;

                    // Logic: Base Price (from config) OR Override (from grid)
                    let val = 0;

                    // 1. Check Daily Override
                    const overrideKey = `${room.id}_${dateKey}`;
                    const hasOverride = rate.overrides && rate.overrides[overrideKey] !== undefined;

                    if (hasOverride) {
                        val = rate.overrides[overrideKey];
                    } else {
                        // 2. Fallback to Rate Plan Base Price
                        val = (rate.basePrices && rate.basePrices[room.id] !== undefined) ? rate.basePrices[room.id] : 0;
                    }

                    let inputStyle = 'width:60px; text-align:right; padding:4px; border:1px solid #cbd5e1; background:#fff; font-size:11px; border-radius:4px;';
                    let indicator = '';

                    if (hasOverride) {
                        inputStyle = 'width:60px; text-align:right; padding:4px; border:1px solid #ef4444; background:#fef2f2; color:#b91c1c; font-weight:bold; border-radius:4px;';
                        // Add X button to clear override
                        indicator = `<div title="Clear Override" 
                                          onclick="updateCalculatedPrice('${rate.id}', '${room.id}', '${dateKey}', '')"
                                          style="font-size:10px; color:#ef4444; position:absolute; top:0; right:0px; cursor:pointer; background:#fff; border:1px solid #ef4444; border-radius:50%; width:14px; height:14px; display:flex; align-items:center; justify-content:center; z-index:10;">×</div>`;
                    }

                    roomRowHtml += `<td style="text-align:center; position:relative;">
                        ${indicator}
                        <input type="number" 
                               value="${val}"
                               onchange="updateCalculatedPrice('${rate.id}', '${room.id}', '${dateKey}', this.value)"
                               style="${inputStyle}"
                        >
                    </td>`;
                });
                tbody.innerHTML += `<tr style="background:${cluster.color}; border-top:1px solid #cbd5e1;">${roomRowHtml}</tr>`;

                // Options... (Logic same as before, no levels for options yet unless we add Option Prices to Levels too?)
                // User said "Rate Levels". Usually applies to Base Rate. Options usually stay fixed addons.
                // Keeping Options logic as is (Base Config + Override).

                const options = room.options || [];
                options.forEach(opt => {
                    let optRowHtml = `<td style="padding-left:32px; font-size:11px; color:#475569; border-right:1px solid #cbd5e1;">
                        <div style="display:flex; justify-content:space-between;">
                            <span>↳ ${opt.name}</span>
                        </div>
                     </td>`;

                    store.days.forEach(day => {
                        const dateKey = day.date;
                        let finalVal = 0;

                        // Check Option Override
                        const optOverrideKey = `${room.id}_${opt.id}_${dateKey}`;
                        const isOptOverridden = rate.optionOverrides && rate.optionOverrides[optOverrideKey] !== undefined;

                        if (isOptOverridden) {
                            finalVal = rate.optionOverrides[optOverrideKey];
                        } else {
                            // Check Rate Plan Configured Option Price
                            const optConfigKey = `${room.id}_${opt.id}`;
                            const hasConfigPrice = rate.optionPrices && rate.optionPrices[optConfigKey] !== undefined;

                            if (hasConfigPrice) {
                                finalVal = rate.optionPrices[optConfigKey];
                            } else {
                                finalVal = 0;
                            }
                        }

                        let cellStyle = 'width:60px; text-align:right; padding:4px; border:1px solid transparent; background:transparent; font-size:11px; color:#64748b; border:1px solid #e2e8f0;';
                        let optIndicator = '';

                        if (isOptOverridden) {
                            cellStyle = 'width:60px; text-align:right; padding:4px; border:1px solid #f59e0b; background:#fffbeb; color:#b45309; font-weight:bold; border-radius:4px;';
                            optIndicator = `<div title="Clear Option Override" 
                                                 onclick="updateOptionOverride('${rate.id}', '${room.id}', '${opt.id}', '${dateKey}', '')"
                                                 style="font-size:10px; color:#f59e0b; position:absolute; top:-6px; right:0px; cursor:pointer; background:#fff; border:1px solid #f59e0b; border-radius:50%; width:14px; height:14px; display:flex; align-items:center; justify-content:center; z-index:10;">×</div>`;
                        }

                        optRowHtml += `<td style="text-align:center; position:relative;">
                            ${optIndicator}
                            <input type="number" 
                                   value="${finalVal}"
                                   onchange="updateOptionOverride('${rate.id}', '${room.id}', '${opt.id}', '${dateKey}', this.value)"
                                   style="${cellStyle}"
                            >
                        </td>`;
                    });
                    tbody.innerHTML += `<tr style="background:${cluster.color}; border-bottom:1px solid #f1f5f9;">${optRowHtml}</tr>`;
                });
            });
        });
    });
}
