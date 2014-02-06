serve: node_modules test/pid
	open http://localhost:5000/test/index.html

test/pid:
	@node test/server.js & echo $$! > test/pid
	@sleep 1 # server needs time to boot

kill:
	@kill $$(cat test/pid)
	@rm -f test/pid

test: node_modules test/pid
	@node_modules/hydro/bin/hydro test/*.test.js \
		--formatter $$PWD/node_modules/hydro-dot \
		--setup test/hydro.conf.js

node_modules: package.json
	@packin install --meta $< --folder $@

.PHONY: serve test
