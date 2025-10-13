# System Prompts Management - Docker Build and Deployment

# Configuration
REGISTRY = docker-registry.kerjaremoteluarnegeri.com
IMAGE_NAME = admin-management
CONTAINER_NAME = admin-management

# Get version from git tags (auto-increment minor version)
# Get latest version tag that ends with -admin-management (e.g., v0.1.0-admin-management)
# Extract the latest version tag that ends with -admin-management
RAW_VERSION := $(shell git tag --list "v*-admin-management" | sed 's/^v//' | sed 's/-admin-management$$//' | sort -V | tail -n 1)

# Fallback to v0.1.0 if no tag found
ifeq ($(RAW_VERSION),)
	VERSION := 0.1.0
else
	VERSION := $(RAW_VERSION)
endif

# Increment patch version
NEXT_VERSION := $(shell echo $(VERSION) | awk -F. '{ printf "%d.%d.%d", $$1, $$2, $$3 + 1 }')

# Final tag
TAG_VERSION := v$(NEXT_VERSION)-admin-management

# Git commit
GIT_COMMIT := $(shell git rev-parse --short HEAD)

# Default target
.PHONY: help
help:
	@echo "System Prompts Management - Docker Operations"
	@echo ""
	@echo "Available targets:"
	@echo "  build          - Build Docker image with auto-incremented version"
	@echo "  build-dev      - Build Docker image with development tag"
	@echo "  push           - Push image to registry"
	@echo "  deploy         - Deploy using docker compose"
	@echo "  deploy-nobuild - Deploy without building (use existing image)"
	@echo "  stop           - Stop and remove containers"
	@echo "  logs           - Show container logs"
	@echo "  clean          - Remove old images (keep last 3)"
	@echo "  install-deps   - Install dependencies using bun"
	@echo "  dev            - Start development server"
	@echo ""
	@echo "Current version: $(VERSION)"
	@echo "Next version: $(TAG_VERSION)"

.PHONY: install-deps
install-deps:
	@echo "Installing dependencies with bun..."
	bun install

.PHONY: dev
dev:
	@echo "Starting development server..."
	bun run dev

.PHONY: build
build:
	@echo "Building Docker image: $(REGISTRY)/$(IMAGE_NAME):$(TAG_VERSION)"
	@echo "Git commit: $(GIT_COMMIT)"
	docker build \
		--build-arg APP_VERSION=$(NEXT_VERSION) \
		-t $(REGISTRY)/$(IMAGE_NAME):$(TAG_VERSION) \
		-t $(REGISTRY)/$(IMAGE_NAME):latest \
		.
	@echo "Tagging git commit with $(TAG_VERSION)"
	git tag $(TAG_VERSION)
	@echo "Build completed: $(REGISTRY)/$(IMAGE_NAME):$(TAG_VERSION)"

.PHONY: build-dev
build-dev:
	@echo "Building development Docker image: $(REGISTRY)/$(IMAGE_NAME):dev-$(GIT_COMMIT)"
	docker build \
		--build-arg APP_VERSION=dev-$(GIT_COMMIT) \
		-t $(REGISTRY)/$(IMAGE_NAME):dev-$(GIT_COMMIT) \
		-t $(REGISTRY)/$(IMAGE_NAME):dev \
		.
	@echo "Development build completed: $(REGISTRY)/$(IMAGE_NAME):dev-$(GIT_COMMIT)"

.PHONY: push
push:
	@echo "Pushing image to registry..."
	docker push $(REGISTRY)/$(IMAGE_NAME):$(TAG_VERSION)
	docker push $(REGISTRY)/$(IMAGE_NAME):latest

.PHONY: deploy
deploy: build
	@echo "Deploying System Prompts Management..."
	docker compose down || true
	docker compose up -d
	@echo "Deployment completed!"
	@echo "Application available at: http://localhost:3030"

.PHONY: deploy-nobuild
deploy-nobuild:
	@echo "Deploying System Prompts Management (no build)..."
	docker compose down || true
	docker compose up -d
	@echo "Deployment completed!"
	@echo "Application available at: http://localhost:3030"

.PHONY: stop
stop:
	@echo "Stopping System Prompts Management..."
	docker compose down
	@echo "Containers stopped and removed."

.PHONY: logs
logs:
	@echo "Showing container logs..."
	docker compose logs -f

.PHONY: logs-app
logs-app:
	@echo "Showing application logs..."
	docker compose logs -f admin-management

.PHONY: logs-db
logs-db:
	@echo "Showing database logs..."
	docker compose logs -f mongodb

.PHONY: clean
clean:
	@echo "Cleaning up old Docker images (keeping last 3)..."
	@docker images $(REGISTRY)/$(IMAGE_NAME) --format "table {{.Repository}}:{{.Tag}}\t{{.ID}}\t{{.CreatedAt}}" | \
		grep -v "latest\|dev" | \
		tail -n +4 | \
		awk '{print $$2}' | \
		xargs -r docker rmi || true
	@echo "Cleanup completed."

.PHONY: shell
shell:
	@echo "Opening shell in running container..."
	docker exec -it $(CONTAINER_NAME) /bin/sh

.PHONY: db-shell
db-shell:
	@echo "Opening MongoDB shell..."
	docker exec -it admin-management-mongodb mongosh

.PHONY: status
status:
	@echo "Container status:"
	@docker compose ps

.PHONY: restart
restart:
	@echo "Restarting System Prompts Management..."
	docker compose restart
	@echo "Restart completed!"

# Development helpers
.PHONY: check
check:
	@echo "Running SvelteKit checks..."
	bun run check

.PHONY: build-local
build-local:
	@echo "Building application locally..."
	bun run build
