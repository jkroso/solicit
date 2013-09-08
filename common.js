
var Deferred = require('result/defer')
var Emitter = require('emitter/light')
var base64 = require('base64-encode')
var statusCodes = require('./codes')
var inherit = require('inherit')
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
}, Object.create(require('mime/types')))

/**
 * default serializers
 */

exports.serialize = {
	'application/json': JSON.stringify,
	'application/x-www-form-urlencoded': qs.stringify
}

/**
 * default parsers
 */

exports.parse = {
	'application/json': JSON.parse,
	'application/x-www-form-urlencoded': qs.parse
}


/**
 * the Request class
 *
 * @param {Object} options
 */

function Request(options){
	this.options = options
	this.header = {}
	this.redirects = []
	if (options.method != 'HEAD') {
		this.set('Accept-Encoding', 'gzip, deflate')
	}
	if (options.auth) {
		var auth = options.auth.split(':')
		this.auth(auth[0], auth[1])
	}
	this.on('pipe', function(){
		this.pipedTo = true
	})
}

/**
 * inherit from Deferred
 */

inherit(Request, Deferred)

/**
 * mixin Emitter
 */

Emitter(Request.prototype)

/**
 * default config
 */

Request.prototype._maxRedirects = Infinity

/**
 * Set header `field` to `val`, or multiple fields with one object.
 *
 * Examples:
 *
 *      req.get('/')
 *        .set('Accept', 'application/json')
 *        .set('X-API-Key', 'foobar')
 *        .end(callback)
 *
 *      req.get('/')
 *        .set({ Accept: 'application/json', 'X-API-Key': 'foobar' })
 *        .end(callback)
 *
 * @param {String|Object} field
 * @param {String} val
 * @return {this}
 * @api public
 */

Request.prototype.set = function(field, val){
	if (typeof field == 'object') {
		merge(this.header, field)
	} else {
		this.header[field] = val
	}
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
 * Set _Content-Type_ response header passed through `mime.lookup()`
 *
 * Examples:
 *
 *      request.post('/')
 *        .type('xml')
 *        .send(xmlstring)
 *        .end(callback)
 *
 *      request.post('/')
 *        .type('json')
 *        .send(jsonstring)
 *        .end(callback)
 *
 *      request.post('/')
 *        .type('application/json')
 *        .send(jsonstring)
 *        .end(callback)
 *
 * @param {String} type
 * @return {this}
 * @api public
 */

Request.prototype.type = function(type){
	if (type.indexOf('/') < 0) {
		if (type[0] == '.') type = type.slice(1)
		type = mime[type]
	}
	return this.set('Content-Type', type)
}

/**
 * Set timeout to `ms`.
 *
 * @param {Number} ms
 * @return {this}
 * @api public
 */

Request.prototype.timeout = function(ms){
	this._timeout = ms
	return this
}

/**
 * start the requests timeout
 *
 * @api private
 */

Request.prototype.startTimer = function(){
	var timeout = this._timeout
	var self = this
	if (timeout) {
		this._timer = setTimeout(function(){
			var err = new Error('timeout of ' + timeout + 'ms exceeded')
			err.timeout = timeout
			self.abort()
			self._res.error(err)
		}, timeout)
	}
}

/**
 * Clear previous timeout.
 *
 * @return {this}
 * @api public
 */

Request.prototype.clearTimeout = function(){
	this._timeout = 0
	clearTimeout(this._timer)
	return this
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
	this.req.abort()
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
 *       // manual json
 *       request.post('/user')
 *         .type('json')
 *         .send('{"name":"tj"}')
 *         .end(callback)
 *
 *       // auto json
 *       request.post('/user')
 *         .send({ name: 'tj' })
 *         .end(callback)
 *
 *       // manual x-www-form-urlencoded
 *       request.post('/user')
 *         .type('form')
 *         .send('name=tj')
 *         .end(callback)
 *
 *       // auto x-www-form-urlencoded
 *       request.post('/user')
 *         .type('form')
 *         .send({ name: 'tj' })
 *         .end(callback)
 *
 *       // string defaults to x-www-form-urlencoded
 *       request.post('/user')
 *         .send('name=tj')
 *         .send('foo=bar')
 *         .send('bar=baz')
 *         .end(callback)
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
 * Set the max redirects to `n`.
 *
 * @param {Number} n
 * @return {this}
 * @api public
 */

Request.prototype.maxRedirects = function(n){
	this._maxRedirects = n
	return this
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
	}, {});
}