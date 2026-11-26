/**
 * CampusPath 2.5D Isometric Campus Map Engine
 * Renders CIT-U buildings, floor plans (1F-3F), color-coded pins, and walking route polylines.
 */
window.CampusMap = (() => {
    const SVG_NS = 'http://www.w3.org/2000/svg';

    // 2.5D Isometric Building Definitions aligned to CIT-U Vicinity Map
    const BUILDINGS = [
        {
            id: 'gym',
            name: 'University Gymnasium',
            short: 'GYM',
            subtitle: 'Sports & Events',
            x: 365, y: 78, w: 110, h: 85, depth: 18,
            roof: '#f8fafc', wallFront: '#cbd5e1', wallSide: '#94a3b8',
            textColor: '#0f172a',
            floors: [1],
            anchor: { x: 420, y: 120 }
        },
        {
            id: 'elem',
            name: 'Elementary Building',
            short: 'ELEM BLDG',
            subtitle: 'Basic Education',
            x: 540, y: 105, w: 205, h: 48, depth: 16,
            roof: '#f8fafc', wallFront: '#cbd5e1', wallSide: '#94a3b8',
            textColor: '#0f172a',
            floors: [1, 2],
            anchor: { x: 642, y: 129 }
        },
        {
            id: 'sal',
            name: 'SAL Building & Link',
            short: 'SAL / LINK',
            subtitle: 'Academic Spine',
            x: 395, y: 195, w: 54, h: 255, depth: 18,
            roof: '#f8fafc', wallFront: '#cbd5e1', wallSide: '#94a3b8',
            textColor: '#0f172a',
            floors: [1, 2, 3],
            anchor: { x: 422, y: 320 }
        },
        {
            id: 'pe',
            name: 'P.E. Area',
            short: 'P.E AREA',
            subtitle: 'Open Court',
            x: 470, y: 245, w: 125, h: 70, depth: 10,
            roof: '#f1f5f9', wallFront: '#cbd5e1', wallSide: '#94a3b8',
            textColor: '#334155',
            floors: [1],
            anchor: { x: 532, y: 280 }
        },
        {
            id: 'allied',
            name: 'Allied Building',
            short: 'ALLIED BLDG',
            subtitle: 'Nursing & Allied Health',
            x: 270, y: 495, w: 60, h: 205, depth: 18,
            roof: '#f8fafc', wallFront: '#cbd5e1', wallSide: '#94a3b8',
            textColor: '#0f172a',
            floors: [1, 2, 3],
            anchor: { x: 300, y: 595 }
        },
        {
            id: 'gphyslab',
            name: 'G-PhysLab',
            short: 'G-PHYSLAB',
            subtitle: 'Physics Laboratory',
            x: 455, y: 430, w: 220, h: 34, depth: 14,
            roof: '#f8fafc', wallFront: '#cbd5e1', wallSide: '#94a3b8',
            textColor: '#0f172a',
            floors: [1],
            anchor: { x: 565, y: 447 }
        },
        {
            id: 'lrac',
            name: 'LRAC Building',
            short: 'LRAC',
            subtitle: 'Learning Resource Center',
            x: 445, y: 474, w: 235, h: 64, depth: 18,
            roof: '#f8fafc', wallFront: '#cbd5e1', wallSide: '#94a3b8',
            textColor: '#0f172a',
            floors: [1, 2, 3],
            anchor: { x: 562, y: 506 }
        },
        {
            id: 'rtl',
            name: 'RTL Building',
            short: 'RTL BLDG',
            subtitle: 'FAO • ETO • OAS • GDNC',
            x: 365, y: 565, w: 305, h: 145, depth: 24,
            roof: '#f8fafc', wallFront: '#800000', wallSide: '#5c0000',
            textColor: '#0f172a',
            floors: [1, 2, 3, 4],
            anchor: { x: 517, y: 635 }
        },
        {
            id: 'nge',
            name: 'NGE Building',
            short: 'NGE BLDG',
            subtitle: 'CCS • Dept. of IT',
            x: 595, y: 745, w: 110, h: 105, depth: 24,
            roof: '#991b1b', wallFront: '#7f1d1d', wallSide: '#5c0000',
            textColor: '#ffffff',
            floors: [1, 2, 3],
            anchor: { x: 650, y: 795 }
        },
        {
            id: 'gle',
            name: 'GLE Building',
            short: 'GLE BLDG',
            subtitle: 'Engineering & Labs',
            x: 775, y: 495, w: 72, h: 165, depth: 20,
            roof: '#f8fafc', wallFront: '#cbd5e1', wallSide: '#94a3b8',
            textColor: '#0f172a',
            floors: [1, 2, 3, 4],
            anchor: { x: 811, y: 575 }
        },
        {
            id: 'acad',
            name: 'ACAD Building',
            short: 'ACAD BLDG',
            subtitle: 'Academic Wing',
            x: 845, y: 375, w: 205, h: 58, depth: 20,
            roof: '#f8fafc', wallFront: '#cbd5e1', wallSide: '#94a3b8',
            textColor: '#0f172a',
            floors: [1, 2, 3, 4],
            anchor: { x: 947, y: 404 }
        }
    ];

    // Walkway Graph Nodes & Edges aligned to CIT-U Vicinity Map
    const GRAPH_NODES = {
        gate:     { x: 730, y: 815, label: 'CIT-U Main Entrance' },
        nge:      { x: 650, y: 795, label: 'NGE Building (CCS / IT)' },
        rtl:      { x: 517, y: 635, label: 'RTL Building (FAO / OAS / ETO)' },
        allied:   { x: 300, y: 595, label: 'Allied Building' },
        gle:      { x: 760, y: 560, label: 'GLE Building' },
        acad:     { x: 830, y: 404, label: 'ACAD Building' },
        lrac:     { x: 562, y: 506, label: 'LRAC Building' },
        gphyslab: { x: 565, y: 447, label: 'G-PhysLab' },
        sal:      { x: 422, y: 320, label: 'SAL / Link Building' },
        pe:       { x: 532, y: 280, label: 'P.E. Area' },
        elem:     { x: 642, y: 155, label: 'Elementary Building' },
        gym:      { x: 420, y: 120, label: 'University Gymnasium' }
    };

    const GRAPH_EDGES = {
        gate: ['nge', 'gle', 'rtl'],
        nge: ['gate', 'rtl', 'gle'],
        rtl: ['gate', 'nge', 'allied', 'lrac', 'gle'],
        allied: ['rtl', 'sal'],
        gle: ['gate', 'nge', 'rtl', 'acad', 'lrac'],
        acad: ['gle', 'elem'],
        lrac: ['rtl', 'gle', 'gphyslab', 'sal'],
        gphyslab: ['lrac', 'sal', 'pe'],
        sal: ['allied', 'lrac', 'gphyslab', 'pe', 'gym'],
        pe: ['sal', 'gphyslab', 'elem'],
        elem: ['acad', 'pe', 'gym'],
        gym: ['elem', 'sal']
    };

    const DEFAULT_PAN_X = 110;
    const DEFAULT_PAN_Y = -10;

    let state = {
        scale: 0.96,
        panX: DEFAULT_PAN_X,
        panY: DEFAULT_PAN_Y,
        isDragging: false,
        dragStartX: 0,
        dragStartY: 0,
        activeBuildingId: 'nge',
        activeFloor: 1,
        activePinKey: null,
        locations: [],
        rooms: [],
        onSelectItem: null
    };

    const svg = () => document.getElementById('campusSvg');
    const world = () => document.getElementById('mapWorld');

    function createEl(tag, attrs = {}) {
        const el = document.createElementNS(SVG_NS, tag);
        Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
        return el;
    }

    function applyTransform() {
        const w = world();
        if (w) {
            w.setAttribute('transform', `translate(${state.panX}, ${state.panY}) scale(${state.scale})`);
        }
    }

    function init(options = {}) {
        state.onSelectItem = options.onSelectItem || (() => {});
        renderBuildings();
        setupPanZoom();
        applyTransform();
    }

    function renderBuildings() {
        const layer = document.getElementById('buildingsLayer');
        if (!layer) return;
        layer.innerHTML = '';

        BUILDINGS.forEach(b => {
            const g = createEl('g', {
                class: 'building-group',
                'data-building-id': b.id
            });

            // 2.5D Shadow
            g.appendChild(createEl('rect', {
                x: b.x + 8, y: b.y + b.depth + 6,
                width: b.w, height: b.h, rx: 10,
                fill: 'rgba(15, 23, 42, 0.14)'
            }));

            // Front Extruded Wall (2.5D depth)
            g.appendChild(createEl('rect', {
                x: b.x, y: b.y + b.depth,
                width: b.w, height: b.h, rx: 10,
                fill: b.wallFront,
                stroke: 'rgba(15,23,42,0.18)',
                'stroke-width': 1.2
            }));

            // Roof Top Face
            const isSelected = state.activeBuildingId === b.id;
            g.appendChild(createEl('rect', {
                x: b.x, y: b.y,
                width: b.w, height: b.h, rx: 10,
                class: 'bldg-roof',
                fill: b.roof,
                stroke: isSelected ? '#F5B800' : 'rgba(255,255,255,0.6)',
                'stroke-width': isSelected ? 3.5 : 1.5
            }));

            // Building Short Name & Subtitle (rotate vertically for tall narrow buildings)
            const isVertical = b.h > b.w * 1.35;
            const cx = b.x + b.w / 2;
            const cy = b.y + b.h / 2;

            const title = createEl('text', {
                x: cx,
                y: isVertical ? cy : cy - 4,
                'text-anchor': 'middle',
                'dominant-baseline': isVertical ? 'central' : 'auto',
                transform: isVertical ? `rotate(-90 ${cx} ${cy})` : '',
                class: 'building-label',
                style: `fill:${b.textColor};`
            });
            title.textContent = b.short;
            g.appendChild(title);

            if (!isVertical) {
                const sub = createEl('text', {
                    x: cx,
                    y: cy + 13,
                    'text-anchor': 'middle',
                    class: 'building-sublabel',
                    style: `fill:${b.textColor}; opacity: 0.85;`
                });
                sub.textContent = b.subtitle;
                g.appendChild(sub);
            }

            // RTL Building Maroon Front Office Strip (GDNC/TEST, OAS, ETO, FAO)
            if (b.id === 'rtl') {
                g.appendChild(createEl('rect', {
                    x: b.x + 8, y: b.y + b.h - 24,
                    width: b.w - 16, height: 18, rx: 4,
                    fill: '#800000'
                }));
                const stripTxt = createEl('text', {
                    x: cx, y: b.y + b.h - 12,
                    'text-anchor': 'middle',
                    style: 'font-size:8.5px; font-weight:800; fill:#F5B800; letter-spacing:0.08em; pointer-events:none;'
                });
                stripTxt.textContent = 'GDNC/TEST  •  OAS  •  ETO  •  FAO';
                g.appendChild(stripTxt);
            }

            g.addEventListener('click', (e) => {
                e.stopPropagation();
                focusBuilding(b.id, 1);
                const matchedLoc = findMatchingLocation(b.name);
                const item = matchedLoc
                    ? { ...matchedLoc, _kind: 'LOCATION', _nodeKey: b.id }
                    : {
                        _kind: 'LOCATION',
                        _nodeKey: b.id,
                        name: b.name,
                        type: 'Building',
                        description: `${b.subtitle} — Multi-story academic building.`,
                        buildingId: b.id,
                        floor: 1
                    };
                state.onSelectItem(item);
            });

            layer.appendChild(g);
        });
    }

    function findMatchingLocation(query) {
        if (!query) return null;
        const q = query.toLowerCase();
        return state.locations.find(l => (l.name || '').toLowerCase().includes(q));
    }

    function inferNodeKey(nameOrDesc = '') {
        const text = nameOrDesc.toLowerCase();
        if (text.includes('nge') || text.includes('ccs') || text.includes('203') || text.includes('wildcat')) return 'nge';
        if (text.includes('rtl') || text.includes('fao') || text.includes('eto') || text.includes('oas') || text.includes('gdnc') || text.includes('registrar')) return 'rtl';
        if (text.includes('gle')) return 'gle';
        if (text.includes('acad')) return 'acad';
        if (text.includes('lrac') || text.includes('library') || text.includes('commons')) return 'lrac';
        if (text.includes('physlab')) return 'gphyslab';
        if (text.includes('sal') || text.includes('link')) return 'sal';
        if (text.includes('allied') || text.includes('nursing')) return 'allied';
        if (text.includes('elem')) return 'elem';
        if (text.includes('p.e') || text.includes('pe area')) return 'pe';
        if (text.includes('gym')) return 'gym';
        if (text.includes('gate') || text.includes('entrance')) return 'gate';
        return 'rtl';
    }

    function getPinColor(type = '') {
        const t = type.toLowerCase();
        if (t.includes('building')) return '#800000';
        if (t.includes('office') || t.includes('department')) return '#0284c7';
        if (t.includes('facility')) return '#059669';
        return '#d97706'; // Classroom
    }

    function renderPins(locations = [], rooms = [], activeCategory = 'ALL') {
        state.locations = locations;
        state.rooms = rooms;

        const layer = document.getElementById('pinsLayer');
        if (!layer) return;
        layer.innerHTML = '';

        // Group pins slightly so overlapping pins at the same building stay clickable
        const nodeCounts = {};

        locations.forEach((loc, idx) => {
            const typeLower = (loc.type || 'Building').toLowerCase();
            if (activeCategory !== 'ALL') {
                if (activeCategory === 'BUILDING' && !typeLower.includes('building')) return;
                if (activeCategory === 'CLASSROOM' && !typeLower.includes('classroom')) return;
                if (activeCategory === 'DEPARTMENT' && !typeLower.includes('office') && !typeLower.includes('department')) return;
                if (activeCategory === 'FACILITY' && !typeLower.includes('facility')) return;
            }

            const nodeKey = inferNodeKey(`${loc.name} ${loc.description}`);
            const bldg = BUILDINGS.find(b => b.id === nodeKey);
            const base = bldg ? { x: bldg.x + bldg.w / 2, y: bldg.y + 18 } : GRAPH_NODES[nodeKey];
            const count = nodeCounts[nodeKey] || 0;
            nodeCounts[nodeKey] = count + 1;

            const offsetX = (count % 3 - 1) * 26;
            const offsetY = Math.floor(count / 3) * -22;
            const px = base.x + offsetX;
            const py = base.y + offsetY;

            const pinKey = `loc-${loc.locationId || idx}`;
            const isActive = state.activePinKey === pinKey;
            const color = getPinColor(loc.type);

            const g = createEl('g', {
                class: 'map-pin',
                transform: `translate(${px}, ${py})`,
                filter: 'url(#pinShadow)'
            });

            if (isActive) {
                g.appendChild(createEl('circle', {
                    cx: 0, cy: 0, r: 16,
                    fill: '#F5B800',
                    class: 'pin-pulse'
                }));
            }

            // Pin circle badge
            const pinCircle = createEl('circle', {
                cx: 0, cy: 0, r: isActive ? 12 : 9.5,
                class: 'pin-circle',
                fill: color,
                stroke: isActive ? '#F5B800' : '#ffffff',
                'stroke-width': isActive ? 3 : 2
            });
            pinCircle.style.transition = 'r 0.15s ease';
            g.appendChild(pinCircle);

            const iconText = createEl('text', {
                x: 0, y: 3.5,
                'text-anchor': 'middle',
                style: 'font-size:9px; font-weight:800; fill:#fff; pointer-events:none;'
            });
            iconText.textContent = (loc.type || 'L')[0].toUpperCase();
            g.appendChild(iconText);

            // Tooltip label on active
            if (isActive) {
                const labelBg = createEl('rect', {
                    x: -68, y: -34, width: 136, height: 20, rx: 10,
                    fill: '#0f172a'
                });
                const labelTxt = createEl('text', {
                    x: 0, y: -20,
                    'text-anchor': 'middle',
                    style: 'font-size:10px; font-weight:700; fill:#F5B800; pointer-events:none;'
                });
                labelTxt.textContent = (loc.name || '').slice(0, 20);
                g.appendChild(labelBg);
                g.appendChild(labelTxt);
            }

            g.addEventListener('click', (e) => {
                e.stopPropagation();
                state.activePinKey = pinKey;
                focusBuilding(nodeKey, 1);
                renderPins(state.locations, state.rooms, activeCategory);
                state.onSelectItem({ ...loc, _kind: 'LOCATION', _nodeKey: nodeKey });
            });

            layer.appendChild(g);
        });
    }

    function renderFloorPlan(buildingId, floor) {
        const layer = document.getElementById('floorPlanLayer');
        if (!layer) return;
        layer.innerHTML = '';

        const b = BUILDINGS.find(item => item.id === buildingId);
        if (!b || !b.floors.includes(Number(floor))) return;

        // Filter rooms belonging to this building & floor
        const floorRooms = state.rooms.filter(r => {
            const bName = (r.building?.buildingName || '').toLowerCase();
            const matchesBldg = bName.includes(b.id) || bName.includes(b.short.toLowerCase());
            return matchesBldg && Number(r.floor) === Number(floor);
        });

        if (!floorRooms.length) return;

        // Draw crisp architectural room blocks inside the building roof footprint
        const pad = 10;
        const cols = Math.min(3, floorRooms.length);
        const rows = Math.ceil(floorRooms.length / cols);
        const cellW = (b.w - pad * (cols + 1)) / cols;
        const cellH = Math.min(32, (b.h - 32 - pad * rows) / rows);

        floorRooms.forEach((room, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const rx = b.x + pad + col * (cellW + pad);
            const ry = b.y + 26 + row * (cellH + pad);

            const rg = createEl('g', { style: 'cursor:pointer;' });
            rg.appendChild(createEl('rect', {
                x: rx, y: ry, width: cellW, height: cellH, rx: 5,
                fill: 'rgba(248, 250, 252, 0.94)',
                stroke: '#F5B800',
                'stroke-width': 1.5
            }));

            const rt = createEl('text', {
                x: rx + cellW / 2,
                y: ry + cellH / 2 + 3.5,
                'text-anchor': 'middle',
                style: 'font-size:9px; font-weight:800; fill:#800000; pointer-events:none;'
            });
            rt.textContent = room.roomNumber || room.roomName;
            rg.appendChild(rt);

            rg.addEventListener('click', (e) => {
                e.stopPropagation();
                state.onSelectItem({ ...room, _kind: 'ROOM', _nodeKey: buildingId });
            });
            layer.appendChild(rg);
        });
    }

    function focusBuilding(buildingId, floor = 1) {
        const targetId = buildingId || state.activeBuildingId || 'nge';
        const b = BUILDINGS.find(item => item.id === targetId);
        const validFloor = b && b.floors.includes(Number(floor)) ? Number(floor) : (b ? b.floors[0] : 1);

        state.activeBuildingId = targetId;
        state.activeFloor = validFloor;
        renderBuildings();
        renderFloorPlan(targetId, validFloor);

        if (b) {
            const switcher = document.getElementById('floorSwitcher');
            const label = document.getElementById('floorBuildingLabel');
            if (b.floors.length > 1) {
                switcher.classList.remove('hidden');
                label.textContent = b.short;
                document.querySelectorAll('.floor-btn').forEach(btn => {
                    const f = Number(btn.dataset.floor);
                    btn.classList.toggle('hidden', !b.floors.includes(f));
                    btn.classList.toggle('active', f === validFloor);
                });
            } else {
                switcher.classList.add('hidden');
            }
        }
    }

    function getActiveBuildingId() {
        return state.activeBuildingId;
    }

    function focusNode(nodeKey, pinKey = null, floor = 1) {
        if (pinKey) state.activePinKey = pinKey;
        focusBuilding(nodeKey, floor);
        const node = GRAPH_NODES[nodeKey];
        if (node) {
            const targetScale = Math.max(state.scale, 1.12);
            state.scale = targetScale;
            // Offset slightly right of center so floating left panels don't cover the focused building
            state.panX = 820 - node.x * targetScale;
            state.panY = 460 - node.y * targetScale;
            applyTransform();
        }
    }

    // Shortest-path BFS on campus walkway graph
    function findPathNodes(startKey, destKey) {
        if (startKey === destKey) return [startKey];
        const queue = [[startKey]];
        const visited = new Set([startKey]);
        while (queue.length) {
            const path = queue.shift();
            const curr = path[path.length - 1];
            const neighbors = GRAPH_EDGES[curr] || [];
            for (const next of neighbors) {
                if (next === destKey) return [...path, next];
                if (!visited.has(next)) {
                    visited.add(next);
                    queue.push([...path, next]);
                }
            }
        }
        return [startKey, destKey];
    }

    function drawRoute(startLoc, destLoc) {
        const layer = document.getElementById('routeLayer');
        if (!layer) return [];
        layer.innerHTML = '';

        const startKey = inferNodeKey(`${startLoc.name} ${startLoc.description}`);
        const destKey = inferNodeKey(`${destLoc.name} ${destLoc.description}`);
        const pathKeys = findPathNodes(startKey, destKey);
        const points = pathKeys.map(k => GRAPH_NODES[k]).filter(Boolean);

        if (points.length >= 2) {
            const ptsStr = points.map(p => `${p.x},${p.y}`).join(' ');

            // Base maroon path
            layer.appendChild(createEl('polyline', {
                points: ptsStr,
                fill: 'none',
                stroke: '#800000',
                'stroke-width': 7,
                'stroke-linecap': 'round',
                'stroke-linejoin': 'round',
                opacity: '0.88'
            }));

            // Animated Warm Gold route overlay
            layer.appendChild(createEl('polyline', {
                points: ptsStr,
                fill: 'none',
                stroke: '#F5B800',
                'stroke-width': 3.5,
                'stroke-linecap': 'round',
                'stroke-linejoin': 'round',
                class: 'route-polyline-animated'
            }));
        }

        // Origin & Destination markers
        const first = points[0];
        const last = points[points.length - 1];
        if (first) {
            layer.appendChild(createEl('circle', {
                cx: first.x, cy: first.y, r: 9,
                fill: '#800000', stroke: '#ffffff', 'stroke-width': 3
            }));
        }
        if (last) {
            layer.appendChild(createEl('circle', {
                cx: last.x, cy: last.y, r: 10,
                fill: '#F5B800', stroke: '#800000', 'stroke-width': 3
            }));
        }

        // Build turn-by-turn steps
        const steps = [];
        steps.push(`Start at ${startLoc.name}.`);
        for (let i = 1; i < points.length - 1; i++) {
            steps.push(`Walk along the campus pathway toward ${points[i].label}.`);
        }
        steps.push(`Arrive at ${destLoc.name}.`);

        // Fit view
        state.scale = 0.96;
        state.panX = DEFAULT_PAN_X;
        state.panY = DEFAULT_PAN_Y;
        applyTransform();

        return steps;
    }

    function clearRoute() {
        const layer = document.getElementById('routeLayer');
        if (layer) layer.innerHTML = '';
    }

    function setupPanZoom() {
        const viewport = document.getElementById('mapViewport');
        if (!viewport) return;

        viewport.addEventListener('pointerdown', (e) => {
            if (e.target.closest('.building-group, .map-pin')) return;
            state.isDragging = true;
            state.dragStartX = e.clientX - state.panX;
            state.dragStartY = e.clientY - state.panY;
        });

        window.addEventListener('pointermove', (e) => {
            if (!state.isDragging) return;
            state.panX = e.clientX - state.dragStartX;
            state.panY = e.clientY - state.dragStartY;
            applyTransform();
        });

        window.addEventListener('pointerup', () => {
            state.isDragging = false;
        });

        viewport.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY < 0 ? 0.1 : -0.1;
            state.scale = Math.min(2.2, Math.max(0.65, state.scale + delta));
            applyTransform();
        }, { passive: false });

        document.getElementById('zoomInBtn')?.addEventListener('click', () => {
            state.scale = Math.min(2.2, state.scale + 0.18);
            applyTransform();
        });
        document.getElementById('zoomOutBtn')?.addEventListener('click', () => {
            state.scale = Math.max(0.65, state.scale - 0.18);
            applyTransform();
        });
        document.getElementById('resetViewBtn')?.addEventListener('click', () => {
            state.scale = 0.96;
            state.panX = DEFAULT_PAN_X;
            state.panY = DEFAULT_PAN_Y;
            applyTransform();
        });
    }

    function clearActivePin(category) {
        state.activePinKey = null;
        renderPins(state.locations, state.rooms, category || 'ALL');
    }

    return {
        init,
        renderPins,
        focusBuilding,
        getActiveBuildingId,
        focusNode,
        drawRoute,
        clearRoute,
        clearActivePin,
        inferNodeKey
    };
})();
