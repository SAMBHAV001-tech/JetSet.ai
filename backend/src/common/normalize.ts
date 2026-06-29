import * as crypto from 'crypto';

export function normalizeAndHash(prefix: string, data: any): string {
    const normalize = (val: any): any => {
        if (val === null || val === undefined) return '';
        if (Array.isArray(val)) {
            // Sort simple arrays, but recurse over arrays of objects
            return val.map(normalize).sort((a, b) => {
                const strA = typeof a === 'object' ? JSON.stringify(a) : String(a);
                const strB = typeof b === 'object' ? JSON.stringify(b) : String(b);
                return strA.localeCompare(strB);
            });
        }
        if (typeof val === 'object') {
            const normalizedObj: Record<string, any> = {};
            const sortedKeys = Object.keys(val).sort();
            for (const key of sortedKeys) {
                // Ignore transient/transaction fields that shouldn't affect search content identity
                if (key === 'tripId' || key === 'timestamp' || key === 'createdAt' || key === 'id') continue;
                normalizedObj[key] = normalize(val[key]);
            }
            return normalizedObj;
        }
        if (typeof val === 'string') {
            return val.trim().toLowerCase();
        }
        return val;
    };

    const normalizedData = normalize(data);
    const serialized = JSON.stringify(normalizedData);
    const hash = crypto.createHash('sha256').update(serialized).digest('hex');
    return `${prefix}_${hash}`;
}
