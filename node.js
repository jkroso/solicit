var parsemime = require('parse-mime')
var lazy = require('lazy-property')
var Request = require('./common')
var parse = require('url').parse
var methods = require('methods')
var Result = require('result')
var merge = require('merge')
var zlib = require('zlib')
var qs = require('qs')

module.exports = exports = Request

/**
 * default protocols
 */

exports.protocols = {
  'http:': require('http').request,
  'https:': require('https').request
}

/**
 * generate function for each HTTP verb
 *
 * @param {String} method
 * @return {Request}
 * @api public
 */

methods.forEach(function(method){
  exports[method] = function(url){
    if (typeof url == 'string') {
      if (url.indexOf('http') !== 0) url = 'http://' + url
      url = parse(url, true)
    }
    url.method = method
    return new Request(url).set('user-agent', userAgent)
  }
  method = method.toUpperCase()
})

var userAgent = [
  process.title,
  process.version,
  process.platform,
  process.arch
].join(' ')

/**
 * translate `this._data` to a string so it can
 * be sent in an `OutGoingMessage`. This method
 * must be called before `.request()`
 *
 * @return {String}
 * @api private
 */

Request.prototype.serializeData = function(){
  var data = this._data
  if (data) {
    if (typeof data != 'string') {
      var fn = exports.serialize[this.header['Content-Type']]
      if (fn) data = fn(data)
    }
    if (typeof data == 'string' && !('Content-Length' in this.header)) {
      this.set('Content-Length', Buffer.byteLength(data))
    }
    return data
  }
}

/**
 * The real request, created lazily
 *
 * @type {OutgoingMessage}
 * @api private
 */

lazy(Request.prototype, 'request', function(){
  var url = this.options
  var query = qs.stringify(url.query)
  var path = encodeURI(url.pathname)
  return exports.protocols[url.protocol]({
    path: query ? (path + '?' + query) : path,
    headers: merge({}, this.header),
    method: url.method,
    host: url.hostname || 'localhost',
    port: url.port,
    agent: false
  })
})

/**
 * onNeed handler, runs the request and parses the
 * response. onNeed is only called the first time
 * either `.read()` or `.then()` is called.
 *
 * @api private
 */

Request.prototype.onNeed = function(){
  var self = this
  return this.response.then(function(res){
    if (res.statusType > 2) throw res
    var result = new Result

    res.text = '' // TODO: support binary
    res.on('readable', function(){
      this.text += this.read() || ''
    }).on('end', function(){
      self.write = Result.prototype.write // HACK
      try {
        result.write(parsemime(res.type, res.text))
      } catch (e) {
        result.error(e)
      }
    }).on('error', function(e){
      result.error(e)
    })

    return result
  })
}

/**
 * get a response object
 *
 * @type {Result<IncomingMessage>}
 * @api private
 */

lazy(Request.prototype, 'response', function(){
  var result = new Result
  var data = this.serializeData()
  var url = this.options
  var self = this

  this.request
    .on('response', onResponse)
    .on('error', onError)

  if (!this.pipedTo) this.end(data)

  function onResponse(res){
    if (isRedirect(res.statusCode)) {
      // ensure the response is being consumed
      // this is required for Node v0.10+
      res.resume()
      self.emit('redirect', res)

      if (url.method != 'HEAD' && url.method != 'GET') {
        return onError(new Error('cant redirect a ' + url.method))
      }

      if (self.redirects.length >= self._maxRedirects) {
        return onError(sugar(res))
      }

      url = redirection(url, res.headers.location)
      url.headers = self.header

      var isLoop = self.redirects.some(function(href){
        return url.href == href
      })

      if (isLoop) {
        return onError(new Error('infinite redirect loop detected'))
      }

      self.redirects.push(url.href)

      exports.protocols[url.protocol](url)
        .on('response', onResponse)
        .on('error', onError)
        .end()
    } else {
      var stream = res
      // inflate
      if (/^(deflate|gzip)$/.test(res.headers['content-encoding'])) {
        stream = res.pipe(zlib.createUnzip())
        stream.statusCode = res.statusCode
        stream.headers = res.headers
      }
      self.clearTimeout()
      self.res = sugar(stream)
      result.write(stream)
    }
  }

  function onError(e){
    self.clearTimeout()
    if (!self.aborted) self.error(e)
  }

  return result
})

function sugar(res){
  res.status = res.statusCode
  return exports.sugar(res)
}

/**
 * Write `data` to the socket.
 *
 * @param {Buffer|String} data
 * @param {String} [encoding='utf8']
 * @return {Boolean}
 * @api public
 */

Request.prototype.write = function(data, encoding){
  return this.request.write(data, encoding)
}

/**
 * send request
 *
 * @param {Buffer|String} [data]
 * @param {String} [encoding]
 * @return {this}
 * @api public
 */

Request.prototype.end = function(data, encoding){
  this.startTimer()
  this.request.end(data, encoding)
  return this
}

/**
 * Pipe the request body to `stream`
 *
 * @param {Stream} stream
 * @param {Object} options
 * @return {Stream}
 * @api public
 */

Request.prototype.pipe = function(stream, options){
  this.response.read(function(res){
    res.pipe(stream, options)
  })
  return stream
}

/**
 * create full url based of a redirect header
 *
 * @param {Object} url
 * @param {String} link
 * @return {Object}
 * @api private
 */

function redirection(url, link){
  // relative path
  if (link.indexOf('://') < 0) {
    if (link.indexOf('//') !== 0) {
      link = '//' + url.host + link
    }
    link = url.protocol + link
  }
  link = parse(link)
  link.method = 'GET'
  return link
}

/**
 * Check if we should follow the redirect `code`
 *
 * @param {Number} code
 * @return {Boolean}
 * @api private
 */

function isRedirect(code) {
  return [301, 302, 303, 305, 307].indexOf(code) >= 0
}
