
var app = require('express')()
var zlib = require('zlib')
var get = require('..').get

var subject = 'some long long long long string'

app.get('/', function(req, res, next){
  zlib.deflate(subject, function(err, buf){
    res.set('Content-Type', 'text/plain')
    res.set('Content-Encoding', 'gzip')
    res.send(buf)
  })
})

app.listen(3080)

describe('zlib', function(){
  describe('.read()', function(){
    it('should get inflated content', function(done){
      get('http://localhost:3080').read(function(body){
        body.should.equal(subject)
        this.res.header['content-length'].should.be.below(subject.length)
        done()
      })
    })
  })

  describe('.response()', function(){
    it('should receive an inflated stream', function(done){
      get('http://localhost:3080').response.read(function(res){
        res.header['content-length'].should.be.below(subject.length)
        res.text = ''
        res.on('readable', function(){
          res.text += this.read() || ''
        }).on('end', function(){
          res.text.should.equal(subject)
          done()
        })
      })
    })
  })
})
