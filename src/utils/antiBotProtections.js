const rateLimitMap = new Map();

function isBotRequest(wallet, ip, windowMs = 30000, maxRequests = 3) {
    const key = `${wallet}_${ip}`;
    const now = Date.now();

    if (!rateLimitMap.has(key)) {
        rateLimitMap.set(key, { count: 1, first: now });
        return false;
    }

    const data = rateLimitMap.get(key);
    if (now - data.first > windowMs) {
        rateLimitMap.set(key, { count: 1, first: now });
        return false;
    }

    data.count += 1;
    if (data.count > maxRequests) {
        return true;
    }

    rateLimitMap.set(key, data);
    return false;
}

module.exports = { isBotRequest };
