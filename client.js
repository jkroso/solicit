
var lazy = require('lazy-property')
var format = require('url').format
var Request = require('./common')
var set = Request.prototype.set
var Result = require('result')
var write = Result.prototype.write
var parse = require('url').parse
var reduce = require('reduce')
var merge = require('merge')
var getXHR = require('xhr')
var type = require('type')
var qs = require('qs')

module.exports = exports = Request

/**
 * generate function for each HTTP verb
 *
 * @param {String} method
 * @return {Request}
 * @api public
 */

;[
	'get',
	'head',
	'put',
	'post',
	'patch',
	'delete',
].forEach(function(method){
	var name = method == 'delete' ? 'del' : method
	method = method.toUpperCase()
	exports[name] = function(url){
		if (typeof url == 'string') url = parse(url, true)
		if (!url.hostname) url.hostname = location.hostname
		if (!url.protocol) url.protocol = location.protocol
		if (!url.port) url.port = location.port
		if (!url.host) url.host = location.host
		url.method = method
		return new Request(url)
	}
})

Request.prototype.set = function(key, value){
	if (typeof key == 'string'
	&& key.toLowerCase() in unsafeHeaders) return this
	return set.call(this, key, value)
}

/**
 * Enable transmission of cookies with x-domain requests.
 *
 * Note that for this to work the origin must not be
 * using "Access-Control-Allow-Origin" with a wildcard,
 * and also must set "Access-Control-Allow-Credentials"
 * to "true".
 *
 * @api public
 */

Request.prototype.withCredentials = function(){
	this._withCredentials = true
	return this
}

lazy(Request.prototype, 'request', getXHR)

lazy(Request.prototype, 'response', function(){
	var result = new Result
	var data = this.serializeData()
	var xhr = this.request
	var url = this.options
	var self = this

	// CORS
	if (this._withCredentials) xhr.withCredentials = true

	xhr.onreadystatechange = function(){
		if (xhr.readyState != 4) return
		if (!xhr.status) {
			if (self.aborted) return self.timeoutError()
			return result.error(crossDomainError())
		}
		xhr.statusCode = xhr.status
		xhr.headers = parseHeader(xhr.getAllResponseHeaders())
		self.res = exports.sugar(xhr)
		result.write(xhr)
	}

	if (xhr.upload) xhr.upload.onprogress = function(e){
		e.percent = e.loaded / e.total * 100
		self.emit('progress', e)
	}

	url.search = qs.stringify(url.query)
	url.host = url.hostname + ':' + url.port
	xhr.open(url.method, format(url), true)

	for (var key in this.header) {
		xhr.setRequestHeader(key, this.header[key])
	}

	this.startTimer()
	xhr.send(data)

	return result
})

/**
 * Parse the given header `str` into
 * an object containing the mapped fields.
 *
 * @param {String} str
 * @return {Object}
 * @api private
 */

function parseHeader(str) {
  var lines = str.split(/\r?\n/)
  lines.pop() // trailing CRLF
  return reduce(lines, function(header, line){
    var index = line.indexOf(':')
    var field = line.slice(0, index).toLowerCase()
    var val = line.slice(index + 1).trim()
    header[field] = val
    return header
  }, {})
}

Request.prototype.serializeData = function(){
	var data = this._data
	var url = this.options
	if (data
	&& url.method != 'GET'
	&& url.method != 'HEAD'
	&& typeof data != 'string'
	&& !isHost(data)) {
		var fn = exports.serialize[this.get('Content-Type')]
		if (fn) return fn(data)
	}
	return data
}

/**
 * Check if `obj` is a host object,
 * we don't want to serialize these
 *
 * @param {Object} obj
 * @return {Boolean}
 * @api private
 */

function isHost(obj) {
	return /file|blob|form\-data/.test(type(obj))
}

function crossDomainError(){
	var err = new Error('Origin is not allowed by Access-Control-Allow-Origin')
	err.crossDomain = true
	return err
}

Request.prototype.timeoutError = function(){
  var time = this._timeout
  var err = new Error('timeout of ' + time + 'ms exceeded')
  err.timeout = time
  this.response.error(err)
}

Request.prototype.onNeed = function(){
	var self = this
	this.response.read(function(res){
		if (res.statusType > 2) return self.error(res)
		res.text = res.responseText
		var parse = self._parser
			? self._parser
			: exports.parse[res.type]
		write.call(self, parse ? parse(res.text) : res.text)
	}, function(e){
		self.error(e)
	})
}

Request.prototype.write = function(s){
	this._data = (this._data || '') + s
	return false
}

Request.prototype.end = function(s){
	if (s != null) this.write(s)
	this.response
	return this
}

var unsafeHeaders = reduce([
	'accept-charset',
	'accept-encoding',
	'access-control-request-headers',
	'access-control-request-method',
	'connection',
	'content-length',
	'cookie',
	'cookie2',
	'content-transfer-encoding',
	'date',
	'expect',
	'host',
	'keep-alive',
	'origin',
	'referer',
	'trailer',
	'transfer-encoding',
	'upgrade',
	'user-agent',
	'via',
], function(obj, key){
	obj[key] = true
	return obj
}, {})