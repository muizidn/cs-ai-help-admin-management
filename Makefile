# Variables
PROJECT_NAME := $(shell basename $(PWD))
GIT_COMMIT := $(shell git rev-parse --short HEAD 2>/dev/null || echo "unknown")
GIT_BRANCH := $(shell git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
APP_VERSION := $(shell git tag --list --sort=-version:refname | head -1 2>/dev/null || echo "v0.0.0")
IMAGE_TAG := $(PROJECT_NAME):$(APP_VERSION)
LATEST_TAG := $(PROJECT_NAME):latest
ENV_FILE := $(if $(ENV),$(ENV),.env)
APP_ENVIRONMENT := $(shell grep APP_ENVIRONMENT $(ENV_FILE) 2>/dev/null | cut -d'=' -f2 || echo "dev")
COMPOSE_PROJECT_NAME := $(PROJECT_NAME)-$(APP_ENVIRONMENT)
CONTAINER_NAME := $(PROJECT_NAME)-$(APP_ENVIRONMENT)

# Colors
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[1;33m
RED := \033[0;31m
CYAN := \033[0;36m
BOLD := \033[1m
NC := \033[0m

# --------------------
# HELP
# --------------------
.PHONY: help
help:
	@printf "$(CYAN)$(BOLD)CS AI App Deployment & Management$(NC)\n\n"
	@printf "$(BOLD)USAGE:$(NC)\n  make <target> [ENV=.env.<env>] [TAG=image-tag]\n\n"
	@printf "$(BOLD)BUILD & DEPLOY:$(NC)\n"
	@echo "  build_image              Build image with new version (tags only after successful build)"
	@echo "  tag_latest               Tag latest version as 'latest'"
	@echo "  deploy                   Deploy app (default: latest)"
	@echo "  deploy_dev               Deploy with volumes (hot reload)"
	@echo "  deploy_nobuild           Deploy existing image"
	@echo "  redeploy                 Build, tag latest, and deploy"
	@printf "\n$(BOLD)MANAGEMENT:$(NC)\n"
	@echo "  show_status              Show deployment status"
	@echo "  show_logs                Tail application logs"
	@echo "  list_images              List Docker images"
	@echo "  show_current_image       Git & Docker version info"
	@echo "  cleanup_old_images       Keep latest image per branch type, remove all others"
	@printf "\n$(BOLD)ROLLBACK:$(NC)\n"
	@echo "  rollback TAG=<tag>       Roll back to previous image"
	@printf "\n$(BOLD)TEST UTILITIES:$(NC)\n"
	@echo "  list_test_scenario       List test titles from 'tests/'"
	@printf "\n$(BOLD)INFO:$(NC)\n"
	@echo "  Project: $(PROJECT_NAME)"
	@echo "  Git Commit: $(GIT_COMMIT)"
	@echo "  Branch: $(GIT_BRANCH)"
	@echo "  App Version: $(APP_VERSION)"
	@echo "  Image Tag: $(IMAGE_TAG)"
	@echo "  Latest Tag: $(LATEST_TAG)"

# --------------------
# BUILD
# --------------------
.PHONY: build_image
build_image:
	@printf "$(BLUE)[INFO]$(NC) Generating version and building Docker image...\n"
	@NEW_VERSION=$$(./scripts/bump-version.sh --dry-run); \
	NEW_IMAGE_TAG="$(PROJECT_NAME):$$NEW_VERSION"; \
	printf "$(BLUE)[INFO]$(NC) Git commit: $(GIT_COMMIT)\n"; \
	printf "$(BLUE)[INFO]$(NC) Git branch: $(GIT_BRANCH)\n"; \
	printf "$(BLUE)[INFO]$(NC) App version: $$NEW_VERSION\n"; \
	printf "$(BLUE)[INFO]$(NC) Image tag: $$NEW_IMAGE_TAG\n"; \
	printf "$(BLUE)[INFO]$(NC) Building Docker image with BuildKit...\n"; \
	if DOCKER_BUILDKIT=1 docker build --build-arg APP_VERSION=$$NEW_VERSION -t $$NEW_IMAGE_TAG .; then \
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

# --------------------
# DEPLOY
# --------------------
.PHONY: deploy
deploy:
	@if [ ! -f "$(ENV_FILE)" ]; then \
		echo -e "$(RED)[ERROR]$(NC) Environment file '$(ENV_FILE)' not found!"; \
		exit 1; \
	fi; \
	DEPLOY_TAG="$(if $(TAG),$(TAG),$(LATEST_TAG))"; \
	echo "$(BLUE)[INFO]$(NC) Deploying application..."; \
	echo "$(BLUE)[INFO]$(NC) Using environment file: $(ENV_FILE)"; \
	echo "$(BLUE)[INFO]$(NC) Using image tag: $$DEPLOY_TAG"; \
	echo "$(BLUE)[INFO]$(NC) Using project name: $(COMPOSE_PROJECT_NAME)"; \
	echo "$(BLUE)[INFO]$(NC) Using container name: $(CONTAINER_NAME)"; \
	if ! docker image inspect "$$DEPLOY_TAG" >/dev/null 2>&1; then \
		echo -e "$(RED)[ERROR]$(NC) Image '$$DEPLOY_TAG' not found!"; \
		$(MAKE) list_images; \
		exit 1; \
	fi; \
	ADMIN_MANAGEMENT_CONTAINER_NAME=$(CONTAINER_NAME) \
	ADMIN_MANAGEMENT_IMAGE="$$DEPLOY_TAG" \
	ENV_FILE=$(ENV_FILE) \
	docker compose -p $(COMPOSE_PROJECT_NAME) -f docker-compose.yml --env-file $(ENV_FILE) up -d; \
	echo "$(GREEN)[SUCCESS]$(NC) Deployed to $(APP_ENVIRONMENT)"

.PHONY: deploy_dev
deploy_dev:
	@if [ ! -f "$(ENV_FILE)" ]; then \
		echo -e "$(RED)[ERROR]$(NC) Environment file '$(ENV_FILE)' not found!"; \
		exit 1; \
	fi; \
	COMPOSE_PROJECT_NAME=$(COMPOSE_PROJECT_NAME) \
	ENV_FILE=$(ENV_FILE) \
	docker compose --env-file $(ENV_FILE) up -d; \
	echo "$(GREEN)[SUCCESS]$(NC) Development environment deployed"

.PHONY: deploy_nobuild
deploy_nobuild:
	@$(MAKE) deploy $(if $(TAG),TAG=$(TAG),) $(if $(ENV),ENV=$(ENV),)

.PHONY: redeploy
redeploy:
	@$(MAKE) build_image
	@$(MAKE) tag_latest
	@$(MAKE) deploy $(if $(ENV),ENV=$(ENV),)

# --------------------
# INFO & STATUS
# --------------------
.PHONY: show_status
show_status:
	@echo "$(CYAN)[INFO] Status for environment: $(APP_ENVIRONMENT)$(NC)"
	@echo "  ENV_FILE: $(ENV_FILE)"
	@echo "  COMPOSE_PROJECT_NAME: $(COMPOSE_PROJECT_NAME)"
	@echo ""
	@COMPOSE_PROJECT_NAME=$(COMPOSE_PROJECT_NAME) docker compose -f docker-compose.yml --env-file $(ENV_FILE) ps

.PHONY: show_logs
show_logs:
	@echo "$(BLUE)[INFO]$(NC) Showing logs for environment: $(APP_ENVIRONMENT)"
	@COMPOSE_PROJECT_NAME=$(COMPOSE_PROJECT_NAME) docker compose --env-file $(ENV_FILE) logs -f

.PHONY: list_images
list_images:
	@echo "$(BLUE)[INFO]$(NC) Available images:"
	@docker images --filter "reference=$(PROJECT_NAME)" --format "table {{.Repository}}:{{.Tag}}\t{{.CreatedAt}}\t{{.Size}}"

.PHONY: show_current_image
show_current_image:
	@echo "$(BLUE)[INFO]$(NC) Git: $(GIT_COMMIT) ($(GIT_BRANCH))"
	@echo "Image Version: $(APP_VERSION)"
	@echo "Image Tag: $(IMAGE_TAG)"
	@echo "Latest Tag: $(LATEST_TAG)"

# --------------------
# ROLLBACK
# --------------------
.PHONY: rollback
rollback:
	@if [ -z "$(TAG)" ]; then \
		echo -e "$(RED)[ERROR]$(NC) TAG is required: make rollback TAG=image-name"; \
		exit 1; \
	fi; \
	if ! docker image inspect "$(TAG)" >/dev/null 2>&1; then \
		echo -e "$(RED)[ERROR]$(NC) Image '$(TAG)' not found"; \
		exit 1; \
	fi; \
	$(MAKE) deploy TAG=$(TAG) $(if $(ENV),ENV=$(ENV),)

# --------------------
# MAINTENANCE
# --------------------
.PHONY: cleanup_old_images
cleanup_old_images:
	@echo "$(YELLOW)[WARNING]$(NC) Cleaning up old images for $(PROJECT_NAME)..."
	@echo "$(BLUE)[INFO]$(NC) Strategy: Keep latest image per branch, remove all others"

	@clean_repo_images() { \
		REPO="$$1"; \
		BRANCH_NAME="$$2"; \
		PATTERN="$$3"; \
		echo "$(BLUE)[INFO]$(NC) Processing $$BRANCH_NAME images for repo: $$REPO (pattern: $$PATTERN)"; \
		\
		ALL_IMAGES=$$(docker images --format '{{.Repository}} {{.Tag}} {{.CreatedAt}} {{.ID}}' | \
			grep "^$$REPO " | grep -E -- "$$PATTERN" | sort -k3 -r); \
		\
		if [ -z "$$ALL_IMAGES" ]; then \
			echo "$(BLUE)[INFO]$(NC) No $$BRANCH_NAME images found for $$REPO"; \
			return; \
		fi; \
		\
		LATEST_IMAGE=$$(echo "$$ALL_IMAGES" | head -1); \
		echo "$(GREEN)[KEEP]$(NC) Latest $$BRANCH_NAME ($$REPO): $$LATEST_IMAGE"; \
		\
		OLD_IMAGES=$$(echo "$$ALL_IMAGES" | tail -n +2 | awk '{print $$1":"$$2}'); \
		if [ -n "$$OLD_IMAGES" ]; then \
			echo "$(YELLOW)[REMOVE]$(NC) Removing old $$BRANCH_NAME images from $$REPO:"; \
			echo "$$ALL_IMAGES" | tail -n +2 | while read repo tag created_at image_id; do \
				echo "  - $$repo:$$tag ($$created_at)"; \
			done; \
			echo "$$OLD_IMAGES" | xargs docker rmi -f; \
			echo "$(GREEN)[SUCCESS]$(NC) Cleaned old $$BRANCH_NAME images for $$REPO"; \
		else \
			echo "$(BLUE)[INFO]$(NC) No old $$BRANCH_NAME images to clean for $$REPO"; \
		fi; \
	}; \
	\
	REPO_LIST="$(PROJECT_NAME) localhost:5000/$(PROJECT_NAME)"; \
	for REPO in $$REPO_LIST; do \
		clean_repo_images "$$REPO" "develop" "-develop"; \
		clean_repo_images "$$REPO" "staging" "-staging"; \
		clean_repo_images "$$REPO" "release" "^v[0-9]+\.[0-9]+\.[0-9]+$$"; \
		clean_repo_images "$$REPO" "latest" "^latest$$"; \
	done; \

	@echo "$(GREEN)[DONE]$(NC) Docker image cleanup complete."


# --------------------
# TEST HELPERS
# --------------------
.PHONY: list_test_scenario
list_test_scenario:
	@grep -R -E 'test\(|it\(' tests/ \
	| sed -E 's/.*(test|it)\("([^"]+)".*/\2/' \
	| sort | uniq

.PHONY: push_to_registry
# Usage:
#   make push_to_registry
#   make push_to_registry TAG=v0.1.36-staging-build.20250927.2
push_to_registry:
	@TAG_TO_PUSH=$(if $(TAG),$(TAG),latest); \
	SOURCE_IMAGE="$(PROJECT_NAME):$$TAG_TO_PUSH"; \
	TARGET_IMAGE="localhost:5000/$(PROJECT_NAME):$$TAG_TO_PUSH"; \
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


NETWORK_NAME = csaiadminmanagement-net-dev
ADMIN_MANAGEMENT_CONTAINER = admin-management-app-dev
AI_INF_CONTAINER = ai-inference-ai-inference-1

.PHONY: network_create attach_network detach_if_exists status_network

network_create:
	@if [ -z "$$(docker network ls --filter name=$(NETWORK_NAME) -q)" ]; then \
		echo "🔧 Creating network $(NETWORK_NAME)..."; \
		docker network create $(NETWORK_NAME); \
	else \
		echo "✅ Network $(NETWORK_NAME) already exists"; \
	fi

# Helper to detach container if already in network
detach_if_exists:
	@if docker network inspect $(NETWORK_NAME) | grep -q "\"Name\": \"$(CONTAINER)\""; then \
		echo "♻️  Removing $(CONTAINER) from $(NETWORK_NAME) first..."; \
		docker network disconnect $(NETWORK_NAME) $(CONTAINER) || true; \
	else \
		echo "ℹ️  $(CONTAINER) not yet in $(NETWORK_NAME), skipping detach"; \
	fi

status_network:
	@echo "📌 Containers in $(NETWORK_NAME):"
	@docker network inspect $(NETWORK_NAME) | grep Name
