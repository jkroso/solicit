import Request, {serialize, sugar} from './common'
import parsemime from 'parse-mime'
import lazy from 'lazy-property'
import type from '@jkroso/type'
import Result from 'result'
import {format} from 'url'
import {parse} from 'url'
import getXHR from 'xhr'
import qs from 'qs'

/**
 * generate function for each HTTP verb
 *
 * @param {String} method
 * @return {Request}
 * @api public
 */

const createRequest = method => url => {
  if (typeof url == 'string') url = parse(url, true)
  if (!url.hostname) url.hostname = location.hostname
  if (!url.protocol) url.protocol = location.protocol
  if (!url.port) url.port = location.port
  if (!url.host) url.host = location.host
  url.method = method
  return new Request(url)
}

export const patch = createRequest('PATCH')
export const del = createRequest('DELETE')
export const head = createRequest('HEAD')
export const post = createRequest('POST')
export const get = createRequest('GET')
export const put = createRequest('PUT')

/**
 * default properties
 */

Request.prototype.progress = 0

/**
 * specialize the `set` and `type` methods
 */

const _set = Request.prototype.set
Request.prototype.set = function(key, value){
  if (typeof key == 'string' && key.toLowerCase() in unsafeHeaders) return this
  return _set.call(this, key, value)
}

const _type = Request.prototype.type
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
  const data = this.serializeData()
  const result = new Result('pending')
  const xhr = this.request
  const url = this.options

  xhr.onreadystatechange = () => {
    switch (xhr.readyState) {
      case 1: this.emit('open'); break
      case 2: this.emit('sent'); break
      case 3: this.emit('receiving'); break
      case 4:
        if (!xhr.status) {
          if (this.aborted) return this.timeoutError()
          return result.error(crossDomainError())
        }
        xhr.statusCode = xhr.status
        xhr.headers = parseHeader(xhr.getAllResponseHeaders())
        xhr.text = xhr.response
        this.res = sugar(xhr)
        result.write(xhr)
    }
  }

  xhr.onprogress = e => {
    this.progress = e.percent = e.loaded / e.total * 100
    this.emit('progress', e)
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

const parseHeader = str =>
  str.trim().split(/\r?\n/).reduce((header, line) => {
    const index = line.indexOf(':')
    const field = line.slice(0, index).toLowerCase()
    const val = line.slice(index + 1).trim()
    header[field] = val
    return header
  }, {})

Request.prototype.serializeData = function(){
  const data = this._data
  const url = this.options
  if (data
   && url.method != 'GET'
   && url.method != 'HEAD'
   && typeof data != 'string'
   && !isHost(data)) {
    var fn = serialize[this.get('Content-Type')]
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

const isHost = obj => /file|blob|form\-data/.test(type(obj))

const crossDomainError = () => {
  var error = new Error('Origin is not allowed by Access-Control-Allow-Origin')
  error.crossDomain = true
  return error
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
const unsafeHeaders = [
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
].reduce((obj, key) => {
  obj[key] = true
  return obj
}, {})
