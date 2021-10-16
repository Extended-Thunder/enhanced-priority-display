.PHONY: release

all: EnhancedPriorityDisplay.xpi
clean: ; rm -f EnhancedPriorityDisplay.xpi

version=$(shell grep -o '"version"\s*:\s*"\S*"' manifest.json | sed -e 's/.*"\([0-9].*\)".*/\1/')

EnhancedPriorityDisplay.xpi: dev/include-manifest $(shell find $(shell cat dev/include-manifest) -type f 2>/dev/null)
	rm -f "$@" "$@".tmp
	zip -q -r "$@".tmp . -i@dev/include-manifest
	mv "$@".tmp "$@"

release/EnhancedPriorityDisplay-${version}-tb.xpi: EnhancedPriorityDisplay.xpi
	mkdir -p "`dirname $@`"
	cp "EnhancedPriorityDisplay.xpi" "$@"

release: release/EnhancedPriorityDisplay-${version}-tb.xpi

## Requires the Node 'addons-linter' package is installed
## npm install -g addons-linter
## Note: this will produce a lot of "UNSUPPORTED_API" and "MANIFEST_PERMISSIONS"
## warnings because the addons-linter assumes vanilla firefox target.
lint:
	addons-linter .
