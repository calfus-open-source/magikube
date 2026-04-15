.PHONY: test test-unit test-quick test-file test-coverage test-failed test-parallel \
       lint lint-fix format format-check check precommit clean help

# === Testing ===
test:                ## Run full test suite with coverage
	npx jest --coverage --passWithNoTests

test-unit:           ## Run tests without coverage (fast feedback)
	npx jest --no-coverage

test-quick:          ## Run tests, stop on first failure
	npx jest --no-coverage --bail

test-file:           ## Run a specific test file: make test-file F=test/core/base-project.test.ts
	npx jest --no-coverage $(F)

test-coverage:       ## Run tests with coverage report
	npx jest --coverage

test-failed:         ## Show only failing tests (clean output)
	@npx jest --no-coverage 2>&1 | grep -E '(FAIL|✕|●|Test Suites:|Tests:)'

test-parallel:       ## Run tests with max parallelism
	npx jest --no-coverage --maxWorkers=100%

# === Quality ===
lint:                ## Run ESLint check
	npx eslint "{src,test}/**/*.ts"

lint-fix:            ## Run ESLint with auto-fix
	npx eslint "{src,test}/**/*.ts" --fix

format:              ## Format code with Prettier
	npx prettier --write "src/**/*.ts" "test/**/*.ts"

format-check:        ## Check formatting without changing files
	npx prettier --check "src/**/*.ts" "test/**/*.ts"

# === Combined ===
check:               ## Full quality check (lint + format + test)
	$(MAKE) lint
	$(MAKE) format-check
	$(MAKE) test

precommit:           ## Pre-commit checks (lint + test without coverage)
	$(MAKE) lint
	$(MAKE) test-unit

# === Build ===
build:               ## Build the project
	npm run build

# === Utility ===
clean:               ## Clean build artifacts
	rm -rf dist coverage

help:                ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help
