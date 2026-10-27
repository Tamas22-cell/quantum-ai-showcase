# Local Kubernetes verification

These manifests use the already built Docker image and are intended for an
ephemeral local kind cluster. CI provisions no remote or paid Kubernetes resources.

Run with Docker and kind installed:
```sh
docker build -t quantum-ai-showcase:ci .
kind create cluster
kind load docker-image quantum-ai-showcase:ci
kubectl apply -f infra/kubernetes/
kubectl rollout status deployment/quantum-ai-showcase --timeout=180s
kubectl port-forward svc/quantum-ai-showcase 3000:80
```

Then open http://localhost:3000/engineering-dashboard.

The Terraform sample validates HCL but is **not applied** automatically.
The image tag is local and should not be used for a hosted cluster without
publishing an authorized, versioned container image and configuring secrets.
