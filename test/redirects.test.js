
var assert = require('assert/index')
var chai = require('./chai')
var request = require('..')

describe('request', function(){
	describe('on redirect', function(){
		it('should emit a "redirect" event', function(done){
			var redirects = []

			request
			.get('http://localhost:5000/')
			.on('redirect', function(res){
				redirects.push(res.headers.location)
			})
			.read(function(res){
				redirects.should.eql([
					'/movies',
					'/movies/all',
					'/movies/all/0'
				])
				done()
			})
		})

		it('should follow Location', function(done){
			request
			.get('http://localhost:5000/')
			.read(function(res){
				this.redirects.should.eql([
					'http://localhost:5000/movies',
					'http://localhost:5000/movies/all',
					'http://localhost:5000/movies/all/0'
				])
				res.should.equal('first movie page')
				done()
			})
		})

		it.skip('should follow Location even when the host changes', function(done){
			this.timeout('5 seconds')
			request
			.get('http://localhost:5000/foreign-host')
			.maxRedirects(1)
			.response()
			.read(function(res){
				res.header.server.should.match(/github\.com/i)
				res.status.should.equal(200)
				done()
			})
		})

		it('should retain header fields', function(done){
			request
			.get('http://localhost:5000/header')
			.set('X-Foo', 'bar')
			.read(function(res){
				res.should.have.property('x-foo', 'bar')
				done()
			})
		})

		it.skip('should remove Content-* fields', function(done){
			request
			.post('http://localhost:5000/header')
			.type('txt')
			.set('X-Foo', 'bar')
			.set('X-Bar', 'baz')
			.send('hey')
			.read(function(res){
				res.body.should.have.property('x-foo', 'bar')
				res.body.should.have.property('x-bar', 'baz')
				res.body.should.not.have.property('content-type')
				res.body.should.not.have.property('content-length')
				res.body.should.not.have.property('transfer-encoding')
				done()
			})
		})

		describe('when relative', function(){
			it('should construct the FQDN', function(done){
				request
				.get('http://localhost:5000/relative')
				.read(function(res){
					this.redirects.should.eql([
						'http://localhost:5000/tobi'
					])
					res.should.equal('tobi')
					done()
				})
			})
		})
	})

	describe('req.maxRedirects(n)', function(){
		it('should alter the default number of redirects to follow', function(done){
			request
			.get('http://localhost:5000/')
			.maxRedirects(2)
			.read(null, function(res){
				this.redirects.should.eql([
					'http://localhost:5000/movies',
					'http://localhost:5000/movies/all'
				])
				res.message.should.match(/Moved Temporarily/)
				done()
			})
		})
	})

	describe.skip('on POST', function(){
		it('should redirect as GET', function(done){
			request
			.post('http://localhost:5000/movie')
			.send({ name: 'Tobi' })
			.maxRedirects(2)
			.read(function(res){
				redirects.should.eql([
					'http://localhost:5000/movies/all/0'
				])
				res.text.should.equal('first movie page')
				done()
			}, done)
		})
	})
})