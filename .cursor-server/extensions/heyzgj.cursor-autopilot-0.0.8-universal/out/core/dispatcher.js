"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sub = exports.pub = void 0;
const bus = new Map();
const pub = (k, d) => bus.get(k)?.forEach(h => h(d));
exports.pub = pub;
const sub = (k, h) => bus.set(k, (bus.get(k) || []).concat(h));
exports.sub = sub;
//# sourceMappingURL=dispatcher.js.map