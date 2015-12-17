import express from 'express'
import zlib from 'zlib'
import {get} from '..'

const app = express()

const subject = 'some long long long long string'

app.get('/', function(req, res, next){
  zlib.deflate(subject, function(err, buf){
    if (err) return next(err)
    res.set('Content-Type', 'text/plain')
    res.set('Content-Encoding', 'gzip')
    res.send(buf)
  })
})

app.listen(3080)

describe('zlib', function(){
  describe('.read()', function(){
    it('should get inflated content', function(done){
      const req = get('http://localhost:3080')
      req.read(body => {
        body.should.equal(subject)
        req.res.header['content-length'].should.be.below(subject.length)
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
