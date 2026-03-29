(function () {
    const APP_ID = 'bananasheroes';
    const SNAPSHOT_KIND = 'progress-transfer';
    const SNAPSHOT_VERSION = 1;
    const EXCLUDED_KEYS = Object.freeze([
        'bh_mobile_controls_hint_seen_v2'
    ]);
    const EXCLUDED_PREFIXES = Object.freeze([
        'bh_touch_'
    ]);

    function getStorageOrThrow() {
        try {
            if (typeof localStorage === 'undefined' || !localStorage) {
                throw new Error('missing_storage');
            }
            return localStorage;
        } catch (err) {
            throw new Error('Локальное хранилище недоступно на этом устройстве.');
        }
    }

    function isPlainObject(value) {
        return !!value && Object.prototype.toString.call(value) === '[object Object]';
    }

    function isTransferableKey(key) {
        if (typeof key !== 'string') return false;
        if (!key.startsWith('bh_')) return false;
        if (EXCLUDED_KEYS.indexOf(key) >= 0) return false;
        return !EXCLUDED_PREFIXES.some(prefix => key.startsWith(prefix));
    }

    function collectTransferablePayload(storage) {
        const payload = {};
        const keys = [];
        for (let i = 0; i < storage.length; i++) {
            const key = storage.key(i);
            if (isTransferableKey(key)) {
                keys.push(key);
            }
        }
        keys.sort();
        keys.forEach(key => {
            const value = storage.getItem(key);
            if (typeof value === 'string') {
                payload[key] = value;
            }
        });
        return payload;
    }

    function normalizeSnapshot(snapshot) {
        if (!isPlainObject(snapshot)) {
            throw new Error('Некорректный формат прогресса.');
        }
        if (snapshot.app !== APP_ID || snapshot.kind !== SNAPSHOT_KIND) {
            throw new Error('Этот код прогресса создан не для Bananas Heroes.');
        }
        if (snapshot.version !== SNAPSHOT_VERSION) {
            throw new Error('Эта версия кода прогресса не поддерживается.');
        }
        if (typeof snapshot.exportedAt !== 'string' || !Number.isFinite(Date.parse(snapshot.exportedAt))) {
            throw new Error('В коде прогресса повреждена дата выгрузки.');
        }
        if (!isPlainObject(snapshot.payload)) {
            throw new Error('В коде прогресса повреждены данные.');
        }

        const payload = {};
        const keys = Object.keys(snapshot.payload).sort();
        keys.forEach(key => {
            if (!isTransferableKey(key)) {
                throw new Error('Код прогресса содержит неподдерживаемые данные.');
            }
            const value = snapshot.payload[key];
            if (typeof value !== 'string') {
                throw new Error('Код прогресса содержит поврежденные значения.');
            }
            payload[key] = value;
        });

        return {
            app: APP_ID,
            kind: SNAPSHOT_KIND,
            version: SNAPSHOT_VERSION,
            exportedAt: snapshot.exportedAt,
            payload
        };
    }

    function createSnapshot() {
        const storage = getStorageOrThrow();
        return {
            app: APP_ID,
            kind: SNAPSHOT_KIND,
            version: SNAPSHOT_VERSION,
            exportedAt: new Date().toISOString(),
            payload: collectTransferablePayload(storage)
        };
    }

    function serializeSnapshot(snapshot) {
        return JSON.stringify(normalizeSnapshot(snapshot), null, 2);
    }

    function parseSnapshot(raw) {
        if (typeof raw !== 'string' || !raw.trim()) {
            throw new Error('Вставь код прогресса перед загрузкой.');
        }

        let parsed;
        try {
            parsed = JSON.parse(raw);
        } catch (err) {
            throw new Error('Не удалось прочитать код прогресса. Проверь, что вставлен полный JSON.');
        }

        return normalizeSnapshot(parsed);
    }

    function clearTransferableStorage() {
        const storage = getStorageOrThrow();
        const keys = Object.keys(collectTransferablePayload(storage));
        keys.forEach(key => {
            storage.removeItem(key);
        });
        return keys.length;
    }

    function applySnapshot(snapshot) {
        const storage = getStorageOrThrow();
        const normalized = normalizeSnapshot(snapshot);
        const backupPayload = collectTransferablePayload(storage);

        try {
            clearTransferableStorage();
            Object.keys(normalized.payload).forEach(key => {
                storage.setItem(key, normalized.payload[key]);
            });
        } catch (err) {
            try {
                clearTransferableStorage();
                Object.keys(backupPayload).forEach(key => {
                    storage.setItem(key, backupPayload[key]);
                });
            } catch (restoreErr) {
                // If restore fails, surface the original import error.
            }
            throw new Error('Не удалось применить прогресс на этом устройстве.');
        }

        return Object.keys(normalized.payload).length;
    }

    window.BHProgressTransfer = Object.freeze({
        createSnapshot,
        serializeSnapshot,
        parseSnapshot,
        applySnapshot,
        clearTransferableStorage,
        isTransferableKey
    });
})();
