import mimeTypes from 'mime-component/types'
import Emitter from '@jkroso/emitter'
import base64 from 'base64-encode'
import setter from 'setter-method'
import lazy from 'lazy-property'
import {Deferred} from 'result'
import join from 'path/join'
import qs from 'qs'

export const statusCodes = {
  100: "Continue",
  101: "Switching Protocols",
  102: "Processing",
  200: "OK",
  201: "Created",
  202: "Accepted",
  203: "Non-Authoritative Information",
  204: "No Content",
  205: "Reset Content",
  206: "Partial Content",
  207: "Multi-Status",
  300: "Multiple Choices",
  301: "Moved Permanently",
  302: "Moved Temporarily",
  303: "See Other",
  304: "Not Modified",
  305: "Use Proxy",
  307: "Temporary Redirect",
  400: "Bad Request",
  401: "Unauthorized",
  402: "Payment Required",
  403: "Forbidden",
  404: "Not Found",
  405: "Method Not Allowed",
  406: "Not Acceptable",
  407: "Proxy Authentication Required",
  408: "Request Time-out",
  409: "Conflict",
  410: "Gone",
  411: "Length Required",
  412: "Precondition Failed",
  413: "Request Entity Too Large",
  414: "Request-URI Too Large",
  415: "Unsupported Media Type",
  416: "Requested Range Not Satisfiable",
  417: "Expectation Failed",
  418: "I'm a teapot",
  422: "Unprocessable Entity",
  423: "Locked",
  424: "Failed Dependency",
  425: "Unordered Collection",
  426: "Upgrade Required",
  428: "Precondition Required",
  429: "Too Many Requests",
  431: "Request Header Fields Too Large",
  500: "Internal Server Error",
  501: "Not Implemented",
  502: "Bad Gateway",
  503: "Service Unavailable",
  504: "Gateway Time-out",
  505: "HTTP Version Not Supported",
  506: "Variant Also Negotiates",
  507: "Insufficient Storage",
  509: "Bandwidth Limit Exceeded",
  510: "Not Extended",
  511: "Network Authentication Required"
}

/**
 * mime type map
 */

const mime = Object.create(mimeTypes)
mime['form'] =
mime['urlencoded'] =
mime['form-data'] = 'application/x-www-form-urlencoded'

/**
 * default serializers
 */

export const serialize = {
  'application/json': JSON.stringify,
  'application/x-www-form-urlencoded': qs.stringify
}

/**
 * Request
 *
 * @param {Object} options
 */

export default class Request extends Deferred {
  constructor(options) {
    super(Request.prototype.onNeed)
    this.options = options
    this.header = {}
    if (options.method != 'HEAD') {
      this.set('Accept-Encoding', 'gzip, deflate')
    }
    if (options.auth) {
      var auth = options.auth.split(':')
      this.auth(auth[0], auth[1])
    }
  }

  /**
   * Set header `field` to `val`, or multiple fields with one object.
   *
   * Examples:
   *
   *   request.get('/')
   *     .set('Accept', 'application/json')
   *     .set('X-API-Key', 'foobar')
   *     .read(callback)
   *
   *   request.get('/')
   *     .set({ Accept: 'application/json', 'X-API-Key': 'foobar' })
   *     .read(callback)
   *
   * @param {String|Object} field
   * @param {String} val
   * @return {this}
   * @api public
   */

  set(field, val) {
    if (typeof field == 'object') Object.assign(this.header, field)
    else this.header[field] = val
    return this
  }

  /**
   * Get request header `field`.
   *
   * @param {String} field
   * @return {String}
   * @api public
   */

  get(field) {
    return this.header[field]
  }

  /**
   * Add query-string `val`.
   *
   * Examples:
   *
   *   request.get('/shoes')
   *     .query('size=10')
   *     .query({ color: 'blue' })
   *
   * @param {Object|String} val
   * @return {this}
   * @api public
   */

  query(val) {
    if (typeof val == 'string') val = qs.parse(val)
    if (!this.options.query) this.options.query = {}
    Object.assign(this.options.query, val)
    return this
  }

  /**
   * Set the "Content-Type" header. Common `type`s can
   * be set with a shorthand string:
   *
   *   request.post('/')
   *     .type('application/json')
   *     .send(jsonstring)
   *     .read(callback)
   *
   *   request.post('/')
   *     .type('json')
   *     .send(jsonstring)
   *     .read(callback)
   *
   * @param {String} type
   * @return {this}
   * @api public
   */

  type(type) {
    if (type[0] == '.') type = type.slice(1)
    return this.set('Content-Type', type in mime ? mime[type] : type)
  }

  /**
   * Set the "Accept" header. As with `Request.type()`
   * shorthand strings are allowed
   *
   * @param {String} type
   * @return {this}
   * @api public
   * TODO: support content negotiation
   */

  accept(type) {
    if (type[0] == '.') type = type.slice(1)
    return this.set('Accept', type in mime ? mime[type] : type)
  }

  /**
   * start the requests timeout
   *
   * @api private
   */

  startTimer() {
    if (this._timeout == Infinity) return
    this._timer = setTimeout(() => {
      this.timeoutError()
      this.abort()
    }, this._timeout)
  }

  /**
   * Clear previous timeout.
   *
   * @return {this}
   * @api public
   */

  clearTimeout() {
    this._timeout = Infinity
    clearTimeout(this._timer)
    return this
  }

  /**
   * set the response to be a timeout error
   *
   * @api private
   */

  timeoutError() {
    var time = this._timeout
    var err = new Error('timeout of ' + time + 'ms exceeded')
    err.timeout = time
    this.response.error(err)
  }

  /**
   * Abort and clear timeout.
   *
   * @return {this}
   * @api public
   */

  abort() {
    if (this.aborted) return
    this.aborted = true
    this.request.abort()
    this.clearTimeout()
    this.emit('abort')
    return this
  }

  /**
   * Gets/sets the `Agent` to use for this HTTP request.
   * The default (if this function is not called) is to
   * opt out of connection pooling (`agent: false`).
   *
   * @param {http.Agent} agent
   * @return {http.Agent}
   * @api public
   */

  agent(agent) {
    if (!arguments.length) return this.options.agent
    this.options.agent = agent
    return this
  }

  /**
   * Send `data`, defaulting the `.type()` to "json" when
   * an object is given.
   *
   * Examples:
   *
   *   // manual json
   *   request.post('/user')
   *     .type('json')
   *     .send('{"name":"tj"}')
   *     .read(callback)
   *
   *   // auto json
   *   request.post('/user')
   *     .send({ name: 'tj' })
   *     .read(callback)
   *
   *   // manual x-www-form-urlencoded
   *   request.post('/user')
   *     .type('form')
   *     .send('name=tj')
   *     .read(callback)
   *
   *   // auto x-www-form-urlencoded
   *   request.post('/user')
   *     .type('form')
   *     .send({ name: 'tj' })
   *     .read(callback)
   *
   *   // string defaults to x-www-form-urlencoded
   *   request.post('/user')
   *     .send('name=tj')
   *     .send('foo=bar')
   *     .send('bar=baz')
   *     .read(callback)
   *
   * @param {String|Object} data
   * @return {this}
   * @api public
   */

  send(data) {
    var type = this.header['Content-Type']

    if (typeof data == 'object') {
      this._data = Object.assign(this._data || {}, data)
      if (!type) this.type('json')
      return this
    }

    if (typeof data == 'string') {
      if (!type) this.type('form')
      type = this.header['Content-Type']

      if (type == 'application/x-www-form-urlencoded') {
        this._data = this._data
          ? this._data + '&' + data
          : data
      } else {
        this._data = (this._data || '') + data
      }
    }

    return this
  }

  /**
   * Set Authorization field value with `user` and `pass`
   *
   * @param {String} user
   * @param {String} pass
   * @return {this}
   * @api public
   */

  auth(user, pass) {
    return this.set('Authorization', 'Basic ' + base64(user + ':' + pass))
  }

  /**
   * Set the path. `arguments` is joined to form the path:
   *
   *   request.get('https://api.github.com')
   *     .path('repos', user, repo, 'tags')
   *     .read(callback)
   *
   * @param {String} ...
   * @return {this}
   * @api public
   */

  path() {
    var path = join.apply(null, arguments)
    this.options.pathname = path.replace(/^\/?/, '/')
    return this
  }

  /**
   * Clone the Request. This provides an efficient way to create
   * several similar requests:
   *
   *   var gh = request.get('https://api.github.com').auth(username, password)
   *   gh.clone().path('repos/jkroso/solicit/tags').read(callback)
   *   gh.clone().path('repos/tj/superagent/tags').read(callback)
   *
   * @return {Request}
   */

  clone() {
    var clone = Object.create(this)
    clone.header = Object.create(this.header)
    clone.options = Object.create(this.options)
    return clone
  }
}

/**
 * mixin Emitter
 */

Emitter(Request.prototype)

/**
 * Get/Set max redirects
 *
 * @param {Number} n
 * @return {this}
 * @api public
 */

setter(Request.prototype, 'maxRedirects', Infinity)

/**
 * Get/Set timeout in ms
 *
 * @param {Number} ms
 * @return {this}
 * @api public
 */

setter(Request.prototype, 'timeout', Infinity)

/**
 * listen to "pipe" on all instances. We need to know
 * if we are being piped to so we know whether or not
 * to wait for data before sending the request
 */

Request.prototype.on('pipe', function(){
  this.pipedTo = true
})

/**
 * create redirects array lazily
 */

lazy(Request.prototype, 'redirects', Array)

/**
 * add sugar to the response
 *
 * @param {IncomingMessage} res
 * @return {IncomingMessage}
 * @api private
 */

export const sugar = res => {
  const type = res.headers['content-type'] || ''
  res.header = res.headers
  Object.assign(res, params(type))
  res.type = type.split(/ *; */)[0]
  res.statusType = res.status / 100 | 0
  res.message = statusCodes[res.status]
  const link = res.headers['link']
  if (link) res.links = parseLinks(link)
  return res
}

/**
 * parse content-type params
 *
 * @param {String} str
 * @return {Object}
 * @api private
 */

const params = str =>
  str.split(/ *; */).reduce((obj, str) => {
    const parts = str.split(/ *= */)
    const key = parts.shift()
    const val = parts.shift()
    if (key && val) obj[key] = val
    return obj
  }, {})

/**
 * Parse Link header fields.
 *
 * @param {String} str
 * @return {Object}
 * @api private
 */

const parseLinks = str =>
  str.split(/ *, */).reduce((obj, str) => {
    const parts = str.split(/ *; */)
    const url = parts[0].slice(1, -1)
    const rel = parts[1].split(/ *= */)[1].slice(1, -1)
    obj[rel] = url
    return obj
  }, {})
