"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const rxjs_1 = require('rxjs');
const bitsharesjs_ws_1 = require('bitsharesjs-ws');
const bitsharesjs_1 = require('bitsharesjs');
const Shuffle = require('shuffle');
class Asset {
    constructor(btsAsset) {
        this.btsAsset = btsAsset;
        this.id = btsAsset.id;
    }
    toIntAmount(floatAmount) {
        return Math.round(floatAmount * Math.pow(10, this.btsAsset.precision));
    }
    toFloatAmount(intAmount) {
        return 1.0 * intAmount / Math.pow(10, this.btsAsset.precision);
    }
    get symbol() {
        return this.btsAsset.symbol;
    }
}
class TradePair {
    constructor(baseAsset, quoteAsset) {
        this.baseAsset = baseAsset;
        this.quoteAsset = quoteAsset;
        this.base = baseAsset;
        this.quote = quoteAsset;
    }
    static emptyPair() {
        return new TradePair(new Asset({}), new Asset({}));
    }
    precision() {
        return Math.pow(10, this.quoteAsset.btsAsset.precision - this.baseAsset.btsAsset.precision);
    }
    price(sell_price) {
        var type = this.orderType(sell_price);
        if (!type)
            throw { message: 'not this pair', sell_price: sell_price, pair: this };
        if (type == 'buy')
            return this.bidPrice(sell_price);
        return this.askPrice(sell_price);
    }
    bidPrice(sell_price) {
        return sell_price.base.amount / sell_price.quote.amount * this.precision();
    }
    askPrice(sell_price) {
        return sell_price.quote.amount / sell_price.base.amount * this.precision();
    }
    orderType(sell_price) {
        var isBid = sell_price.base.asset_id == this.base.id && sell_price.quote.asset_id == this.quote.id;
        var isAsk = sell_price.quote.asset_id == this.base.id && sell_price.base.asset_id == this.quote.id;
        if (isBid)
            return 'buy';
        if (isAsk)
            return 'sell';
    }
    get symbolsArray() {
        return [this.base.btsAsset.symbol, this.quote.btsAsset.symbol];
    }
    reverse() {
        return new TradePair(this.quote, this.base);
    }
}
exports.TradePair = TradePair;
class ApiManager {
    constructor() {
        this.assets = new Map();
        this.status = new rxjs_1.BehaviorSubject('connecting');
        this.connected = this.status.filter(s => s === 'connected');
        this.ready = new Promise((resolve, reject) => {
            this.resolve = resolve;
        });
    }
    tryConnect(point) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(point);
            return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                bitsharesjs_ws_1.Apis.instance().close();
                var timeout = setTimeout(() => {
                    bitsharesjs_ws_1.Apis.instance().close();
                    reject();
                }, 5000);
                yield bitsharesjs_ws_1.Apis.instance(point, true).init_promise;
                var prop = yield this.exec_db('get_dynamic_global_properties', []);
                console.log(prop);
                clearTimeout(timeout);
                resolve(prop);
            }));
        });
    }
    connect(mainPoints = ['wss://bts.transwiser.com/ws', 'wss://bit.btsabc.org/ws', 'wss://bitshares.openledger.info/ws', 'wss://secure.freedomledger.com/ws'], backupPoints = []) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.status.getValue() == 'connected')
                return;
            this.status.next('connecting');
            let endpoints1 = mainPoints;
            let deck = Shuffle.shuffle({ deck: endpoints1 });
            let endpoints = deck.drawRandom(endpoints1.length).concat(backupPoints);
            console.log(endpoints);
            // wss://bts.transwiser.com/ws
            // wss://bit.btsabc.org/ws
            // wss://bitshares.dacplay.org/ws
            // wss://openledger.hk/ws
            for (var i = 0; i <= endpoints.length; i++) {
                try {
                    yield this.tryConnect(endpoints[i]);
                    this.status.next('connected');
                    yield bitsharesjs_1.ChainStore.init();
                    this.resolve();
                    return;
                }
                catch (e) {
                }
            }
            this.status.next('failed');
            throw 'Failed trying all preset endpoints.';
        });
    }
    tradePair(baseAssetName, quoteAssetName) {
        return __awaiter(this, void 0, void 0, function* () {
            var baseAsset = yield this.getAsset(baseAssetName);
            var quoteAsset = yield this.getAsset(quoteAssetName);
            return new TradePair(baseAsset, quoteAsset);
        });
    }
    getAsset(name) {
        return __awaiter(this, void 0, void 0, function* () {
            yield bitsharesjs_ws_1.Apis.instance().init_promise;
            if (this.assets.has(name))
                return this.assets.get(name);
            var assets = yield bitsharesjs_ws_1.Apis.instance().db_api().exec('lookup_asset_symbols', [[name]]);
            this.assets.set(name, new Asset(assets[0]));
            return this.assets.get(name);
        });
    }
    exec_db(name, params) {
        var db = bitsharesjs_ws_1.Apis.instance().db_api();
        return db.exec(name, params).catch(e => {
            console.log('reconnect', e);
            this.connect();
            throw e;
        });
    }
    exec_history(name, params) {
        var db = bitsharesjs_ws_1.Apis.instance().history_api();
        return db.exec(name, params);
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = new ApiManager();
//# sourceMappingURL=api-manager.js.map