
var get = require('..').get

get('https://api.github.com')
	.path('repos/jkroso/solicit/tags')
	.read(function(tags){
		console.log('github', tags[0].name)
	})

get('registry.npmjs.org/solicit/*').read(function(json){
	console.log('npm', json.version)
})
