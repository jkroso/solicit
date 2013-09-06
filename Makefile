REPORTER=dot

serve: node_modules
	@node test/server.js
	#open http://localhost:5000/test/index.html

test: node_modules
	@node_modules/mocha/bin/_mocha test/*.test.js \
		--reporter $(REPORTER) \
		--timeout 1000 \
		--check-leaks \
		--bail

node_modules: *.json
	@packin install \
		--meta package.json,component.json,deps.json \
		--folder node_modules \
		--executables \
		--no-retrace

.PHONY: serve test