/**
 * CampusPath — one app for phones and computers.
 * Each screen is a hash route (#/home, #/map, ...), so the browser/phone back button works.
 * Phones: full-screen pages, bottom sheets and a 4-tab bar. Computers (900px and wider):
 * the same pages in a side panel over a full-screen campus map. The layout switch is pure CSS
 * plus a few map-placement rules below (isDesktop).
 * Talks to the Spring Boot REST API (/api/...) and draws the campus with map.js.
 */
(() => {
    'use strict';

    // ------------------------------------------------------------------ state
    const S = {
        user: null,
        locations: [],
        buildings: [],
        rooms: [],
        departments: [],
        loaded: false,
        loadFailed: false,
        mapReady: false,
        mapCategory: 'ALL',
        route: null,          // last computed directions (used by the navigation screen)
        navStep: 0,
        stack: []             // visited routes, for in-app back buttons
    };

    const METERS_PER_MAP_UNIT = 0.5;   // rough scale of the campus drawing (for distance estimates)
    const WALK_METERS_PER_MIN = 80;
    const ISSUE_TYPES = ['Wrong location', 'Incorrect room information', 'Missing location',
        'Incorrect department information', 'Other'];
    const CATEGORIES = [
        { key: 'building', label: 'Buildings' },
        { key: 'classroom', label: 'Classrooms' },
        { key: 'department', label: 'Departments' },
        { key: 'office', label: 'Offices' },
        { key: 'facility', label: 'Facilities' }
    ];
    // "Building on the map" choices for the admin form: [id, "B1 — Dr. Nicolas G. Escario Sr. Building"]
    const mapBuildings = () => (window.CampusMap?.listBuildings() || []).map(b => [b.id, `${b.code} — ${b.name}`]);
    const CAT_LABEL = { building: 'Building', classroom: 'Classroom', department: 'Department', office: 'Office', facility: 'Facility' };
    const CAT_ICON = { building: 'building', classroom: 'door', department: 'users', office: 'briefcase', facility: 'pin' };

    const $ = (sel, root = document) => root.querySelector(sel);
    const desktopQuery = matchMedia('(min-width: 900px)');
    const isDesktop = () => desktopQuery.matches;
    const DESKTOP_PANEL_EDGE = 452;   // side panel (16 + 420 + 16 px): the map frames places to its right
    const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
    const screenEl = $('#screen');

    // ------------------------------------------------------------------ icons (Lucide-style line icons)
    const ICONS = {
        home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
        map: '<path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/>',
        search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
        user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
        nav: '<path d="M3 11 22 2l-9 19-2-8z"/>',
        flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>',
        back: '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
        chev: '<path d="m9 18 6-6-6-6"/>',
        building: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"/>',
        door: '<path d="M13 4h3a2 2 0 0 1 2 2v14M2 20h3M13 20h9M10 12v.01"/><path d="M13 4.56v16.16a1 1 0 0 1-1.24.97L5 20V5.56a2 2 0 0 1 1.52-1.94l4-1A2 2 0 0 1 13 4.56z"/>',
        users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
        briefcase: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
        pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
        clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
        x: '<path d="M18 6 6 18M6 6l12 12"/>',
        logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
        grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
        plus: '<path d="M12 5v14M5 12h14"/>',
        check: '<path d="M20 6 9 17l-5-5"/>',
        info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
        swap: '<path d="m7 15 5 5 5-5M7 9l5-5 5 5"/>',
        monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
        up: '<path d="m5 12 7-7 7 7M12 19V5"/>',
        left: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5V20"/>',
        right: '<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5A5.5 5.5 0 0 0 4 14.5V20"/>',
        list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
        trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>'
    };
    const icon = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
    const fillIcons = (root = document) => $$('[data-icon]', root).forEach(el => { el.innerHTML = icon(el.dataset.icon); });

    // ------------------------------------------------------------------ helpers
    function esc(value) {
        return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    function toast(message, kind = '') {
        const el = $('#toast');
        el.textContent = message;
        el.className = `toast show ${kind}`;
        clearTimeout(toast.timer);
        toast.timer = setTimeout(() => el.classList.remove('show'), 3500);
    }

    async function api(path, options = {}) {
        const res = await fetch(`/api${path}`, {
            ...options,
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
        });
        const text = await res.text();
        let data = null;
        try { data = text ? JSON.parse(text) : null; } catch { data = text; }
        if (!res.ok) {
            const err = new Error(data?.message || `Request failed (${res.status})`);
            err.status = res.status;
            throw err;
        }
        return data;
    }

    // Readable message for a failed request. 401 = the sign-in expired: sign out and go to login.
    function describe(err, fallback = 'Something went wrong. Please try again.') {
        if (err?.status === 401) {
            if (S.user) { S.user = null; }
            setTimeout(() => go(`#/login?next=${encodeURIComponent(location.hash)}`), 0);
            return 'Please sign in again.';
        }
        if (err instanceof TypeError) return "Can't reach the CampusPath server.";
        return err?.message || fallback;
    }

    function go(hash, replace = false) {
        if (location.hash === hash) { render(); return; }
        if (replace) {
            S.replacing = true;          // the hashchange handler swaps the top of the stack
            location.replace(hash);
        } else {
            location.hash = hash;
        }
    }

    function back(fallback = '#/home') {
        if (S.stack.length > 1) history.back();
        else go(fallback, true);
    }

    const isAdmin = () => (S.user?.role || '').toUpperCase() === 'ADMIN';
    // First + last name initials, skipping middle initials like "B." ("John Emmanuel B. Montemayor" -> "JM")
    const initials = (name = '') => {
        const words = name.split(/\s+/).filter(w => /^[A-Za-z]/.test(w) && !/^[A-Za-z]\.?$/.test(w));
        if (!words.length) return 'U';
        return (words[0][0] + (words.length > 1 ? words.at(-1)[0] : '')).toUpperCase();
    };
    const firstName = (name = '') => name.split(/\s+/)[0] || '';

    function floorLabel(n) {
        const f = Number(n);
        if (!f) return '';
        const suffix = f % 10 === 1 && f !== 11 ? 'st' : f % 10 === 2 && f !== 12 ? 'nd' : f % 10 === 3 && f !== 13 ? 'rd' : 'th';
        return `${f}${suffix} Floor`;
    }

    function formatDate(value) {
        if (!value) return '';
        const d = new Date(`${value}T00:00:00`);
        return isNaN(d) ? value : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    }

    // Reports store the issue type at the start of the message: "[Wrong location] details..."
    function parseReport(report) {
        const message = report?.message || '';
        if (report?.issueType) return { issue: report.issueType, text: message };
        const m = /^\[([^\]]+)\]\s*([\s\S]*)$/.exec(message);
        return m ? { issue: m[1], text: m[2] } : { issue: 'Location report', text: message };
    }

    const statusChip = (status = 'PENDING') => {
        const s = status.toUpperCase();
        const label = s.charAt(0) + s.slice(1).toLowerCase();
        return `<span class="chip status-${esc(s.toLowerCase())}">${esc(label)}</span>`;
    };

    // ------------------------------------------------------------------ data → list items
    function catFromType(type = '') {
        const t = type.toLowerCase();
        if (t.includes('building')) return 'building';
        if (t.includes('classroom') || t.includes('room')) return 'classroom';
        if (t.includes('department')) return 'department';
        if (t.includes('office')) return 'office';
        return 'facility';
    }

    const locationItem = (l) => ({ kind: 'location', id: l.locationId, name: l.name, cat: catFromType(l.type), sub: l.description || '', locationId: l.locationId });

    function roomItem(r) {
        const b = r.building;
        return {
            kind: 'room', id: r.roomId,
            name: r.roomName || `Room ${r.roomNumber}`,
            cat: 'classroom',
            sub: [b?.buildingName, floorLabel(r.floor)].filter(Boolean).join(' • '),
            locationId: b?.location?.locationId
        };
    }

    function departmentItem(d) {
        const room = S.rooms.find(r => r.department?.departmentId === d.departmentId);
        return { kind: 'department', id: d.departmentId, name: d.departmentName, cat: 'department', sub: d.description || '', locationId: room?.building?.location?.locationId };
    }

    function buildingItem(b) {
        const loc = S.locations.find(l => l.locationId === b.location?.locationId);
        return loc ? locationItem(loc) : { kind: 'building', id: b.buildingId, name: b.buildingName, cat: 'building', sub: b.description || '', locationId: b.location?.locationId };
    }

    const allItems = () => [
        ...S.locations.map(locationItem),
        ...S.rooms.map(roomItem),
        ...S.departments.map(departmentItem)
    ];

    function dedupe(items) {
        const seen = new Set();
        return items.filter(i => { const k = `${i.kind}:${i.id}`; if (seen.has(k)) return false; seen.add(k); return true; });
    }

    const detailsHref = (item) => `#/details/${item.kind}/${item.id}`;
    const directionsHref = (item) => item.locationId ? `#/directions?to=${item.locationId}` : null;

    function iconBox(cat) {
        return `<span class="icon-box cat-${cat}">${icon(CAT_ICON[cat] || 'pin')}</span>`;
    }

    function itemRow(item, href = detailsHref(item)) {
        return `
            <a class="list-item" href="${href}">
                ${iconBox(item.cat)}
                <span class="grow">
                    <span class="title">${esc(item.name)}</span>
                    <span class="sub"><span class="chip cat-${item.cat}">${CAT_LABEL[item.cat]}</span> ${item.sub ? '&nbsp;' + esc(item.sub) : ''}</span>
                </span>
                <span class="chev">${icon('chev')}</span>
            </a>`;
    }

    function resultCard(item) {
        const dir = directionsHref(item);
        return `
            <div class="card result-card">
                <a class="result-main" href="${detailsHref(item)}">
                    ${iconBox(item.cat)}
                    <span class="grow">
                        <span class="title">${esc(item.name)}</span>
                        <span class="chip cat-${item.cat}">${CAT_LABEL[item.cat]}</span>
                        ${item.sub ? `<span class="sub">${esc(item.sub)}</span>` : ''}
                    </span>
                </a>
                <div class="result-actions">
                    <a class="mini-btn outline" href="${detailsHref(item)}">View Location</a>
                    ${dir ? `<a class="mini-btn gold" href="${dir}">${icon('nav')} Directions</a>` : ''}
                </div>
            </div>`;
    }

    const topbar = (title, fallback = '#/home', extra = '') => `
        <header class="topbar">
            <button class="icon-btn" type="button" data-back="${fallback}" aria-label="Back">${icon('back')}</button>
            <h1>${esc(title)}</h1>${extra}
        </header>`;

    const emptyState = (iconName, title, text, action = '') => `
        <div class="empty">
            <div class="icon-box">${icon(iconName)}</div>
            <h3>${esc(title)}</h3>
            <p>${esc(text)}</p>
            ${action}
        </div>`;

    const spinner = `<div class="skeleton-list" role="progressbar" aria-label="Loading">${'<div class="skeleton-row"><span></span><div><i></i><i></i></div></div>'.repeat(4)}</div>`;

    // ------------------------------------------------------------------ data loading
    // Loads the campus data. The last good copy is saved on the device, so if the Wi-Fi drops the
    // app keeps showing real (if slightly older) data instead of going blank.
    async function loadData() {
        try {
            const [locations, buildings, rooms, departments] = await Promise.all([
                api('/locations'), api('/locations/buildings'), api('/locations/rooms'), api('/locations/departments')
            ]);
            Object.assign(S, { locations: locations || [], buildings: buildings || [], rooms: rooms || [], departments: departments || [] });
            S.loaded = true;
            S.loadFailed = false;
            S.savedAt = null;
            try {
                localStorage.setItem('cp_catalog', JSON.stringify({ at: Date.now(), locations, buildings, rooms, departments }));
            } catch { /* storage full or disabled: nothing to save */ }
            $('#offlineBar').hidden = true;
        } catch {
            S.loadFailed = true;
            const saved = readSavedCatalog();
            if (saved && !S.loaded) {
                Object.assign(S, { locations: saved.locations, buildings: saved.buildings, rooms: saved.rooms, departments: saved.departments });
                S.loaded = true;
                S.savedAt = saved.at;
            }
            $('#offlineText').textContent = S.savedAt
                ? `Offline — showing campus data saved ${new Date(S.savedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}.`
                : S.loaded ? 'Offline — showing the campus data already loaded.' : "Can't reach the CampusPath server.";
            $('#offlineBar').hidden = false;
        }
        if (S.mapReady) window.CampusMap.renderPins(S.locations, S.rooms, S.mapCategory);
    }

    function readSavedCatalog() {
        try {
            const saved = JSON.parse(localStorage.getItem('cp_catalog') || 'null');
            return saved && Array.isArray(saved.locations) ? saved : null;
        } catch {
            return null;
        }
    }

    async function restoreSession() {
        try {
            const me = await api('/auth/me');
            if (me?.authenticated) S.user = me;
        } catch {
            // not signed in (401) or offline: stay a visitor
        }
    }

    // ------------------------------------------------------------------ the shared campus map
    const viewport = $('#mapViewport');
    const parking = $('#mapParking');
    let frameCurrent = null;   // re-run on resize/rotation

    const stage = $('#mapStage');

    function setupMap() {
        try {
            window.CampusMap.init({ onSelectItem: onMapSelect });
            S.mapReady = true;
            if (S.loaded) window.CampusMap.renderPins(S.locations, S.rooms, S.mapCategory);

            $$('.floor-btn', viewport).forEach(btn => btn.addEventListener('click', () => {
                const id = window.CampusMap.getActiveBuildingId();
                window.CampusMap.focusBuilding(id, Number(btn.dataset.floor));
            }));
            $('#fitCampusBtn').addEventListener('click', () => frameCampus());
        } catch {
            // Map unavailable (e.g. offline); the rest of the app still works
        }
    }

    // Phones: the map moves into whichever page needs it. Computers: it always fills the
    // background (#mapStage) and pages just tell it what to show.
    function mountMap(host) {
        if (!S.mapReady) return false;
        if (isDesktop()) {
            if (viewport.parentElement !== stage) stage.appendChild(viewport);
            return true;
        }
        if (!host) return false;
        host.appendChild(viewport);
        return true;
    }

    function parkMap() {
        frameCurrent = null;
        const home = isDesktop() ? stage : parking;
        if (viewport.parentElement !== home) home.appendChild(viewport);
    }

    // Fit a box of map coordinates (x, y, width, height) into the visible map area
    function frameBox(box, pad = 20) {
        const svgEl = $('#campusSvg');
        if (!svgEl || !box) return;
        const rect = viewport.getBoundingClientRect();
        if (rect.width < 10 || rect.height < 10) return;   // map is hidden right now: framing would break it
        const w = rect.width, h = rect.height;
        svgEl.setAttribute('viewBox', `0 0 ${w} ${h}`);   // 1 map unit = 1 screen pixel before scaling
        // On computers the side panel covers the left of the map: frame the place in the area to its right
        const left = isDesktop() && w > DESKTOP_PANEL_EDGE + 200 ? DESKTOP_PANEL_EDGE : 0;
        const areaW = w - left;
        window.CampusMap.setView({ scale: Math.min((areaW - pad * 2) / box.width, (h - pad * 2) / box.height) });
        const scale = window.CampusMap.getView().scale;   // may be clamped to the map's zoom limits
        window.CampusMap.setView({
            panX: left + areaW / 2 - (box.x + box.width / 2) * scale,
            panY: h / 2 - (box.y + box.height / 2) * scale
        });
    }

    const grow = (b, by) => ({ x: b.x - by, y: b.y - by, width: b.width + by * 2, height: b.height + by * 2 });

    function campusBox() {
        const poly = $('#campusRoads polygon');
        return poly ? poly.getBBox() : { x: 245, y: 75, width: 635, height: 790 };
    }

    function frameCampus() {
        frameCurrent = () => frameBox(campusBox(), 12);
        requestAnimationFrame(frameCurrent);
    }

    function frameBuilding(nodeKey, around = 150) {
        frameCurrent = () => {
            const g = $(`[data-building-id="${nodeKey}"]`);
            frameBox(g ? grow(g.getBBox(), around) : campusBox(), 8);
        };
        requestAnimationFrame(frameCurrent);
    }

    function frameRoute(segment = null) {
        frameCurrent = () => {
            const pts = S.route?.points || [];
            let use = pts;
            if (segment != null && pts.length) use = [pts[segment], pts[Math.min(segment + 1, pts.length - 1)]];
            if (!use.length) return frameBox(campusBox());
            const xs = use.map(p => p.x), ys = use.map(p => p.y);
            const box = { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
            frameBox(grow(box, segment != null ? 110 : 60), 16);
        };
        requestAnimationFrame(frameCurrent);
    }

    // Window resized / phone rotated: re-frame what the page was showing, or at least keep 1 unit = 1 pixel
    window.addEventListener('resize', () => requestAnimationFrame(() => {
        if (frameCurrent) return frameCurrent();
        const svgEl = $('#campusSvg');
        const rect = viewport.getBoundingClientRect();
        if (svgEl && rect.width >= 10 && rect.height >= 10) svgEl.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);
    }));

    // Which map building a place is in: the location's saved mapKey (falls back to a name guess for old data)
    const nodeKeyOf = (loc) => (loc && window.CampusMap?.nodeKeyOf(loc)) || 'rtl';

    function routePoints() {
        const line = $('#routeLayer polyline');
        if (!line) return [];
        return line.getAttribute('points').trim().split(/\s+/).map(p => {
            const [x, y] = p.split(',').map(Number);
            return { x, y };
        });
    }

    function pathLength(points) {
        let len = 0;
        for (let i = 1; i < points.length; i++) len += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
        return len;
    }

    // Pulsing dot on the map showing where the walker is in navigation mode
    function setNavMarker(point) {
        const layer = $('#routeLayer');
        if (!layer) return;
        $('#navMarker')?.remove();
        if (!point) return;
        const ns = 'http://www.w3.org/2000/svg';
        const g = document.createElementNS(ns, 'g');
        g.id = 'navMarker';
        g.setAttribute('transform', `translate(${point.x}, ${point.y})`);
        g.innerHTML = '<circle r="16" fill="#3b82f6" class="pin-pulse"/><circle r="9" fill="#3b82f6" stroke="#fff" stroke-width="3"/>';
        layer.appendChild(g);
    }

    // ------------------------------------------------------------------ map selection bottom sheet
    function onMapSelect(raw) {
        const routeName = currentRoute().name;
        if (routeName === 'navigate') return;
        if (!isDesktop() && routeName !== 'map') return;
        let item;
        if (raw._kind === 'ROOM') {
            item = roomItem(raw);
        } else if (raw.locationId) {
            item = locationItem(raw);
        } else {
            item = { kind: null, name: raw.name, cat: catFromType(raw.type), sub: raw.description || '' };
        }
        // Computers: open the place in the side panel. Phones: show a card over the map.
        if (isDesktop() && item.kind) go(detailsHref(item));
        else showSheet(item);
    }

    function showSheet(item) {
        hideSheet();
        const sheet = document.createElement('div');
        sheet.className = 'sheet';
        sheet.id = 'mapSheet';
        const dir = directionsHref(item);
        sheet.innerHTML = `
            <button class="sheet-close" type="button" data-close-sheet aria-label="Close">${icon('x')}</button>
            <div class="row">
                ${iconBox(item.cat)}
                <div class="grow">
                    <h3>${esc(item.name)}</h3>
                    <span class="chip cat-${item.cat}">${CAT_LABEL[item.cat]}</span>
                </div>
            </div>
            ${item.sub ? `<p class="sheet-sub">${esc(item.sub)}</p>` : ''}
            <div class="btn-row">
                ${item.kind ? `<a class="btn btn-outline" href="${detailsHref(item)}">Details</a>` : ''}
                ${dir ? `<a class="btn btn-gold" href="${dir}">${icon('nav')} Directions</a>` : ''}
            </div>`;
        $('#app').appendChild(sheet);
        $('[data-close-sheet]', sheet).addEventListener('click', hideSheet);
    }

    const hideSheet = () => $('#mapSheet')?.remove();

    // ================================================================== SCREENS
    const screens = {};

    // ---------- Welcome (first launch)
    screens.welcome = () => {
        screenEl.innerHTML = `
            <div class="welcome">
                <div class="welcome-art" id="welcomeMap">
                    <div class="float-card">
                        <span class="icon-box cat-building" style="width:34px;height:34px">${icon('pin')}</span>
                        <span><strong>NGE Building</strong>CCS • Dept. of IT</span>
                    </div>
                </div>
                <h1>Welcome to<br>CampusPath</h1>
                <p>Find classrooms, buildings, departments, and other locations around CIT-U with ease.</p>
                <div class="btn-row">
                    <button class="btn btn-gold" type="button" data-start>Get Started ${icon('chev')}</button>
                    <button class="center-link" type="button" data-start>Skip</button>
                </div>
            </div>`;
        const art = $('#welcomeMap');
        if (mountMap(art)) {
            art.prepend(viewport);
            frameBuilding('nge', 260);
        }
        $$('[data-start]').forEach(b => b.addEventListener('click', () => {
            localStorage.setItem('cp_onboarded', '1');
            go('#/home', true);
        }));
    };

    // ---------- Home
    function popularItems() {
        const picks = [
            l => /nge/i.test(l.name),
            l => /lrac|library/i.test(l.name),
            l => /fao|finance/i.test(l.name) || catFromType(l.type) === 'office',
            l => /gym/i.test(l.name)
        ];
        const items = [];
        picks.forEach(test => {
            const l = S.locations.find(x => test(x) && !items.some(i => i.id === x.locationId));
            if (l) items.push(locationItem(l));
        });
        const ccs = S.departments.find(d => /computer/i.test(d.departmentName));
        if (ccs) items.splice(1, 0, departmentItem(ccs));
        return items.length ? items : S.locations.slice(0, 4).map(locationItem);
    }

    screens.home = () => {
        const hour = new Date().getHours();
        const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
        const name = S.user ? `, ${esc(firstName(S.user.name))}` : '';
        screenEl.innerHTML = `
            <section class="hero">
                <div class="hero-top">
                    <div>
                        <p class="greet">${greet}${name}! 👋</p>
                        <h1>Where do you want to go?</h1>
                    </div>
                    <a class="avatar-sm" href="#/profile" aria-label="Profile">${S.user ? esc(initials(S.user.name)) : icon('user')}</a>
                </div>
                <a class="searchbox" href="#/search">${icon('search')}<span>Search classrooms, buildings, departments…</span></a>
            </section>
            <div class="page" style="padding-top:0">
                <section class="section">
                    <div class="section-head"><h2 class="section-title">Quick Actions</h2></div>
                    <div class="quick-grid">
                        <a class="quick map" href="#/map">${icon('map')}Map</a>
                        <a class="quick search" href="#/search">${icon('search')}Search</a>
                        <a class="quick directions" href="#/directions">${icon('nav')}Directions</a>
                        <a class="quick report" href="#/report">${icon('flag')}Report</a>
                    </div>
                </section>
                <section class="section">
                    <div class="section-head">
                        <h2 class="section-title">Popular Locations</h2>
                        <a class="link-btn" href="#/results?cat=all">See all</a>
                    </div>
                    <div class="list">${S.loaded ? popularItems().map(i => itemRow(i)).join('') : (S.loadFailed ? emptyState('info', 'No connection', "Locations couldn't be loaded.") : spinner)}</div>
                </section>
            </div>`;
    };

    // ---------- Map
    screens.map = ({ query }) => {
        // "Classrooms" highlights the buildings that have classrooms (rooms are inside buildings, not separate pins)
        const pills = [['ALL', 'All'], ['BUILDING', 'Buildings'], ['CLASSROOM', 'Classrooms'], ['DEPARTMENT', 'Offices'], ['FACILITY', 'Facilities']];
        screenEl.innerHTML = `
            <div class="map-host full" id="mapHost"></div>
            <div class="map-top">
                <a class="searchbox" href="#/search">${icon('search')}<span>Search campus locations…</span></a>
                <div class="pills scroll" role="tablist">
                    ${pills.map(([k, l]) => `<button class="pill ${S.mapCategory === k ? 'active' : ''}" type="button" data-cat="${k}">${l}</button>`).join('')}
                </div>
            </div>`;
        if (!mountMap($('#mapHost'))) {
            $('#mapHost').innerHTML = emptyState('map', 'Map unavailable', "The campus map couldn't be loaded.");
            return;
        }
        window.CampusMap.clearRoute();
        if (S.loaded) window.CampusMap.renderPins(S.locations, S.rooms, S.mapCategory);
        $$('[data-cat]').forEach(btn => btn.addEventListener('click', () => {
            S.mapCategory = btn.dataset.cat;
            $$('[data-cat]').forEach(b => b.classList.toggle('active', b === btn));
            window.CampusMap.renderPins(S.locations, S.rooms, S.mapCategory);
            hideSheet();
        }));

        const focus = S.locations.find(l => String(l.locationId) === query.get('focus'));
        if (focus) {
            const key = nodeKeyOf(focus);
            window.CampusMap.focusBuilding(key, 1);
            frameBuilding(key, 140);
            showSheet(locationItem(focus));
        } else {
            frameCampus();
        }
    };

    // ---------- Search
    const recentSearches = () => { try { return JSON.parse(localStorage.getItem('cp_recent') || '[]'); } catch { return []; } };
    function rememberSearch(q) {
        const list = [q, ...recentSearches().filter(x => x.toLowerCase() !== q.toLowerCase())].slice(0, 6);
        localStorage.setItem('cp_recent', JSON.stringify(list));
    }

    screens.search = () => {
        const recents = recentSearches();
        screenEl.innerHTML = `
            ${topbar('Search Location')}
            <div class="page">
                <form class="searchbox" id="searchForm" role="search">
                    ${icon('search')}
                    <input id="searchInput" type="search" enterkeyhint="search" placeholder="Search buildings, rooms, offices…" aria-label="Search" autocomplete="off">
                </form>
                <section class="section">
                    <div class="section-head"><h2 class="section-title">Browse Categories</h2></div>
                    <div class="pills">${CATEGORIES.map(c => `<a class="pill" href="#/results?cat=${c.key}">${c.label}</a>`).join('')}</div>
                </section>
                <section class="section">
                    <div class="section-head">
                        <h2 class="section-title">Recent Searches</h2>
                        ${recents.length ? '<button class="link-btn" type="button" id="clearRecents">Clear</button>' : ''}
                    </div>
                    <div class="list">
                        ${recents.length ? recents.map(q => `
                            <a class="list-item" href="#/results?q=${encodeURIComponent(q)}">
                                <span class="icon-box" style="background:#f3f4f6;color:#9ca3af">${icon('clock')}</span>
                                <span class="grow"><span class="title">${esc(q)}</span></span>
                                <span class="chev">${icon('chev')}</span>
                            </a>`).join('') : '<p class="muted">Your searches will show up here.</p>'}
                    </div>
                </section>
            </div>`;
        const input = $('#searchInput');
        setTimeout(() => input.focus(), 50);
        $('#searchForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const q = input.value.trim();
            if (q) go(`#/results?q=${encodeURIComponent(q)}`);
        });
        $('#clearRecents')?.addEventListener('click', () => { localStorage.removeItem('cp_recent'); screens.search(); });
    };

    // ---------- Search results
    function localMatch(q) {
        const k = q.toLowerCase();
        return allItems().filter(i => `${i.name} ${i.sub}`.toLowerCase().includes(k));
    }

    screens.results = async ({ query }, token) => {
        const q = (query.get('q') || '').trim();
        const cat = query.get('cat');
        const title = q ? `“${q}”` : cat === 'all' ? 'All Locations' : (CATEGORIES.find(c => c.key === cat)?.label || 'Results');
        screenEl.innerHTML = `${topbar('Search Results', '#/search')}<div class="page"><p class="muted" id="resultsMeta">${esc(title)}</p><div class="list" id="resultsList">${spinner}</div></div>`;

        let items = [];
        if (q) {
            rememberSearch(q);
            try {
                // The server also saves this search to the signed-in user's history
                const data = await api(`/locations/search?keyword=${encodeURIComponent(q)}`);
                if (data?.found) {
                    items = dedupe([
                        ...(data.locations || []).map(locationItem),
                        ...(data.buildings || []).map(buildingItem),
                        ...(data.departments || []).map(departmentItem),
                        ...(data.rooms || []).map(roomItem)
                    ]);
                }
            } catch {
                items = localMatch(q);   // offline: search what is already loaded
            }
        } else {
            if (!S.loaded) await loadData();
            items = cat === 'all' || !cat ? allItems() : allItems().filter(i => i.cat === cat);
        }
        if (token !== renderToken) return;

        $('#resultsMeta').innerHTML = `<strong>${esc(title)}</strong><br>${items.length} result${items.length === 1 ? '' : 's'} found`;
        $('#resultsList').innerHTML = items.length
            ? items.map(resultCard).join('')
            : emptyState('search', 'Location not found', 'Try another name or room number. If a place is missing, let us know.',
                '<a class="btn btn-outline" href="#/report">Report a missing location</a>');
    };

    // ---------- Location details
    screens.details = ({ parts }) => {
        const [kind, idText] = parts;
        const id = Number(idText);
        if (!S.loaded) {
            screenEl.innerHTML = `${topbar('Location Details')}${S.loadFailed ? emptyState('info', 'No connection', "Couldn't load this location.") : spinner}`;
            if (!S.loadFailed) loadData().then(() => currentRoute().name === 'details' && render());
            return;
        }

        let item, rows = [], description = '', roomsList = [], nodeKey, reportLoc;
        if (kind === 'location') {
            const l = S.locations.find(x => x.locationId === id);
            if (l) {
                item = locationItem(l);
                nodeKey = nodeKeyOf(l);
                reportLoc = l.locationId;
                description = l.description;
                rows.push(['Type', l.type || 'Location']);
                const b = S.buildings.find(x => x.location?.locationId === l.locationId);
                if (b) {
                    roomsList = S.rooms.filter(r => r.building?.buildingId === b.buildingId);
                    const floors = [...new Set(roomsList.map(r => r.floor).filter(Boolean))].sort((a, c) => a - c);
                    if (floors.length) rows.push(['Floors', floors.length === 1 ? floorLabel(floors[0]) : `${floorLabel(floors[0]).replace(' Floor', '')} – ${floorLabel(floors.at(-1))}`]);
                    rows.push(['Rooms', String(roomsList.length)]);
                    if (b.description) description = b.description;
                } else if (l.mapKey) {
                    // e.g. an office: name the building it is inside
                    const host = S.locations.find(x => x.mapKey === l.mapKey && catFromType(x.type) === 'building' && x.locationId !== l.locationId);
                    if (host) rows.push(['Inside', host.name]);
                }
            }
        } else if (kind === 'room') {
            const r = S.rooms.find(x => x.roomId === id);
            if (r) {
                item = roomItem(r);
                nodeKey = nodeKeyOf(r.building?.location);
                reportLoc = r.building?.location?.locationId;
                rows = [['Building', r.building?.buildingName || '—'], ['Floor', floorLabel(r.floor) || '—'], ['Room', r.roomNumber || '—']];
                if (r.department) rows.push(['Department', r.department.departmentName]);
            }
        } else if (kind === 'department') {
            const d = S.departments.find(x => x.departmentId === id);
            if (d) {
                item = departmentItem(d);
                roomsList = S.rooms.filter(r => r.department?.departmentId === d.departmentId);
                const first = roomsList[0];
                nodeKey = first ? nodeKeyOf(first.building?.location) : null;
                reportLoc = item.locationId;
                description = d.description;
                const buildings = [...new Set(roomsList.map(r => r.building?.buildingName).filter(Boolean))];
                if (buildings.length) rows.push(['Buildings', buildings.join(', ')]);
                rows.push(['Rooms', String(roomsList.length)]);
            }
        }

        if (!item) {
            screenEl.innerHTML = `${topbar('Location Details')}${emptyState('search', 'Location not found', 'It may have been removed.', '<a class="btn btn-outline" href="#/search">Search again</a>')}`;
            return;
        }

        const byFloor = {};
        roomsList.forEach(r => { (byFloor[r.floor] = byFloor[r.floor] || []).push(r); });
        const dir = directionsHref(item);

        screenEl.innerHTML = `
            ${topbar('Location Details')}
            <div class="page">
                <div class="detail-head">
                    <span class="icon-box">${icon(CAT_ICON[item.cat])}</span>
                    <div><h2>${esc(item.name)}</h2><span class="chip">${CAT_LABEL[item.cat]}</span></div>
                </div>
                ${nodeKey ? '<div class="map-host mini section" id="detailMap"></div>' : ''}
                <div class="card info-card section">
                    <h3>LOCATION INFORMATION</h3>
                    ${rows.map(([k, v]) => `<div class="info-row"><span>${esc(k)}</span><span>${esc(v)}</span></div>`).join('')}
                    ${description ? `<h3>DESCRIPTION</h3><p class="prose">${esc(description)}</p>` : ''}
                </div>
                <div class="btn-row section">
                    ${dir ? `<a class="btn btn-gold" href="${dir}">${icon('nav')} Get Directions</a>` : ''}
                    ${nodeKey && item.locationId ? `<a class="btn btn-outline" href="#/map?focus=${item.locationId}">${icon('map')} View on Map</a>` : ''}
                </div>
                ${Object.keys(byFloor).length ? `
                    <section class="section">
                        <div class="section-head"><h2 class="section-title">Rooms</h2></div>
                        ${Object.keys(byFloor).sort((a, b) => a - b).map(f => `
                            <p class="floor-title">${esc(floorLabel(f))}</p>
                            <div class="list">${byFloor[f].map(r => itemRow(roomItem(r))).join('')}</div>`).join('')}
                    </section>` : ''}
                ${reportLoc ? `<a class="center-link" href="#/report?loc=${reportLoc}">${icon('flag')} Report incorrect information</a>` : ''}
            </div>`;

        if (nodeKey && mountMap($('#detailMap'))) {
            window.CampusMap.clearRoute();
            window.CampusMap.focusBuilding(nodeKey, kind === 'room' ? Number(S.rooms.find(x => x.roomId === id)?.floor) || 1 : 1);
            frameBuilding(nodeKey, 90);
        }
    };

    // ---------- Directions
    const sortedLocations = () => [...S.locations].sort((a, b) => a.name.localeCompare(b.name));

    screens.directions = async ({ query }, token) => {
        if (!S.loaded) await loadData();
        if (token !== renderToken) return;
        const to = query.get('to') || '';
        const from = query.get('from') || localStorage.getItem('cp_from') || '';
        const options = (selected, placeholder) => `<option value="">${placeholder}</option>` +
            sortedLocations().map(l => `<option value="${l.locationId}" ${String(l.locationId) === String(selected) ? 'selected' : ''}>${esc(l.name)}</option>`).join('');

        screenEl.innerHTML = `
            ${topbar('Directions')}
            <div class="page">
                <div class="card route-card">
                    <div class="route-line"><span class="dot from"></span>
                        <label class="grow" style="flex:1"><small>FROM</small><select class="select" id="fromSel" aria-label="Starting point">${options(from, 'Choose starting point')}</select></label>
                    </div>
                    <button class="swap" type="button" id="swapBtn">${icon('swap')} Swap</button>
                    <div class="route-line"><span class="dot to"></span>
                        <label class="grow" style="flex:1"><small>TO</small><select class="select" id="toSel" aria-label="Destination">${options(to, 'Choose destination')}</select></label>
                    </div>
                </div>
                <div id="routeOut"></div>
            </div>`;

        const fromSel = $('#fromSel'), toSel = $('#toSel');
        const update = () => {
            const q = new URLSearchParams();
            if (fromSel.value) q.set('from', fromSel.value);
            if (toSel.value) q.set('to', toSel.value);
            history.replaceState(null, '', `#/directions?${q}`);
            if (S.stack.length) S.stack[S.stack.length - 1] = location.hash;
            showRoute(fromSel.value, toSel.value, token);
        };
        fromSel.addEventListener('change', () => { if (fromSel.value) localStorage.setItem('cp_from', fromSel.value); update(); });
        toSel.addEventListener('change', update);
        $('#swapBtn').addEventListener('click', () => { [fromSel.value, toSel.value] = [toSel.value, fromSel.value]; update(); });
        showRoute(fromSel.value, toSel.value, token);
    };

    async function showRoute(fromId, toId, token) {
        const out = $('#routeOut');
        if (!out) return;
        if (!fromId || !toId) {
            out.innerHTML = emptyState('nav', 'Where to?', 'Choose a starting point and a destination to see the walking route.');
            parkMap();
            return;
        }
        if (fromId === toId) {
            out.innerHTML = `<div class="form-error section">The starting point and destination are the same place.</div>`;
            parkMap();
            return;
        }
        out.innerHTML = spinner;
        let start = S.locations.find(l => String(l.locationId) === fromId);
        let dest = S.locations.find(l => String(l.locationId) === toId);
        try {
            // Also saves the trip to the signed-in user's history
            const data = await api(`/navigation/directions?startLocationId=${fromId}&destinationId=${toId}`);
            start = data.startLocation || start;
            dest = data.destinationLocation || dest;
        } catch (err) {
            if (err.status) {
                if (token === renderToken) out.innerHTML = `<div class="form-error section">${esc(describe(err))}</div>`;
                return;
            }
            // Server unreachable: the route can still be drawn from loaded data
        }
        if (token !== renderToken || !start || !dest) return;

        out.innerHTML = `
            <div class="map-host mini section" id="routeMap" style="height:280px"></div>
            <div class="stats section">
                <div class="card stat"><strong id="distOut">—</strong><span>Distance (approx.)</span></div>
                <div class="card stat"><strong id="timeOut">—</strong><span>Walk</span></div>
            </div>
            <section class="section">
                <div class="section-head"><h2 class="section-title">Walking Directions</h2></div>
                <ol class="steps card" id="stepsOut"></ol>
            </section>
            <div class="section"><a class="btn btn-gold" href="#/navigate">${icon('nav')} Start Navigation</a></div>`;

        let steps = [`Start at ${start.name}.`, `Walk to ${dest.name}.`, `Arrive at ${dest.name}.`];
        let points = [];
        if (mountMap($('#routeMap'))) {
            steps = window.CampusMap.drawRoute(start, dest);
            points = routePoints();
        }
        const meters = Math.round(pathLength(points) * METERS_PER_MAP_UNIT / 10) * 10;
        S.route = { start, dest, steps, points, meters };
        S.navStep = 0;
        $('#distOut').textContent = meters ? `${meters} m` : '—';
        $('#timeOut').textContent = meters ? `${Math.max(1, Math.round(meters / WALK_METERS_PER_MIN))} min` : '—';
        $('#stepsOut').innerHTML = steps.map((s, i) => `<li><span class="num">${i + 1}</span><span>${esc(s)}</span></li>`).join('');
        if (points.length) frameRoute();
    }

    // ---------- Live navigation (step by step)
    screens.navigate = () => {
        const r = S.route;
        if (!r) { go('#/directions', true); return; }
        const last = r.steps.length - 1;
        const i = Math.min(S.navStep, last);
        // where on the route this step happens
        const pi = Math.min(r.steps.pointIndex?.[i] ?? i, Math.max(r.points.length - 1, 0));
        const remainingPts = r.points.slice(pi);
        const metersLeft = Math.round(pathLength(remainingPts) * METERS_PER_MAP_UNIT / 10) * 10;
        const arrived = i === last;

        screenEl.innerHTML = `
            <div class="map-host nav" id="navMap"></div>
            <div class="nav-banner">
                ${icon(arrived ? 'check' : i === 0 ? 'pin' : /left/.test(r.steps[i]) ? 'left' : /right/.test(r.steps[i]) ? 'right' : 'up')}
                <div><strong>${esc(arrived ? 'You have arrived' : i === 0 ? 'Start here' : (/^Turn (left|right)/.exec(r.steps[i])?.[0] || 'Continue'))}</strong><span>${esc(r.steps[i])}</span></div>
            </div>
            <div class="nav-panel">
                <div class="meta">
                    <div><h3>${esc(r.dest.name)}</h3><p>Step ${i + 1} of ${r.steps.length}</p></div>
                    <div class="eta"><strong>${arrived ? '0 m' : metersLeft ? `${metersLeft} m` : '—'}</strong><p>${arrived ? 'Arrived' : `${Math.max(1, Math.round(metersLeft / WALK_METERS_PER_MIN))} min away`}</p></div>
                </div>
                <div class="btn-row">
                    <button class="btn btn-grey" type="button" id="endNav">End</button>
                    <button class="btn btn-gold" type="button" id="nextStep">${arrived ? 'Done' : 'Next step'}</button>
                </div>
            </div>`;

        if (mountMap($('#navMap'))) {
            if (!$('#routeLayer polyline')) window.CampusMap.drawRoute(r.start, r.dest);
            setNavMarker(r.points[pi]);
            frameRoute(Math.min(pi, Math.max(r.points.length - 2, 0)));
        }
        $('#endNav').addEventListener('click', () => { setNavMarker(null); S.navStep = 0; back('#/directions'); });
        $('#nextStep').addEventListener('click', () => {
            if (arrived) { setNavMarker(null); S.navStep = 0; toast(`You've arrived at ${r.dest.name}.`, 'success'); go('#/home'); return; }
            S.navStep = i + 1;
            screens.navigate();
        });
    };

    // ---------- Report incorrect information
    screens.report = async ({ query }, token) => {
        if (!S.user) {
            screenEl.innerHTML = `
                ${topbar('Report Incorrect Information')}
                <div class="page">${emptyState('flag', 'Sign in to send a report', 'Reports go to the CampusPath administrators, so we need to know who sent them.',
                    `<a class="btn btn-gold" href="#/login?next=${encodeURIComponent(location.hash)}">Sign In</a>`)}</div>`;
            return;
        }
        if (!S.loaded) await loadData();
        if (token !== renderToken) return;
        const pre = query.get('loc') || '';
        screenEl.innerHTML = `
            ${topbar('Report Incorrect Information')}
            <div class="page">
                <p class="muted">Help us keep campus information accurate.</p>
                <form id="reportForm" novalidate>
                    <div class="field"><label for="repLoc">Location</label>
                        <select class="select" id="repLoc" required>
                            <option value="">Select a location</option>
                            ${sortedLocations().map(l => `<option value="${l.locationId}" ${String(l.locationId) === pre ? 'selected' : ''}>${esc(l.name)}</option>`).join('')}
                        </select></div>
                    <div class="field"><label for="repType">Issue Type</label>
                        <select class="select" id="repType" required>
                            <option value="">Select issue type</option>
                            ${ISSUE_TYPES.map(t => `<option>${esc(t)}</option>`).join('')}
                        </select></div>
                    <div class="field"><label for="repText">Description</label>
                        <textarea class="textarea" id="repText" maxlength="255" placeholder="What is wrong or missing? e.g. Room 203 moved to the 3rd floor." required></textarea></div>
                    <div id="repError" class="form-error" hidden></div>
                    <button class="btn btn-gold" type="submit" id="repSubmit">Submit Report</button>
                </form>
            </div>`;
        $('#reportForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const errBox = $('#repError');
            const loc = $('#repLoc').value, type = $('#repType').value, text = $('#repText').value.trim();
            const missing = !loc ? 'Please choose a location.' : !type ? 'Please choose an issue type.' : !text ? 'Please describe the issue.' : '';
            if (missing) { errBox.textContent = missing; errBox.hidden = false; return; }
            errBox.hidden = true;
            const btn = $('#repSubmit');
            btn.disabled = true;
            try {
                await api('/reports', { method: 'POST', body: JSON.stringify({ locationId: Number(loc), issueType: type, message: text }) });
                go('#/submitted', true);
            } catch (err) {
                errBox.textContent = `Report not sent: ${describe(err)}`;
                errBox.hidden = false;
            } finally {
                btn.disabled = false;
            }
        });
    };

    screens.submitted = () => {
        screenEl.innerHTML = `
            <div class="success">
                <div class="check">${icon('check')}</div>
                <h1>Report Submitted</h1>
                <p>Thank you! Your report has been submitted and will be reviewed by the administrator.</p>
                <div class="btn-row" style="width:100%;max-width:340px">
                    <a class="btn btn-gold" href="#/home">Back to Home</a>
                    <a class="btn btn-outline" href="#/my-reports">View My Reports</a>
                </div>
            </div>`;
    };

    // ---------- Profile
    screens.profile = () => {
        const u = S.user;
        screenEl.innerHTML = `
            <div class="page">
                <h1 style="font-size:22px;margin:4px 0 16px">My Profile</h1>
                <div class="profile-card">
                    <div class="avatar">${u ? esc(initials(u.name)) : icon('user')}</div>
                    <div>
                        <h2>${u ? esc(u.name) : 'Visitor'}</h2>
                        <span class="chip">${u ? esc((u.role || 'Student').charAt(0) + (u.role || 'student').slice(1).toLowerCase()) : 'Not signed in'}</span>
                    </div>
                </div>
                ${u ? '' : '<div class="section"><a class="btn btn-gold" href="#/login?next=%23%2Fprofile">Sign In</a></div>'}
                <div class="list section">
                    ${u ? `
                        <a class="list-item" href="#/history"><span class="icon-box">${icon('clock')}</span><span class="grow"><span class="title">Recent Locations</span><span class="sub" id="histCount">Your past directions</span></span><span class="chev">${icon('chev')}</span></a>
                        <a class="list-item" href="#/my-reports"><span class="icon-box">${icon('flag')}</span><span class="grow"><span class="title">Report History</span><span class="sub" id="repCount">Reports you sent</span></span><span class="chev">${icon('chev')}</span></a>
                        ${isAdmin() ? `<a class="list-item" href="#/admin"><span class="icon-box cat-office">${icon('grid')}</span><span class="grow"><span class="title">Admin Dashboard</span><span class="sub">Manage locations and reports</span></span><span class="chev">${icon('chev')}</span></a>` : ''}
                    ` : ''}
                    <button class="list-item" type="button" id="aboutBtn"><span class="icon-box">${icon('info')}</span><span class="grow"><span class="title">About CampusPath</span><span class="sub">Version 1.0.0 • CSIT321</span></span><span class="chev">${icon('chev')}</span></button>
                </div>
                ${u ? `<div class="section"><button class="btn logout" type="button" id="logoutBtn">${icon('logout')} Log Out</button></div>` : ''}
            </div>`;
        $('#aboutBtn').addEventListener('click', () => toast('CampusPath — CIT-U campus navigation by Montemayor & Reyna (CSIT321).'));
        $('#logoutBtn')?.addEventListener('click', async () => {
            try { await api('/auth/logout', { method: 'POST' }); } catch { /* signing out locally is still right */ }
            S.user = null;
            toast('Signed out.');
            render();
        });
        if (u) {
            api(`/navigation/history/${u.userId}`).then(list => { const el = $('#histCount'); if (el) el.textContent = `${list.length} trip${list.length === 1 ? '' : 's'}`; }).catch(() => {});
            api(`/reports/user/${u.userId}`).then(list => { const el = $('#repCount'); if (el) el.textContent = `${list.length} report${list.length === 1 ? '' : 's'} submitted`; }).catch(() => {});
        }
    };

    screens.history = async (_, token) => {
        if (!S.user) { go('#/login?next=%23%2Fhistory', true); return; }
        screenEl.innerHTML = `${topbar('Recent Locations', '#/profile')}<div class="page"><div class="list" id="histList">${spinner}</div></div>`;
        try {
            const list = await api(`/navigation/history/${S.user.userId}`);
            if (token !== renderToken) return;
            $('#histList').innerHTML = list.length ? list.map(h => `
                <a class="list-item" href="#/directions?from=${h.location?.locationId}&to=${h.destination?.locationId}">
                    <span class="icon-box cat-facility">${icon('nav')}</span>
                    <span class="grow"><span class="title">${esc(h.destination?.name || 'Destination')}</span>
                    <span class="sub">From ${esc(h.location?.name || '—')} • ${esc(formatDate(h.requestDate))}</span></span>
                    <span class="chev">${icon('chev')}</span>
                </a>`).join('') : emptyState('clock', 'No trips yet', 'Directions you look up will appear here.', '<a class="btn btn-gold" href="#/directions">Get Directions</a>');
        } catch (err) {
            if (token === renderToken) $('#histList').innerHTML = `<div class="form-error">${esc(describe(err))}</div>`;
        }
    };

    screens['my-reports'] = async (_, token) => {
        if (!S.user) { go('#/login?next=%23%2Fmy-reports', true); return; }
        screenEl.innerHTML = `${topbar('Report History', '#/profile')}<div class="page"><div class="list" id="myReps">${spinner}</div></div>`;
        try {
            const list = await api(`/reports/user/${S.user.userId}`);
            if (token !== renderToken) return;
            $('#myReps').innerHTML = list.length ? list.map(r => {
                const p = parseReport(r);
                return `<div class="card report-card"><div class="report-top"><strong>${esc(p.issue)}</strong>${statusChip(r.status)}</div>
                    <span class="sub">${esc(r.location?.name || '')} • ${esc(formatDate(r.reportDate))}</span><p class="prose" style="padding:8px 0 0">${esc(p.text)}</p></div>`;
            }).join('') : emptyState('flag', 'No reports yet', 'Spotted something wrong on the map? Tell us.', '<a class="btn btn-gold" href="#/report">Report an Issue</a>');
        } catch (err) {
            if (token === renderToken) $('#myReps').innerHTML = `<div class="form-error">${esc(describe(err))}</div>`;
        }
    };

    // ---------- Sign in
    screens.login = ({ query }) => {
        const next = query.get('next') || '';
        screenEl.innerHTML = `
            <div class="login-hero">
                <div class="brand-mark">${icon('map')}</div>
                <h1>CampusPath</h1>
                <p>CIT-U Campus Navigation</p>
            </div>
            <div class="login-card">
                <h2>Sign In</h2>
                <p>Use your CampusPath account. Administrators sign in here too.</p>
                <form id="loginForm" novalidate>
                    <div class="field"><label for="email">Email</label><input class="input" id="email" type="email" autocomplete="username" inputmode="email" placeholder="name@cit.edu" required></div>
                    <div class="field"><label for="password">Password</label><input class="input" id="password" type="password" autocomplete="current-password" placeholder="Enter your password" required></div>
                    <div id="loginError" class="form-error" hidden></div>
                    <button class="btn btn-gold" type="submit" id="loginBtn">Login</button>
                </form>
                <a class="center-link" href="#/home">← Continue as visitor</a>
            </div>`;
        $('#loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const err = $('#loginError');
            const email = $('#email').value.trim(), password = $('#password').value;
            if (!email || !password) { err.textContent = 'Enter your email and password.'; err.hidden = false; return; }
            const btn = $('#loginBtn');
            btn.disabled = true;
            try {
                const me = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
                S.user = me;
                toast(`Welcome, ${firstName(me.name)}!`, 'success');
                go(next || (isAdmin() ? '#/admin' : '#/home'), true);
            } catch (ex) {
                err.textContent = ex.status === 401 ? 'Wrong email or password.' : describe(ex);
                err.hidden = false;
            } finally {
                btn.disabled = false;
            }
        });
    };

    // ---------- Admin
    function requireAdmin() {
        if (!S.user) { go(`#/login?next=${encodeURIComponent(location.hash)}`, true); return false; }
        if (!isAdmin()) { toast('Only administrators can open that page.', 'error'); go('#/home', true); return false; }
        return true;
    }

    screens.admin = async (_, token) => {
        if (!requireAdmin()) return;
        screenEl.innerHTML = `
            <div class="admin-head">
                <div><h1>Admin Dashboard</h1><p>CIT-U CampusPath</p></div>
                <a class="small-btn" href="#/home">Student App</a>
            </div>
            <div class="page" style="padding-top:18px" id="adminBody">${spinner}</div>`;
        let summary = { pending: 0 };
        try {
            [summary] = await Promise.all([api('/reports/summary'), loadData()]);
        } catch (err) {
            if (token === renderToken) toast(describe(err), 'error');
        }
        if (token !== renderToken) return;
        const pending = summary.pending || 0;
        $('#adminBody').innerHTML = `
            <div class="stat-grid">
                <a class="stat-tile t1" href="#/admin/locations"><strong>${S.locations.length}</strong><span>Total Locations</span></a>
                <a class="stat-tile t2" href="#/admin/buildings"><strong>${S.buildings.length}</strong><span>Buildings</span></a>
                <a class="stat-tile t3" href="#/admin/rooms"><strong>${S.rooms.length}</strong><span>Rooms</span></a>
                <a class="stat-tile t4" href="#/admin/reports?status=PENDING"><strong>${pending}</strong><span>Pending Reports</span></a>
            </div>
            <section class="section">
                <div class="section-head"><h2 class="section-title">Quick Actions</h2></div>
                <div class="list">
                    <a class="list-item" href="#/admin/locations"><span class="icon-box cat-building">${icon('grid')}</span><span class="grow"><span class="title">Manage Locations</span><span class="sub">Add, edit, or remove campus locations</span></span><span class="chev">${icon('chev')}</span></a>
                    <a class="list-item" href="#/admin/buildings"><span class="icon-box cat-office">${icon('building')}</span><span class="grow"><span class="title">Buildings</span><span class="sub">Building names, descriptions and map links</span></span><span class="chev">${icon('chev')}</span></a>
                    <a class="list-item" href="#/admin/rooms"><span class="icon-box cat-classroom">${icon('door')}</span><span class="grow"><span class="title">Floors &amp; Rooms</span><span class="sub">Classrooms, labs and offices on each floor</span></span><span class="chev">${icon('chev')}</span></a>
                    <a class="list-item" href="#/admin/reports"><span class="icon-box cat-department badge-dot">${icon('flag')}${pending ? `<b>${pending}</b>` : ''}</span><span class="grow"><span class="title">Reports</span><span class="sub">${pending} pending report${pending === 1 ? '' : 's'} to review</span></span><span class="chev">${icon('chev')}</span></a>
                </div>
            </section>`;
    };

    screens['admin-locations'] = async ({ query }, token) => {
        if (!requireAdmin()) return;
        await loadData();
        if (token !== renderToken) return;
        screenEl.innerHTML = `
            ${topbar('Manage Locations', '#/admin')}
            <div class="page" style="padding-bottom:90px">
                <div class="searchbox">${icon('search')}<input id="locFilter" type="search" placeholder="Filter locations" aria-label="Filter locations" value="${esc(query.get('q') || '')}"></div>
                <div class="list section" id="adminLocList"></div>
            </div>
            <div class="fab-bar"><a class="btn btn-gold" href="#/admin/location/new">${icon('plus')} Add Location</a></div>`;
        const draw = () => {
            const k = $('#locFilter').value.trim().toLowerCase();
            const list = sortedLocations().filter(l => !k || `${l.name} ${l.type} ${l.description}`.toLowerCase().includes(k));
            $('#adminLocList').innerHTML = list.length ? list.map(l => itemRow(locationItem(l), `#/admin/location/${l.locationId}`)).join('') : emptyState('search', 'No matches', 'Try another name.');
        };
        $('#locFilter').addEventListener('input', draw);
        draw();
    };

    screens['admin-location'] = async ({ parts }, token) => {
        if (!requireAdmin()) return;
        if (!S.loaded) await loadData();
        if (token !== renderToken) return;
        const isNew = parts[0] === 'new';
        const loc = isNew ? null : S.locations.find(l => String(l.locationId) === parts[0]);
        if (!isNew && !loc) {
            screenEl.innerHTML = `${topbar('Edit Location', '#/admin/locations')}${emptyState('search', 'Location not found', 'It may have been deleted.')}`;
            return;
        }
        const types = ['Building', 'Classroom', 'Department', 'Office', 'Facility'];
        const currentType = loc?.type && !types.includes(loc.type) ? [loc.type, ...types] : types;
        screenEl.innerHTML = `
            ${topbar(isNew ? 'Add Location' : 'Edit Location', '#/admin/locations')}
            <div class="page">
                <form id="locForm" novalidate>
                    <div class="field"><label for="locType">Category</label>
                        <select class="select" id="locType" required>
                            <option value="">Select category</option>
                            ${currentType.map(t => `<option ${loc?.type === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}
                        </select></div>
                    <div class="field"><label for="locName">Location Name</label><input class="input" id="locName" maxlength="255" value="${esc(loc?.name || '')}" placeholder="e.g. NGE BLDG" required></div>
                    <div class="field"><label for="locMap">Building on the map</label>
                        <select class="select" id="locMap">
                            <option value="">Not on the map</option>
                            ${mapBuildings().map(([k, label]) => `<option value="${k}" ${loc?.mapKey === k ? 'selected' : ''}>${esc(label)}</option>`).join('')}
                        </select></div>
                    <div class="field"><label for="locDesc">Description</label><textarea class="textarea" id="locDesc" maxlength="255" placeholder="What is here, which building or floor…">${esc(loc?.description || '')}</textarea></div>
                    <div id="locError" class="form-error" hidden></div>
                    <div class="btn-row">
                        <button class="btn btn-gold" type="submit" id="locSave">${isNew ? 'Save Location' : 'Save Changes'}</button>
                        <a class="btn btn-grey" href="#/admin/locations">Cancel</a>
                        ${isNew ? '' : `<button class="btn btn-danger" type="button" id="locDelete">${icon('trash')} Delete Location</button>`}
                    </div>
                </form>
            </div>`;
        const errBox = $('#locError');
        $('#locForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = { type: $('#locType').value, name: $('#locName').value.trim(), description: $('#locDesc').value.trim(), mapKey: $('#locMap').value || null };
            if (!payload.type || !payload.name) { errBox.textContent = 'Category and name are required.'; errBox.hidden = false; return; }
            const btn = $('#locSave');
            btn.disabled = true;
            try {
                if (isNew) await api('/locations', { method: 'POST', body: JSON.stringify(payload) });
                else await api(`/locations/${loc.locationId}`, { method: 'PUT', body: JSON.stringify(payload) });
                await loadData();
                toast(isNew ? 'Location added.' : 'Changes saved.', 'success');
                go('#/admin/locations', true);
            } catch (err) {
                errBox.textContent = describe(err);
                errBox.hidden = false;
            } finally {
                btn.disabled = false;
            }
        });
        $('#locDelete')?.addEventListener('click', async () => {
            if (!confirm(`Delete "${loc.name}"? This cannot be undone.`)) return;
            try {
                await api(`/locations/${loc.locationId}`, { method: 'DELETE' });
                await loadData();
                toast('Location deleted.', 'success');
                go('#/admin/locations', true);
            } catch (err) {
                errBox.textContent = describe(err);
                errBox.hidden = false;
            }
        });
    };

    screens['admin-reports'] = async ({ query }, token) => {
        if (!requireAdmin()) return;
        const filter = (query.get('status') || 'ALL').toUpperCase();
        const tabs = [['ALL', 'All'], ['PENDING', 'Pending'], ['REVIEWING', 'Reviewing'], ['RESOLVED', 'Resolved']];
        screenEl.innerHTML = `
            ${topbar('Reports', '#/admin')}
            <div class="page">
                <div class="pills scroll">${tabs.map(([k, l]) => `<a class="pill ${filter === k ? 'active' : ''}" href="#/admin/reports?status=${k}" data-replace>${l}</a>`).join('')}</div>
                <div class="list section" id="repList">${spinner}</div>
            </div>`;
        $$('[data-replace]').forEach(a => a.addEventListener('click', (e) => { e.preventDefault(); go(a.getAttribute('href'), true); }));
        try {
            const all = await api('/reports');
            if (token !== renderToken) return;
            const list = filter === 'ALL' ? all : all.filter(r => (r.status || '').toUpperCase() === filter);
            $('#repList').innerHTML = list.length ? list.map(r => {
                const p = parseReport(r);
                return `<a class="card report-card" href="#/admin/report/${r.reportId}">
                    <div class="report-top"><strong>${esc(p.issue)}</strong>${statusChip(r.status)}</div>
                    <span class="sub">${esc(r.location?.name || '—')} • ${esc(r.user?.name || 'User')} • ${esc(formatDate(r.reportDate))}</span>
                    <span class="review-link">Review ${icon('chev')}</span></a>`;
            }).join('') : emptyState('check', 'Nothing here', filter === 'ALL' ? 'No reports have been sent yet.' : `No ${filter.toLowerCase()} reports.`);
        } catch (err) {
            if (token === renderToken) $('#repList').innerHTML = `<div class="form-error">${esc(describe(err))}</div>`;
        }
    };

    screens['admin-report'] = async ({ parts }, token) => {
        if (!requireAdmin()) return;
        screenEl.innerHTML = `${topbar('Report Details', '#/admin/reports')}<div class="page" id="repBody">${spinner}</div>`;
        let report;
        try {
            report = await api(`/reports/${encodeURIComponent(parts[0])}`);
        } catch (err) {
            if (token !== renderToken) return;
            $('#repBody').innerHTML = err.status === 404
                ? emptyState('search', 'Report not found', 'It may have been removed.')
                : `<div class="form-error">${esc(describe(err))}</div>`;
            return;
        }
        if (token !== renderToken) return;
        if (!report) { $('#repBody').innerHTML = emptyState('search', 'Report not found', 'It may have been removed.'); return; }
        const p = parseReport(report);
        let chosen = (report.status || 'PENDING').toUpperCase();
        $('#repBody').innerHTML = `
            <div class="card info-card">
                <h3>ISSUE</h3><p class="prose" style="font-weight:600;color:var(--ink)">${esc(p.issue)}</p>
                <h3>LOCATION</h3><p class="prose">${esc(report.location?.name || '—')}</p>
                <h3>SUBMITTED BY</h3><p class="prose">${esc(report.user?.name || 'User')} • ${esc(formatDate(report.reportDate))}</p>
                <h3>DESCRIPTION</h3><p class="prose">${esc(p.text)}</p>
                ${report.managedBy ? `<h3>HANDLED BY</h3><p class="prose">${esc(report.managedBy.name)}</p>` : ''}
            </div>
            <section class="section">
                <div class="section-head"><h2 class="section-title">Update Status</h2></div>
                <div class="segmented" role="radiogroup">
                    ${['PENDING', 'REVIEWING', 'RESOLVED'].map(s => `<button type="button" role="radio" data-status="${s}" class="${chosen === s ? 'active' : ''}" aria-checked="${chosen === s}">${s.charAt(0) + s.slice(1).toLowerCase()}</button>`).join('')}
                </div>
                <p class="muted" style="margin:10px 0 0">Currently: ${statusChip(report.status)}</p>
            </section>
            <div class="btn-row section">
                <button class="btn btn-maroon" type="button" id="saveStatus">Update Status</button>
                ${chosen !== 'RESOLVED' ? '<button class="btn btn-gold" type="button" id="resolveNow">Resolve Report</button>' : ''}
                ${report.location?.locationId ? `<a class="btn btn-outline" href="#/admin/location/${report.location.locationId}">Edit ${esc(report.location.name)}</a>` : ''}
            </div>`;
        $$('[data-status]').forEach(b => b.addEventListener('click', () => {
            chosen = b.dataset.status;
            $$('[data-status]').forEach(x => { x.classList.toggle('active', x === b); x.setAttribute('aria-checked', String(x === b)); });
        }));
        const save = async (status) => {
            try {
                await api(`/reports/${report.reportId}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
                toast(`Report marked ${status.toLowerCase()}.`, 'success');
                render();
            } catch (err) {
                toast(describe(err), 'error');
            }
        };
        $('#saveStatus').addEventListener('click', () => save(chosen));
        $('#resolveNow')?.addEventListener('click', () => save('RESOLVED'));
    };

    // ---------- Admin: buildings
    screens['admin-buildings'] = async ({ query }, token) => {
        if (!requireAdmin()) return;
        await loadData();
        if (token !== renderToken) return;
        screenEl.innerHTML = `
            ${topbar('Buildings', '#/admin')}
            <div class="page" style="padding-bottom:90px">
                <div class="searchbox">${icon('search')}<input id="bFilter" type="search" placeholder="Filter buildings" aria-label="Filter buildings" value="${esc(query.get('q') || '')}"></div>
                <div class="list section" id="bList"></div>
            </div>
            <div class="fab-bar"><a class="btn btn-gold" href="#/admin/building/new">${icon('plus')} Add Building</a></div>`;
        const draw = () => {
            const k = $('#bFilter').value.trim().toLowerCase();
            const list = [...S.buildings].sort((a, b) => a.buildingName.localeCompare(b.buildingName))
                .filter(b => !k || `${b.buildingName} ${b.description || ''}`.toLowerCase().includes(k));
            $('#bList').innerHTML = list.length ? list.map(b => {
                const roomCount = S.rooms.filter(r => r.building?.buildingId === b.buildingId).length;
                return `<a class="list-item" href="#/admin/building/${b.buildingId}">
                    ${iconBox('building')}
                    <span class="grow"><span class="title">${esc(b.buildingName)}</span>
                    <span class="sub">${roomCount} room${roomCount === 1 ? '' : 's'}${b.location ? ` • on map as ${esc(b.location.name)}` : ''}</span></span>
                    <span class="chev">${icon('chev')}</span></a>`;
            }).join('') : emptyState('search', 'No matches', 'Try another name.');
        };
        $('#bFilter').addEventListener('input', draw);
        draw();
    };

    screens['admin-building'] = async ({ parts }, token) => {
        if (!requireAdmin()) return;
        if (!S.loaded) await loadData();
        if (token !== renderToken) return;
        const isNew = parts[0] === 'new';
        const b = isNew ? null : S.buildings.find(x => String(x.buildingId) === parts[0]);
        if (!isNew && !b) {
            screenEl.innerHTML = `${topbar('Edit Building', '#/admin/buildings')}${emptyState('search', 'Building not found', 'It may have been deleted.')}`;
            return;
        }
        const rooms = b ? S.rooms.filter(r => r.building?.buildingId === b.buildingId) : [];
        screenEl.innerHTML = `
            ${topbar(isNew ? 'Add Building' : 'Edit Building', '#/admin/buildings')}
            <div class="page">
                <form id="bForm" novalidate>
                    <div class="field"><label for="bName">Building Name</label><input class="input" id="bName" maxlength="255" value="${esc(b?.buildingName || '')}" placeholder="e.g. NGE BLDG" required></div>
                    <div class="field"><label for="bDesc">Description</label><textarea class="textarea" id="bDesc" maxlength="255" placeholder="What is inside, how many floors…">${esc(b?.description || '')}</textarea></div>
                    <div class="field"><label for="bLoc">Location on the map</label>
                        <select class="select" id="bLoc">
                            <option value="">Not linked</option>
                            ${sortedLocations().map(l => `<option value="${l.locationId}" ${b?.location?.locationId === l.locationId ? 'selected' : ''}>${esc(l.name)}</option>`).join('')}
                        </select></div>
                    <div id="bError" class="form-error" hidden></div>
                    <div class="btn-row">
                        <button class="btn btn-gold" type="submit" id="bSave">${isNew ? 'Save Building' : 'Save Changes'}</button>
                        ${isNew ? '' : `<a class="btn btn-outline" href="#/admin/rooms?b=${b.buildingId}">${icon('door')} Rooms in this building (${rooms.length})</a>`}
                        <a class="btn btn-grey" href="#/admin/buildings">Cancel</a>
                        ${isNew ? '' : `<button class="btn btn-danger" type="button" id="bDelete">${icon('trash')} Delete Building</button>`}
                    </div>
                </form>
            </div>`;
        const errBox = $('#bError');
        $('#bForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const locId = $('#bLoc').value;
            const payload = {
                buildingName: $('#bName').value.trim(),
                description: $('#bDesc').value.trim(),
                location: locId ? { locationId: Number(locId) } : null
            };
            if (!payload.buildingName) { errBox.textContent = 'Building name is required.'; errBox.hidden = false; return; }
            const btn = $('#bSave');
            btn.disabled = true;
            try {
                if (isNew) await api('/locations/buildings', { method: 'POST', body: JSON.stringify(payload) });
                else await api(`/locations/buildings/${b.buildingId}`, { method: 'PUT', body: JSON.stringify(payload) });
                await loadData();
                toast(isNew ? 'Building added.' : 'Changes saved.', 'success');
                go('#/admin/buildings', true);
            } catch (err) {
                errBox.textContent = describe(err);
                errBox.hidden = false;
            } finally {
                btn.disabled = false;
            }
        });
        $('#bDelete')?.addEventListener('click', async () => {
            if (!confirm(`Delete "${b.buildingName}"? This cannot be undone.`)) return;
            try {
                await api(`/locations/buildings/${b.buildingId}`, { method: 'DELETE' });
                await loadData();
                toast('Building deleted.', 'success');
                go('#/admin/buildings', true);
            } catch (err) {
                errBox.textContent = describe(err);
                errBox.hidden = false;
            }
        });
    };

    // ---------- Admin: floors & rooms
    screens['admin-rooms'] = async ({ query }, token) => {
        if (!requireAdmin()) return;
        await loadData();
        if (token !== renderToken) return;
        const buildingFilter = query.get('b') || '';
        screenEl.innerHTML = `
            ${topbar('Floors & Rooms', '#/admin')}
            <div class="page" style="padding-bottom:90px">
                <div class="field" style="margin-bottom:10px">
                    <select class="select" id="rBuilding" aria-label="Building">
                        <option value="">All buildings</option>
                        ${[...S.buildings].sort((a, b) => a.buildingName.localeCompare(b.buildingName)).map(b => `<option value="${b.buildingId}" ${String(b.buildingId) === buildingFilter ? 'selected' : ''}>${esc(b.buildingName)}</option>`).join('')}
                    </select>
                </div>
                <div class="searchbox">${icon('search')}<input id="rFilter" type="search" placeholder="Filter by room number or name" aria-label="Filter rooms"></div>
                <div class="section" id="rList"></div>
            </div>
            <div class="fab-bar"><a class="btn btn-gold" id="addRoomLink" href="#/admin/room/new${buildingFilter ? `?b=${buildingFilter}` : ''}">${icon('plus')} Add Room</a></div>`;
        const draw = () => {
            const bId = $('#rBuilding').value;
            const k = $('#rFilter').value.trim().toLowerCase();
            const list = S.rooms
                .filter(r => !bId || String(r.building?.buildingId) === bId)
                .filter(r => !k || `${r.roomNumber} ${r.roomName || ''}`.toLowerCase().includes(k))
                .sort((a, b) => (a.building?.buildingName || '').localeCompare(b.building?.buildingName || '') || (a.floor - b.floor) || String(a.roomNumber).localeCompare(String(b.roomNumber), undefined, { numeric: true }));
            const groups = {};
            list.forEach(r => {
                const key = `${r.building?.buildingName || 'No building'} — ${floorLabel(r.floor)}`;
                (groups[key] = groups[key] || []).push(r);
            });
            $('#rList').innerHTML = list.length ? Object.entries(groups).map(([title, rooms]) => `
                <p class="floor-title">${esc(title)}</p>
                <div class="list">${rooms.map(r => `
                    <a class="list-item" href="#/admin/room/${r.roomId}">
                        ${iconBox('classroom')}
                        <span class="grow"><span class="title">${esc(r.roomName || `Room ${r.roomNumber}`)}</span>
                        <span class="sub">Room ${esc(r.roomNumber)}${r.department ? ` • ${esc(r.department.departmentName)}` : ''}</span></span>
                        <span class="chev">${icon('chev')}</span></a>`).join('')}</div>`).join('')
                : emptyState('door', 'No rooms', 'No rooms match this filter.');
            $('#addRoomLink').setAttribute('href', `#/admin/room/new${bId ? `?b=${bId}` : ''}`);
        };
        $('#rBuilding').addEventListener('change', () => {
            history.replaceState(null, '', `#/admin/rooms${$('#rBuilding').value ? `?b=${$('#rBuilding').value}` : ''}`);
            if (S.stack.length) S.stack[S.stack.length - 1] = location.hash;
            draw();
        });
        $('#rFilter').addEventListener('input', draw);
        draw();
    };

    screens['admin-room'] = async ({ parts, query }, token) => {
        if (!requireAdmin()) return;
        if (!S.loaded) await loadData();
        if (token !== renderToken) return;
        const isNew = parts[0] === 'new';
        const room = isNew ? null : S.rooms.find(r => String(r.roomId) === parts[0]);
        if (!isNew && !room) {
            screenEl.innerHTML = `${topbar('Edit Room', '#/admin/rooms')}${emptyState('search', 'Room not found', 'It may have been deleted.')}`;
            return;
        }
        const bId = String(room?.building?.buildingId || query.get('b') || '');
        const floor = Number(room?.floor) || 1;
        const backTo = `#/admin/rooms${bId ? `?b=${bId}` : ''}`;
        screenEl.innerHTML = `
            ${topbar(isNew ? 'Add Room' : 'Edit Room', backTo)}
            <div class="page">
                <form id="rForm" novalidate>
                    <div class="field"><label for="rB">Building</label>
                        <select class="select" id="rB" required>
                            <option value="">Select building</option>
                            ${[...S.buildings].sort((a, b) => a.buildingName.localeCompare(b.buildingName)).map(b => `<option value="${b.buildingId}" ${String(b.buildingId) === bId ? 'selected' : ''}>${esc(b.buildingName)}</option>`).join('')}
                        </select></div>
                    <div class="field-row">
                        <div class="field"><label for="rNum">Room Number</label><input class="input" id="rNum" maxlength="255" value="${esc(room?.roomNumber || '')}" placeholder="e.g. 203" required></div>
                        <div class="field"><label for="rFloor">Floor</label>
                            <select class="select" id="rFloor">${Array.from({ length: 8 }, (_, i) => i + 1).map(f => `<option value="${f}" ${f === floor ? 'selected' : ''}>${floorLabel(f)}</option>`).join('')}</select></div>
                    </div>
                    <div class="field"><label for="rName">Room Name</label><input class="input" id="rName" maxlength="255" value="${esc(room?.roomName || '')}" placeholder="e.g. NGE 203 or IT Lab 2"></div>
                    <div class="field"><label for="rDept">Department</label>
                        <select class="select" id="rDept">
                            <option value="">None</option>
                            ${S.departments.map(d => `<option value="${d.departmentId}" ${room?.department?.departmentId === d.departmentId ? 'selected' : ''}>${esc(d.departmentName)}</option>`).join('')}
                        </select></div>
                    <div id="rError" class="form-error" hidden></div>
                    <div class="btn-row">
                        <button class="btn btn-gold" type="submit" id="rSave">${isNew ? 'Save Room' : 'Save Changes'}</button>
                        <a class="btn btn-grey" href="${backTo}">Cancel</a>
                        ${isNew ? '' : `<button class="btn btn-danger" type="button" id="rDelete">${icon('trash')} Delete Room</button>`}
                    </div>
                </form>
            </div>`;
        const errBox = $('#rError');
        $('#rForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = {
                building: $('#rB').value ? { buildingId: Number($('#rB').value) } : null,
                department: $('#rDept').value ? { departmentId: Number($('#rDept').value) } : null,
                roomNumber: $('#rNum').value.trim(),
                roomName: $('#rName').value.trim(),
                floor: Number($('#rFloor').value)
            };
            const missing = !payload.building ? 'Choose the building this room is in.' : !payload.roomNumber ? 'Room number is required.' : '';
            if (missing) { errBox.textContent = missing; errBox.hidden = false; return; }
            const btn = $('#rSave');
            btn.disabled = true;
            try {
                if (isNew) await api('/locations/rooms', { method: 'POST', body: JSON.stringify(payload) });
                else await api(`/locations/rooms/${room.roomId}`, { method: 'PUT', body: JSON.stringify(payload) });
                await loadData();
                toast(isNew ? 'Room added.' : 'Changes saved.', 'success');
                go(`#/admin/rooms?b=${payload.building.buildingId}`, true);
            } catch (err) {
                errBox.textContent = describe(err);
                errBox.hidden = false;
            } finally {
                btn.disabled = false;
            }
        });
        $('#rDelete')?.addEventListener('click', async () => {
            if (!confirm(`Delete room ${room.roomNumber}? This cannot be undone.`)) return;
            try {
                await api(`/locations/rooms/${room.roomId}`, { method: 'DELETE' });
                await loadData();
                toast('Room deleted.', 'success');
                go(backTo, true);
            } catch (err) {
                errBox.textContent = describe(err);
                errBox.hidden = false;
            }
        });
    };

    // ================================================================== ROUTER
    const NO_TABBAR = new Set(['welcome', 'login', 'navigate', 'submitted', 'admin', 'admin-locations', 'admin-location',
        'admin-buildings', 'admin-building', 'admin-rooms', 'admin-room', 'admin-reports', 'admin-report']);
    const FULL_BLEED = new Set(['map', 'navigate', 'welcome', 'submitted']);
    const TAB_FOR = { home: 'home', map: 'map', search: 'search', results: 'search', profile: 'profile', history: 'profile', 'my-reports': 'profile' };
    let renderToken = 0;

    function currentRoute() {
        const raw = location.hash.replace(/^#\/?/, '');
        const [path, qs = ''] = raw.split('?');
        const segs = path.split('/').filter(Boolean);
        let name = segs[0] || 'home';
        let parts = segs.slice(1);
        if (name === 'admin' && segs[1]) { name = `admin-${segs[1]}`; parts = segs.slice(2); }
        return { name, parts, query: new URLSearchParams(qs) };
    }

    function render() {
        const route = currentRoute();
        const handler = screens[route.name] || screens.home;
        const token = ++renderToken;
        hideSheet();
        parkMap();
        if (route.name !== 'directions' && route.name !== 'navigate' && S.mapReady) {
            window.CampusMap.clearRoute();
            setNavMarker(null);
        }
        screenEl.className = '';
        if (NO_TABBAR.has(route.name)) screenEl.classList.add('no-tabbar');
        if (FULL_BLEED.has(route.name)) screenEl.classList.add('full-bleed');
        $('#tabbar').hidden = NO_TABBAR.has(route.name);
        $('#app').classList.toggle('tabbar-hidden', NO_TABBAR.has(route.name));
        $('#app').dataset.route = route.name;
        $$('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === TAB_FOR[route.name]));
        window.scrollTo(0, 0);
        screenEl.scrollTop = 0;
        screenEl.style.animation = 'none';
        if (!FULL_BLEED.has(route.name)) {
            void screenEl.offsetWidth;   // restart the fade-in for normal pages
            screenEl.style.animation = '';
        }
        Promise.resolve(handler(route, token)).catch(err => {
            console.error(err);
            if (token === renderToken) toast(describe(err), 'error');
        });
    }

    // Keep a simple stack of visited screens so in-app back buttons can use history.back()
    window.addEventListener('hashchange', () => {
        const h = location.hash;
        if (S.replacing) { S.stack[Math.max(S.stack.length - 1, 0)] = h; S.replacing = false; }
        else if (S.stack.length > 1 && S.stack[S.stack.length - 2] === h) S.stack.pop();
        else S.stack.push(h);
        render();
    });

    document.addEventListener('click', (e) => {
        const b = e.target.closest('[data-back]');
        if (b) { e.preventDefault(); back(b.dataset.back); }
    });

    $('#retryBtn').addEventListener('click', async () => { await loadData(); render(); });

    // Switching between phone and computer layouts: show the page again and fit the campus to the new layout
    desktopQuery.addEventListener('change', () => {
        parkMap();
        render();
        if (!frameCurrent) frameCampus();
    });

    // ================================================================== START
    async function start() {
        fillIcons();
        const minSplash = new Promise(r => setTimeout(r, 350));
        setupMap();
        await Promise.all([loadData(), restoreSession(), minSplash]);
        if (!location.hash || location.hash === '#') {
            // replaceState does not fire hashchange, so render() below runs once
            history.replaceState(null, '', localStorage.getItem('cp_onboarded') ? '#/home' : '#/welcome');
        }
        S.stack = [location.hash];
        render();
        if (isDesktop() && !frameCurrent) frameCampus();
        const splash = $('#splash');
        splash.classList.add('hide');
        setTimeout(() => splash.remove(), 400);
    }

    start();
})();
