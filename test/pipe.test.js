/* global after */
import {post,get} from '..'
import fs from 'fs'

var app = require('express')()

app.use(require('body-parser').json())

app.post('/', function(req, res){
  res.send(req.body)
})

app.get('/user.json', function(req, res){
  fs.createReadStream(fixtures + '/user.json').pipe(res)
})

app.listen(3020)

const fixtures = __dirname + '/fixtures'

const removeTmpfile = done =>
  fs.unlink(fixtures + '/tmp.json', () => done())

describe('request pipe', function(){
  after(removeTmpfile)

  it('should act as a writable stream', function(done){
    fs.createReadStream(fixtures + '/user.json')
      .pipe(post('localhost:3020').type('json'))
      .read(function(res){
        res.should.eql({ name: 'tobi' })
        done()
      })
  })

  it('should act as a readable stream', function(done){
    get('localhost:3020/user.json')
      .pipe(fs.createWriteStream(fixtures + '/tmp.json'))
      .on('finish', function(){
        var json = fs.readFileSync(fixtures + '/tmp.json', 'utf8')
        JSON.parse(json).should.eql({ name: 'tobi' })
        done()
      })
  })
})
