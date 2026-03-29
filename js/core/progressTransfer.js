(function () {
    const APP_ID = 'bananasheroes';
    const SNAPSHOT_KIND = 'progress-transfer';
    const SNAPSHOT_VERSION = 1;
    const TRANSFER_CODE_PREFIX = 'BHT1.';
    const TRANSFER_OBFUSCATION_KEY = 'bananasheroes-transfer-v1';
    const EXCLUDED_KEYS = Object.freeze([
        'bh_mobile_controls_hint_seen_v2'
    ]);
    const EXCLUDED_PREFIXES = Object.freeze([
        'bh_touch_'
    ]);
    const textEncoder = typeof TextEncoder === 'function' ? new TextEncoder() : null;
    const textDecoder = typeof TextDecoder === 'function' ? new TextDecoder() : null;
    const obfuscationKeyBytes = utf8ToBytes(TRANSFER_OBFUSCATION_KEY);

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

    function utf8ToBytes(value) {
        const stringValue = String(value);
        if (textEncoder) return textEncoder.encode(stringValue);

        const binary = unescape(encodeURIComponent(stringValue));
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }

    function bytesToUtf8(bytes) {
        if (textDecoder) return textDecoder.decode(bytes);

        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }

        try {
            return decodeURIComponent(escape(binary));
        } catch (err) {
            throw new Error('Не удалось прочитать код переноса. Проверь, что он вставлен целиком.');
        }
    }

    function encodeBase64(binary) {
        if (typeof btoa === 'function') return btoa(binary);
        if (typeof Buffer !== 'undefined') return Buffer.from(binary, 'binary').toString('base64');
        throw new Error('Не удалось подготовить код переноса на этом устройстве.');
    }

    function decodeBase64(base64) {
        if (typeof atob === 'function') return atob(base64);
        if (typeof Buffer !== 'undefined') return Buffer.from(base64, 'base64').toString('binary');
        throw new Error('Не удалось прочитать код переноса. Проверь, что он вставлен целиком.');
    }

    function bytesToBase64Url(bytes) {
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return encodeBase64(binary)
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/g, '');
    }

    function base64UrlToBytes(raw) {
        if (typeof raw !== 'string' || !raw || !/^[A-Za-z0-9\-_]+$/.test(raw)) {
            throw new Error('Не удалось прочитать код переноса. Проверь, что он вставлен целиком.');
        }

        let padded = raw.replace(/-/g, '+').replace(/_/g, '/');
        while (padded.length % 4) padded += '=';

        let binary = '';
        try {
            binary = decodeBase64(padded);
        } catch (err) {
            throw new Error('Не удалось прочитать код переноса. Проверь, что он вставлен целиком.');
        }

        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }

    function obfuscateBytes(bytes) {
        const result = new Uint8Array(bytes.length);
        for (let i = 0; i < bytes.length; i++) {
            const mask = obfuscationKeyBytes[i % obfuscationKeyBytes.length] ^ ((i * 31 + 17) & 0xff);
            result[i] = bytes[i] ^ mask;
        }
        return result;
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
            throw new Error('Вставь код переноса перед загрузкой.');
        }

        let parsed;
        try {
            parsed = JSON.parse(raw.trim());
        } catch (err) {
            throw new Error('Не удалось прочитать код переноса. Проверь, что он вставлен целиком.');
        }

        return normalizeSnapshot(parsed);
    }

    function serializeTransferCode(snapshot) {
        const compactSnapshot = JSON.stringify(normalizeSnapshot(snapshot));
        const obfuscated = obfuscateBytes(utf8ToBytes(compactSnapshot));
        return TRANSFER_CODE_PREFIX + bytesToBase64Url(obfuscated);
    }

    function parseTransferCode(raw) {
        if (typeof raw !== 'string' || !raw.trim()) {
            throw new Error('Вставь код переноса перед загрузкой.');
        }

        const trimmed = raw.trim();
        const compact = trimmed.replace(/\s+/g, '');
        if (!compact.startsWith(TRANSFER_CODE_PREFIX)) {
            return parseSnapshot(trimmed);
        }

        const encodedBody = compact.slice(TRANSFER_CODE_PREFIX.length);
        if (!encodedBody) {
            throw new Error('Не удалось прочитать код переноса. Проверь, что он вставлен целиком.');
        }

        const decodedJson = bytesToUtf8(obfuscateBytes(base64UrlToBytes(encodedBody)));
        return parseSnapshot(decodedJson);
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
        serializeTransferCode,
        parseTransferCode,
        applySnapshot,
        clearTransferableStorage,
        isTransferableKey
    });
})();
