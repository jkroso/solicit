import {get,post} from '..'

describe('on redirect', function(){
  it('should emit a "redirect" event', function(done){
    var redirects = []

    get('http://localhost:5000/movies')
    .on('redirect', res => {
      redirects.push(res.headers.location)
    })
    .read(() => {
      redirects.should.eql([
        '/movies/all',
        '/movies/all/0'
      ])
      done()
    })
  })

  it('should follow Location', function(done){
    const req = get('http://localhost:5000/movies')
    req.read(res => {
      req.redirects.should.eql([
        'http://localhost:5000/movies/all',
        'http://localhost:5000/movies/all/0'
      ])
      res.should.equal('first movie page')
      done()
    })
  })

  it('should detect redirect loops', function(done){
    get('http://localhost:5000/loop/1').read(null, function(e){
      e.message.should.match(/redirect loop/i)
      done()
    })
  })

  it('should follow Location even when the host changes', function(done){
    this.timeout('5 seconds')
    get('http://localhost:5000/foreign-host')
    .maxRedirects(1)
    .response.read(function(res){
      res.header.server.should.match(/github\.com/i)
      res.status.should.equal(200)
      done()
    })
  }).skip()

  it('should retain header fields', function(done){
    get('http://localhost:5000/header')
    .set('X-Foo', 'bar')
    .read(function(res){
      res.should.have.property('x-foo', 'bar')
      done()
    })
  })

  it('should remove Content-* fields', function(done){
    post('http://localhost:5000/header')
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
  }).skip()

  describe('when relative', function(){
    it('should construct the FQDN', function(done){
      const req = get('http://localhost:5000/relative')
      req.read(function(res){
        req.redirects.should.eql([
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
    const req = get('http://localhost:5000/movies').maxRedirects(1)
    req.read(null, function(res){
      req.redirects.should.eql([
        'http://localhost:5000/movies/all'
      ])
      res.message.should.match(/Moved Temporarily/)
      done()
    })
  })
})
