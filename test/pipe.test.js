
var express = require('express')
var chai = require('./chai')
var request = require('..')
var fs = require('fs')

var app = express()

app.use(express.json())

app.post('/', function(req, res){
	res.send(req.body)
})

app.get('/user.json', function(req, res){
	fs.createReadStream(fixtures + '/user.json').pipe(res)
})

app.listen(3020)

var fixtures = __dirname + '/fixtures'

describe('request pipe', function(){
	afterEach(removeTmpfile)

	it('should act as a writable stream', function(done){
		fs.createReadStream(fixtures + '/user.json')
			.pipe(request.post('localhost:3020').type('json'))
			.read(function(res){
				res.should.eql({ name: 'tobi' })
				done()
			})
	})

	it('should act as a readable stream', function(done){
		request
			.get('localhost:3020/user.json')
			.pipe(fs.createWriteStream(fixtures + '/tmp.json'))
			.on('finish', function(){
				var json = fs.readFileSync(fixtures + '/tmp.json', 'utf8')
				JSON.parse(json).should.eql({ name: 'tobi' })
				done()
			})
	})
})

function removeTmpfile(done){
	fs.unlink(fixtures + '/tmp.json', function(err){
		done()
	})
}