#!/bin/bash
set -euo pipefail

# ==============================================================================
# TechyPark Engine - MINIMAL GCP Deployment Script
#
# This script automates a minimal, self-contained deployment to GKE. It runs
# PostgreSQL and Redis inside the Kubernetes cluster to reduce cost and
# complexity, avoiding the need for separate Cloud SQL and Memorystore instances.
#
# Prerequisites:
#   - Google Cloud SDK (gcloud) installed and authenticated.
#   - Docker installed and running.
#   - A GCP project with billing enabled.
#   - kubectl installed.
#   - A '.env' file with secrets. IMPORTANT: For this minimal setup, ensure
#     your DATABASE_URL and REDIS_URL point to the in-cluster services:
#     DATABASE_URL="postgresql://techypark:localpassword123@postgres-service:5432/techypark"
#     REDIS_URL="redis://redis-service:6379"
# ==============================================================================

# --- Configuration ---
GCP_REGION="us-central1"
GKE_CLUSTER_NAME="techypark-cluster-min" # New name to avoid conflicts
K8S_NAMESPACE="techypark"

# --- Colors for better output ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# --- Helper Functions ---
function print_header() {
  echo -e "\n${CYAN}=======================================================================${NC}"
  echo -e "${CYAN} $1 ${NC}"
  echo -e "${CYAN}=======================================================================${NC}"
}

function check_command() {
  if ! command -v "$1" &> /dev/null; then
    echo -e "${YELLOW}Error: '$1' is not installed. Please install it to continue.${NC}"
    exit 1
  fi
}

# --- Main Script ---

# 1. Initial Checks
print_header "Step 1: Checking Prerequisites"
check_command "gcloud"
check_command "docker"
check_command "kubectl"
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Error: A '.env' file is required. See script header for required values.${NC}"
    exit 1
fi
echo "✅ Prerequisites met."

# 2. GCP Project Setup
print_header "Step 2: GCP Project Configuration"
read -p "Enter your GCP Project ID: " GCP_PROJECT_ID
gcloud config set project "$GCP_PROJECT_ID"
echo "✅ GCP project set to '$GCP_PROJECT_ID'."

# 3. Enable GCP APIs
print_header "Step 3: Enabling GCP APIs"
gcloud services enable container.googleapis.com artifactregistry.googleapis.com
echo "✅ Required APIs enabled."

# 4. GKE Cluster Setup
print_header "Step 4: Setting Up Minimal GKE Cluster"
if ! gcloud container clusters describe "$GKE_CLUSTER_NAME" --region "$GCP_REGION" &>/dev/null; then
  echo "Creating GKE cluster..."
  gcloud container clusters create "$GKE_CLUSTER_NAME" \
    --region "$GCP_REGION" \
    --num-nodes=1 \
    --machine-type=e2-small \
    --disk-type="pd-standard" \
    --disk-size="30GB" \
    --enable-autoscaling --min-nodes=1 --max-nodes=2
else
  echo "✅ GKE cluster already exists."
fi
gcloud container clusters get-credentials "$GKE_CLUSTER_NAME" --region "$GCP_REGION"
echo "✅ GKE cluster is ready."

# 5. Build and Push Docker Images
print_header "Step 5: Building and Pushing Docker Images"
gcloud auth configure-docker gcr.io -q
FRONTEND_IMAGE="gcr.io/${GCP_PROJECT_ID}/frontend:latest"
BACKEND_IMAGE="gcr.io/${GCP_PROJECT_ID}/backend:latest"
docker build -t "$FRONTEND_IMAGE" ./frontend
docker build -t "$BACKEND_IMAGE" ./backend
docker push "$FRONTEND_IMAGE"
docker push "$BACKEND_IMAGE"
echo "✅ Docker images pushed to Artifact Registry."

# 6. Kubernetes Deployment
print_header "Step 6: Deploying to Kubernetes"
kubectl create namespace "$K8S_NAMESPACE" || echo "Namespace '$K8S_NAMESPACE' already exists."

# Create Kubernetes secret from .env file
kubectl create secret generic techypark-secrets --from-env-file=.env -n "$K8S_NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

# Deploy dependencies (Postgres, Redis) and the application
echo "Applying Kubernetes deployments and services..."
cat <<EOF | kubectl apply -n "$K8S_NAMESPACE" -f -
# --- PostgreSQL In-Cluster ---
apiVersion: v1
kind: Service
metadata:
  name: postgres-service
spec:
  ports:
  - port: 5432
  selector:
    app: postgres
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15-alpine
        ports:
        - containerPort: 5432
        envFrom:
        - secretRef:
            name: techypark-secrets # Assumes DB credentials are in the secret
---
# --- Redis In-Cluster ---
apiVersion: v1
kind: Service
metadata:
  name: redis-service
spec:
  ports:
  - port: 6379
  selector:
    app: redis
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
---
# --- Backend Application ---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
spec:
  replicas: 1
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: ${BACKEND_IMAGE}
        ports:
        - containerPort: 3001
        envFrom:
        - secretRef:
            name: techypark-secrets
---
apiVersion: v1
kind: Service
metadata:
  name: backend-service
spec:
  type: ClusterIP
  selector:
    app: backend
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3001
---
# --- Frontend Application ---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
spec:
  replicas: 1
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
      - name: frontend
        image: ${FRONTEND_IMAGE}
        ports:
        - containerPort: 3000
---
apiVersion: v1
kind: Service
metadata:
  name: frontend-service
spec:
  type: LoadBalancer
  selector:
    app: frontend
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
EOF

# 7. Finalizing Deployment
print_header "Step 7: Finalizing Deployment"
kubectl rollout status deployment/postgres -n "$K8S_NAMESPACE"
kubectl rollout status deployment/redis -n "$K8S_NAMESPACE"
kubectl rollout status deployment/backend -n "$K8S_NAMESPACE"
kubectl rollout status deployment/frontend -n "$K8S_NAMESPACE"

EXTERNAL_IP=""
while [ -z "$EXTERNAL_IP" ]; do
  echo "Waiting for frontend Load Balancer IP..."
  EXTERNAL_IP=$(kubectl get svc frontend-service -n "$K8S_NAMESPACE" --template="{{range .status.loadBalancer.ingress}}{{.ip}}{{end}}")
  [ -z "$EXTERNAL_IP" ] && sleep 10
done

print_header "🎉 Deployment Successful! 🎉"
echo -e "${GREEN}Access your application at: ${YELLOW}http://${EXTERNAL_IP}${NC}"


