
var chai = require('./chai')
var request = require('..')
var get = request.get

describe('browser only tests', function(){
	describe('events', function(){
		it('progress', function(done){
			this.timeout('1 second')
			var calls = 0
			get('/image').on('progress', function(e){
				e.percent.should.be.a('number')
				e.percent.should.be.within(0, 100)
				calls++
			}).read(function(blob){
				calls.should.be.above(0)
				done()
			})
		})
	})

	describe('type(str)', function(){
		it('should handle blobs', function(done){
			this.timeout('1 second')
			get('/image').type('blob').read(function(res){
				res.should.be.instanceOf(Blob);
				done()
			})
		})
	})
})