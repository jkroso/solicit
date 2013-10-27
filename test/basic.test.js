
var assert = require('assert/index')
var chai = require('./chai')
var request = require('..')
var url = require('url')
var post = request.post
var get = request.get

describe('request', function(){
	describe('with an object', function(){
		it('should format the url', function(done){
			get(url.parse('http://localhost:5000/login'))
			.read(function(res){
				assert('<form id="login"></form>' == res)
				done()
			})
		})
	})

	describe('.read()', function(){
		it('should pass in the response body', function(done){
			get('http://localhost:5000/login').read(function(res){
				assert('<form id="login"></form>' == res)
				done()
			})
		})

		it('should follow redirects', function(done){
			get('http://localhost:5000/movies').read(function(res){
				assert('first movie page' == res)
				done()
			})
		})

		describe('context inside the callback', function(){
			it('should be the request', function(done){
				var req = get('http://localhost:5000/login')
				req.read(function(){
					assert(this === req)
					done()
				})
			})

			it('should provide the response object', function(done){
				get('http://localhost:5000/login').read(function(){
					assert('<form id="login"></form>' == this.res.text)
					done()
				})
			})
		})
	})

	// node
	if (typeof window == 'undefined') {
		describe('without a schema', function(){
			it('should default to http', function(done){
				get('localhost:5000/login').read(function(res){
					assert('<form id="login"></form>' == res)
					done()
				})
			})

			it('should default to localhost', function(done){
				get(':5000/login').read(function(res){
					assert('<form id="login"></form>' == res)
					done()
				})
			})
		})
	} else { // browser
		describe('without a host', function(){
			it('should default to the current host', function(done){
				get('/login').read(function(res){
					assert('<form id="login"></form>' == res)
					done()
				})
			})
		})
	}

	describe('error', function(){
		it('should be the response object', function(done){
			get('http://localhost:5000/error').read(null, function(res){
				assert(res.message == 'Internal Server Error')
				assert(res.statusCode == 500)
				done()
			})
		})
	})

	describe('default headers', function(){
		it('user-agent', function(done){
			post('http://localhost:5000/echo')
			.response.read(function(res){
				assert(res.header['user-agent'])
				done()
			})
		})
	})

	describe('.response', function(){
		describe('res.charset', function(){
			it('should be set when present', function(done){
				get('http://localhost:5000/login')
				.response.read(function(res){
					assert(res.charset == 'utf-8')
					done()
				})
			})
		})

		describe('res.statusType', function(){
			it('should provide the first digit', function(done){
				get('http://localhost:5000/login')
				.response.read(function(res){
					assert(200 == res.status)
					assert(2 == res.statusType)
					done()
				})
			})
		})

		describe('res.type', function(){
			it('should provide the mime-type void of params', function(done){
				get('http://localhost:5000/login')
				.response.read(function(res){
					res.should.have.property('type', 'text/html')
					res.should.have.property('charset', 'utf-8')
					done()
				})
			})
		})

		describe('res.links', function(){
			it('should default to undefined', function(done){
				get('http://localhost:5000/login')
				.response.read(function(res){
					assert(res.links == null)
					done()
				})
			})

			it('should parse the Link header field', function(done){
				get('http://localhost:5000/links')
				.response.read(function(res){
					res.links.should.eql({
						next: 'https://api.github.com/repos/visionmedia/mocha/issues?page=2'
					})
					done()
				})
			})
		})
	})

	describe('.set(field, val)', function(){
		it('should set the header field', function(done){
			post('http://localhost:5000/echo')
			.set('X-Foo', 'bar')
			.set('X-Bar', 'baz')
			.response.read(function(res){
				assert('bar' == res.header['x-foo'])
				assert('baz' == res.header['x-bar'])
				done()
			})
		})
	})

	describe('.set(obj)', function(){
		it('should set the header fields', function(done){
			post('http://localhost:5000/echo')
			.set({ 'X-Foo': 'bar', 'X-Bar': 'baz' })
			.response.read(function(res){
				assert('bar' == res.header['x-foo'])
				assert('baz' == res.header['x-bar'])
				done()
			})
		})
	})

	describe('.type(str)', function(){
		it('should set the Content-Type', function(done){
			post('http://localhost:5000/echo')
			.type('text/x-foo')
			.response.read(function(res){
				res.header['content-type'].should.equal('text/x-foo')
				done()
			})
		})

		it('should map "json"', function(done){
			post('http://localhost:5000/echo')
			.type('json')
			.response.read(function(res){
				res.header['content-type'].should.equal('application/json')
				done()
			})
		})

		it('should map "html"', function(done){
			post('http://localhost:5000/echo')
			.type('html')
			.response.read(function(res){
				res.header['content-type'].should.equal('text/html')
				done()
			})
		})
	})

	describe('.accept(str)', function(){
		it('should set the Accept header', function(done){
			post('http://localhost:5000/echo')
			.accept('text/x-foo')
			.response.read(function(res){
				res.header['accept'].should.equal('text/x-foo')
				done()
			})
		})

		it('should map "json"', function(done){
			post('http://localhost:5000/echo')
			.accept('json')
			.response.read(function(res){
				res.header['accept'].should.equal('application/json')
				done()
			})
		})
	})

	describe('.write(str)', function(){
		it('should write the given data', function(done){
			var req = post('http://localhost:5000/echo')
			req.set('Content-Type', 'application/json')
			req.write('{"name"').should.be.a('boolean')
			req.write(':"tobi"}').should.be.a('boolean')
			req.read(function(res){
				res.should.eql({ name: 'tobi' })
				done()
			})
		})
	})

	describe('.send(str)', function(){
		it('should write the string', function(done){
			post('http://localhost:5000/echo')
			.type('json')
			.send('{"name":"tobi"}')
			.read(function(res){
				res.should.eql({ name: 'tobi' })
				done()
			})
		})
	})

	describe('.send(Object)', function(){
		it('should default to json', function(done){
			post('http://localhost:5000/echo')
			.send({ name: 'tobi' })
			.read(function(res){
				res.should.eql({ name: 'tobi' })
				done()
			})
		})

		describe('when called several times', function(){
			it('should merge the objects', function(done){
				post('http://localhost:5000/echo')
				.send({ name: 'tobi' })
				.send({ age: 1 })
				.read(function(res){
					res.should.eql({ name: 'tobi', age: 1 })
					done()
				})
			})
		})
	})

	describe('.timeout(ms)', function(){
		describe('when timeout is exceeded', function(){
			it('should error', function(done){
				get('http://localhost:5000/timeout/50')
				.timeout(30)
				.read(null, function(err){
					err.message.should.match(/timeout of 30ms exceeded/i)
					assert(typeof err.timeout == 'number')
					done()
				})
			})
		})
	})

	describe('.query(String)', function(){
		it('should work when called once', function(done){
			request
			.delete('http://localhost:5000/query')
			.query('name=tobi')
			.read(function(res){
				res.should.eql({ name: 'tobi' })
				done()
			})
		})

		it('should work with url query-string', function(done){
			request
			.delete('http://localhost:5000/query?name=tobi')
			.query('age=2')
			.read(function(res){
				res.should.eql({ name: 'tobi', age: '2' })
				done()
			})
		})

		it('should work when called multiple times', function(done){
			request
			.delete('http://localhost:5000/query')
			.query('name=tobi')
			.query('age=2')
			.read(function(res){
				res.should.eql({ name: 'tobi', age: '2' })
				done()
			})
		})

		it('should work when mixed with objects', function(done){
			request
			.delete('http://localhost:5000/query')
			.query('name=tobi')
			.query({ age: 2 })
			.read(function(res){
				res.should.eql({ name: 'tobi', age: '2' })
				done()
			})
		})
	})

	describe('req.query(Object)', function(){
		it('should construct the query-string', function(done){
			request
			.delete('http://localhost:5000/query')
			.query({ name: 'tobi' })
			.query({ order: 'asc' })
			.query({ limit: ['1', '2'] })
			.read(function(res){
				res.should.eql({ name: 'tobi', order: 'asc', limit: ['1', '2'] })
				done()
			})
		})

		it('should not error on dates', function(done){
			request
			.delete('http://localhost:5000/query')
			.query({ at: new Date(0) })
			.read(function(res){
				assert(String(new Date(0)) == res.at)
				done()
			})
		})

		it('should work after setting header fields', function(done){
			request
			.delete('http://localhost:5000/query')
			.set('Foo', 'bar')
			.set('Bar', 'baz')
			.query({ name: 'tobi' })
			.query({ order: 'asc' })
			.query({ limit: ['1', '2'] })
			.read(function(res){
				res.should.eql({ name: 'tobi', order: 'asc', limit: ['1', '2'] })
				done()
			})
		})

		it('should append to the original query-string', function(done){
			request
			.delete('http://localhost:5000/query?name=tobi')
			.query({ order: 'asc' })
			.read(function(res) {
				res.should.eql({ name: 'tobi', order: 'asc' })
				done()
			})
		})

		it('should retain the original query-string', function(done){
			request
			.delete('http://localhost:5000/query?name=tobi')
			.read(function(res) {
				res.should.eql({ name: 'tobi' })
				done()
			})
		})
	})

	describe('req.path(...)', function(){
		it('should set the url path', function(done){
			get('http://localhost:5000')
			.path('/movies/all/0')
			.read(function(res){
				assert(res == 'first movie page')
				done()
			})
		})

		it('should handle missing leading slash', function(done){
			get('http://localhost:5000')
			.path('movies/all/0')
			.read(function(res){
				assert(res == 'first movie page')
				done()
			})
		})

		it('should join path segments', function(done){
			get('http://localhost:5000')
			.path('movies', 'all', 0)
			.read(function(res){
				assert(res == 'first movie page')
				done()
			})
		})
	})
})

describe('Basic auth', function(){
	describe('when credentials are present in url', function(){
		it('should set Authorization', function(done){
			get('http://tobi:learnboost@localhost:5000/auth')
			.read(function(res){
				assert(res == 'you win!')
				done()
			}, done)
		})
	})

	describe('req.auth(user, pass)', function(){
		it('should set Authorization', function(done){
			get('http://localhost:5000/auth')
			.auth('tobi', 'learnboost')
			.read(function(res){
				assert(res == 'you win!')
				done()
			}, done)
		})
	})
})