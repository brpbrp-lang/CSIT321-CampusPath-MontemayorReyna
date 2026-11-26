/**
 * CampusPath Application Controller
 * Integrates with Spring Boot REST API (/api/*) with graceful fallback data if offline.
 */
(() => {
    const API_BASE = window.location.protocol === 'file:' ? 'http://localhost:8080/api' : '/api';

    // Fallback seed data (used only if backend API is unreachable or empty during UI preview)
    const FALLBACK = {
        locations: [
            { locationId: 1, name: 'NGE BLDG', type: 'Building', description: 'New Generation Engineering / Computer Studies Building (South Campus)' },
            { locationId: 2, name: 'RTL BLDG', type: 'Building', description: 'Rizal Technological / Main Academic Building housing FAO, ETO, OAS, and GDNC/TEST' },
            { locationId: 3, name: 'GLE BLDG', type: 'Building', description: 'Gregorio L. Escario Building (East Campus)' },
            { locationId: 4, name: 'ACAD BLDG', type: 'Building', description: 'Academic Building (East Campus)' },
            { locationId: 5, name: 'LRAC', type: 'Building', description: 'Learning Resource and Activity Center' },
            { locationId: 13, name: 'CCS Faculty Office', type: 'Office', description: 'College of Computer Studies Faculty Office inside NGE Building' }
        ],
        buildings: [
            { buildingId: 1, buildingName: 'NGE BLDG', description: 'Houses Wildcat Innovation Play Lab, CCS Faculty Office, and NGE Classrooms (Floors 1 to 3)', location: { locationId: 1, name: 'NGE BLDG' } },
            { buildingId: 2, buildingName: 'RTL BLDG', description: 'Main quadrangle building housing FAO, ETO, OAS, GDNC/TEST, and classrooms (Floors 1 to 4)', location: { locationId: 2, name: 'RTL BLDG' } },
            { buildingId: 3, buildingName: 'GLE BLDG', description: 'East-wing academic building beside ACAD BLDG (Floors 1 to 4)', location: { locationId: 3, name: 'GLE BLDG' } }
        ],
        departments: [
            { departmentId: 1, departmentName: 'College of Computer Studies', description: 'Department of Information Technology and Computer Science' },
            { departmentId: 5, departmentName: 'College of Engineering & Architecture', description: 'Engineering and Architecture Programs' }
        ],
        rooms: [
            { roomId: 1, roomNumber: '101', roomName: 'NGE 101', floor: 1, building: { buildingId: 1, buildingName: 'NGE BLDG' }, department: { departmentId: 1, departmentName: 'College of Computer Studies' } },
            { roomId: 9, roomNumber: '203', roomName: 'NGE 203', floor: 2, building: { buildingId: 1, buildingName: 'NGE BLDG' }, department: { departmentId: 1, departmentName: 'College of Computer Studies' } },
            { roomId: 17, roomNumber: 'FAC-CCS', roomName: 'CCS Faculty Office', floor: 3, building: { buildingId: 1, buildingName: 'NGE BLDG' }, department: { departmentId: 1, departmentName: 'College of Computer Studies' } }
        ],
        reports: []
    };

    const appState = {
        user: null,
        locations: [],
        buildings: [],
        rooms: [],
        departments: [],
        reports: [],
        activeCategory: 'ALL',
        selectedItem: null,
        reportFilter: 'ALL',
        usingFallback: false
    };

    // --- API Helper ---
    async function apiFetch(path, options = {}) {
        const res = await fetch(`${API_BASE}${path}`, {
            headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
            ...options
        });
        const text = await res.text();
        let data = null;
        try { data = text ? JSON.parse(text) : null; } catch { data = text; }
        if (!res.ok) {
            const err = new Error(data?.message || `Request failed (${res.status})`);
            err.status = res.status;
            err.data = data;
            throw err;
        }
        return data;
    }

    // --- Error feedback ---
    // Shows a short message at the bottom of the screen (kind: 'error' | 'success').
    function showToast(message, kind = 'error') {
        let toast = document.getElementById('appToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'appToast';
            toast.setAttribute('role', 'status');
            toast.setAttribute('aria-live', 'polite');
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.className = `app-toast ${kind} visible`;
        clearTimeout(showToast.timer);
        showToast.timer = setTimeout(() => toast.classList.remove('visible'), 4500);
    }

    // Turns a failed request into a readable message. A 401 means the server session
    // ended (e.g. the server restarted), so the page signs out and asks to sign in again.
    function describeError(err, fallback = 'Something went wrong. Please try again.') {
        if (err?.status === 401) {
            if (appState.user) clearAuthenticatedUser();
            document.getElementById('loginModal').classList.remove('hidden');
            return 'Your session has ended. Please sign in again.';
        }
        if (err?.status === 403) return err.message || 'Only administrators can do this.';
        if (err instanceof TypeError) return 'Cannot reach the CampusPath server. Check that it is running.';
        return err?.message || fallback;
    }

    function showError(err, fallback) {
        showToast(describeError(err, fallback), 'error');
    }

    // --- Initial Data Bootstrap ---
    async function loadCatalog() {
        try {
            const [locations, buildings, rooms, departments] = await Promise.all([
                apiFetch('/locations'),
                apiFetch('/locations/buildings'),
                apiFetch('/locations/rooms'),
                apiFetch('/locations/departments')
            ]);
            appState.locations = locations || [];
            appState.buildings = buildings || [];
            appState.rooms = rooms || [];
            appState.departments = departments || [];
            appState.usingFallback = false;
        } catch {
            appState.locations = [...FALLBACK.locations];
            appState.buildings = [...FALLBACK.buildings];
            appState.rooms = [...FALLBACK.rooms];
            appState.departments = [...FALLBACK.departments];
            appState.usingFallback = true;
        }

        populateLocationSelects();
        window.CampusMap.renderPins(appState.locations, appState.rooms, appState.activeCategory);
        if (appState.usingFallback) {
            showToast('Showing sample data: the CampusPath server could not be reached.', 'error');
        }
    }

    function populateLocationSelects() {
        const locOptions = appState.locations
            .map(l => `<option value="${l.locationId}">${escapeHtml(l.name)} (${escapeHtml(l.type || 'Location')})</option>`)
            .join('');

        const startSel = document.getElementById('startLocationSelect');
        const destSel = document.getElementById('destinationSelect');
        const repSel = document.getElementById('reportLocationSelect');

        if (startSel) startSel.innerHTML = `<option value="">Select Starting Point...</option>${locOptions}`;
        if (destSel) destSel.innerHTML = `<option value="">Select Destination...</option>${locOptions}`;
        if (repSel) repSel.innerHTML = locOptions;

        const bldOptions = appState.buildings
            .map(b => `<option value="${b.buildingId}">${escapeHtml(b.buildingName)}</option>`)
            .join('');
        const deptOptions = appState.departments
            .map(d => `<option value="${d.departmentId}">${escapeHtml(d.departmentName)}</option>`)
            .join('');

        const bldLocSel = document.getElementById('adminBldLocSelect');
        const rmBldSel = document.getElementById('adminRoomBuildingSelect');
        const rmDeptSel = document.getElementById('adminRoomDeptSelect');

        if (bldLocSel) bldLocSel.innerHTML = locOptions;
        if (rmBldSel) rmBldSel.innerHTML = bldOptions;
        if (rmDeptSel) rmDeptSel.innerHTML = deptOptions;

        // "Building on the map" choices come from the campus map itself (B1, B2, …)
        const mapSel = document.getElementById('adminLocMapKey');
        if (mapSel && mapSel.options.length <= 1) {
            mapSel.insertAdjacentHTML('beforeend', window.CampusMap.listBuildings()
                .map(b => `<option value="${b.id}">${escapeHtml(b.code)} — ${escapeHtml(b.name)}</option>`).join(''));
        }
    }

    // --- Omni-Search & Category Filter ---
    async function runSearch() {
        const input = document.getElementById('omniSearchInput');
        const keyword = input.value.trim();
        const panel = document.getElementById('searchResultsPanel');
        document.getElementById('clearSearchBtn').classList.toggle('hidden', !keyword);

        if (!keyword) {
            panel.classList.add('hidden');
            return;
        }

        let data;
        try {
            // The server records search history for the signed-in user from the session
            data = await apiFetch(`/locations/search?keyword=${encodeURIComponent(keyword)}`);
        } catch {
            // Read-only: if the server is unreachable, search the data already loaded in the page
            data = localSearch(keyword);
        }

        renderSearchResults(data, keyword);
    }

    function localSearch(keyword) {
        const k = keyword.toLowerCase();
        const locations = appState.locations.filter(l =>
            `${l.name} ${l.description} ${l.type}`.toLowerCase().includes(k)
        );
        const rooms = appState.rooms.filter(r =>
            `${r.roomNumber} ${r.roomName} ${r.building?.buildingName || ''}`.toLowerCase().includes(k)
        );
        const buildings = appState.buildings.filter(b =>
            `${b.buildingName} ${b.description}`.toLowerCase().includes(k)
        );
        const departments = appState.departments.filter(d =>
            `${d.departmentName} ${d.description}`.toLowerCase().includes(k)
        );
        const found = locations.length || rooms.length || buildings.length || departments.length;
        return found ? { found: true, locations, rooms, buildings, departments } : { found: false, message: 'Location not found' };
    }

    function renderSearchResults(data, keyword) {
        const panel = document.getElementById('searchResultsPanel');
        panel.classList.remove('hidden');

        if (!data || !data.found) {
            panel.innerHTML = `
                <div class="empty-state-card">
                    <h3>Location not found</h3>
                    <p>No campus building, room, department, or facility matched "<strong>${escapeHtml(keyword)}</strong>".</p>
                    <button class="ghost-btn" id="resetSearchPromptBtn">Reset &amp; Search Again</button>
                </div>
            `;
            document.getElementById('resetSearchPromptBtn')?.addEventListener('click', resetSearch);
            return;
        }

        const cat = appState.activeCategory;
        let html = '';

        const rooms = (cat === 'ALL' || cat === 'CLASSROOM') ? (data.rooms || []) : [];
        const departments = (cat === 'ALL' || cat === 'DEPARTMENT') ? (data.departments || []) : [];
        // A building and its map location are the same place: show it once, as the location
        const matchedPlaces = [...(data.locations || [])];
        const buildings = [];
        (data.buildings || []).forEach(b => {
            const loc = appState.locations.find(l => l.locationId === b.location?.locationId);
            if (loc) {
                if (!matchedPlaces.some(l => l.locationId === loc.locationId)) matchedPlaces.push(loc);
            } else if (cat === 'ALL' || cat === 'BUILDING') {
                buildings.push(b);
            }
        });
        const locations = matchedPlaces.filter(l => {
            const t = (l.type || '').toLowerCase();
            if (cat === 'ALL') return true;
            if (cat === 'BUILDING') return t.includes('building');
            if (cat === 'CLASSROOM') return t.includes('classroom');
            if (cat === 'DEPARTMENT') return t.includes('office') || t.includes('department');
            if (cat === 'FACILITY') return t.includes('facility');
            return true;
        });

        if (buildings.length) {
            html += `<div class="result-group-title">Buildings</div>`;
            buildings.forEach((b, idx) => {
                html += `
                    <div class="result-item" data-kind="BUILDING" data-idx="${idx}">
                        <div class="result-main">
                            <span class="result-title">${escapeHtml(b.buildingName)}</span>
                            <span class="result-sub">${escapeHtml(b.description || '')}</span>
                        </div>
                        <span class="type-badge building">Building</span>
                    </div>
                `;
            });
        }

        if (locations.length) {
            html += `<div class="result-group-title">Places</div>`;
            locations.forEach((l, idx) => {
                const badgeCls = (l.type || 'building').toLowerCase();
                html += `
                    <div class="result-item" data-kind="LOCATION" data-idx="${idx}">
                        <div class="result-main">
                            <span class="result-title">${escapeHtml(l.name)}</span>
                            <span class="result-sub">${escapeHtml(l.description || '')}</span>
                        </div>
                        <span class="type-badge ${badgeCls}">${escapeHtml(l.type || 'Location')}</span>
                    </div>
                `;
            });
        }

        if (departments.length) {
            html += `<div class="result-group-title">Departments</div>`;
            departments.forEach((d, idx) => {
                html += `
                    <div class="result-item" data-kind="DEPARTMENT" data-idx="${idx}">
                        <div class="result-main">
                            <span class="result-title">${escapeHtml(d.departmentName)}</span>
                            <span class="result-sub">${escapeHtml(d.description || '')}</span>
                        </div>
                        <span class="type-badge department">Department</span>
                    </div>
                `;
            });
        }

        if (rooms.length) {
            html += `<div class="result-group-title">Classrooms &amp; Rooms</div>`;
            rooms.forEach((r, idx) => {
                html += `
                    <div class="result-item" data-kind="ROOM" data-idx="${idx}">
                        <div class="result-main">
                            <span class="result-title">${escapeHtml(r.roomName || 'Room ' + r.roomNumber)}</span>
                            <span class="result-sub">${escapeHtml(r.building?.buildingName || 'Campus')} • ${escapeHtml(floorLabel(r.floor))}</span>
                        </div>
                        <span class="type-badge classroom">Classroom</span>
                    </div>
                `;
            });
        }

        if (!html) {
            panel.innerHTML = `
                <div class="empty-state-card">
                    <h3>Location not found</h3>
                    <p>No results in the selected category filter for "${escapeHtml(keyword)}".</p>
                    <button class="ghost-btn" id="resetSearchPromptBtn">Reset Filter</button>
                </div>
            `;
            document.getElementById('resetSearchPromptBtn')?.addEventListener('click', resetSearch);
            return;
        }

        panel.innerHTML = html;

        panel.querySelectorAll('.result-item').forEach(el => {
            el.addEventListener('click', () => {
                const kind = el.dataset.kind;
                const i = Number(el.dataset.idx);
                if (kind === 'ROOM') selectItem({ ...rooms[i], _kind: 'ROOM' });
                else if (kind === 'BUILDING') selectItem({ ...buildings[i], _kind: 'BUILDING' });
                else if (kind === 'DEPARTMENT') selectItem({ ...departments[i], _kind: 'DEPARTMENT' });
                else selectItem({ ...locations[i], _kind: 'LOCATION' });
                panel.classList.add('hidden');
            });
        });
    }

    function resetSearch() {
        const input = document.getElementById('omniSearchInput');
        input.value = '';
        document.getElementById('clearSearchBtn').classList.add('hidden');
        document.getElementById('searchResultsPanel').classList.add('hidden');
        document.querySelectorAll('.filter-chips .chip[data-category]').forEach(c => {
            c.classList.toggle('active', c.dataset.category === 'ALL');
        });
        appState.activeCategory = 'ALL';
        input.focus();
    }

    // --- Location Detail Card ---
    function floorLabel(n) {
        const f = Number(n);
        if (!f) return '—';
        const suffix = f === 1 ? 'st' : f === 2 ? 'nd' : f === 3 ? 'rd' : 'th';
        return `${f}${suffix} Floor`;
    }

    function floorRange(rooms) {
        const floors = [...new Set(rooms.map(r => Number(r.floor)).filter(Boolean))].sort((a, b) => a - b);
        if (!floors.length) return null;
        return floors.length === 1 ? floorLabel(floors[0]) : `${floorLabel(floors[0]).replace(' Floor', '')} – ${floorLabel(floors[floors.length - 1])}`;
    }

    // Builds the detail drawer from the real data for each kind of place (no placeholder values)
    function selectItem(item) {
        if (item._kind === 'BUILDING') {
            const loc = appState.locations.find(l => l.locationId === item.location?.locationId);
            if (loc) return selectItem({ ...loc, _kind: 'LOCATION' });
        }
        appState.selectedItem = item;
        const drawer = document.getElementById('detailDrawer');
        const content = document.getElementById('detailContent');

        let title = item.name || '';
        let badge = item.type || 'Location';
        let rows = [];
        let desc = item.description || '';
        let floor = 1;
        let targetLocationId = item.locationId || null;
        let nodeKey = item._nodeKey || window.CampusMap.nodeKeyOf(item);
        let roomList = [];

        if (item._kind === 'ROOM') {
            const bLoc = item.building?.location;
            title = item.roomName || `Room ${item.roomNumber}`;
            badge = 'Classroom';
            floor = Number(item.floor) || 1;
            rows = [['Room', item.roomNumber], ['Floor', floorLabel(item.floor)], ['Building', item.building?.buildingName]];
            if (item.department) rows.push(['Department', item.department.departmentName]);
            desc = '';
            targetLocationId = bLoc?.locationId || null;
            nodeKey = item._nodeKey || window.CampusMap.nodeKeyOf(bLoc);
        } else if (item._kind === 'DEPARTMENT') {
            roomList = appState.rooms.filter(r => r.department?.departmentId === item.departmentId);
            const bLoc = roomList[0]?.building?.location;
            title = item.departmentName;
            badge = 'Department';
            const bNames = [...new Set(roomList.map(r => r.building?.buildingName).filter(Boolean))];
            if (bNames.length) rows.push(['Buildings', bNames.join(', ')]);
            rows.push(['Rooms', String(roomList.length)]);
            targetLocationId = bLoc?.locationId || null;
            nodeKey = bLoc ? window.CampusMap.nodeKeyOf(bLoc) : null;
            floor = Number(roomList[0]?.floor) || 1;
        } else {
            const building = item.locationId && appState.buildings.find(b => b.location?.locationId === item.locationId);
            rows.push(['Type', item.type || 'Location']);
            if (building) {
                roomList = appState.rooms.filter(r => r.building?.buildingId === building.buildingId);
                const range = floorRange(roomList);
                if (range) rows.push(['Floors', range]);
                rows.push(['Rooms', String(roomList.length)]);
                desc = building.description || desc;
            } else if (item.mapKey) {
                // e.g. an office inside a building: name the building it is in
                const host = appState.locations.find(l => l.mapKey === item.mapKey && (l.type || '').toLowerCase() === 'building' && l.locationId !== item.locationId);
                if (host) rows.push(['Inside', host.name]);
            }
        }

        const pinKey = item.locationId ? `loc-${item.locationId}` : null;
        if (nodeKey) window.CampusMap.focusNode(nodeKey, pinKey, floor);

        content.innerHTML = `
            <div class="detail-header">
                <span class="type-badge ${escapeHtml(badge.toLowerCase())}">${escapeHtml(badge)}</span>
                <h2 class="detail-title">${escapeHtml(title)}</h2>
            </div>
            <div class="detail-meta-grid">
                ${rows.filter(([, v]) => v).map(([k, v]) => `
                    <div class="meta-box">
                        <span class="meta-label">${escapeHtml(k)}</span>
                        <span class="meta-value">${escapeHtml(v)}</span>
                    </div>`).join('')}
            </div>
            ${desc ? `<p class="detail-desc">${escapeHtml(desc)}</p>` : ''}
            ${roomList.length && item._kind !== 'ROOM' ? `
                <div class="detail-rooms">
                    <span class="meta-label">Rooms</span>
                    <div class="room-chips">${roomList.slice(0, 18).map(r => `<button type="button" class="room-chip" data-room-id="${r.roomId}">${escapeHtml(r.roomNumber)}</button>`).join('')}${roomList.length > 18 ? `<span class="room-chip more">+${roomList.length - 18}</span>` : ''}</div>
                </div>` : ''}
            <div class="detail-actions">
                ${targetLocationId ? '<button class="primary-btn" id="detailGetDirectionsBtn">Get Directions</button>' : ''}
                ${targetLocationId ? '<button class="subtle-link-btn" id="detailReportBtn">Report outdated info</button>' : ''}
            </div>
        `;

        drawer.classList.remove('hidden');

        content.querySelectorAll('[data-room-id]').forEach(btn => btn.addEventListener('click', () => {
            const room = appState.rooms.find(r => String(r.roomId) === btn.dataset.roomId);
            if (room) selectItem({ ...room, _kind: 'ROOM' });
        }));
        document.getElementById('detailGetDirectionsBtn')?.addEventListener('click', () => openRoutePanel(targetLocationId));
        document.getElementById('detailReportBtn')?.addEventListener('click', () => openReportModal(targetLocationId));
    }

    // --- Route Guidance ---
    function openRoutePanel(prefillDestId = null) {
        const routePanel = document.getElementById('routePanel');
        routePanel.classList.remove('hidden');
        document.getElementById('toggleDirectionsBtn').classList.add('active');
        document.getElementById('searchResultsPanel').classList.add('hidden');
        document.getElementById('detailDrawer').classList.add('hidden');
        if (prefillDestId) {
            document.getElementById('destinationSelect').value = String(prefillDestId);
        }
    }

    async function calculateDirections() {
        const startId = document.getElementById('startLocationSelect').value;
        const destId = document.getElementById('destinationSelect').value;
        const banner = document.getElementById('routeValidationBanner');
        const resultBox = document.getElementById('routeGuidanceResult');

        banner.classList.add('hidden');

        if (!startId || !destId) {
            banner.textContent = 'Please select both a Starting Point and a Destination.';
            banner.classList.remove('hidden');
            resultBox.classList.add('hidden');
            return;
        }
        if (startId === destId) {
            banner.textContent = 'Starting Point and Destination cannot be the same location.';
            banner.classList.remove('hidden');
            resultBox.classList.add('hidden');
            return;
        }

        let startLoc = appState.locations.find(l => String(l.locationId) === String(startId));
        let destLoc = appState.locations.find(l => String(l.locationId) === String(destId));

        try {
            const data = await apiFetch(`/navigation/directions?startLocationId=${startId}&destinationId=${destId}`);
            startLoc = data.startLocation || startLoc;
            destLoc = data.destinationLocation || destLoc;
        } catch (err) {
            // The server answered with an error (e.g. 400 invalid location): show it, don't draw a route
            if (err.status) {
                banner.textContent = err.data?.message || err.message || 'Invalid starting point or destination.';
                banner.classList.remove('hidden');
                resultBox.classList.add('hidden');
                return;
            }
            // Server unreachable: still draw the route from the locations already loaded in the page
            if (!startLoc || !destLoc) {
                banner.textContent = 'Unable to resolve selected locations.';
                banner.classList.remove('hidden');
                return;
            }
        }

        const steps = window.CampusMap.drawRoute(startLoc, destLoc);
        // Approximate distance from the route drawn on the map (about 0.5 m per map unit)
        const pts = (document.querySelector('#routeLayer polyline')?.getAttribute('points') || '')
            .trim().split(/\s+/).filter(Boolean).map(p => p.split(',').map(Number));
        let units = 0;
        for (let i = 1; i < pts.length; i++) units += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
        const meters = Math.round(units * 0.5 / 10) * 10;
        const estMins = Math.max(1, Math.round(meters / 80));

        resultBox.innerHTML = `
            <div class="route-summary-bar">
                <span>${escapeHtml(startLoc.name)} &rarr; ${escapeHtml(destLoc.name)}</span>
                <span>${meters ? `~${meters} m • ` : ''}${estMins} min walk</span>
            </div>
            <ol class="route-steps">
                ${steps.map(s => `<li>${escapeHtml(s)}</li>`).join('')}
            </ol>
        `;
        resultBox.classList.remove('hidden');
    }

    // --- Information Reporting ---
    function openReportModal(prefillLocId = null) {
        const modal = document.getElementById('reportModal');
        const feedback = document.getElementById('reportFeedbackBanner');
        feedback.classList.add('hidden');
        feedback.classList.remove('success');
        if (prefillLocId) {
            document.getElementById('reportLocationSelect').value = String(prefillLocId);
        }
        modal.classList.remove('hidden');
    }

    async function handleReportSubmit(e) {
        e.preventDefault();
        const feedback = document.getElementById('reportFeedbackBanner');
        const locationId = document.getElementById('reportLocationSelect').value;
        const message = document.getElementById('reportMessage').value.trim();
        const issueType = document.getElementById('reportIssueType').value;

        if (!appState.user) {
            feedback.textContent = 'Please sign in first to submit a location report.';
            feedback.classList.remove('hidden', 'success');
            return;
        }
        const missing = !locationId ? 'Please choose a location.' : !issueType ? 'Please choose an issue type.' : !message ? 'Please describe the issue.' : '';
        if (missing) {
            feedback.textContent = missing;
            feedback.classList.remove('hidden', 'success');
            return;
        }

        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        try {
            // The server takes the reporter from the signed-in session
            await apiFetch('/reports', {
                method: 'POST',
                body: JSON.stringify({ locationId: Number(locationId), issueType, message })
            });
        } catch (err) {
            feedback.textContent = `Report not submitted: ${describeError(err)}`;
            feedback.classList.remove('hidden', 'success');
            return;
        } finally {
            submitBtn.disabled = false;
        }

        document.getElementById('reportMessage').value = '';
        document.getElementById('reportIssueType').value = '';
        feedback.textContent = 'Thank you! Your report was sent and is waiting for an administrator to review it.';
        feedback.classList.remove('hidden');
        feedback.classList.add('success');
    }

    // --- Authentication ---
    async function handleLoginSubmit(e) {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        const errBox = document.getElementById('loginErrorMsg');
        errBox.classList.add('hidden');

        try {
            const data = await apiFetch('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });
            if (data && data.authenticated) {
                setAuthenticatedUser(data);
                document.getElementById('loginModal').classList.add('hidden');
                document.getElementById('loginForm').reset();
            } else {
                errBox.textContent = data?.message || 'Invalid email or password';
                errBox.classList.remove('hidden');
            }
        } catch (err) {
            errBox.textContent = err.data?.message || err.message || 'Invalid email or password';
            errBox.classList.remove('hidden');
        }
    }

    function setAuthenticatedUser(user) {
        appState.user = user;
        document.getElementById('authLoggedOutPill').classList.add('hidden');
        document.getElementById('authLoggedInPill').classList.remove('hidden');
        document.getElementById('userNameLabel').textContent = user.name || user.email;
        document.getElementById('userAvatar').textContent = (user.name || 'U')[0].toUpperCase();
        const role = (user.role || 'STUDENT').toUpperCase();
        document.getElementById('userRoleBadge').textContent = role;
        document.getElementById('openAdminBtn').classList.toggle('hidden', role !== 'ADMIN');
    }

    // Restores the signed-in user after a page refresh (the server keeps the session)
    async function restoreSession() {
        try {
            const me = await apiFetch('/auth/me');
            if (me?.authenticated) setAuthenticatedUser(me);
        } catch {
            // 401 = nobody signed in; network error = server offline. Either way: stay in Visitor Mode.
        }
    }

    async function handleLogout() {
        try {
            await apiFetch('/auth/logout', { method: 'POST' });
        } catch {
            // Signing out locally is still correct if the server is unreachable
        }
        clearAuthenticatedUser();
    }

    function clearAuthenticatedUser() {
        appState.user = null;
        document.getElementById('authLoggedOutPill').classList.remove('hidden');
        document.getElementById('authLoggedInPill').classList.add('hidden');
        document.getElementById('openAdminBtn').classList.add('hidden');
        document.getElementById('adminModal').classList.add('hidden');
    }

    // --- Administrator Dashboard ---
    async function openAdminDashboard() {
        if (!appState.user || (appState.user.role || '').toUpperCase() !== 'ADMIN') return;
        document.getElementById('adminModal').classList.remove('hidden');
        await refreshAdminTables();
    }

    async function refreshAdminTables() {
        await loadCatalog();
        try {
            const reports = await apiFetch('/reports');
            appState.reports = reports || [];
        } catch (err) {
            showError(err, 'Could not load the reports queue.');
        }
        renderAdminLocations();
        renderAdminBuildingsAndRooms();
        renderAdminReports();
    }

    function renderAdminLocations() {
        const wrap = document.getElementById('adminLocationsTable');
        wrap.innerHTML = `
            <table class="admin-table">
                <thead><tr><th>ID</th><th>Name</th><th>Type</th><th>On map</th><th>Description</th><th>Actions</th></tr></thead>
                <tbody>
                    ${appState.locations.map(l => `
                        <tr>
                            <td>#${l.locationId}</td>
                            <td><strong>${escapeHtml(l.name)}</strong></td>
                            <td>${escapeHtml(l.type)}</td>
                            <td>${l.mapKey ? escapeHtml(l.mapKey.toUpperCase()) : '<span class="muted-cell">—</span>'}</td>
                            <td>${escapeHtml(l.description || '')}</td>
                            <td>
                                <button class="edit-btn" data-edit-loc="${l.locationId}">Edit</button>
                                <button class="danger-btn" data-del-loc="${l.locationId}">Delete</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        wrap.querySelectorAll('[data-edit-loc]').forEach(btn => {
            btn.addEventListener('click', () => {
                const loc = appState.locations.find(l => l.locationId === Number(btn.dataset.editLoc));
                if (!loc) return;
                document.getElementById('editLocationId').value = loc.locationId;
                document.getElementById('adminLocName').value = loc.name;
                document.getElementById('adminLocType').value = loc.type || 'Building';
                document.getElementById('adminLocDesc').value = loc.description || '';
                document.getElementById('adminLocMapKey').value = loc.mapKey || '';
                document.getElementById('saveLocationBtn').textContent = 'Save Changes';
                document.getElementById('cancelEditLocBtn').classList.remove('hidden');
            });
        });

        wrap.querySelectorAll('[data-del-loc]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = Number(btn.dataset.delLoc);
                if (!confirm('Delete this location? This cannot be undone.')) return;
                try {
                    await apiFetch(`/locations/${id}`, { method: 'DELETE' });
                    showToast('Location deleted.', 'success');
                } catch (err) {
                    showError(err, 'Could not delete this location.');
                    return;
                }
                await refreshAdminTables();
            });
        });
    }

    function renderAdminBuildingsAndRooms() {
        const bWrap = document.getElementById('adminBuildingsTable');
        bWrap.innerHTML = `
            <table class="admin-table">
                <thead><tr><th>Building</th><th>Description</th><th>Actions</th></tr></thead>
                <tbody>
                    ${appState.buildings.map(b => `
                        <tr>
                            <td><strong>${escapeHtml(b.buildingName)}</strong></td>
                            <td>${escapeHtml(b.description || '')}</td>
                            <td>
                                <button class="edit-btn" data-edit-bld="${b.buildingId}">Edit</button>
                                <button class="danger-btn" data-del-bld="${b.buildingId}">Delete</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        bWrap.querySelectorAll('[data-edit-bld]').forEach(btn => {
            btn.addEventListener('click', () => {
                const b = appState.buildings.find(item => item.buildingId === Number(btn.dataset.editBld));
                if (!b) return;
                document.getElementById('editBuildingId').value = b.buildingId;
                document.getElementById('adminBldName').value = b.buildingName;
                document.getElementById('adminBldDesc').value = b.description || '';
                if (b.location?.locationId) document.getElementById('adminBldLocSelect').value = b.location.locationId;
                document.getElementById('saveBuildingBtn').textContent = 'Save Building';
                document.getElementById('cancelEditBldBtn').classList.remove('hidden');
            });
        });

        bWrap.querySelectorAll('[data-del-bld]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = Number(btn.dataset.delBld);
                if (!confirm('Delete this building? This cannot be undone.')) return;
                try {
                    await apiFetch(`/locations/buildings/${id}`, { method: 'DELETE' });
                    showToast('Building deleted.', 'success');
                } catch (err) {
                    showError(err, 'Could not delete this building.');
                    return;
                }
                await refreshAdminTables();
            });
        });

        const rWrap = document.getElementById('adminRoomsTable');
        rWrap.innerHTML = `
            <table class="admin-table">
                <thead><tr><th>Room #</th><th>Room Name</th><th>Floor</th><th>Building</th><th>Actions</th></tr></thead>
                <tbody>
                    ${appState.rooms.map(r => `
                        <tr>
                            <td><strong>${escapeHtml(r.roomNumber)}</strong></td>
                            <td>${escapeHtml(r.roomName)}</td>
                            <td>${r.floor}F</td>
                            <td>${escapeHtml(r.building?.buildingName || 'N/A')}</td>
                            <td>
                                <button class="edit-btn" data-edit-room="${r.roomId}">Edit</button>
                                <button class="danger-btn" data-del-room="${r.roomId}">Delete</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        rWrap.querySelectorAll('[data-edit-room]').forEach(btn => {
            btn.addEventListener('click', () => {
                const r = appState.rooms.find(item => item.roomId === Number(btn.dataset.editRoom));
                if (!r) return;
                document.getElementById('editRoomId').value = r.roomId;
                if (r.building?.buildingId) document.getElementById('adminRoomBuildingSelect').value = r.building.buildingId;
                if (r.department?.departmentId) document.getElementById('adminRoomDeptSelect').value = r.department.departmentId;
                document.getElementById('adminRoomNumber').value = r.roomNumber;
                document.getElementById('adminRoomName').value = r.roomName;
                document.getElementById('adminRoomFloor').value = r.floor;
                document.getElementById('saveRoomBtn').textContent = 'Save Room';
                document.getElementById('cancelEditRoomBtn').classList.remove('hidden');
            });
        });

        rWrap.querySelectorAll('[data-del-room]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = Number(btn.dataset.delRoom);
                if (!confirm('Delete this room? This cannot be undone.')) return;
                try {
                    await apiFetch(`/locations/rooms/${id}`, { method: 'DELETE' });
                    showToast('Room deleted.', 'success');
                } catch (err) {
                    showError(err, 'Could not delete this room.');
                    return;
                }
                await refreshAdminTables();
            });
        });
    }

    function renderAdminReports() {
        const wrap = document.getElementById('adminReportsTable');
        const filtered = appState.reports.filter(r =>
            appState.reportFilter === 'ALL' || (r.status || '').toUpperCase() === appState.reportFilter
        );

        if (!filtered.length) {
            wrap.innerHTML = `<div style="padding:18px;text-align:center;color:#64748b;">No reports matching filter "${appState.reportFilter}".</div>`;
            return;
        }

        const label = (st) => st.charAt(0) + st.slice(1).toLowerCase();
        wrap.innerHTML = `
            <table class="admin-table">
                <thead><tr><th>Issue</th><th>Location</th><th>Reporter</th><th>Details</th><th>Date</th><th>Status</th></tr></thead>
                <tbody>
                    ${filtered.map(r => {
                        const status = (r.status || 'PENDING').toUpperCase();
                        return `
                            <tr>
                                <td><strong>${escapeHtml(r.issueType || 'Other')}</strong></td>
                                <td>${escapeHtml(r.location?.name || 'N/A')}</td>
                                <td>${escapeHtml(r.user?.name || r.user?.email || 'User')}</td>
                                <td>${escapeHtml(r.message)}</td>
                                <td>${escapeHtml(r.reportDate || '')}</td>
                                <td>
                                    <select class="status-select ${status}" data-report-id="${r.reportId}" aria-label="Report status">
                                        ${['PENDING', 'REVIEWING', 'RESOLVED'].map(st => `<option value="${st}" ${st === status ? 'selected' : ''}>${label(st)}</option>`).join('')}
                                    </select>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;

        wrap.querySelectorAll('[data-report-id]').forEach(sel => {
            sel.addEventListener('change', async () => {
                sel.disabled = true;
                try {
                    // The server records which admin handled it from the session
                    await apiFetch(`/reports/${sel.dataset.reportId}/status`, {
                        method: 'PUT',
                        body: JSON.stringify({ status: sel.value })
                    });
                    showToast(`Report marked ${sel.value.toLowerCase()}.`, 'success');
                } catch (err) {
                    showError(err, 'Could not update this report.');
                }
                await refreshAdminTables();
            });
        });
    }

    function escapeHtml(str) {
        return String(str ?? '').replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    }

    // --- Wire Event Listeners ---
    function bindEvents() {
        // Search
        document.getElementById('searchSubmitBtn').addEventListener('click', runSearch);
        document.getElementById('omniSearchInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') runSearch();
        });
        document.getElementById('omniSearchInput').addEventListener('input', (e) => {
            document.getElementById('clearSearchBtn').classList.toggle('hidden', !e.target.value.trim());
        });
        document.getElementById('clearSearchBtn').addEventListener('click', resetSearch);

        // Category Filter Chips
        document.querySelectorAll('.filter-chips .chip[data-category]').forEach(chip => {
            chip.addEventListener('click', () => {
                document.querySelectorAll('.filter-chips .chip[data-category]').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                appState.activeCategory = chip.dataset.category;
                window.CampusMap.renderPins(appState.locations, appState.rooms, appState.activeCategory);
                if (document.getElementById('omniSearchInput').value.trim()) runSearch();
            });
        });

        // Floor Switcher (uses currently active building instead of hardcoding NGE)
        document.querySelectorAll('.floor-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const floor = Number(btn.dataset.floor);
                const activeBldg = window.CampusMap.getActiveBuildingId();
                window.CampusMap.focusBuilding(activeBldg, floor);
            });
        });

        // Close search dropdown and deselect pins when clicking empty map space
        document.getElementById('mapViewport').addEventListener('click', (e) => {
            // Only deselect if the click was on the map background, not a building or pin
            if (!e.target.closest('.building-group, .map-pin')) {
                document.getElementById('searchResultsPanel').classList.add('hidden');
                document.getElementById('detailDrawer').classList.add('hidden');
                window.CampusMap.clearActivePin(appState.activeCategory);
            }
        });

        // Modal backdrop click & Escape key to close
        ['loginModal', 'reportModal', 'adminModal'].forEach(id => {
            const modal = document.getElementById(id);
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.classList.add('hidden');
            });
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                ['loginModal', 'reportModal', 'adminModal'].forEach(id => {
                    document.getElementById(id).classList.add('hidden');
                });
                document.getElementById('searchResultsPanel').classList.add('hidden');
            }
        });

        // Detail Drawer close — also clears active pin
        document.getElementById('closeDetailBtn').addEventListener('click', () => {
            document.getElementById('detailDrawer').classList.add('hidden');
            window.CampusMap.clearActivePin(appState.activeCategory);
        });

        // Route Panel
        document.getElementById('toggleDirectionsBtn').addEventListener('click', () => {
            const panel = document.getElementById('routePanel');
            const isHidden = panel.classList.contains('hidden');
            panel.classList.toggle('hidden');
            document.getElementById('toggleDirectionsBtn').classList.toggle('active', isHidden);
            if (!isHidden) window.CampusMap.clearRoute();
        });
        document.getElementById('closeRouteBtn').addEventListener('click', () => {
            document.getElementById('routePanel').classList.add('hidden');
            document.getElementById('toggleDirectionsBtn').classList.remove('active');
            window.CampusMap.clearRoute();
        });
        document.getElementById('swapRouteBtn').addEventListener('click', () => {
            const s = document.getElementById('startLocationSelect');
            const d = document.getElementById('destinationSelect');
            [s.value, d.value] = [d.value, s.value];
        });
        document.getElementById('getDirectionsBtn').addEventListener('click', calculateDirections);

        // Report Modal
        document.getElementById('openReportNavBtn').addEventListener('click', () => openReportModal());
        document.getElementById('closeReportModalBtn').addEventListener('click', () => {
            document.getElementById('reportModal').classList.add('hidden');
        });
        document.getElementById('reportForm').addEventListener('submit', handleReportSubmit);

        // Auth Modal
        document.getElementById('openLoginModalBtn').addEventListener('click', () => {
            document.getElementById('loginModal').classList.remove('hidden');
        });
        document.getElementById('closeLoginModalBtn').addEventListener('click', () => {
            document.getElementById('loginModal').classList.add('hidden');
        });
        document.getElementById('loginForm').addEventListener('submit', handleLoginSubmit);
        document.getElementById('logoutBtn').addEventListener('click', handleLogout);

        // Admin Modal & Tabs
        document.getElementById('openAdminBtn').addEventListener('click', openAdminDashboard);
        document.getElementById('closeAdminModalBtn').addEventListener('click', () => {
            document.getElementById('adminModal').classList.add('hidden');
        });
        document.querySelectorAll('.admin-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.admin-tab-pane').forEach(p => p.classList.remove('active'));
                tab.classList.add('active');
                const mapId = {
                    locations: 'adminTabLocations',
                    buildingsRooms: 'adminTabBuildingsRooms',
                    reports: 'adminTabReports'
                }[tab.dataset.adminTab];
                document.getElementById(mapId).classList.add('active');
            });
        });

        // Admin Location Form
        document.getElementById('adminLocationForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('editLocationId').value;
            const payload = {
                name: document.getElementById('adminLocName').value.trim(),
                type: document.getElementById('adminLocType').value,
                description: document.getElementById('adminLocDesc').value.trim(),
                mapKey: document.getElementById('adminLocMapKey').value || null
            };
            try {
                if (id) await apiFetch(`/locations/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
                else await apiFetch('/locations', { method: 'POST', body: JSON.stringify(payload) });
                showToast('Saved.', 'success');
            } catch (err) {
                // Keep what the admin typed so they can fix it and try again
                showError(err, 'Could not save this location.');
                return;
            }
            document.getElementById('adminLocationForm').reset();
            document.getElementById('editLocationId').value = '';
            document.getElementById('saveLocationBtn').textContent = 'Add Location';
            document.getElementById('cancelEditLocBtn').classList.add('hidden');
            await refreshAdminTables();
        });
        document.getElementById('cancelEditLocBtn').addEventListener('click', () => {
            document.getElementById('adminLocationForm').reset();
            document.getElementById('editLocationId').value = '';
            document.getElementById('saveLocationBtn').textContent = 'Add Location';
            document.getElementById('cancelEditLocBtn').classList.add('hidden');
        });

        // Admin Building Form
        document.getElementById('adminBuildingForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('editBuildingId').value;
            const payload = {
                buildingName: document.getElementById('adminBldName').value.trim(),
                description: document.getElementById('adminBldDesc').value.trim(),
                location: { locationId: Number(document.getElementById('adminBldLocSelect').value) }
            };
            try {
                if (id) await apiFetch(`/locations/buildings/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
                else await apiFetch('/locations/buildings', { method: 'POST', body: JSON.stringify(payload) });
                showToast('Saved.', 'success');
            } catch (err) {
                // Keep what the admin typed so they can fix it and try again
                showError(err, 'Could not save this building.');
                return;
            }
            document.getElementById('adminBuildingForm').reset();
            document.getElementById('editBuildingId').value = '';
            document.getElementById('saveBuildingBtn').textContent = 'Add Building';
            document.getElementById('cancelEditBldBtn').classList.add('hidden');
            await refreshAdminTables();
        });
        document.getElementById('cancelEditBldBtn').addEventListener('click', () => {
            document.getElementById('adminBuildingForm').reset();
            document.getElementById('editBuildingId').value = '';
            document.getElementById('saveBuildingBtn').textContent = 'Add Building';
            document.getElementById('cancelEditBldBtn').classList.add('hidden');
        });

        // Admin Room Form
        document.getElementById('adminRoomForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('editRoomId').value;
            const payload = {
                building: { buildingId: Number(document.getElementById('adminRoomBuildingSelect').value) },
                department: { departmentId: Number(document.getElementById('adminRoomDeptSelect').value) },
                roomNumber: document.getElementById('adminRoomNumber').value.trim(),
                roomName: document.getElementById('adminRoomName').value.trim(),
                floor: Number(document.getElementById('adminRoomFloor').value)
            };
            try {
                if (id) await apiFetch(`/locations/rooms/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
                else await apiFetch('/locations/rooms', { method: 'POST', body: JSON.stringify(payload) });
                showToast('Saved.', 'success');
            } catch (err) {
                // Keep what the admin typed so they can fix it and try again
                showError(err, 'Could not save this room.');
                return;
            }
            document.getElementById('adminRoomForm').reset();
            document.getElementById('editRoomId').value = '';
            document.getElementById('saveRoomBtn').textContent = 'Add Room';
            document.getElementById('cancelEditRoomBtn').classList.add('hidden');
            await refreshAdminTables();
        });
        document.getElementById('cancelEditRoomBtn').addEventListener('click', () => {
            document.getElementById('adminRoomForm').reset();
            document.getElementById('editRoomId').value = '';
            document.getElementById('saveRoomBtn').textContent = 'Add Room';
            document.getElementById('cancelEditRoomBtn').classList.add('hidden');
        });

        // Admin Report Filter Chips
        document.querySelectorAll('.report-filter').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.report-filter').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                appState.reportFilter = btn.dataset.reportStatus;
                renderAdminReports();
            });
        });
    }

    // --- Boot ---
    document.addEventListener('DOMContentLoaded', () => {
        window.CampusMap.init({ onSelectItem: selectItem });
        bindEvents();
        loadCatalog();
        restoreSession();
    });
})();
