"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var rxjs_1 = require("rxjs");
var bitsharesjs_ws_1 = require("bitsharesjs-ws");
exports.Apis = bitsharesjs_ws_1.Apis;
var bitsharesjs_1 = require("bitsharesjs");
exports.ChainStore = bitsharesjs_1.ChainStore;
var Shuffle = require("shuffle");
var Asset = /** @class */ (function () {
    function Asset(btsAsset) {
        this.btsAsset = btsAsset;
        this.id = btsAsset.id;
    }
    Asset.prototype.toIntAmount = function (floatAmount) {
        return Math.round(floatAmount * Math.pow(10, this.btsAsset.precision));
    };
    Asset.prototype.toFloatAmount = function (intAmount) {
        return 1.0 * intAmount / Math.pow(10, this.btsAsset.precision);
    };
    Object.defineProperty(Asset.prototype, "symbol", {
        get: function () {
            return this.btsAsset.symbol;
        },
        enumerable: true,
        configurable: true
    });
    return Asset;
}());
exports.Asset = Asset;
var TradePair = /** @class */ (function () {
    function TradePair(baseAsset, quoteAsset) {
        this.baseAsset = baseAsset;
        this.quoteAsset = quoteAsset;
        this.base = baseAsset;
        this.quote = quoteAsset;
    }
    TradePair.emptyPair = function () {
        return new TradePair(new Asset({}), new Asset({}));
    };
    TradePair.prototype.precision = function () {
        return Math.pow(10, this.quoteAsset.btsAsset.precision - this.baseAsset.btsAsset.precision);
    };
    TradePair.prototype.price = function (sell_price) {
        var type = this.orderType(sell_price);
        //    if (!type) throw {message:'not this pair', sell_price: sell_price, pair: this}
        if (type == 'buy')
            return this.bidPrice(sell_price);
        return this.askPrice(sell_price);
    };
    TradePair.prototype.bidPrice = function (sell_price) {
        return sell_price.base.amount / sell_price.quote.amount * this.precision();
    };
    TradePair.prototype.askPrice = function (sell_price) {
        return sell_price.quote.amount / sell_price.base.amount * this.precision();
    };
    TradePair.prototype.orderType = function (sell_price) {
        var isBid = sell_price.base.asset_id == this.base.id && sell_price.quote.asset_id == this.quote.id;
        var isAsk = sell_price.quote.asset_id == this.base.id && sell_price.base.asset_id == this.quote.id;
        if (isBid)
            return 'buy';
        if (isAsk)
            return 'sell';
    };
    Object.defineProperty(TradePair.prototype, "symbolsArray", {
        get: function () {
            return [this.base.btsAsset.symbol, this.quote.btsAsset.symbol];
        },
        enumerable: true,
        configurable: true
    });
    TradePair.prototype.reverse = function () {
        return new TradePair(this.quote, this.base);
    };
    return TradePair;
}());
exports.TradePair = TradePair;
var defaultServersString = process.env.bts_servers || ['wss://bts.transwiser.com/ws', 'wss://bit.btsabc.org/ws', 'wss://bitshares.openledger.info/ws', 'wss://secure.freedomledger.com/ws'].join(',');
var defaultServers = defaultServersString.split(',');
var ApiManager = /** @class */ (function () {
    function ApiManager() {
        var _this = this;
        this.assets = new Map();
        this.status = new rxjs_1.BehaviorSubject('connecting');
        this.connected = this.status.filter(function (s) { return s === 'connected'; });
        this.ready = new Promise(function (resolve, reject) {
            _this.resolve = resolve;
        });
    }
    ApiManager.prototype.tryConnect = function (point, apis) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                console.debug(point);
                return [2 /*return*/, new Promise(function (resolve, reject) { return __awaiter(_this, void 0, void 0, function () {
                        var timeout, prop;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    apis.instance().close();
                                    timeout = setTimeout(function () {
                                        apis.instance().close();
                                        reject();
                                    }, 5000);
                                    return [4 /*yield*/, apis.instance(point, true).init_promise];
                                case 1:
                                    _a.sent();
                                    return [4 /*yield*/, this.exec_db('get_dynamic_global_properties', [])];
                                case 2:
                                    prop = _a.sent();
                                    console.debug(prop);
                                    clearTimeout(timeout);
                                    resolve(prop);
                                    return [2 /*return*/];
                            }
                        });
                    }); })];
            });
        });
    };
    ApiManager.prototype.connect = function (mainPoints, _a) {
        if (mainPoints === void 0) { mainPoints = defaultServers; }
        var _b = _a === void 0 ? {} : _a, _c = _b.backupPoints, backupPoints = _c === void 0 ? [] : _c, _d = _b.apis, apis = _d === void 0 ? bitsharesjs_ws_1.Apis : _d;
        return __awaiter(this, void 0, void 0, function () {
            var endpoints1, endpoints, deck, i, e_1;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (this.status.getValue() == 'connected')
                            return [2 /*return*/];
                        this.status.next('connecting');
                        endpoints1 = mainPoints;
                        if (endpoints1.length > 1) {
                            deck = Shuffle.shuffle({ deck: endpoints1 });
                            endpoints = (deck.drawRandom(endpoints1.length) || []);
                        }
                        else {
                            endpoints = endpoints1;
                        }
                        endpoints = endpoints.concat(backupPoints);
                        console.debug(endpoints);
                        i = 0;
                        _e.label = 1;
                    case 1:
                        if (!(i <= endpoints.length)) return [3 /*break*/, 7];
                        _e.label = 2;
                    case 2:
                        _e.trys.push([2, 5, , 6]);
                        return [4 /*yield*/, this.tryConnect(endpoints[i], apis)];
                    case 3:
                        _e.sent();
                        this.status.next('connected');
                        return [4 /*yield*/, bitsharesjs_1.ChainStore.init(false)];
                    case 4:
                        _e.sent();
                        this.resolve();
                        return [2 /*return*/];
                    case 5:
                        e_1 = _e.sent();
                        return [3 /*break*/, 6];
                    case 6:
                        i++;
                        return [3 /*break*/, 1];
                    case 7:
                        this.status.next('failed');
                        throw 'Failed trying all preset endpoints.';
                }
            });
        });
    };
    ApiManager.prototype.tradePair = function (baseAssetName, quoteAssetName) {
        return __awaiter(this, void 0, void 0, function () {
            var baseAsset, quoteAsset;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getAsset(baseAssetName)];
                    case 1:
                        baseAsset = _a.sent();
                        return [4 /*yield*/, this.getAsset(quoteAssetName)];
                    case 2:
                        quoteAsset = _a.sent();
                        return [2 /*return*/, new TradePair(baseAsset, quoteAsset)];
                }
            });
        });
    };
    ApiManager.prototype.getAsset = function (name) {
        return __awaiter(this, void 0, void 0, function () {
            var assets;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, bitsharesjs_ws_1.Apis.instance().init_promise];
                    case 1:
                        _a.sent();
                        if (this.assets.has(name))
                            return [2 /*return*/, this.assets.get(name)];
                        return [4 /*yield*/, bitsharesjs_ws_1.Apis.instance().db_api().exec('lookup_asset_symbols', [[name]])];
                    case 2:
                        assets = _a.sent();
                        this.assets.set(name, new Asset(assets[0]));
                        return [2 /*return*/, this.assets.get(name)];
                }
            });
        });
    };
    ApiManager.prototype.getAssetById = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var _i, _a, _b, key, value, assets;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, bitsharesjs_ws_1.Apis.instance().init_promise];
                    case 1:
                        _c.sent();
                        for (_i = 0, _a = this.assets; _i < _a.length; _i++) {
                            _b = _a[_i], key = _b[0], value = _b[1];
                            if (value.id == id)
                                return [2 /*return*/, value];
                        }
                        return [4 /*yield*/, bitsharesjs_ws_1.Apis.instance().db_api().exec('get_objects', [[id]])];
                    case 2:
                        assets = _c.sent();
                        this.assets.set(name, new Asset(assets[0]));
                        return [2 /*return*/, this.assets.get(name)];
                }
            });
        });
    };
    ApiManager.prototype.exec_db = function (name, params) {
        var _this = this;
        var db = bitsharesjs_ws_1.Apis.instance().db_api();
        return db.exec(name, params).catch(function (e) {
            console.debug('reconnect', e);
            _this.connect();
            throw e;
        });
    };
    ApiManager.prototype.exec_history = function (name, params) {
        var db = bitsharesjs_ws_1.Apis.instance().history_api();
        return db.exec(name, params);
    };
    return ApiManager;
}());
exports.ApiManager = ApiManager;
exports.default = new ApiManager();
//# sourceMappingURL=api-manager.js.map