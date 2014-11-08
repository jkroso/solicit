
/**
 * Hydro configuration
 *
 * @param {Hydro} hydro
 */

module.exports = function(hydro) {
  hydro.set({
    suite: 'solicit',
    timeout: 1000,
    plugins: [
      require('hydro-chai'),
      require('hydro-bdd')
    ],
    chai: {
      chai: require('chai'),
      styles: ['should', 'expect', 'assert'],
      stack: true
    },
    globals: {}
  })
}
