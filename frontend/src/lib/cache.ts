type CacheEntry<T> = {
    data: T;
    expiry: number;
};

class Cache {
    private store: Map<string, CacheEntry<any>> = new Map();
    private defaultTTL: number = 5 * 60 * 1000; // 5 minutes default TTL

    set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
        const expiry = Date.now() + ttl;
        this.store.set(key, { data, expiry });
    }

    get<T>(key: string): T | null {
        const entry = this.store.get(key);
        if (!entry) return null;

        if (Date.now() > entry.expiry) {
            this.store.delete(key);
            return null;
        }

        return entry.data;
    }

    remove(key: string): void {
        this.store.delete(key);
    }

    clear(): void {
        this.store.clear();
    }
}

export const cache = new Cache();
