
# solicit

A declarative http client based off [superagent](//github.com/visionmedia/superagent). Versions available for both the browser and node with the same API and shared test suite.

## Installation

With your favorite package manager:

- [packin](//github.com/jkroso/packin): `packin add solicit`
- [component](//github.com/component/component#installing-packages): `component install jkroso/solicit`
- [npm](//npmjs.org/doc/cli/npm-install.html): `npm install solicit`

then in your app:

```js
var request = require('solicit')
```

### Example

```js
request.get('component.io/components/all').read(console.log) // => a whole lot of JSON
```

## API

### Solicit.[verb](http://github.com/visionmedia/node-methods)(url:String|Object)

Each http verb has a corresponding helper function for making that type of request. Each function will return a `Request`. Requests are [deferred results](//github.com/jkroso/result) so you are free to configure them as much as you like with the methods mentioned below then call `read()` or `then()` to actually send the request and read the response. The main verbs you will be using are:

- get
- post
- put
- head
- delete

### Request.set(field:String|Object, val:String)

  Set header `field` to `val`, or multiple fields with one object.

  Examples:

```js
request.get('/')
  .set('Accept', 'application/json')
  .set('X-API-Key', 'foobar')
  .read(callback)
```

```js
request.get('/')
  .set({ Accept: 'application/json', 'X-API-Key': 'foobar' })
  .read(callback)
```

### Request.get(field)

  Get request header `field`.

### Request.query(val:Object|String)

  Add query-string `val`.

  Examples:

```js
request.get('/shoes')
  .query('size=10')
  .query({ color: 'blue' })
```

### Request.type(type)

  Set the "Content-Type" header. Common `type`s can
  be set with a shorthand string:

```js
request.post('/')
  .type('application/json')
  .send(jsonstring)
  .read(callback)
```

```js
request.post('/')
  .type('json')
  .send(jsonstring)
  .read(callback)
```

### Request.accept(type)

  Set the "Accept" header. As with `Request.type()`
  shorthand strings are allowed

### Request.timeout(ms)

  Set timeout to `ms`.

### Request.clearTimeout()

  Clear previous timeout.

### Request.abort()

  Abort and clear timeout.

### Request.agent(agent:http.Agent)

  Gets/sets the `Agent` to use for this HTTP request.
  The default (if this function is not called) is to
  opt out of connection pooling (`agent: false`).

### Request.send(data:String|Object)

  Send `data`, defaulting the `.type()` to "json" when
  an object is given.

  Examples:

```js
// manual json
request.post('/user')
  .type('json')
  .send('{"name":"tj"}')
  .read(callback)
```

```js
// auto json
request.post('/user')
  .send({ name: 'tj' })
  .read(callback)
```

```js
// manual x-www-form-urlencoded
request.post('/user')
  .type('form')
  .send('name=tj')
  .read(callback)
```

```js
// auto x-www-form-urlencoded
request.post('/user')
  .type('form')
  .send({ name: 'tj' })
  .read(callback)
```

```js
// string defaults to x-www-form-urlencoded
request.post('/user')
  .send('name=tj')
  .send('foo=bar')
  .send('bar=baz')
  .read(callback)
```

### Request.auth(user, pass)

  Set Authorization field value with `user` and `pass`

### Request.maxRedirects(n)

  Set the max redirects to `n`.

### Request.path(...)

  Set the path. `arguments` is joined to form the path:

```js
get('https://api.github.com')
  .path('repos', user, repo, 'tags')
  .read(callback)
```

### Request.write(data:Buffer|String, [encoding='utf8'])

  Write `data` to the socket.

### Request.end([data]:Buffer|String, [encoding='utf8'])

  send request

### Request.pipe(stream, options)

  Pipe the request body to `stream`