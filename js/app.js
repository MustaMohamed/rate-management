/* --- APP ENGINE --- */

function init() {
    // Initialize Data Store
    if (typeof initStore === 'function') {
        initStore();
        store.pricingModel = 'derivation';
    } else {
        console.error('Store module not loaded');
        return;
    }

    // Initialize UI Elements

    // Reading file only.ws
    renderRoomsTable();
    renderRatesTable();
    renderSupplementMatrix();
    // renderLevelsTable(); // Removed
    renderMatrix();

    // Update Stats
    updateStats();
}

// Stats & Utils
function updateStats() {
    if (store) {
        document.getElementById('stat-plans').innerText = store.rates.length;
        document.getElementById('stat-rooms').innerText = store.rooms.length;
    }
}

function updateDailyBase(dayIndex, val) {
    store.days[dayIndex].baseRate = parseFloat(val) || 0;
    saveStore();
    renderMatrix();
}

function updateGlobalBase(val) {
    const rate = parseFloat(val) || 0;
    store.days.forEach(d => d.baseRate = rate);
    saveStore();
    renderMatrix();
}

function switchView(viewName, element) {
    // Update Sidebar
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    if (element) {
        element.classList.add('active');
    } else {
        const index = ['dashboard', 'rooms', 'rates', 'matrix'].indexOf(viewName);
        if (index >= 0) document.querySelectorAll('.nav-item')[index].classList.add('active');
    }

    // Update user interface
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    document.getElementById(`view-${viewName}`).classList.add('active');

    // Update Title
    const titles = {
        dashboard: 'Overview',
        rooms: 'Room Type Configuration',
        rates: 'Rate Plan Management',
        levels: 'Rate Level Ladder',
        matrix: 'Rate Grid & Inventory'
    };
    document.getElementById('pageTitle').innerText = titles[viewName] || 'Enterprise Rate Manager';
}

/* --- ROOM MANAGMENT --- */

function renderRoomsTable() {
    const tbody = document.getElementById('roomsTableBody');
    tbody.innerHTML = '';
    store.rooms.forEach((room, idx) => {
        const isBar = room.id === store.barRoomId;
        const cluster = store.clusters ? store.clusters.find(c => c.id === (room.cluster || 'c1')) : { name: '-' };
        const clusterName = cluster ? cluster.name : '-';
        const bgColor = cluster && cluster.color ? cluster.color : '#f1f5f9';

        const tr = document.createElement('tr');

        // BAR Badge / Action
        let actionHtml = '';
        if (isBar) {
            actionHtml = '<span class="badge badge-green">★ BAR Base</span>';
        } else {
            actionHtml = `<button class="btn btn-outline" style="padding:4px 8px; font-size:11px;" onclick="setBarRoom('${room.id}')">Set as BAR</button>`;
        }

        tr.innerHTML = `
            <td><span class="badge badge-gray">${room.code}</span></td>
            <td><span style="font-size:11px; text-transform:uppercase; font-weight:700; color:#475569; background-color:${bgColor}; padding:4px 8px; border-radius:4px;">${clusterName}</span></td>
            <td><strong>${room.name}</strong></td>
            <td>${actionHtml}</td>
            <td>
                ${!isBar ? `<button class="btn btn-outline" style="padding:4px 8px; font-size:12px; color:var(--danger); border-color:var(--danger);" onclick="deleteRoom(${idx})">Delete</button>` : ''}
            </td>
        `;
        tbody.appendChild(tr);
    });
    updateStats();
}

function setBarRoom(id) {
    store.barRoomId = id;
    saveStore();
    renderRoomsTable();
    renderSupplementMatrix(); // Update Grid
    renderMatrix();
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
            options: [
                { id: 'o_def_1', name: 'Standard', delta: 0 }
            ]
        });
        saveStore();
        renderRoomsTable();
        renderSupplementMatrix();
        renderMatrix();
        closeModal('roomModal');
    }
}

function deleteRoom(idx) {
    store.rooms.splice(idx, 1);
    saveStore();
    renderRoomsTable();
    renderSupplementMatrix();
    renderMatrix();
}

/* --- RATE PLAN CONFIGURATION --- */

function renderRatesTable() {
    const tbody = document.getElementById('ratesTableBody');
    tbody.innerHTML = '';
    // Headers: Plan Code, Name, Type, Derivation Rule, Actions
    // indices: 0, 1, 2, 3, 4
    const tableHeader = document.querySelector('#ratesTable thead tr');
    if (tableHeader) {
        const headers = tableHeader.querySelectorAll('th');
        if (headers[3]) headers[3].innerText = 'Derivation Rule'; // Always Derivation Rule
    }

    store.rates.forEach((rate, idx) => {
        const tr = document.createElement('tr');

        // Parent Info
        let derivationInfo = '-';
        if (rate.type === 'derived') {
            const parent = store.rates.find(r => r.id === rate.parent);
            const parentName = parent ? parent.code : 'Unknown';
            const ruleText = rate.rule === 'percent' ? `${rate.value}%` : `$${rate.value}`;
            derivationInfo = `Linked to <strong>${parentName}</strong> <span class="badge badge-gray" style="margin-left:4px;">${ruleText}</span>`;
        } else {
            derivationInfo = '<span class="badge badge-blue">Independent Source</span>';
        }

        let typeLabel = rate.type === 'source' ? 'Source' : 'Derived';

        tr.innerHTML = `
            <td><strong>${rate.code}</strong></td>
            <td>${rate.name}</td>
            <td>${typeLabel}</td>
            <td>${derivationInfo}</td>
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

    // Populate Parents
    const sel = document.getElementById('m_rate_parent');
    sel.innerHTML = '';
    store.rates.forEach(r => {
        const opt = document.createElement('option');
        opt.value = r.id;
        opt.text = r.name;
        sel.appendChild(opt);
    });

    toggleDerivationFields();
    document.getElementById('rateModal').style.display = 'flex';
}

function toggleDerivationFields() {
    const type = document.getElementById('m_rate_type').value;
    document.getElementById('derivationOptions').style.display = type === 'derived' ? 'block' : 'none';
}

function saveRate() {
    const name = document.getElementById('m_rate_name').value;
    const code = document.getElementById('m_rate_code').value;
    const type = document.getElementById('m_rate_type').value;

    if (!name || !code) return;

    const newRate = {
        id: 'p' + Date.now(),
        name,
        code,
        type,
        supplements: {}
    };

    if (type === 'derived') {
        newRate.parent = document.getElementById('m_rate_parent').value;
        newRate.rule = document.getElementById('m_rate_rule').value;
        newRate.value = parseFloat(document.getElementById('m_rate_val').value) || 0;
    }

    store.rates.push(newRate);
    saveStore();
    renderRatesTable();
    renderSupplementMatrix(); // Update Grid
    renderMatrix();
    closeModal('rateModal');
}

function deleteRate(idx) {
    store.rates.splice(idx, 1);
    saveStore();
    renderRatesTable();
    renderSupplementMatrix(); // Update Grid
    renderMatrix();
}

/* --- SUPPLEMENT MATRIX GRID (New Feature) --- */
function renderSupplementMatrix() {


    // HEADERS (Rates)
    let headerHtml = '<th style="min-width:150px;">Room Type / Rate Plan</th>';
    store.rates.forEach(rate => {
        let badge = rate.type === 'source' ? '<span class="badge badge-green">Source</span>' : '<span class="badge badge-gray">Derived</span>';
        headerHtml += `<th style="text-align:center; min-width:120px;">
            <div>${rate.name}</div>
            <div style="font-size:10px; margin-top:4px;">${badge}</div>
        </th>`;
    });
    thead.innerHTML = headerHtml;

    // BODY (Rooms by Cluster)
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
            const isBar = room.id === store.barRoomId;

            // 1. MAIN ROOM ROW
            let roomRowHtml = `<td style="font-weight:bold;">
                <div>${room.name}</div>
                ${isBar ? '<div style="font-size:10px; color:var(--primary);">Anchor Room</div>' : ''}
            </td>`;

            store.rates.forEach(rate => {
                if (rate.type === 'source') {
                    if (isBar) {
                        roomRowHtml += `<td style="text-align:center; background:#f0fdf4; color:#166534; font-size:11px;">Anchor Base</td>`;
                    } else {
                        // Handle Object {type, value} or number
                        let supp = { type: 'fixed', value: 0 };
                        if (rate.supplements && rate.supplements[room.id] !== undefined) {
                            const raw = rate.supplements[room.id];
                            if (typeof raw === 'object') supp = raw;
                            else supp = { type: 'fixed', value: raw };
                        }

                        // Style for active supplements
                        const style = supp.value !== 0 ? 'font-weight:bold; border-color:#3b82f6;' : '';

                        roomRowHtml += `<td style="text-align:center;">
                            <div style="display:flex; align-items:center; justify-content:center; gap:2px;">
                                <input type="number" class="matrix-input" style="width:60px; text-align:right; ${style}" 
                                       placeholder="0" value="${supp.value}"
                                       onchange="updatePlanSupplement('${rate.id}', '${room.id}', 'value', this.value)">
                                <select onchange="updatePlanSupplement('${rate.id}', '${room.id}', 'type', this.value)" 
                                        style="font-size:10px; border:1px solid #cbd5e1; border-radius:4px; padding:2px; height:24px;">
                                    <option value="fixed" ${supp.type === 'fixed' ? 'selected' : ''}>$</option>
                                    <option value="percent" ${supp.type === 'percent' ? 'selected' : ''}>%</option>
                                </select>
                            </div>
                        </td>`;
                    }
                } else {
                    // Derived
                    const dummyBase = store.days[0] ? store.days[0].baseRate : 100; // Just for display
                    const calcPrice = resolveRatePrice(rate, dummyBase, store.rates, room, null);
                    roomRowHtml += `<td style="text-align:center; color:#475569; font-size:11px;">
                        <div style="font-weight:500;">Est. $${calcPrice.toFixed(0)}</div>
                        <div style="font-size:9px; color:#94a3b8;">Derived</div>
                    </td>`;
                }
            });

            const tr = document.createElement('tr');
            if (cluster.color) tr.style.backgroundColor = cluster.color; // lighten?
            tr.innerHTML = roomRowHtml;
            tbody.appendChild(tr);

            // 2. OPTION ROWS
            if (room.options && room.options.length > 0) {
                room.options.forEach(opt => {
                    let optRowHtml = `<td style="padding-left:30px; font-size:12px; color:#475569;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span>↳ ${opt.name}</span>
                        </div>
                     </td>`;

                    const delta = (typeof opt.delta === 'object') ? opt.delta : { type: 'fixed', value: opt.delta || 0 };

                    store.rates.forEach(rate => {
                        const isSource = rate.type === 'source';
                        if (isSource) {
                            optRowHtml += `<td style="text-align:center;">
                                <div style="display:flex; align-items:center; justify-content:center; gap:2px;">
                                    <input type="number" class="matrix-input" style="width:50px; text-align:right; font-size:11px;" 
                                           value="${delta.value}"
                                           onchange="updateRoomOption('${room.id}', '${opt.id}', 'value', this.value)">
                                    <select onchange="updateRoomOption('${room.id}', '${opt.id}', 'type', this.value)" 
                                            style="font-size:10px; border:1px solid #cbd5e1; border-radius:4px; padding:2px; height:24px;">
                                        <option value="fixed" ${delta.type === 'fixed' ? 'selected' : ''}>$</option>
                                        <option value="percent" ${delta.type === 'percent' ? 'selected' : ''}>%</option>
                                    </select>
                                </div>
                             </td>`;
                        } else {
                            // Derived Options
                            const suffix = delta.type === 'percent' ? '%' : '$';
                            optRowHtml += `<td style="text-align:center; opacity:0.7; font-size:11px;">
                                + ${delta.value}${suffix}
                             </td>`;
                        }
                    });

                    const optTr = document.createElement('tr');
                    // slightly lighter bg for options?
                    if (cluster.color) optTr.style.backgroundColor = cluster.color;
                    optTr.innerHTML = optRowHtml;
                    tbody.appendChild(optTr);
                });
            }
        });
    });
}

function updateRoomOption(roomId, optId, field, val) {
    const room = store.rooms.find(r => r.id === roomId);
    if (!room) return;
    const opt = room.options.find(o => o.id === optId);
    if (opt) {
        if (typeof opt.delta !== 'object') {
            opt.delta = { type: 'fixed', value: opt.delta || 0 };
        }

        if (field === 'value') opt.delta.value = parseFloat(val);
        else opt.delta.type = val;

        saveStore();
        renderSupplementMatrix();
        renderMatrix();
    }
}

function updatePlanSupplement(planId, roomId, field, val) {
    const rate = store.rates.find(r => r.id === planId);
    if (!rate) return;
    if (!rate.supplements) rate.supplements = {};

    // Ensure object exists
    if (!rate.supplements[roomId] || typeof rate.supplements[roomId] !== 'object') {
        const existingVal = (typeof rate.supplements[roomId] === 'number') ? rate.supplements[roomId] : 0;
        rate.supplements[roomId] = { type: 'fixed', value: existingVal };
    }

    if (field === 'value') {
        rate.supplements[roomId].value = parseFloat(val);
    } else {
        rate.supplements[roomId].type = val;
    }

    // Cleanup if 0 fixed? No, let's keep explicit 0 fixed.

    saveStore();
    renderSupplementMatrix();
    renderMatrix();
}

/* --- RATE MATRIX SIMULATION --- */

function renderMatrix() {
    const thead = document.getElementById('matrixThead');
    const tbody = document.getElementById('matrixTbody');
    const isExplicit = false; // Always standard derivation model

    // 1. HEADERS (DATES)
    let headerHtml = '<th style="min-width:200px;">Rate Product</th>';
    store.days.forEach(day => {
        headerHtml += `<th style="text-align:center; min-width:80px;">${day.date}</th>`;
    });
    thead.innerHTML = headerHtml;

    // 2. BODY
    tbody.innerHTML = '';

    // ROW A: GLOBAL ANCHOR INPUTS
    const barRoom = store.rooms.find(r => r.id === store.barRoomId);
    const anchorName = barRoom ? barRoom.name : 'Unknown';

    let anchorRow = `<tr style="background:#f0fdf4; border-bottom:2px solid #22c55e;">
        <td>
            <strong>Anchor Base Rate</strong>
            <div style="font-size:10px; color:#166534;">${anchorName} (Base)</div>
        </td>`;

    store.days.forEach(day => {
        const val = (store.anchorRates && store.anchorRates[day.date]) ? store.anchorRates[day.date] : 0;
        anchorRow += `<td style="text-align:center;">
            <input type="number" 
                   value="${val}" 
                   onchange="updateAnchorRate('${day.date}', this.value)"
                   style="width:70px; text-align:right; font-weight:bold; color:#166534; padding:6px; border:1px solid #86efac; border-radius:4px;">
        </td>`;
    });
    anchorRow += `</tr>`;
    tbody.innerHTML += anchorRow;


    // ROW B: PRODUCT GRID (Rate > Clusters > Rooms)
    store.rates.forEach(rate => {
        const isSource = rate.type === 'source';

        // Group Header (Rate Plan)
        let headerDetail = isExplicit ? 'Fixed Pricing Plan' : (isSource ? 'Source Plan' : 'Derived Plan');
        let headerColor = isExplicit ? '#4f46e5' : (isSource ? 'var(--primary)' : '#64748b');

        tbody.innerHTML += `<tr style="background:#f1f5f9;"><td colspan="${store.days.length + 1}" style="font-size:12px; font-weight:bold; letter-spacing:0.5px; text-transform:uppercase; color:${headerColor}; padding-top:16px; border-bottom: 1px solid #e2e8f0;">
            ${rate.name} <span style="font-weight:normal; opacity:0.7; font-size:11px; margin-left:8px;">(${headerDetail})</span>
            <div style="font-size:10px; opacity:0.6; font-weight:normal;">${rate.code}</div>
        </td></tr>`;

        // Loop Clusters
        const clusters = store.clusters || [{ id: 'c1', name: 'Default' }];

        clusters.forEach(cluster => {
            const clusterRooms = store.rooms.filter(r => (r.cluster || 'c1') === cluster.id);
            if (clusterRooms.length === 0) return;

            // Cluster Sub-Header
            const bgColor = cluster.color || '#fff';
            tbody.innerHTML += `<tr>
                <td colspan="${store.days.length + 1}" style="font-size:11px; font-weight:600; color:#475569; background:${bgColor}; padding:6px 12px; border-bottom:1px solid #cbd5e1; padding-left:24px;">
                    ${cluster.name} Cluster
                </td>
            </tr>`;

            clusterRooms.forEach(room => {
                const isBarRoom = room.id === store.barRoomId;
                const roomBgColor = cluster.color || '#fff';

                // 1. ROOM ROW (Base Price)
                let metaInfo = '';
                if (!isExplicit && isSource) {
                    if (isBarRoom) {
                        metaInfo = `<span style="color:#166534; font-size:10px; background:#dcfce7; padding:2px 4px; border-radius:4px;">Anchor</span>`;
                    } else {
                        // Handle Object {type, value} or number logic
                        let supp = { type: 'fixed', value: 0 };
                        if (rate.supplements && rate.supplements[room.id] !== undefined) {
                            const raw = rate.supplements[room.id];
                            if (typeof raw === 'object') supp = raw;
                            else supp = { type: 'fixed', value: raw };
                        }

                        if (supp.value !== 0) {
                            const suffix = supp.type === 'percent' ? '%' : '$';
                            const prefix = supp.type === 'fixed' ? '$' : '';
                            const sign = supp.value > 0 ? '+' : '';
                            metaInfo = `<span style="color:#64748b; font-size:10px;">${sign}${prefix}${supp.value}${suffix} Supp</span>`;
                        }
                    }
                }

                let roomRowHtml = `<td style="border-right:1px solid #cbd5e1;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div style="padding-left:12px; font-weight:700; color:#334155; font-size:12px;">
                            ${room.name}
                        </div>
                        <div>${metaInfo}</div>
                    </div>
                </td>`;

                // Calculate Base Prices (Room Row)
                store.days.forEach(day => {
                    const dateKey = day.date;
                    const overrideKey = `${room.id}_${dateKey}`;
                    const isOverridden = rate.overrides && rate.overrides[overrideKey] !== undefined;

                    const calculatedPrice = resolveRatePrice(rate, day.baseRate, store.rates, room, dateKey);

                    // Style logic
                    let inputStyle = 'width:60px; text-align:right; padding:4px; border:1px solid transparent; background:transparent; font-size:11px;';
                    let indicator = '';

                    if (isExplicit) {
                        // EXPLICIT MODE: Everything is an input. 
                        inputStyle = 'width:60px; text-align:right; padding:4px; border:1px solid #cbd5e1; background:#fff; font-size:11px; border-radius:4px;';
                    } else {
                        // DERIVATION MODE override styling
                        if (isOverridden) {
                            inputStyle = 'width:60px; text-align:right; padding:4px; border:1px solid #ef4444; background:#fef2f2; color:#b91c1c; font-weight:bold; border-radius:4px;';
                            indicator = `<div title="Clear Override" 
                                          onclick="updateCalculatedPrice('${rate.id}', '${room.id}', '${dateKey}', '')"
                                          style="font-size:10px; color:#ef4444; position:absolute; top:0; right:0px; cursor:pointer; background:#fff; border:1px solid #ef4444; border-radius:50%; width:14px; height:14px; display:flex; align-items:center; justify-content:center; z-index:10;">×</div>`;
                        } else if (isSource && isBarRoom) {
                            inputStyle += 'color:#166534; font-weight:700;';
                        } else {
                            inputStyle += 'color:#334155; font-weight:600;';
                        }
                    }

                    roomRowHtml += `<td style="text-align:center; position:relative;">
                        ${indicator}
                        <input type="number" 
                               value="${isOverridden ? rate.overrides[overrideKey].toFixed(0) : calculatedPrice.toFixed(0)}"
                               onchange="updateCalculatedPrice('${rate.id}', '${room.id}', '${dateKey}', this.value)"
                               style="${inputStyle}"
                        >
                    </td>`;
                });

                tbody.innerHTML += `<tr style="background:${roomBgColor}; border-top:1px solid #cbd5e1;">${roomRowHtml}</tr>`;

                // 2. OPTION ROWS (Total Price: Base + Delta)
                const options = room.options || [];

                options.forEach(opt => {
                    // Start: Fix Delta Handling
                    let deltaVal = 0;
                    let deltaType = 'fixed';
                    if (typeof opt.delta === 'object') {
                        deltaVal = opt.delta.value || 0;
                        deltaType = opt.delta.type || 'fixed';
                    } else {
                        deltaVal = parseFloat(opt.delta) || 0;
                    }

                    // Display Logic
                    let displayDelta = '';
                    if (deltaVal !== 0) {
                        if (deltaType === 'percent') displayDelta = `+${deltaVal}%`;
                        else displayDelta = `+$${deltaVal}`;
                    }
                    // End: Fix Delta Handling

                    let optRowHtml = `<td style="padding-left:32px; font-size:11px; color:#475569; border-right:1px solid #cbd5e1;">
                        <div style="display:flex; justify-content:space-between;">
                            <span>↳ ${opt.name}</span>
                            <span style="color:#64748b; opacity:0.7; font-size:10px;">${displayDelta}</span>
                        </div>
                     </td>`;

                    store.days.forEach(day => {
                        const dateKey = day.date;
                        const basePrice = resolveRatePrice(rate, day.baseRate, store.rates, room, dateKey);

                        const optOverrideKey = `${room.id}_${opt.id}_${dateKey}`;
                        const isOptOverridden = rate.optionOverrides && rate.optionOverrides[optOverrideKey] !== undefined;

                        // Start: Calculation Fix
                        let calculatedOptPrice = 0;
                        if (deltaType === 'percent') {
                            calculatedOptPrice = basePrice * (1 + (deltaVal / 100));
                        } else {
                            calculatedOptPrice = basePrice + deltaVal;
                        }

                        let finalVal = isOptOverridden ? rate.optionOverrides[optOverrideKey] : calculatedOptPrice;
                        // End: Calculation Fix

                        // Styles
                        let cellStyle = 'width:60px; text-align:right; padding:4px; border:1px solid transparent; background:transparent; font-size:11px; color:#64748b;';
                        let optIndicator = '';

                        if (isExplicit) {
                            cellStyle = 'width:60px; text-align:right; padding:4px; border:1px solid #cbd5e1; background:#fff; font-size:11px; border-radius:4px;';
                        } else {
                            if (isOptOverridden) {
                                cellStyle = 'width:60px; text-align:right; padding:4px; border:1px solid #f59e0b; background:#fffbeb; color:#b45309; font-weight:bold; border-radius:4px;';
                                optIndicator = `<div title="Clear Option Override" 
                                                 onclick="updateOptionOverride('${rate.id}', '${room.id}', '${opt.id}', '${dateKey}', '')"
                                                 style="font-size:10px; color:#f59e0b; position:absolute; top:-6px; right:0px; cursor:pointer; background:#fff; border:1px solid #f59e0b; border-radius:50%; width:14px; height:14px; display:flex; align-items:center; justify-content:center; z-index:10;">×</div>`;
                            } else if (isSource && isBarRoom && deltaVal === 0) {
                                cellStyle += 'color:#166534; font-weight:600;';
                            }
                        }

                        optRowHtml += `<td style="text-align:center; position:relative;">
                            ${optIndicator}
                            <input type="number" 
                                   value="${finalVal.toFixed(0)}"
                                   onchange="updateOptionOverride('${rate.id}', '${room.id}', '${opt.id}', '${dateKey}', this.value)"
                                   style="${cellStyle}"
                            >
                        </td>`;
                    });

                    tbody.innerHTML += `<tr style="background:${roomBgColor}; border-bottom:1px solid #f1f5f9;">${optRowHtml}</tr>`;
                });
            });
        });
    });
}

function updateCalculatedPrice(rateId, roomId, date, val) {
    const rate = store.rates.find(r => r.id === rateId);
    if (!rate) return;
    if (!rate.overrides) rate.overrides = {};

    // Check if user cleared it or set same as calculated? 
    if (val === '') {
        delete rate.overrides[`${roomId}_${date}`];
    } else {
        rate.overrides[`${roomId}_${date}`] = parseFloat(val);
    }
    saveStore();
    renderMatrix();
}

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

/* --- RATE LEVEL LOGIC REMOVED --- */
// (This section has been removed as per user request to drop Rate Levels from Derivation Model)

function updateAnchorRate(date, val) {
    if (!store.anchorRates) store.anchorRates = {};
    store.anchorRates[date] = parseFloat(val);
    saveStore();
    renderMatrix(); // re-render to potentially update level dropdown to "Custom"
}

/* --- RATE MATRIX SIMULATION --- */

// ... previous code ...

function resolveRatePrice(targetRate, anchorValue, allRates, room, date) {
    // 1. Check Overrides (Priority 1 for both modes)
    if (date && targetRate.overrides) {
        const key = `${room.id}_${date}`;
        if (targetRate.overrides[key] !== undefined) return targetRate.overrides[key];
    }



    // 3. Derivation Mode Derivation logic
    if (targetRate.type === 'source') {
        if (room.id === store.barRoomId) return anchorValue;

        // Supplement Logic (Fixed vs Percent)
        let supp = { type: 'fixed', value: 0 };
        if (targetRate.supplements && targetRate.supplements[room.id] !== undefined) {
            const raw = targetRate.supplements[room.id];
            if (typeof raw === 'object') supp = raw;
            else supp = { type: 'fixed', value: raw };
        }

        if (supp.type === 'percent') {
            return anchorValue * (1 + (supp.value / 100)); // e.g. 100 * 1.2 = 120
        } else {
            return anchorValue + supp.value; // e.g. 100 + 20 = 120, or 100 + (-10) = 90
        }
    }

    const parentRate = allRates.find(r => r.id === targetRate.parent);
    if (!parentRate) return anchorValue;

    // Recursive resolution
    const parentPrice = resolveRatePrice(parentRate, anchorValue, allRates, room, date);

    if (targetRate.rule === 'percent') {
        return parentPrice * (1 + (targetRate.value / 100));
    } else {
        return parentPrice + targetRate.value;
    }
}

// --- UTILS ---
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

// Init call is at the top of file or triggered by window load, but we'll export it or let HTML call it
// window.onload = init; // Better to let HTML verify script loading
