
/**
 * get a list of components which depend 
 * on a certain component
 *
 *   node examples/c8-usage component/emitter
 */

var reduce = require('reduce/series')
var merge = require('merge')
var get = require('..').get

var target = process.argv[2]

reduce(get('component.io/components/all'), function(arr, c8){
	if (c8 == null) return arr
	var deps = merge(merge({}, c8.development), c8.dependencies)
	if (target in deps) arr.push(c8.repo || c8.name)
	return arr
}, []).read(console.log)
