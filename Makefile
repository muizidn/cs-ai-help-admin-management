# Admin Management - Build & Deployment
# Variables
PROJECT_NAME := admin-management
GIT_COMMIT := $(shell git rev-parse --short HEAD 2>/dev/null || echo "unknown")
GIT_BRANCH := $(shell git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
APP_VERSION := $(shell git tag --list --sort=-version:refname | head -1 2>/dev/null || echo "v0.0.0")
IMAGE_TAG := $(PROJECT_NAME):$(APP_VERSION)
LATEST_TAG := $(PROJECT_NAME):latest
ENV_FILE := $(if $(ENV),$(ENV),.env)
REGISTRY := $(if $(REGISTRY),$(REGISTRY),localhost:5000)
REGISTRY_IMAGE := $(REGISTRY)/$(PROJECT_NAME)

# Colors
RED := \033[0;31m
GREEN := \033[0;32m
BLUE := \033[0;34m
CYAN := \033[0;36m
YELLOW := \033[1;33m
BOLD := \033[1m
NC := \033[0m

.PHONY: help install dev build_image tag_latest push_to_registry deploy redeploy stop logs clean

# Default target
help:
	@printf "$(CYAN)$(BOLD)Admin Management$(NC)\n\n"
	@printf "$(BOLD)BUILD & DEPLOY:$(NC)\n"
	@echo "  build_image              Build versioned Docker image"
	@echo "  tag_latest               Tag latest version as 'latest'"
	@echo "  push_to_registry         Push image to registry"
	@echo "  deploy                   Deploy with external services"
	@echo "  redeploy                 Build, tag latest, and deploy"
	@printf "\n$(BOLD)DEVELOPMENT:$(NC)\n"
	@echo "  install                  Install dependencies using bun"
	@echo "  dev                      Run development server"
	@echo "  check                    Run SvelteKit checks"
	@echo "  build-local              Build application locally"
	@printf "\n$(BOLD)LEGACY DOCKER:$(NC)\n"
	@echo "  deploy-nobuild           Deploy without building (use existing image)"
	@echo "  stop                     Stop Docker containers"
	@echo "  logs                     View Docker logs"
	@echo "  clean                    Remove old images"
	@printf "\n$(BOLD)INFO:$(NC)\n"
	@echo "  Project: $(PROJECT_NAME) | Version: $(APP_VERSION) | Branch: $(GIT_BRANCH)"

# =================================================
# DEVELOPMENT
# =================================================
install:
	@echo "📦 Installing dependencies with bun..."
	bun install

dev:
	@echo "🚀 Starting development server..."
	bun run dev

check:
	@echo "🔍 Running SvelteKit checks..."
	bun run check

build-local:
	@echo "🏗️ Building application locally..."
	bun run build

# =================================================
# BUILD SYSTEM
# =================================================
.PHONY: build_image
build_image:
	@printf "$(BLUE)[INFO]$(NC) Generating version and building Docker image...\n"
	@NEW_VERSION=$$(./scripts/bump-version.sh --dry-run); \
	NEW_IMAGE_TAG="$(PROJECT_NAME):$$NEW_VERSION"; \
	printf "$(BLUE)[INFO]$(NC) Git commit: $(GIT_COMMIT)\n"; \
	printf "$(BLUE)[INFO]$(NC) Git branch: $(GIT_BRANCH)\n"; \
	printf "$(BLUE)[INFO]$(NC) App version: $$NEW_VERSION\n"; \
	printf "$(BLUE)[INFO]$(NC) Image tag: $$NEW_IMAGE_TAG\n"; \
	printf "$(BLUE)[INFO]$(NC) Building Docker image...\n"; \
	if docker build --build-arg APP_VERSION=$$NEW_VERSION -t $$NEW_IMAGE_TAG .; then \
		printf "$(GREEN)[SUCCESS]$(NC) Docker build completed successfully!\n"; \
		printf "$(BLUE)[INFO]$(NC) Creating and pushing git tag: $$NEW_VERSION\n"; \
		./scripts/bump-version.sh --commit-tag "$$NEW_VERSION"; \
		printf "$(GREEN)[SUCCESS]$(NC) Built and tagged: $$NEW_IMAGE_TAG\n"; \
	else \
		printf "$(RED)[ERROR]$(NC) Docker build failed! No git tag created.\n"; \
		exit 1; \
	fi

.PHONY: tag_latest
tag_latest:
	@TARGET_TAG=$(if $(TAG),$(TAG),$$(git tag --list --sort=-version:refname | head -1)); \
	IMAGE="$(PROJECT_NAME):$$TARGET_TAG"; \
	if ! docker image inspect $$IMAGE >/dev/null 2>&1; then \
		printf "$(RED)[ERROR]$(NC) Image not found: $$IMAGE\n"; \
		exit 1; \
	fi; \
	docker tag $$IMAGE $(LATEST_TAG); \
	printf "$(GREEN)[SUCCESS]$(NC) Tagged $$IMAGE as $(LATEST_TAG)\n"

.PHONY: push_to_registry
push_to_registry:
	@TAG_TO_PUSH=$(if $(TAG),$(TAG),latest); \
	SOURCE_IMAGE="$(PROJECT_NAME):$$TAG_TO_PUSH"; \
	TARGET_IMAGE="$(REGISTRY_IMAGE):$$TAG_TO_PUSH"; \
	if ! docker image inspect "$$SOURCE_IMAGE" > /dev/null 2>&1; then \
		echo "$(RED)[ERROR]$(NC) Image '$$SOURCE_IMAGE' not found locally"; \
		docker images | grep $(PROJECT_NAME) || true; \
		exit 1; \
	fi; \
	echo "$(BLUE)[INFO]$(NC) Retagging $$SOURCE_IMAGE as $$TARGET_IMAGE"; \
	docker tag $$SOURCE_IMAGE $$TARGET_IMAGE; \
	echo "$(BLUE)[INFO]$(NC) Pushing $$TARGET_IMAGE to registry..."; \
	docker push $$TARGET_IMAGE; \
	echo "$(GREEN)[SUCCESS]$(NC) Pushed: $$TARGET_IMAGE"

# =================================================
# DEPLOY
# =================================================
.PHONY: deploy
deploy:
	@if [ ! -f "$(ENV_FILE)" ]; then \
		echo -e "$(RED)[ERROR]$(NC) Environment file '$(ENV_FILE)' not found!"; \
		echo -e "$(BLUE)[INFO]$(NC) Please create $(ENV_FILE) or specify ENV=.env.example"; \
		exit 1; \
	fi; \
	DEPLOY_TAG="$(if $(TAG),$(TAG),$(LATEST_TAG))"; \
	echo "$(BLUE)[INFO]$(NC) Deploying Admin Management..."; \
	echo "$(BLUE)[INFO]$(NC) Using environment file: $(ENV_FILE)"; \
	echo "$(BLUE)[INFO]$(NC) Using image tag: $$DEPLOY_TAG"; \
	if ! docker image inspect "$$DEPLOY_TAG" >/dev/null 2>&1; then \
		echo -e "$(RED)[ERROR]$(NC) Image '$$DEPLOY_TAG' not found!"; \
		$(MAKE) list_images; \
		exit 1; \
	fi; \
	ADMIN_MANAGEMENT_IMAGE="$$DEPLOY_TAG" \
	docker compose --env-file $(ENV_FILE) up -d; \
	echo "$(GREEN)[SUCCESS]$(NC) Admin Management deployed"

.PHONY: redeploy
redeploy:
	@$(MAKE) build_image
	@$(MAKE) tag_latest
	@$(MAKE) deploy $(if $(ENV),ENV=$(ENV),)

.PHONY: list_images
list_images:
	@echo "$(BLUE)[INFO]$(NC) Available Admin Management images:"
	@docker images --filter "reference=$(PROJECT_NAME)" --format "table {{.Repository}}:{{.Tag}}\t{{.CreatedAt}}\t{{.Size}}"

# =================================================
# LEGACY DOCKER COMMANDS (for development)
# =================================================
.PHONY: deploy-nobuild
deploy-nobuild:
	@echo "🚀 Deploying Admin Management (no build)..."
	docker compose down || true
	docker compose up -d
	@echo "✅ Deployment completed!"
	@echo "🌐 Application available at: http://localhost:3030"

.PHONY: stop
stop:
	@echo "🛑 Stopping Admin Management..."
	docker compose down
	@echo "✅ Containers stopped and removed."

.PHONY: logs
logs:
	@echo "📋 Showing container logs..."
	docker compose logs -f

.PHONY: logs-app
logs-app:
	@echo "📋 Showing application logs..."
	docker compose logs -f admin-management

.PHONY: logs-db
logs-db:
	@echo "📋 Showing database logs..."
	docker compose logs -f mongodb

# =================================================
# MAINTENANCE & UTILITIES
# =================================================
.PHONY: clean
clean:
	@echo "$(YELLOW)[WARNING]$(NC) Cleaning up old Admin Management images..."
	@echo "$(BLUE)[INFO]$(NC) Strategy: Keep latest image per branch, remove all others"

	@clean_branch_images() { \
		BRANCH_NAME="$$1"; \
		PATTERN="$$2"; \
		echo "$(BLUE)[INFO]$(NC) Processing $$BRANCH_NAME branch images (pattern: $$PATTERN)"; \
		\
		ALL_IMAGES=$$(docker images --format '{{.Repository}}:{{.Tag}} {{.CreatedAt}} {{.ID}}' | \
			grep "^$(PROJECT_NAME):" | grep -E -- "$$PATTERN" | sort -k2 -r); \
		\
		if [ -z "$$ALL_IMAGES" ]; then \
			echo "$(BLUE)[INFO]$(NC) No $$BRANCH_NAME images found"; \
			return; \
		fi; \
		\
		LATEST_IMAGE=$$(echo "$$ALL_IMAGES" | head -1); \
		echo "$(GREEN)[KEEP]$(NC) Latest $$BRANCH_NAME: $$LATEST_IMAGE"; \
		\
		OLD_IMAGES=$$(echo "$$ALL_IMAGES" | tail -n +2 | awk '{print $$NF}'); \
		if [ -n "$$OLD_IMAGES" ]; then \
			echo "$(YELLOW)[REMOVE]$(NC) Removing old $$BRANCH_NAME images:"; \
			echo "$$ALL_IMAGES" | tail -n +2 | while read repo_tag created_at image_id; do \
				echo "  - $$repo_tag ($$created_at)"; \
			done; \
			echo "$$OLD_IMAGES" | xargs docker rmi -f; \
			echo "$(GREEN)[SUCCESS]$(NC) Cleaned old $$BRANCH_NAME images"; \
		else \
			echo "$(BLUE)[INFO]$(NC) No old $$BRANCH_NAME images to clean"; \
		fi; \
	}; \
	\
	clean_branch_images "develop" "-develop "; \
	clean_branch_images "staging" "-staging "; \
	clean_branch_images "staging-build" "-staging-build\."; \
	clean_branch_images "main/production" "^$(PROJECT_NAME):v[0-9]+\.[0-9]+\.[0-9]+ "; \
	clean_branch_images "main-build" "^$(PROJECT_NAME):v[0-9]+\.[0-9]+\.[0-9]+-build\."; \
	clean_branch_images "latest" "^$(PROJECT_NAME):latest "; \

	@echo "$(GREEN)[DONE]$(NC) Docker image cleanup complete."

.PHONY: shell
shell:
	@echo "🐚 Opening shell in running container..."
	docker exec -it admin-management /bin/sh

.PHONY: db-shell
db-shell:
	@echo "🗄️ Opening MongoDB shell..."
	docker exec -it admin-management-mongodb mongosh

.PHONY: status
status:
	@echo "📊 Container status:"
	@docker compose ps

.PHONY: restart
restart:
	@echo "🔄 Restarting Admin Management..."
	docker compose restart
	@echo "✅ Restart completed!"
