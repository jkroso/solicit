import screenshot from 'url-to-screenshot'
import express from 'express'
import Result from 'result'
import path from 'path'

const app = express()

// request logging
// app.use(express.logger('dev'))
app.use(require('errorhandler')())

// allow cross-origin
// app.use(function(req, res, next){
//  res.setHeader('Access-Control-Allow-Origin', '*')
//  res.setHeader('Access-Control-Allow-Methods','GET,PUT,POST,DELETE,OPTIONS')
//  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With, Accept, x-csrf-token, origin')
//  if ('OPTIONS' == req.method) return res.end()
//  next()
// })

app.post('/echo', function(req, res){
  res.writeHead(200, req.headers)
  req.pipe(res)
})

app.get('/login', function(req, res){
  res.send('<form id="login"></form>')
})

// cache image
var image = new Result('pending')
screenshot('http://localhost:5000/').capture(function(err, img){
  if (err) image.error(err)
  else image.write(img)
})

app.get('/image', function(req, res){
  image.read(function(img){
    res.set('content-length', img.length)
    res.type('png')
    var i = 0
    // simulate a slow write
    function next(){
      var start = i
      i = Math.min(i + 1e3, img.length)
      res.write(img.slice(start, i))
      if (i == img.length) res.end()
      else setTimeout(next, 20)
    }
    next()
  })
})

app.get('/json', function(req, res){
  res.send({ name: 'manny' })
})

app.get('/query', function(req, res){
  res.send(req.query)
})

app.delete('/query', function(req, res){
  res.send(req.query)
})

app.get('/movies', function(req, res){
  res.redirect('/movies/all')
})

app.post('/movie', function(req, res){
  res.redirect('/movies/all/0')
})

app.get('/movies/all', function(req, res){
  res.redirect('/movies/all/0')
})

app.get('/loop/1', function(req, res){
  res.redirect('/loop/2')
})

app.get('/loop/2', function(req, res){
  res.redirect('/loop/1')
})

app.get('/movies/all/0', function(req, res){
  res.send('first movie page')
})

app.get('/links', function(req, res){
  res.header('Link', '<https://api.github.com/repos/visionmedia/mocha/issues?page=2>; rel="next"')
  res.end()
})

app.get('/xml', function(req, res){
  res.type('xml')
  res.send('<some><xml></xml></some>')
})

app.get('/custom', function(req, res){
  res.type('application/x-custom')
  res.send('custom stuff')
})

app.get('/error', function(req, res){
  res.status(500).send('boom')
})

app.get('/timeout/:ms', function(req, res){
  var ms = parseInt(req.params.ms, 10)
  setTimeout(function(){
    res.send('hello')
  }, ms)
})

app.get('/tobi', function(req, res){
  res.send('tobi')
})

app.get('/relative', function(req, res){
  res.set('Location', '/tobi')
  res.status(302).send()
})

app.get('/header', function(req, res){
  res.redirect('/header/2')
})

app.post('/header', function(req, res){
  res.redirect('/header/2')
})

app.get('/header/2', function(req, res){
  res.send(req.headers)
})

app.get('/foreign-host', function(req, res){
  res.redirect('https://github.com/')
})

app.get('/form-data', function(req, res){
  res.header('Content-Type', 'application/x-www-form-urlencoded')
  res.send('pet[name]=manny')
})

/**
 * mount authentication server
 */

var auth = express()

app.use('/auth', auth)

auth.use(require('basic-auth-connect')('tobi', 'learnboost'))

auth.get('/', function(req, res){
  res.end('you win!')
})

// compile javascript and html
app.use(require('serve-js')(path.dirname(__dirname)))

// render Readme
app.use(require('markdown-middleware')({
  directory: path.dirname(__dirname)
}))

var dir = path.dirname(__dirname)

// static files
app.use(require('serve-static')(dir, { dotfiles: 'ignore' }))

// directory serving
app.use(require('serve-index')(dir, {icons: true}))

app.listen(5000)
