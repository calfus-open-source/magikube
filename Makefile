SHELL := /bin/bash
.DEFAULT_GOAL := help

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
ROOT_DIR := $(shell pwd)

# ---------------------------------------------------------------------------
# Colors & Symbols
# ---------------------------------------------------------------------------
GREEN  := \033[0;32m
RED    := \033[0;31m
YELLOW := \033[0;33m
CYAN   := \033[0;36m
BOLD   := \033[1m
DIM    := \033[2m
RESET  := \033[0m

PASS := $(GREEN)✅ PASS$(RESET)
FAIL := $(RED)❌ FAIL$(RESET)
WARN := $(YELLOW)⚠️  WARN$(RESET)
SEP  := $(DIM)─────────────────────────────────────────────────────$(RESET)

# ---------------------------------------------------------------------------
# Phony targets
# ---------------------------------------------------------------------------
.PHONY: help \
	test test-unit test-quick test-file test-coverage test-failed test-parallel \
	test-core test-aws test-utils test-logger test-config test-commands \
	test-integration test-snapshots \
	lint lint-fix format format-check \
	lint-all lint-summary \
	check ci precommit \
	build setup clean update-deps \
	check-deps status list-tests

# ═══════════════════════════════════════════════════════════════════════════
# Help
# ═══════════════════════════════════════════════════════════════════════════

help: ## Show this help
	@printf "\n$(BOLD)$(CYAN)  magikube — Make Targets$(RESET)\n\n"
	@printf "$(BOLD)  Testing$(RESET)$(DIM) (unit + integration)$(RESET)\n"
	@grep -E '^(test|test-unit|test-quick|test-file|test-coverage|test-failed|test-parallel):.*?## ' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "    $(CYAN)%-22s$(RESET) %s\n", $$1, $$2}'
	@printf "\n$(BOLD)  Test Categories$(RESET)$(DIM) (run by module)$(RESET)\n"
	@grep -E '^(test-core|test-aws|test-utils|test-logger|test-config|test-commands|test-integration|test-snapshots):.*?## ' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "    $(CYAN)%-22s$(RESET) %s\n", $$1, $$2}'
	@printf "\n$(BOLD)  Quality$(RESET)$(DIM) (linting + formatting)$(RESET)\n"
	@grep -E '^(lint|lint-fix|format|format-check|lint-all|lint-summary):.*?## ' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "    $(CYAN)%-22s$(RESET) %s\n", $$1, $$2}'
	@printf "\n$(BOLD)  Combined$(RESET)$(DIM) (full pipelines)$(RESET)\n"
	@grep -E '^(check|ci|precommit):.*?## ' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "    $(CYAN)%-22s$(RESET) %s\n", $$1, $$2}'
	@printf "\n$(BOLD)  Build / Setup$(RESET)\n"
	@grep -E '^(build|setup|clean|update-deps):.*?## ' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "    $(CYAN)%-22s$(RESET) %s\n", $$1, $$2}'
	@printf "\n$(BOLD)  Utility$(RESET)\n"
	@grep -E '^(check-deps|status|list-tests):.*?## ' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "    $(CYAN)%-22s$(RESET) %s\n", $$1, $$2}'
	@printf "\n"

# ═══════════════════════════════════════════════════════════════════════════
# Testing — unit tests + full suite
# ═══════════════════════════════════════════════════════════════════════════

test: ## Run full test suite with coverage
	@printf "\n$(SEP)\n$(BOLD)$(CYAN)  Full Test Suite$(RESET)\n$(SEP)\n"
	@npx jest --coverage --passWithNoTests && \
		printf "$(PASS)  Full Test Suite\n" || \
		{ printf "$(FAIL)  Full Test Suite\n"; exit 1; }

test-unit: ## Run tests without coverage (fast feedback)
	@printf "\n$(SEP)\n$(BOLD)$(CYAN)  Unit Tests$(RESET)\n$(SEP)\n"
	@npx jest --no-coverage && \
		printf "$(PASS)  Unit Tests\n" || \
		{ printf "$(FAIL)  Unit Tests\n"; exit 1; }

test-quick: ## Run tests, stop on first failure
	@printf "\n$(SEP)\n$(BOLD)$(CYAN)  Quick Tests$(RESET)\n$(SEP)\n"
	@npx jest --no-coverage --bail && \
		printf "$(PASS)  Quick Tests\n" || \
		{ printf "$(FAIL)  Quick Tests\n"; exit 1; }

test-file: ## Run a specific test file: make test-file F=test/core/base-project.test.ts
	@printf "\n$(SEP)\n$(BOLD)$(CYAN)  Test File: $(F)$(RESET)\n$(SEP)\n"
	@npx jest --no-coverage $(F)

test-coverage: ## Run tests with coverage report
	@printf "\n$(SEP)\n$(BOLD)$(CYAN)  Coverage Report$(RESET)\n$(SEP)\n"
	@npx jest --coverage

test-failed: ## Show only failing tests (clean output)
	@printf "\n$(SEP)\n$(BOLD)$(CYAN)  Failing Tests$(RESET)\n$(SEP)\n"
	@npx jest --no-coverage 2>&1 | grep -E '(FAIL|✕|●|Test Suites:|Tests:)'

test-parallel: ## Run tests with max parallelism
	@printf "\n$(SEP)\n$(BOLD)$(CYAN)  Parallel Tests$(RESET)\n$(SEP)\n"
	@npx jest --no-coverage --maxWorkers=100% && \
		printf "$(PASS)  Parallel Tests\n" || \
		{ printf "$(FAIL)  Parallel Tests\n"; exit 1; }

# ═══════════════════════════════════════════════════════════════════════════
# Test Categories — run by module
# ═══════════════════════════════════════════════════════════════════════════

test-core: ## Run core module tests (base, azure, terraform)
	@printf "\n$(SEP)\n$(BOLD)$(CYAN)  Core Tests$(RESET)\n$(SEP)\n"
	@npx jest --no-coverage --testPathPattern='test/core/' && \
		printf "$(PASS)  Core Tests\n" || \
		{ printf "$(FAIL)  Core Tests\n"; exit 1; }

test-aws: ## Run AWS module tests
	@printf "\n$(SEP)\n$(BOLD)$(CYAN)  AWS Tests$(RESET)\n$(SEP)\n"
	@npx jest --no-coverage --testPathPattern='test/aws/' && \
		printf "$(PASS)  AWS Tests\n" || \
		{ printf "$(FAIL)  AWS Tests\n"; exit 1; }

test-utils: ## Run utility function tests
	@printf "\n$(SEP)\n$(BOLD)$(CYAN)  Utils Tests$(RESET)\n$(SEP)\n"
	@npx jest --no-coverage --testPathPattern='test/utils/' && \
		printf "$(PASS)  Utils Tests\n" || \
		{ printf "$(FAIL)  Utils Tests\n"; exit 1; }

test-logger: ## Run logger tests
	@printf "\n$(SEP)\n$(BOLD)$(CYAN)  Logger Tests$(RESET)\n$(SEP)\n"
	@npx jest --no-coverage --testPathPattern='test/logger/' && \
		printf "$(PASS)  Logger Tests\n" || \
		{ printf "$(FAIL)  Logger Tests\n"; exit 1; }

test-config: ## Run config tests
	@printf "\n$(SEP)\n$(BOLD)$(CYAN)  Config Tests$(RESET)\n$(SEP)\n"
	@npx jest --no-coverage --testPathPattern='test/config/' && \
		printf "$(PASS)  Config Tests\n" || \
		{ printf "$(FAIL)  Config Tests\n"; exit 1; }

test-commands: ## Run command handler tests
	@printf "\n$(SEP)\n$(BOLD)$(CYAN)  Command Tests$(RESET)\n$(SEP)\n"
	@npx jest --no-coverage --testPathPattern='test/commands/' && \
		printf "$(PASS)  Command Tests\n" || \
		{ printf "$(FAIL)  Command Tests\n"; exit 1; }

test-integration: ## Run integration tests (CLI contracts, template rendering)
	@printf "\n$(SEP)\n$(BOLD)$(CYAN)  Integration Tests$(RESET)\n$(SEP)\n"
	@npx jest --no-coverage --testPathPattern='test/integration/' && \
		printf "$(PASS)  Integration Tests\n" || \
		{ printf "$(FAIL)  Integration Tests\n"; exit 1; }

test-snapshots: ## Update Jest snapshots
	@printf "\n$(SEP)\n$(BOLD)$(CYAN)  Update Snapshots$(RESET)\n$(SEP)\n"
	@npx jest --no-coverage --updateSnapshot && \
		printf "$(PASS)  Snapshots updated\n" || \
		{ printf "$(FAIL)  Snapshot update failed\n"; exit 1; }

# ═══════════════════════════════════════════════════════════════════════════
# Quality — linting + formatting
# ═══════════════════════════════════════════════════════════════════════════

lint: ## Run ESLint check
	@printf "\n$(SEP)\n$(BOLD)$(CYAN)  ESLint$(RESET)\n$(SEP)\n"
	@npx eslint "{src,test}/**/*.ts" && \
		printf "$(PASS)  ESLint\n" || \
		{ printf "$(FAIL)  ESLint\n"; exit 1; }

lint-fix: ## Run ESLint with auto-fix
	@printf "\n$(SEP)\n$(BOLD)$(CYAN)  ESLint Auto-fix$(RESET)\n$(SEP)\n"
	@npx eslint "{src,test}/**/*.ts" --fix && \
		printf "$(PASS)  ESLint auto-fix complete\n" || \
		{ printf "$(FAIL)  ESLint auto-fix\n"; exit 1; }

format: ## Format code with Prettier
	@printf "\n$(SEP)\n$(BOLD)$(CYAN)  Prettier Format$(RESET)\n$(SEP)\n"
	@npx prettier --write "src/**/*.ts" "test/**/*.ts" && \
		printf "$(PASS)  Prettier format complete\n" || \
		{ printf "$(FAIL)  Prettier format\n"; exit 1; }

format-check: ## Check formatting without changing files
	@printf "\n$(SEP)\n$(BOLD)$(CYAN)  Prettier Check$(RESET)\n$(SEP)\n"
	@npx prettier --check "src/**/*.ts" "test/**/*.ts" && \
		printf "$(PASS)  Prettier check\n" || \
		{ printf "$(FAIL)  Prettier check\n"; exit 1; }

lint-all: ## Run ALL quality checks (continues on failure, shows summary)
	@FAILED=0; \
	printf "\n$(BOLD)$(CYAN)══════════════════════════════════════════$(RESET)\n"; \
	printf "$(BOLD)$(CYAN)  Running All Quality Checks$(RESET)\n"; \
	printf "$(BOLD)$(CYAN)══════════════════════════════════════════$(RESET)\n"; \
	\
	printf "\n$(DIM)  [1/3] ESLint$(RESET)\n"; \
	npx eslint "{src,test}/**/*.ts" 2>&1 && R_LINT="PASS" || R_LINT="FAIL"; \
	[ "$$R_LINT" = "FAIL" ] && FAILED=$$((FAILED+1)); \
	\
	printf "\n$(DIM)  [2/3] Prettier$(RESET)\n"; \
	npx prettier --check "src/**/*.ts" "test/**/*.ts" 2>&1 && R_FMT="PASS" || R_FMT="FAIL"; \
	[ "$$R_FMT" = "FAIL" ] && FAILED=$$((FAILED+1)); \
	\
	printf "\n$(DIM)  [3/3] Tests$(RESET)\n"; \
	npx jest --coverage --passWithNoTests 2>&1 && R_TEST="PASS" || R_TEST="FAIL"; \
	[ "$$R_TEST" = "FAIL" ] && FAILED=$$((FAILED+1)); \
	\
	printf "\n$(BOLD)$(CYAN)══════════════════════════════════════════$(RESET)\n"; \
	printf "$(BOLD)  Summary$(RESET)\n"; \
	printf "$(CYAN)══════════════════════════════════════════$(RESET)\n"; \
	for ITEM in "ESLint:$$R_LINT" "Prettier:$$R_FMT" "Tests:$$R_TEST"; do \
		NAME=$${ITEM%%:*}; STATUS=$${ITEM##*:}; \
		if [ "$$STATUS" = "PASS" ]; then \
			printf "  $(GREEN)✅ %-22s PASS$(RESET)\n" "$$NAME"; \
		else \
			printf "  $(RED)❌ %-22s FAIL$(RESET)\n" "$$NAME"; \
		fi; \
	done; \
	printf "$(CYAN)══════════════════════════════════════════$(RESET)\n"; \
	if [ $$FAILED -gt 0 ]; then \
		printf "  $(RED)$(BOLD)$$FAILED check(s) failed$(RESET)\n\n"; exit 1; \
	else \
		printf "  $(GREEN)$(BOLD)All checks passed$(RESET)\n\n"; \
	fi

lint-summary: ## Dashboard — violation counts per checker
	@printf "\n$(BOLD)$(CYAN)══════════════════════════════════════════════════════$(RESET)\n"
	@printf "$(BOLD)$(CYAN)  Quality Summary Dashboard$(RESET)\n"
	@printf "$(BOLD)$(CYAN)══════════════════════════════════════════════════════$(RESET)\n"
	@printf "  $(BOLD)%-24s %-10s %s$(RESET)\n" "Checker" "Status" "Issues"
	@printf "  $(DIM)%-24s %-10s %s$(RESET)\n" "────────────────────────" "──────────" "──────"
	@\
	LINT_OUT=$$(npx eslint "{src,test}/**/*.ts" 2>&1); LINT_RC=$$?; \
	if [ $$LINT_RC -eq 0 ]; then \
		printf "  %-24s $(GREEN)%-10s$(RESET) %s\n" "eslint" "PASS" "0"; \
	else \
		LINT_COUNT=$$(echo "$$LINT_OUT" | grep -cE '^\s+[0-9]+:[0-9]+' || echo "?"); \
		printf "  %-24s $(RED)%-10s$(RESET) %s\n" "eslint" "FAIL" "$$LINT_COUNT"; \
	fi; \
	\
	FMT_OUT=$$(npx prettier --check "src/**/*.ts" "test/**/*.ts" 2>&1); FMT_RC=$$?; \
	if [ $$FMT_RC -eq 0 ]; then \
		printf "  %-24s $(GREEN)%-10s$(RESET) %s\n" "prettier" "PASS" "0"; \
	else \
		FMT_COUNT=$$(echo "$$FMT_OUT" | grep -cE '^\[warn\]' || echo "?"); \
		printf "  %-24s $(YELLOW)%-10s$(RESET) %s\n" "prettier" "WARN" "$$FMT_COUNT files"; \
	fi; \
	\
	TSC_OUT=$$(npx tsc --noEmit 2>&1); TSC_RC=$$?; \
	if [ $$TSC_RC -eq 0 ]; then \
		printf "  %-24s $(GREEN)%-10s$(RESET) %s\n" "typescript" "PASS" "0"; \
	else \
		TSC_COUNT=$$(echo "$$TSC_OUT" | grep -cE 'error TS' || echo "?"); \
		printf "  %-24s $(RED)%-10s$(RESET) %s\n" "typescript" "FAIL" "$$TSC_COUNT errors"; \
	fi; \
	\
	TEST_OUT=$$(npx jest --no-coverage --passWithNoTests 2>&1); TEST_RC=$$?; \
	if [ $$TEST_RC -eq 0 ]; then \
		printf "  %-24s $(GREEN)%-10s$(RESET) %s\n" "jest" "PASS" "0"; \
	else \
		TEST_FAIL=$$(echo "$$TEST_OUT" | grep -oE '[0-9]+ failed' | grep -oE '[0-9]+' || echo "?"); \
		printf "  %-24s $(RED)%-10s$(RESET) %s\n" "jest" "FAIL" "$$TEST_FAIL failed"; \
	fi; \
	\
	printf "$(CYAN)══════════════════════════════════════════════════════$(RESET)\n\n"

# ═══════════════════════════════════════════════════════════════════════════
# Combined — full pipelines
# ═══════════════════════════════════════════════════════════════════════════

check: ## Full quality check (lint + format + test)
	@$(MAKE) --no-print-directory lint
	@$(MAKE) --no-print-directory format-check
	@$(MAKE) --no-print-directory test

ci: ## CI pipeline (strict — stops on first failure)
	@printf "\n$(BOLD)$(CYAN)══════════════════════════════════════════$(RESET)\n"
	@printf "$(BOLD)$(CYAN)  CI Pipeline$(RESET)\n"
	@printf "$(BOLD)$(CYAN)══════════════════════════════════════════$(RESET)\n"
	@$(MAKE) --no-print-directory lint
	@$(MAKE) --no-print-directory format-check
	@$(MAKE) --no-print-directory test
	@$(MAKE) --no-print-directory build
	@printf "\n$(GREEN)$(BOLD)  CI Pipeline — all checks passed$(RESET)\n\n"

precommit: ## Pre-commit checks (lint + unit tests, no coverage)
	@$(MAKE) --no-print-directory lint
	@$(MAKE) --no-print-directory test-unit

# ═══════════════════════════════════════════════════════════════════════════
# Build / Setup
# ═══════════════════════════════════════════════════════════════════════════

build: ## Build the project (compile + copy templates)
	@printf "\n$(SEP)\n$(BOLD)$(CYAN)  Build$(RESET)\n$(SEP)\n"
	@npm run build && \
		printf "$(PASS)  Build complete\n" || \
		{ printf "$(FAIL)  Build failed\n"; exit 1; }

setup: ## Install all dependencies
	@printf "\n$(SEP)\n$(BOLD)$(CYAN)  Setup$(RESET)\n$(SEP)\n"
	@npm install && \
		printf "$(PASS)  Dependencies installed\n" || \
		{ printf "$(FAIL)  npm install failed\n"; exit 1; }

clean: ## Remove build artifacts and caches
	@printf "\n$(SEP)\n$(BOLD)$(CYAN)  Clean$(RESET)\n$(SEP)\n"
	@rm -rf dist coverage
	@printf "$(PASS)  Cleaned dist/ and coverage/\n"

update-deps: ## Upgrade all dependencies to latest
	@printf "\n$(SEP)\n$(BOLD)$(CYAN)  Update Dependencies$(RESET)\n$(SEP)\n"
	@npm update && \
		printf "$(PASS)  Dependencies updated\n" || \
		{ printf "$(FAIL)  Update failed\n"; exit 1; }
	@printf "$(DIM)  Run 'npm outdated' to check for major version bumps$(RESET)\n"

# ═══════════════════════════════════════════════════════════════════════════
# Utility
# ═══════════════════════════════════════════════════════════════════════════

check-deps: ## Verify required tools are installed
	@printf "\n$(SEP)\n$(BOLD)$(CYAN)  Dependency Check$(RESET)\n$(SEP)\n"
	@printf "  $(BOLD)%-16s$(RESET)" "node"; \
	if command -v node >/dev/null 2>&1; then \
		printf "$(GREEN)%-8s$(RESET) %s\n" "OK" "$$(node --version)"; \
	else \
		printf "$(RED)%-8s$(RESET)\n" "MISSING"; \
	fi
	@printf "  $(BOLD)%-16s$(RESET)" "npm"; \
	if command -v npm >/dev/null 2>&1; then \
		printf "$(GREEN)%-8s$(RESET) %s\n" "OK" "$$(npm --version)"; \
	else \
		printf "$(RED)%-8s$(RESET)\n" "MISSING"; \
	fi
	@printf "  $(BOLD)%-16s$(RESET)" "npx"; \
	if command -v npx >/dev/null 2>&1; then \
		printf "$(GREEN)%-8s$(RESET) %s\n" "OK" "$$(npx --version)"; \
	else \
		printf "$(RED)%-8s$(RESET)\n" "MISSING"; \
	fi
	@printf "  $(BOLD)%-16s$(RESET)" "git"; \
	if command -v git >/dev/null 2>&1; then \
		printf "$(GREEN)%-8s$(RESET) %s\n" "OK" "$$(git --version | cut -d' ' -f3)"; \
	else \
		printf "$(RED)%-8s$(RESET)\n" "MISSING"; \
	fi
	@printf "\n"

status: ## Show project environment status
	@printf "\n$(BOLD)$(CYAN)══════════════════════════════════════════════════════$(RESET)\n"
	@printf "$(BOLD)$(CYAN)  Environment Status$(RESET)\n"
	@printf "$(BOLD)$(CYAN)══════════════════════════════════════════════════════$(RESET)\n"
	@printf "  $(BOLD)%-20s$(RESET) %s\n" "Node.js" "$$(node --version 2>/dev/null || echo 'not found')"
	@printf "  $(BOLD)%-20s$(RESET) %s\n" "npm" "$$(npm --version 2>/dev/null || echo 'not found')"
	@printf "  $(BOLD)%-20s$(RESET) %s\n" "TypeScript" "$$(npx tsc --version 2>/dev/null || echo 'not found')"
	@printf "  $(BOLD)%-20s$(RESET) %s\n" "Jest" "$$(npx jest --version 2>/dev/null || echo 'not found')"
	@printf "  $(BOLD)%-20s$(RESET) %s\n" "ESLint" "$$(npx eslint --version 2>/dev/null || echo 'not found')"
	@printf "  $(BOLD)%-20s$(RESET) %s\n" "Prettier" "$$(npx prettier --version 2>/dev/null || echo 'not found')"
	@printf "  $(DIM)──────────────────────────────────$(RESET)\n"
	@printf "  $(BOLD)%-20s$(RESET) %s\n" "Project" "magikube v$$(node -p "require('./package.json').version" 2>/dev/null)"
	@printf "  $(BOLD)%-20s$(RESET) %s\n" "Test files" "$$(find test -name '*.test.ts' | wc -l | tr -d ' ')"
	@printf "  $(BOLD)%-20s$(RESET) %s\n" "Source files" "$$(find src -name '*.ts' | wc -l | tr -d ' ')"
	@printf "  $(BOLD)%-20s$(RESET) %s\n" "Node modules" "$$(test -d node_modules && echo 'installed' || echo 'NOT INSTALLED')"
	@printf "  $(BOLD)%-20s$(RESET) %s\n" "Build output" "$$(test -d dist && echo 'present' || echo 'not built')"
	@printf "$(CYAN)══════════════════════════════════════════════════════$(RESET)\n\n"

list-tests: ## List all test files grouped by category
	@printf "\n$(BOLD)$(CYAN)  Test Files$(RESET)\n\n"
	@for DIR in core aws utils logger config commands integration; do \
		COUNT=$$(find test/$$DIR -name '*.test.ts' 2>/dev/null | wc -l | tr -d ' '); \
		printf "  $(BOLD)$(CYAN)%-14s$(RESET) $(DIM)(%s files)$(RESET)\n" "$$DIR" "$$COUNT"; \
		find test/$$DIR -name '*.test.ts' 2>/dev/null | sort | while read F; do \
			printf "    $(DIM)%s$(RESET)\n" "$$F"; \
		done; \
		printf "\n"; \
	done
