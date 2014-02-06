// client or server?
module.exports = typeof window == 'undefined'
  ? require('./node')
  : require('./client')