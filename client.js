
var parsemime = require('parse-mime')
var lazy = require('lazy-property')
var format = require('url').format
var Request = require('./common')
var parse = require('url').parse
var Result = require('result')
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
  exports[method] = function(url){
    if (typeof url == 'string') url = parse(url, true)
    if (!url.hostname) url.hostname = location.hostname
    if (!url.protocol) url.protocol = location.protocol
    if (!url.port) url.port = location.port
    if (!url.host) url.host = location.host
    url.method = method
    return new Request(url)
  }
  method = method.toUpperCase()
})

/**
 * default properties
 */

Request.prototype.progress = 0

/**
 * specialize the `set` and `type` methods
 */

var _set = Request.prototype.set
Request.prototype.set = function(key, value){
  if (typeof key == 'string'
  && key.toLowerCase() in unsafeHeaders) return this
  return _set.call(this, key, value)
}

var _type = Request.prototype.type
Request.prototype.type = function(str){
  if (str == 'blob') this._responseType = str
  return _type.call(this, str)
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

Request.prototype.onNeed = function(){
  var self = this
  return this.response.then(function(res){
    if (res.statusType > 2) throw res
    self.write = Result.prototype.write // HACK
    return parsemime(res.type, res.text)
  })
}

lazy(Request.prototype, 'request', getXHR)

lazy(Request.prototype, 'response', function(){
  var data = this.serializeData()
  var result = new Result
  var xhr = this.request
  var url = this.options
  var self = this

  xhr.onreadystatechange = function(){
    switch (xhr.readyState) {
      case 1: self.emit('open'); break
      case 2: self.emit('sent'); break
      case 3: self.emit('receiving'); break
      case 4:
        if (!xhr.status) {
          if (self.aborted) return self.timeoutError()
          return result.error(crossDomainError())
        }
        xhr.statusCode = xhr.status
        xhr.headers = parseHeader(xhr.getAllResponseHeaders())
        xhr.text = xhr.response
        self.res = exports.sugar(xhr)
        result.write(xhr)
    }
  }

  xhr.onprogress = function(e){
    self.progress = e.percent = e.loaded / e.total * 100
    self.emit('progress', e)
  }

  url.search = qs.stringify(url.query)
  url.host = url.hostname + ':' + url.port
  xhr.open(url.method, format(url), true)
  if (this._withCredentials) xhr.withCredentials = true
  xhr.responseType = this._responseType || 'text'

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
  return str.trim().split(/\r?\n/).reduce(function(header, line){
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

Request.prototype.write = function(s){
  this._data = (this._data || '') + s
  return false
}

Request.prototype.end = function(s){
  if (s != null) this.write(s)
  this.response
  return this
}

var unsafeHeaders = [
  'access-control-request-headers',
  'access-control-request-method',
  'content-transfer-encoding',
  'transfer-encoding',
  'accept-encoding',
  'content-length',
  'accept-charset',
  'connection',
  'keep-alive',
  'user-agent',
  'referer',
  'trailer',
  'cookie2',
  'upgrade',
  'origin',
  'cookie',
  'expect',
  'date',
  'host',
  'via'
].reduce(function(obj, key){
  obj[key] = true
  return obj
}, {})
