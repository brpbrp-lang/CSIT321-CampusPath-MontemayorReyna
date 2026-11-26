/**
 * CampusPath 2.5D Isometric Campus Map Engine
 * Renders CIT-U buildings, floor plans (1F-3F), color-coded pins, and walking route polylines.
 */
window.CampusMap = (() => {
    const SVG_NS = 'http://www.w3.org/2000/svg';

    // ------------------------------------------------------------------
    // CIT-U campus layout, traced from the official Campus Directory sign
    // (straightened so north is up). Each building keeps its directory code (B1–B43).
    // `id` is the mapKey stored on Location rows in the database.
    // kind: 'building' (has rooms/floors) | 'facility' (court, open area) | 'context' (shown for orientation only)
    // ------------------------------------------------------------------
    const STYLE = {
        building: { roof: '#f8fafc', wallFront: '#cbd5e1', wallSide: '#94a3b8', textColor: '#0f172a' },
        facility: { roof: '#ecf7ef', wallFront: '#b9dcc5', wallSide: '#8fc3a2', textColor: '#166534' },
        context:  { roof: '#eef1f5', wallFront: '#d9dee6', wallSide: '#c3cad4', textColor: '#64748b' }
    };

    function bldg(id, code, short, name, x, y, w, h, opts = {}) {
        const kind = opts.kind || 'building';
        return {
            id, code, short, name,
            subtitle: opts.subtitle ?? `${code} • ${name}`,
            x, y, w, h,
            depth: opts.depth ?? (kind === 'building' ? 8 : 5),
            kind,
            floors: opts.floors || [1],
            ...STYLE[kind],
            ...(opts.style || {})
        };
    }

    const BUILDINGS = [
        // North edge (back gate side)
        bldg('maint', 'B40', 'MAINTENANCE', 'Maintenance Areas (B40, B41, B43)', 300, 48, 160, 40, { kind: 'context', subtitle: 'B40 • B41 • B43' }),
        bldg('annex', 'B39', 'ANNEX', 'Backgate Annex Rooms 101–116', 470, 92, 90, 22, { kind: 'context', subtitle: '' }),
        bldg('athletes', 'B29', 'ATHLETES', 'Athletes’ Quarters', 600, 56, 62, 46, { kind: 'context', subtitle: 'B29' }),
        bldg('backgate', 'B26', 'BACK GATE', 'Back Gate & Parking (B26–B28)', 690, 36, 36, 74, { kind: 'context' }),
        bldg('elem', 'B13', 'ELEM BLDG', 'Elementary Department Building', 470, 120, 420, 38, { floors: [1, 2, 3] }),
        bldg('elemoffice', 'B16', 'ELEM OFFICE', 'Elementary Guidance & Office (B15, B16)', 900, 122, 95, 36, { subtitle: 'B15 • B16' }),
        // West strip (along the river)
        bldg('gym', 'B11', 'GYM', 'School Gymnasium', 300, 100, 140, 148, { floors: [1, 2] }),
        bldg('hscanteen', 'B24', 'HS CANTEEN', 'High School Canteen', 446, 176, 40, 60, { kind: 'facility' }),
        bldg('pe', 'B25', 'P.E. AREA', 'P.E. Activity Area', 300, 262, 90, 40, { kind: 'facility' }),
        bldg('dressing', 'B21', 'PE ROOM', 'Physical Education Dressing Room', 420, 262, 50, 40, { kind: 'facility', subtitle: 'B21' }),
        bldg('mining', 'B10', 'MINING', 'Mining Engineering Building', 300, 312, 90, 55),
        bldg('mech', 'B8', 'MECHANICAL', 'Mechanical Engineering Building', 300, 377, 90, 120),
        bldg('sal', 'B9', 'SAL BLDG', 'Don Simplicio A. Lizares Sr. Building', 420, 312, 50, 260, { floors: [1, 2, 3] }),
        bldg('chem', 'B7', 'CHEMICAL', 'Chemical Engineering Building', 300, 507, 90, 80),
        bldg('power', 'B7a', 'POWER HOUSE', 'Electrical Power House', 300, 597, 90, 40, { kind: 'context', subtitle: 'B7a' }),
        bldg('lecture', 'B20', 'LECTURE', 'Lecture Rooms', 420, 585, 55, 55, { subtitle: 'B20' }),
        bldg('allied', 'B6', 'ALLIED BLDG', 'Allied Engineering Building', 300, 655, 100, 220, { floors: [1, 2, 3] }),
        bldg('satcanteen', 'B5', 'SATELLITE CANTEEN', 'Satellite School Canteen', 410, 886, 95, 22, { kind: 'facility', subtitle: '' }),
        // Centre: courts, pavilion and the main academic block
        bldg('busgarage', 'B36', 'BUS GARAGE', 'School Bus Garage', 515, 196, 85, 28, { kind: 'context', subtitle: '' }),
        bldg('elemcenter', 'B12', 'PUPILS CENTER', 'Elementary Pupils Activity Center', 612, 182, 85, 30, { kind: 'facility', subtitle: '' }),
        bldg('elemcanteen', 'B38', 'ELEM CANTEEN', 'Elementary Canteen', 790, 182, 70, 28, { kind: 'facility', subtitle: '' }),
        bldg('court', 'B19', 'COVERED COURT', 'Covered Court', 515, 236, 140, 70, { kind: 'facility' }),
        bldg('canteen', 'B18', 'CANTEEN', 'Main School Canteen', 740, 250, 110, 50),
        bldg('foodlab', 'B23', 'FOOD LAB', 'Food Innovation Center', 860, 215, 45, 85),
        bldg('pavilion', 'B42', 'PAVILION', 'Sports Pavilion', 552, 342, 96, 96, { kind: 'facility' }),
        bldg('gphyslab', 'B33', 'PHYSICS LABS', 'Physics Laboratories', 540, 585, 160, 28, { floors: [1, 2], subtitle: '' }),
        bldg('trooms', 'B4', 'T-ROOMS', 'T-Rooms', 540, 618, 280, 40),
        bldg('lrac', 'B3', 'LRAC', 'Learning Resource and Activity Center', 520, 665, 380, 72, { floors: [1, 2, 3] }),
        bldg('rtl', 'B2', 'RTL BLDG', 'Don Rodolfo T. Lizares Sr. Building', 520, 748, 380, 120, {
            floors: [1, 2, 3, 4], style: { wallFront: '#800020', wallSide: '#600018' }
        }),
        // East side and the front gate (N. Bacalso Avenue)
        bldg('acad', 'B17', 'ACAD BLDG', 'New Academic Building', 930, 290, 170, 60, { floors: [1, 2, 3, 4] }),
        bldg('gle', 'B34', 'GLE BLDG', 'Gregorio L. Escario Building', 950, 430, 75, 200, { floors: [1, 2, 3, 4] }),
        bldg('nge', 'B1', 'NGE BLDG', 'Dr. Nicolas G. Escario Sr. Building', 930, 780, 110, 95, {
            floors: [1, 2, 3], subtitle: 'B1 • CCS • Dept. of IT',
            style: { roof: '#991b1b', wallFront: '#7f1d1d', wallSide: '#5c0000', textColor: '#ffffff' }
        }),
        bldg('gate', 'B22', 'GATE', 'Main Gate (Front Gate Guard House)', 1050, 850, 34, 24, { kind: 'context', subtitle: '' })
    ];

    // ------------------------------------------------------------------
    // Covered walkways (the yellow paths on the sign). Routes follow these.
    // A node is a junction ("j…") or a building door; building doors use the building id.
    // ------------------------------------------------------------------
    const GRAPH_NODES = {
        // junctions
        jN2: { x: 490, y: 168, label: 'the north walkway' },
        jE4: { x: 915, y: 168, label: 'the north-east corner' },
        jB0: { x: 490, y: 258, label: 'the walkway beside the gym' },
        jB1: { x: 490, y: 320, label: 'the walkway beside SAL' },
        jB2: { x: 490, y: 450, label: 'the walkway beside SAL' },
        jB3: { x: 490, y: 578, label: 'the walkway beside SAL' },
        jB4: { x: 490, y: 645, label: 'the walkway beside the lecture rooms' },
        jB5: { x: 490, y: 742, label: 'the walkway beside LRAC' },
        jA3: { x: 405, y: 645, label: 'the engineering walkway' },
        jSA: { x: 405, y: 876, label: 'the south-west corner' },
        jSW: { x: 490, y: 876, label: 'the south walkway' },
        jSM: { x: 700, y: 876, label: 'the walkway behind RTL' },
        jSE: { x: 915, y: 876, label: 'the front walkway' },
        jQ1: { x: 700, y: 320, label: 'the quadrangle walkway' },
        jQ2: { x: 700, y: 450, label: 'the quadrangle walkway' },
        jM2: { x: 700, y: 578, label: 'the walkway by the physics labs' },
        jM1: { x: 700, y: 742, label: 'the walkway between LRAC and RTL' },
        jE1: { x: 915, y: 742, label: 'the east walkway' },
        jE2: { x: 915, y: 578, label: 'the east walkway' },
        jE3: { x: 915, y: 450, label: 'the east walkway' },
        // building doors
        gate: { x: 1065, y: 895 }, nge: { x: 985, y: 876 }, satcanteen: { x: 455, y: 876 },
        allied: { x: 405, y: 760 }, chem: { x: 405, y: 547 }, mech: { x: 405, y: 437 }, mining: { x: 405, y: 340 },
        pe: { x: 405, y: 282 }, gym: { x: 405, y: 258 },
        hscanteen: { x: 490, y: 206 }, dressing: { x: 490, y: 282 }, sal: { x: 490, y: 510 }, lecture: { x: 490, y: 612 },
        court: { x: 585, y: 320 }, canteen: { x: 795, y: 320 }, acad: { x: 915, y: 320 },
        pavilion: { x: 600, y: 450 }, gphyslab: { x: 620, y: 578 }, trooms: { x: 760, y: 578 },
        lrac: { x: 610, y: 742 }, rtl: { x: 790, y: 742 },
        elemcenter: { x: 655, y: 168 }, elem: { x: 700, y: 168 }, elemcanteen: { x: 825, y: 168 }, elemoffice: { x: 950, y: 168 },
        foodlab: { x: 915, y: 258 }, gle: { x: 915, y: 530 }
    };

    // Each line is one straight stretch of walkway, listed node by node
    const WALKWAYS = [
        ['jN2', 'elemcenter', 'elem', 'elemcanteen', 'jE4', 'elemoffice'],                    // north, below the Elementary bldg
        ['jN2', 'hscanteen', 'jB0', 'dressing', 'jB1', 'jB2', 'sal', 'jB3', 'lecture', 'jB4', 'jB5', 'jSW'], // beside SAL
        ['gym', 'pe', 'mining', 'mech', 'chem', 'jA3', 'allied', 'jSA'],                       // engineering row
        ['gym', 'jB0'], ['jA3', 'jB4'],
        ['jB1', 'court', 'jQ1', 'canteen', 'acad'],
        ['jB2', 'pavilion', 'jQ2', 'jE3'],
        ['jB3', 'gphyslab', 'jM2', 'trooms', 'jE2'],
        ['jB5', 'lrac', 'jM1', 'rtl', 'jE1'],
        ['elem', 'jQ1', 'jQ2', 'jM2'],                                                          // quadrangle
        ['jE4', 'foodlab', 'acad', 'jE3', 'gle', 'jE2', 'jE1', 'jSE'],                          // east
        ['jSA', 'satcanteen', 'jSW', 'jSM', 'jSE', 'nge', 'gate']                               // south / front
    ];

    const GRAPH_EDGES = {};
    WALKWAYS.forEach(line => line.forEach((key, i) => {
        if (i === 0) return;
        const a = line[i - 1];
        (GRAPH_EDGES[a] = GRAPH_EDGES[a] || []).push(key);
        (GRAPH_EDGES[key] = GRAPH_EDGES[key] || []).push(a);
    }));

    // Labels for building doors come from the building list
    BUILDINGS.forEach(b => {
        if (GRAPH_NODES[b.id] && !GRAPH_NODES[b.id].label) GRAPH_NODES[b.id].label = b.name;
    });

    const DEFAULT_PAN_X = 150;
    const DEFAULT_PAN_Y = 0;
    const DEFAULT_SCALE = 0.94;

    let state = {
        scale: DEFAULT_SCALE,
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
        renderWalkways();
        renderBuildings();
        setupPanZoom();
        applyTransform();
    }

    function renderWalkways() {
        const layer = document.getElementById('walkwayLayer');
        if (!layer) return;
        layer.innerHTML = '';
        WALKWAYS.forEach(line => {
            const pts = line.map(k => GRAPH_NODES[k]).filter(Boolean).map(p => `${p.x},${p.y}`).join(' ');
            layer.appendChild(createEl('polyline', {
                points: pts, fill: 'none', stroke: '#efe3a6', 'stroke-width': 9,
                'stroke-linecap': 'round', 'stroke-linejoin': 'round'
            }));
            layer.appendChild(createEl('polyline', {
                points: pts, fill: 'none', stroke: '#fbf3c9', 'stroke-width': 4,
                'stroke-linecap': 'round', 'stroke-linejoin': 'round'
            }));
        });
    }

    function renderBuildings() {
        const layer = document.getElementById('buildingsLayer');
        if (!layer) return;
        layer.innerHTML = '';

        // Draw from the back (top of the map) to the front so walls overlap naturally
        [...BUILDINGS].sort((a, b) => (a.y + a.h) - (b.y + b.h)).forEach(b => {
            const g = createEl('g', {
                class: `building-group kind-${b.kind}`,
                'data-building-id': b.id
            });
            const rx = b.id === 'pavilion' ? 30 : Math.min(8, b.w / 4, b.h / 4);

            g.appendChild(createEl('rect', {
                x: b.x + 4, y: b.y + b.depth + 4, width: b.w, height: b.h, rx,
                fill: 'rgba(15, 23, 42, 0.12)'
            }));
            g.appendChild(createEl('rect', {
                x: b.x, y: b.y + b.depth, width: b.w, height: b.h, rx,
                fill: b.wallFront, stroke: 'rgba(15,23,42,0.16)', 'stroke-width': 1
            }));
            const isSelected = state.activeBuildingId === b.id;
            g.appendChild(createEl('rect', {
                x: b.x, y: b.y, width: b.w, height: b.h, rx,
                class: 'bldg-roof', fill: b.roof,
                stroke: isSelected ? '#FEC412' : 'rgba(15,23,42,0.08)',
                'stroke-width': isSelected ? 3.5 : 1
            }));

            // Labels: rotate for tall narrow buildings, shrink for small ones
            const isVertical = b.h > b.w * 1.35;
            const cx = b.x + b.w / 2;
            const cy = b.y + b.h / 2;
            const span = isVertical ? b.h : b.w;
            const small = span < 80 || (isVertical ? b.w : b.h) < 30;
            const showSub = !isVertical && b.subtitle && b.h >= 34 && b.w >= 80;

            const title = createEl('text', {
                x: cx,
                y: isVertical || !showSub ? cy : cy - 4,
                'text-anchor': 'middle',
                'dominant-baseline': 'central',
                transform: isVertical ? `rotate(-90 ${cx} ${cy})` : '',
                class: 'building-label',
                style: `fill:${b.textColor}; font-size:${small ? 8 : (b.kind === 'context' ? 9.5 : 11.5)}px;`
            });
            title.textContent = b.short;
            g.appendChild(title);

            if (showSub) {
                const sub = createEl('text', {
                    x: cx, y: cy + 10, 'text-anchor': 'middle', 'dominant-baseline': 'central',
                    class: 'building-sublabel',
                    style: `fill:${b.textColor}; opacity: 0.8; font-size:${b.w < 130 ? 7.5 : 9}px;`
                });
                sub.textContent = b.subtitle.length > Math.floor(b.w / 5) ? b.code : b.subtitle;
                g.appendChild(sub);
            }

            // RTL front office strip (GDNC/TEST, OAS, ETO, FAO are on its ground floor)
            if (b.id === 'rtl') {
                g.appendChild(createEl('rect', {
                    x: b.x + 8, y: b.y + b.h - 22, width: b.w - 16, height: 16, rx: 4, fill: '#800020'
                }));
                const stripTxt = createEl('text', {
                    x: cx, y: b.y + b.h - 11, 'text-anchor': 'middle',
                    style: 'font-size:8px; font-weight:800; fill:#FEC412; letter-spacing:0.08em; pointer-events:none;'
                });
                stripTxt.textContent = 'GDNC/TEST  •  OAS  •  ETO  •  FAO';
                g.appendChild(stripTxt);
            }

            const tip = createEl('title');
            tip.textContent = `${b.code} — ${b.name}`;
            g.appendChild(tip);

            g.addEventListener('click', (e) => {
                e.stopPropagation();
                focusBuilding(b.id, 1);
                const matchedLoc = locationForBuilding(b);
                const item = matchedLoc
                    ? { ...matchedLoc, _kind: 'LOCATION', _nodeKey: b.id }
                    : {
                        _kind: 'LOCATION',
                        _nodeKey: b.id,
                        name: b.name,
                        type: b.kind === 'facility' ? 'Facility' : 'Building',
                        description: `${b.code} — ${b.name}`,
                        buildingId: b.id,
                        floor: 1
                    };
                state.onSelectItem(item);
            });

            layer.appendChild(g);
        });
    }

    // The database location linked to a map building (Location.mapKey), preferring the building itself
    function locationForBuilding(b) {
        const linked = state.locations.filter(l => l.mapKey === b.id);
        return linked.find(l => (l.type || '').toLowerCase() === 'building')
            || linked[0]
            || state.locations.find(l => (l.name || '').toLowerCase().includes(b.short.toLowerCase()));
    }

    // Which map building a location sits in: the saved mapKey, or a guess from its name for old data
    function nodeKeyOf(loc) {
        if (!loc) return 'rtl';
        return loc.mapKey || inferNodeKey(`${loc.name || ''} ${loc.description || ''}`);
    }

    const roomNodeKey = (room) => room?.building?.location?.mapKey
        || inferNodeKey(room?.building?.buildingName || '');

    // Floors come from the rooms in the database, plus the floors drawn for the building
    function floorsOf(b) {
        const fromRooms = state.rooms.filter(r => roomNodeKey(r) === b.id).map(r => Number(r.floor)).filter(Boolean);
        return [...new Set([...b.floors, ...fromRooms])].sort((x, y) => x - y);
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
        if (t.includes('building')) return '#800020';
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
                // Classrooms live inside buildings, so this shows the buildings that have rooms
                if (activeCategory === 'CLASSROOM' && !typeLower.includes('classroom')
                    && !(typeLower.includes('building') && state.rooms.some(r => roomNodeKey(r) === nodeKeyOf(loc)))) return;
                if (activeCategory === 'DEPARTMENT' && !typeLower.includes('office') && !typeLower.includes('department')) return;
                if (activeCategory === 'FACILITY' && !typeLower.includes('facility')) return;
            }

            const nodeKey = nodeKeyOf(loc);
            const bldg = BUILDINGS.find(b => b.id === nodeKey);
            // Sit pins on the top edge of the building so they do not cover its name
            const base = bldg ? { x: bldg.x + bldg.w / 2, y: bldg.y - 4 } : GRAPH_NODES[nodeKey];
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
                    fill: '#FEC412',
                    class: 'pin-pulse'
                }));
            }

            // Pin circle badge
            const pinCircle = createEl('circle', {
                cx: 0, cy: 0, r: isActive ? 12 : 9.5,
                class: 'pin-circle',
                fill: color,
                stroke: isActive ? '#FEC412' : '#ffffff',
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
                    style: 'font-size:10px; font-weight:700; fill:#FEC412; pointer-events:none;'
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
        if (!b || !floorsOf(b).includes(Number(floor))) return;

        // Rooms in this building (linked through the building's location) on this floor
        const floorRooms = state.rooms.filter(r => roomNodeKey(r) === b.id && Number(r.floor) === Number(floor));

        if (!floorRooms.length) return;

        // Draw crisp architectural room blocks inside the building roof footprint
        const pad = 6;
        const cols = Math.max(1, Math.min(floorRooms.length, 4, Math.floor((b.w - pad) / 38)));
        const rows = Math.ceil(floorRooms.length / cols);
        const cellW = (b.w - pad * (cols + 1)) / cols;
        const cellH = Math.max(10, Math.min(24, (b.h - 14 - pad * (rows + 1)) / rows));

        floorRooms.forEach((room, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const rx = b.x + pad + col * (cellW + pad);
            const ry = b.y + pad + row * (cellH + pad);

            const rg = createEl('g', { style: 'cursor:pointer;' });
            rg.appendChild(createEl('rect', {
                x: rx, y: ry, width: cellW, height: cellH, rx: 5,
                fill: 'rgba(248, 250, 252, 0.94)',
                stroke: '#FEC412',
                'stroke-width': 1.5
            }));

            const rt = createEl('text', {
                x: rx + cellW / 2,
                y: ry + cellH / 2 + 3.5,
                'text-anchor': 'middle',
                style: 'font-size:9px; font-weight:800; fill:#800020; pointer-events:none;'
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
        const floors = b ? floorsOf(b) : [1];
        const validFloor = floors.includes(Number(floor)) ? Number(floor) : floors[0];

        state.activeBuildingId = targetId;
        state.activeFloor = validFloor;
        renderBuildings();
        renderFloorPlan(targetId, validFloor);

        if (b) {
            const switcher = document.getElementById('floorSwitcher');
            const label = document.getElementById('floorBuildingLabel');
            if (switcher && floors.length > 1) {
                switcher.classList.remove('hidden');
                if (label) label.textContent = b.short;
                document.querySelectorAll('.floor-btn').forEach(btn => {
                    const f = Number(btn.dataset.floor);
                    btn.classList.toggle('hidden', !floors.includes(f));
                    btn.classList.toggle('active', f === validFloor);
                });
            } else if (switcher) {
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
        const b = BUILDINGS.find(item => item.id === nodeKey);
        const node = b ? { x: b.x + b.w / 2, y: b.y + b.h / 2 } : GRAPH_NODES[nodeKey];
        if (node) {
            const targetScale = Math.max(state.scale, 1.12);
            state.scale = targetScale;
            // Offset slightly right of center so floating left panels don't cover the focused building
            state.panX = 820 - node.x * targetScale;
            state.panY = 460 - node.y * targetScale;
            applyTransform();
        }
    }

    // Shortest walking route along the covered walkways (Dijkstra on real distances)
    function findPathNodes(startKey, destKey) {
        if (startKey === destKey) return [startKey];
        if (!GRAPH_NODES[startKey] || !GRAPH_NODES[destKey]) return [startKey, destKey].filter(k => GRAPH_NODES[k]);
        const dist = { [startKey]: 0 };
        const prev = {};
        const open = new Set([startKey]);
        const done = new Set();
        while (open.size) {
            let cur = null;
            open.forEach(k => { if (cur === null || dist[k] < dist[cur]) cur = k; });
            open.delete(cur);
            if (cur === destKey) break;
            done.add(cur);
            (GRAPH_EDGES[cur] || []).forEach(next => {
                if (done.has(next)) return;
                const a = GRAPH_NODES[cur], b = GRAPH_NODES[next];
                const d = dist[cur] + Math.hypot(a.x - b.x, a.y - b.y);
                if (dist[next] === undefined || d < dist[next]) {
                    dist[next] = d;
                    prev[next] = cur;
                    open.add(next);
                }
            });
        }
        if (dist[destKey] === undefined) return [startKey, destKey];
        const path = [destKey];
        while (path[0] !== startKey) path.unshift(prev[path[0]]);
        return path;
    }

    function compass(dx, dy) {
        const a = Math.atan2(-dy, dx) * 180 / Math.PI;   // screen y points down; north is up
        if (a >= 45 && a < 135) return 'north';
        if (a >= -45 && a < 45) return 'east';
        if (a >= -135 && a < -45) return 'south';
        return 'west';
    }

    // Turn-by-turn steps: only where the route actually changes direction.
    // steps.pointIndex[i] is the index in `points` where step i happens (used by the mobile navigation view).
    function buildSteps(keys, points, startLoc, destLoc) {
        const steps = [];
        const at = [];
        if (points.length >= 2) {
            steps.push(`Start at ${startLoc.name} and head ${compass(points[1].x - points[0].x, points[1].y - points[0].y)}.`);
        } else {
            steps.push(`Start at ${startLoc.name}.`);
        }
        at.push(0);
        for (let i = 1; i < points.length - 1; i++) {
            const ax = points[i].x - points[i - 1].x, ay = points[i].y - points[i - 1].y;
            const bx = points[i + 1].x - points[i].x, by = points[i + 1].y - points[i].y;
            const angle = Math.abs(Math.atan2(ax * by - ay * bx, ax * bx + ay * by)) * 180 / Math.PI;
            if (angle < 30) continue;
            const turn = (ax * by - ay * bx) > 0 ? 'right' : 'left';
            const label = GRAPH_NODES[keys[i]]?.label || 'the next walkway';
            steps.push(`Turn ${turn} at ${label}.`);
            at.push(i);
        }
        if (steps.length === 1 && points.length >= 2) {
            steps.push('Follow the covered walkway straight ahead.');
            at.push(0);
        }
        steps.push(`Arrive at ${destLoc.name}.`);
        at.push(Math.max(points.length - 1, 0));
        steps.pointIndex = at;
        return steps;
    }

    function drawRoute(startLoc, destLoc) {
        const layer = document.getElementById('routeLayer');
        if (!layer) return [];
        layer.innerHTML = '';

        const startKey = nodeKeyOf(startLoc);
        const destKey = nodeKeyOf(destLoc);
        const pathKeys = findPathNodes(startKey, destKey).filter(k => GRAPH_NODES[k]);
        const points = pathKeys.map(k => GRAPH_NODES[k]);

        if (points.length >= 2) {
            const ptsStr = points.map(p => `${p.x},${p.y}`).join(' ');

            // Base maroon path
            layer.appendChild(createEl('polyline', {
                points: ptsStr,
                fill: 'none',
                stroke: '#800020',
                'stroke-width': 7,
                'stroke-linecap': 'round',
                'stroke-linejoin': 'round',
                opacity: '0.88'
            }));

            // Animated Warm Gold route overlay
            layer.appendChild(createEl('polyline', {
                points: ptsStr,
                fill: 'none',
                stroke: '#FEC412',
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
                fill: '#800020', stroke: '#ffffff', 'stroke-width': 3
            }));
        }
        if (last) {
            layer.appendChild(createEl('circle', {
                cx: last.x, cy: last.y, r: 10,
                fill: '#FEC412', stroke: '#800020', 'stroke-width': 3
            }));
        }

        const steps = buildSteps(pathKeys, points, startLoc, destLoc);

        // Fit view
        state.scale = DEFAULT_SCALE;
        state.panX = DEFAULT_PAN_X;
        state.panY = DEFAULT_PAN_Y;
        applyTransform();

        return steps;
    }

    function clearRoute() {
        const layer = document.getElementById('routeLayer');
        if (layer) layer.innerHTML = '';
    }

    const MIN_SCALE = 0.2;
    const MAX_SCALE = 3;
    const clampScale = (s) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

    // Screen (client) pixels -> SVG user units, so a drag follows the finger/mouse exactly
    // no matter how the SVG is scaled to fit the screen.
    function toSvgPoint(clientX, clientY) {
        const el = svg();
        const ctm = el && el.getScreenCTM();
        if (!ctm) return { x: clientX, y: clientY };
        const pt = el.createSVGPoint();
        pt.x = clientX;
        pt.y = clientY;
        const p = pt.matrixTransform(ctm.inverse());
        return { x: p.x, y: p.y };
    }

    // Zoom while keeping the point (ux, uy) (in SVG units) fixed on screen
    function zoomAt(newScale, ux, uy) {
        const s = clampScale(newScale);
        const wx = (ux - state.panX) / state.scale;
        const wy = (uy - state.panY) / state.scale;
        state.scale = s;
        state.panX = ux - wx * s;
        state.panY = uy - wy * s;
        applyTransform();
    }

    function viewCenter() {
        const vb = svg()?.viewBox?.baseVal;
        return vb && vb.width ? { x: vb.x + vb.width / 2, y: vb.y + vb.height / 2 } : { x: 700, y: 475 };
    }

    function setupPanZoom() {
        const viewport = document.getElementById('mapViewport');
        if (!viewport) return;

        const pointers = new Map();   // active touches / mouse, for drag and two-finger pinch
        let pinch = null;

        const pinchInfo = () => {
            const [a, b] = [...pointers.values()];
            return {
                dist: Math.hypot(a.x - b.x, a.y - b.y),
                mid: toSvgPoint((a.x + b.x) / 2, (a.y + b.y) / 2)
            };
        };

        viewport.addEventListener('pointerdown', (e) => {
            if (e.target.closest('button')) return;
            pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
            if (pointers.size === 2) {
                state.isDragging = false;
                const info = pinchInfo();
                pinch = { startDist: info.dist || 1, startScale: state.scale };
                return;
            }
            if (e.target.closest('.building-group, .map-pin')) return;
            const p = toSvgPoint(e.clientX, e.clientY);
            state.isDragging = true;
            state.dragStartX = p.x - state.panX;
            state.dragStartY = p.y - state.panY;
        });

        window.addEventListener('pointermove', (e) => {
            if (!pointers.has(e.pointerId)) return;
            pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
            if (pinch && pointers.size === 2) {
                const info = pinchInfo();
                zoomAt(pinch.startScale * (info.dist / pinch.startDist), info.mid.x, info.mid.y);
                return;
            }
            if (!state.isDragging) return;
            const p = toSvgPoint(e.clientX, e.clientY);
            state.panX = p.x - state.dragStartX;
            state.panY = p.y - state.dragStartY;
            applyTransform();
        });

        const endPointer = (e) => {
            pointers.delete(e.pointerId);
            if (pointers.size < 2) pinch = null;
            if (pointers.size === 0) state.isDragging = false;
        };
        window.addEventListener('pointerup', endPointer);
        window.addEventListener('pointercancel', endPointer);

        viewport.addEventListener('wheel', (e) => {
            e.preventDefault();
            const p = toSvgPoint(e.clientX, e.clientY);
            zoomAt(state.scale * (e.deltaY < 0 ? 1.1 : 1 / 1.1), p.x, p.y);
        }, { passive: false });

        document.getElementById('zoomInBtn')?.addEventListener('click', () => {
            const c = viewCenter();
            zoomAt(state.scale * 1.25, c.x, c.y);
        });
        document.getElementById('zoomOutBtn')?.addEventListener('click', () => {
            const c = viewCenter();
            zoomAt(state.scale / 1.25, c.x, c.y);
        });
        document.getElementById('resetViewBtn')?.addEventListener('click', () => {
            state.scale = DEFAULT_SCALE;
            state.panX = DEFAULT_PAN_X;
            state.panY = DEFAULT_PAN_Y;
            applyTransform();
        });
    }

    function clearActivePin(category) {
        state.activePinKey = null;
        renderPins(state.locations, state.rooms, category || 'ALL');
    }

    // Lets a page (e.g. the mobile view) frame a specific area of the map.
    function setView({ scale, panX, panY }) {
        if (scale != null) state.scale = clampScale(scale);
        if (panX != null) state.panX = panX;
        if (panY != null) state.panY = panY;
        applyTransform();
    }

    function getView() {
        return { scale: state.scale, panX: state.panX, panY: state.panY };
    }

    // [{ id, code, name }] for pickers in admin forms
    function listBuildings() {
        return BUILDINGS.map(b => ({ id: b.id, code: b.code, name: b.name, kind: b.kind }))
            .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
    }

    return {
        listBuildings,
        setView,
        getView,
        init,
        renderPins,
        focusBuilding,
        getActiveBuildingId,
        focusNode,
        drawRoute,
        clearRoute,
        clearActivePin,
        inferNodeKey,
        nodeKeyOf
    };
})();
