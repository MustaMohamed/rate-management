/* Data Store and Persistence */

const DEFAULT_STORE = {
    // Calendar Data
    days: [],

    // Configuration
    barRoomId: 'r1',
    pricingModel: 'standard', // 'standard' or 'exact'

    // Rate Levels
    rateLevels: [
        { id: 'l1', name: 'Level 1', baseValue: 80, roomPrices: {} },
        { id: 'l2', name: 'Level 2', baseValue: 100, roomPrices: {} },
        { id: 'l3', name: 'Level 3', baseValue: 120, roomPrices: {} }
    ],

    // Defined Clusters
    clusters: [
        { id: 'c1', name: 'Standard', color: '#bfdbfe' }, // Distinct Blue
        { id: 'c2', name: 'Premium', color: '#fed7aa' },  // Distinct Orange
        { id: 'c3', name: 'Luxury', color: '#e9d5ff' }    // Distinct Purple
    ],

    rooms: [
        // Standard Cluster
        {
            id: 'r1', code: 'STD', name: 'Standard Room', cluster: 'c1',
            options: [
                { id: 'o1', name: 'King Bed', delta: 0 },
                { id: 'o2', name: 'Twin Bed', delta: 0 }
            ]
        },
        {
            id: 'r2', code: 'STV', name: 'Standard View', cluster: 'c1',
            options: [
                { id: 'o4', name: 'Garden View', delta: 0 },
                { id: 'o5', name: 'Pool View', delta: 20 }
            ]
        },

        // Premium Cluster
        {
            id: 'r3', code: 'SUP', name: 'Superior Room', cluster: 'c2',
            options: [
                { id: 'o6', name: 'King Bed', delta: 0 },
                { id: 'o7', name: 'Twin Bed', delta: 0 }
            ]
        },
        {
            id: 'r4', code: 'DLX', name: 'Deluxe Room', cluster: 'c2',
            options: [
                { id: 'o9', name: 'City View', delta: 0 },
                { id: 'o10', name: 'Ocean View', delta: 40 }
            ]
        },
        {
            id: 'r5', code: 'JSU', name: 'Junior Suite', cluster: 'c2',
            options: [
                { id: 'o13', name: 'Standard', delta: 0 },
                { id: 'o14', name: 'Panorama', delta: 60 }
            ]
        },

        // Luxury Cluster
        {
            id: 'r6', code: 'EXS', name: 'Executive Suite', cluster: 'c3',
            options: [
                { id: 'o15', name: 'One Bedroom', delta: 0 },
                { id: 'o16', name: 'Two Bedroom', delta: 150 }
            ]
        },
        {
            id: 'r7', code: 'PRS', name: 'Presidential Suite', cluster: 'c3',
            options: [
                { id: 'o18', name: 'Penthouse', delta: 0 },
                { id: 'o19', name: 'Royal Wing', delta: 500 }
            ]
        }
    ],
    rates: [
        {
            id: 'p1', code: 'BAR', name: 'Best Available Rate', type: 'source',
            supplements: {
                r2: 10,  // Standard View
                r3: 30,  // Superior
                r4: 50,  // Deluxe
                r5: 100, // Junior Suite
                r6: 200, // Exec Suite
                r7: 300  // Presidential
            }
        },
        { id: 'p2', code: 'NREF', name: 'Non-Refundable', type: 'derived', parent: 'p1', rule: 'percent', value: -10, supplements: {} },
        { id: 'p3', code: 'PROMO', name: 'Summer Promo', type: 'derived', parent: 'p2', rule: 'percent', value: -5, supplements: {} }
    ]
};

// Singleton Store Instance
let store = null;

function initStore() {
    const saved = localStorage.getItem('infinito_rate_store');
    if (saved) {
        try {
            store = JSON.parse(saved);
        } catch (e) {
            console.error('Failed to parse store', e);
            store = JSON.parse(JSON.stringify(DEFAULT_STORE));
        }
    } else {
        store = JSON.parse(JSON.stringify(DEFAULT_STORE));
    }

    // Ensure days exist (hydration)
    if (!store.days || store.days.length === 0) {
        initCalendarData();
    }
}

function saveStore() {
    if (store) {
        localStorage.setItem('infinito_rate_store', JSON.stringify(store));
    }
}

function initCalendarData() {
    const today = new Date();
    store.days = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const dateStr = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        const isWeekend = d.getDay() === 5 || d.getDay() === 6;
        store.days.push({
            date: dateStr,
            baseRate: isWeekend ? 150 : 100
        });
    }
    saveStore();
}
