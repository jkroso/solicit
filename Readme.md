
# solicit

  a declarative http client based of [superagent](//github.com/visionmedia/superagent). Versions available for both the browser and node with the same API and shared test suite. Usable now but still a WIP. A little bit experimental also so API is unstable.

## Installation

_With [packin](//github.com/jkroso/packin) or [component](//github.com/component/component)_

	$ packin add jkroso/solicit

then in your app:

```js
var request = require('solicit')
```

### Example

```js
request.get('http://component.io/components/all').read(console.log)
// => a whole lot of JSON
```

## API

### solicit()

## Running the tests

Just run `make` and navigate your browser to the test directory.
