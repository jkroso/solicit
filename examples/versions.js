import {get} from '..'

get('https://api.github.com/repos/jkroso/solicit/tags')
  .read(tags => console.log('github', tags[0].name))

get('registry.npmjs.org/solicit/*')
  .read(pkg => console.log('npm', pkg.version))
