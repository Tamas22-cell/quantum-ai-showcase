# Azure Container Apps deployment (prepared, not provisioned)

This repo is currently deployed on Vercel. Azure is **not connected or verified**.
The Docker image is a portable alternative deployment.

## Prerequisites
- Azure subscription with budget alerts
- Resource group, Azure Container Registry (ACR), and Azure Container App created and cost-approved by the owner
- Federated GitHub OIDC credentials; never place Azure client secrets in the repo
- A GitHub Environment named `azure-staging` with approval protection

## GitHub Environment variables
Set `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`,
`AZURE_RESOURCE_GROUP`, `AZURE_CONTAINER_REGISTRY`, and
`AZURE_CONTAINER_APP` as environment variables in GitHub (not checked into source).

The workflow `Azure Container Apps (manual)` is **manual only**.
It builds and pushes an image to an existing ACR and updates an existing
Container App. It does **not** create paid cloud resources or run automatically.
Its first execution should be supervised, followed by URL, health,
cost and rollback verification.

## Local validation
```bash
docker compose up --build -d
curl -f http://127.0.0.1:3000/engineering-dashboard
docker compose down
```

## Rollback
Use Azure Container Apps revision management to restore the preceding healthy
revision. Keep multiple revisions until the new release is verified.
