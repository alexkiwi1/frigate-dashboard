"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adapterMap = void 0;
const email_1 = __importDefault(require("./email"));
const telegram_1 = __importDefault(require("./telegram"));
const feishu_1 = __importDefault(require("./feishu"));
exports.adapterMap = {
    email: email_1.default,
    telegram: telegram_1.default,
    feishu: feishu_1.default,
};
//# sourceMappingURL=index.js.map