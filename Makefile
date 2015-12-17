serve: node_modules test/pid
	open http://localhost:5000/test/index.html

test/pid:
	@future-node test/server.js & echo $$! > test/pid
	@sleep 5 # server needs time to boot

kill:
	@kill $$(cat test/pid)
	@rm -f test/pid

test: node_modules test/pid
	@$</.bin/_hydro test/*.test.js \
		--formatter $</hydro-dot \
		--setup test/hydro.conf.js
	@make kill

node_modules: package.json
	@npm install

.PHONY: serve test
