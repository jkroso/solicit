REPORTER=dot

serve: node_modules test/pid
	open http://localhost:5000/test/index.html

test/pid: node_modules
	@node test/server.js & echo $$! > test/pid
	@sleep 1 # server needs time to boot

kill:
	@kill $$(cat test/pid)
	@rm -f test/pid

test: node_modules test/pid
	@node_modules/mocha/bin/mocha test/*.test.js \
		--reporter $(REPORTER) \
		--timeout 1000 \
		--check-leaks \
		--bail

node_modules: *.json
	@packin install \
		--meta deps.json,package.json \
		--folder node_modules

.PHONY: serve test
