
var base64 = require('base64-encode')
var setter = require('setter-method')
var statusCodes = require('./codes')
var defer = require('result/defer')
var lazy = require('lazy-property')
var Emitter = require('emitter')
var join = require('path/join')
var merge = require('merge')
var qs = require('qs')

module.exports = exports = Request

/**
 * expose helpers
 */

exports.sugar = sugar

/**
 * mime type map
 */

var mime = [
  'form',
  'urlencoded',
  'form-data'
].reduce(function(types, mime){
  types[mime] = 'application/x-www-form-urlencoded'
  return types
}, Object.create(require('mime-component/types')))

/**
 * default serializers
 */

exports.serialize = {
  'application/json': JSON.stringify,
  'application/x-www-form-urlencoded': qs.stringify
}

/**
 * the Request class
 *
 * @param {Object} options
 */

function Request(options){
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
 * inherit from Deferred
 */

Request.prototype = new defer.Deferred

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

Request.prototype.set = function(field, val){
  if (typeof field == 'object') merge(this.header, field)
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

Request.prototype.get = function(field){
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

Request.prototype.query = function(val){
  if (typeof val == 'string') val = qs.parse(val)
  if (!this.options.query) this.options.query = {}
  merge(this.options.query, val)
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

Request.prototype.type = function(type){
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

Request.prototype.accept = function(type){
  if (type[0] == '.') type = type.slice(1)
  return this.set('Accept', type in mime ? mime[type] : type)
}

/**
 * start the requests timeout
 *
 * @api private
 */

Request.prototype.startTimer = function(){
  if (this._timeout == Infinity) return
  var self = this
  this._timer = setTimeout(function(){
    self.timeoutError()
    self.abort()
  }, this._timeout)
}

/**
 * Clear previous timeout.
 *
 * @return {this}
 * @api public
 */

Request.prototype.clearTimeout = function(){
  this._timeout = Infinity
  clearTimeout(this._timer)
  return this
}

/**
 * set the response to be a timeout error
 *
 * @api private
 */

Request.prototype.timeoutError = function(){
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

Request.prototype.abort = function(){
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

Request.prototype.agent = function(agent){
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

Request.prototype.send = function(data){
  var type = this.header['Content-Type']

  if (typeof data == 'object') {
    this._data = merge(this._data || {}, data)
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

Request.prototype.auth = function(user, pass){
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

Request.prototype.path = function(){
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

Request.prototype.clone = function(){
  var clone = Object.create(this)
  clone.header = Object.create(this.header)
  clone.options = Object.create(this.options)
  return clone
}

/**
 * add sugar to the response
 *
 * @param {IncomingMessage} res
 * @return {IncomingMessage}
 * @api private
 */

function sugar(res){
  var type = res.headers['content-type'] || ''
  res.header = res.headers
  merge(res, params(type))
  res.type = type.split(/ *; */)[0]
  res.statusType = res.status / 100 | 0
  res.message = statusCodes[res.status]
  var link = res.headers['link']
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

function params(str){
  return str.split(/ *; */).reduce(function(obj, str){
    var parts = str.split(/ *= */)
    var key = parts.shift()
    var val = parts.shift()
    if (key && val) obj[key] = val
    return obj
  }, {})
}

/**
 * Parse Link header fields.
 *
 * @param {String} str
 * @return {Object}
 * @api private
 */

function parseLinks(str){
  return str.split(/ *, */).reduce(function(obj, str){
    var parts = str.split(/ *; */)
    var url = parts[0].slice(1, -1)
    var rel = parts[1].split(/ *= */)[1].slice(1, -1)
    obj[rel] = url
    return obj
  }, {})
}
