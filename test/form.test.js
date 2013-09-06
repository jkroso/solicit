
var assert = require('assert/index')
var chai = require('./chai')
var request = require('..')
var post = request.post
var get = request.get

describe('req.send(Object) as "form"', function(){
	describe('with req.type() set to form', function(){
		it('should send x-www-form-urlencoded data', function(done){
			post('http://localhost:5000/echo')
			.type('form')
			.send({ name: 'tobi' })
			.response().read(function(res){
				res.header.should.have.property('content-type', 'application/x-www-form-urlencoded')
				done()
			})
		})

		it('should parse the body', function(done){
			get('http://localhost:5000/form-data').read(function(res){
				res.should.eql({ pet: { name: 'manny' }})
				done()
			})
		})
	})

	describe('when called several times', function(){
		it('should merge the objects', function(done){
			post('http://localhost:5000/echo')
			.type('form')
			.send({ name: { first: 'tobi', last: 'holowaychuk' } })
			.send({ age: '1' })
			.read(function(body){
				body.should.eql({
					name: {
						first: 'tobi',
						last: 'holowaychuk'
					},
					age: '1'
				})
				this.res.header['content-type'].should.equal('application/x-www-form-urlencoded')
				this.res.text.should.equal('name[first]=tobi&name[last]=holowaychuk&age=1')
				done()
			})
		})
	})
})

describe('req.send(String)', function(){
	it('should default to "form"', function(done){
		post('http://localhost:5000/echo')
		.send('user[name]=tj')
		.send('user[email]=tj@vision-media.ca')
		.read(function(body){
			body.should.eql({ user: { name: 'tj', email: 'tj@vision-media.ca' } })
			done()
		})
	})
})