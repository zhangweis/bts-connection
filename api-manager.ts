import {BehaviorSubject, Observable, Subject} from 'rxjs'
import {Apis} from 'bitsharesjs-ws'
import {ChainStore} from 'bitsharesjs'
import * as Shuffle from 'shuffle'
export class Asset {
  id: string
  constructor(public btsAsset) {
    this.id = btsAsset.id
  }
  toIntAmount(floatAmount) {
    return Math.round(floatAmount * Math.pow(10, this.btsAsset.precision))
  }
  toFloatAmount(intAmount) {
    return 1.0 * intAmount / Math.pow(10, this.btsAsset.precision)
  }
  get symbol() {
    return this.btsAsset.symbol
  }
}
export class TradePair {
  base: Asset
  quote: Asset
  static emptyPair() {
    return new TradePair(new Asset({}), new Asset({}))
  }
  constructor(public baseAsset: Asset, public quoteAsset: Asset) {
    this.base = baseAsset
    this.quote = quoteAsset
  }
  private precision() {
    return Math.pow(10, this.quoteAsset.btsAsset.precision - this.baseAsset.btsAsset.precision)
  }
  price(sell_price) {
    var type = this.orderType(sell_price)
    //    if (!type) throw {message:'not this pair', sell_price: sell_price, pair: this}
    if (type=='buy') return this.bidPrice(sell_price)
    return this.askPrice(sell_price)
  }
  private bidPrice(sell_price) {
    return sell_price.base.amount / sell_price.quote.amount * this.precision()
  }
  private askPrice(sell_price) {
    return sell_price.quote.amount / sell_price.base.amount * this.precision()
  }
  orderType(sell_price) {
    var isBid = sell_price.base.asset_id == this.base.id && sell_price.quote.asset_id == this.quote.id
    var isAsk = sell_price.quote.asset_id == this.base.id && sell_price.base.asset_id == this.quote.id
    if (isBid) return 'buy'
    if (isAsk) return 'sell'
  }
  get symbolsArray() {
    return [this.base.btsAsset.symbol, this.quote.btsAsset.symbol]
  }
  reverse() {
    return new TradePair(this.quote, this.base)
  }
}
var defaultServersString = process.env.bts_servers || ['wss://bts.transwiser.com/ws', 'wss://bit.btsabc.org/ws', 'wss://bitshares.openledger.info/ws', 'wss://secure.freedomledger.com/ws'].join(',');
var defaultServers = defaultServersString.split(',');
class ApiManager {
  constructor() {
    this.ready = new Promise((resolve, reject) => {
      this.resolve = resolve
    })
  }
  async tryConnect(point) {
    console.debug(point)
    return new Promise(async (resolve, reject)=>{
      Apis.instance().close()
      var timeout = setTimeout(()=>{
        Apis.instance().close()
        reject()
      }, 5000)
      await Apis.instance(point, true).init_promise
      var prop = await this.exec_db('get_dynamic_global_properties',[])
      console.debug(prop)
      clearTimeout(timeout)
      resolve(prop)
    })

  }
  async connect(mainPoints = defaultServers, backupPoints = []) {
    if (this.status.getValue()=='connected') return;
    this.status.next('connecting')
    let endpoints1 = mainPoints
    var endpoints;
    if (endpoints1.length>1) {
      let deck = Shuffle.shuffle({deck:endpoints1})
      endpoints = (deck.drawRandom(endpoints1.length)||[]);
    } else {
      endpoints = endpoints1;
    }
    endpoints = endpoints.concat(backupPoints)
    console.debug(endpoints)
    // wss://bts.transwiser.com/ws
    // wss://bit.btsabc.org/ws
    // wss://bitshares.dacplay.org/ws
    // wss://openledger.hk/ws
    for (var i = 0; i <= endpoints.length; i++) {
      try {
        await this.tryConnect(endpoints[i]);
        this.status.next('connected')
        await ChainStore.init(false)
        this.resolve()
        return;
        } catch(e) {
        // continue;
      }
    }
    this.status.next('failed')
    throw 'Failed trying all preset endpoints.'
  }
  resolve: any
  ready: Promise<any>
  async tradePair(baseAssetName, quoteAssetName) {
    var baseAsset = await this.getAsset(baseAssetName)
    var quoteAsset = await this.getAsset(quoteAssetName)
    return new TradePair(baseAsset, quoteAsset)
  }
  async getAsset(name):Promise<Asset> {
    await Apis.instance().init_promise
    if (this.assets.has(name)) return this.assets.get(name)
    var assets = await Apis.instance().db_api().exec('lookup_asset_symbols',[[name]])
    this.assets.set(name, new Asset(assets[0]))
    return this.assets.get(name)
  }

  async getAssetById(id):Promise<Asset> {
    await Apis.instance().init_promise
    for (var [key, value] of this.assets) {
      if (value.id==id) return value;
    }
    var assets = await Apis.instance().db_api().exec('get_objects',[[id]])
    this.assets.set(name, new Asset(assets[0]))
    return this.assets.get(name)
  }

  assets: Map<string, any> = new Map<string, any>()
  exec_db(name, params) {
    var db = Apis.instance().db_api()
    return db.exec(name, params).catch(e=>{
      console.debug('reconnect', e)
      this.connect()
      throw e
    })
  }
  exec_history(name, params) {
    var db = Apis.instance().history_api()
    return db.exec(name, params)
  }
  
  public status : BehaviorSubject<string> = new BehaviorSubject<string>('connecting')
  connected: Observable<any> = this.status.filter(s => s === 'connected')
}
export {ApiManager};

export default new ApiManager()
