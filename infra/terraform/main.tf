terraform {
  required_version = ">= 1.6.0"
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.30"
    }
  }
}

variable "kubeconfig_path" {
  type        = string
  description = "Explicit kubeconfig path for an existing, user-approved Kubernetes cluster."
  default     = "~/.kube/config"
}

provider "kubernetes" {
  config_path = var.kubeconfig_path
}

# Optional local-cluster infrastructure example. Never auto-applied from CI.
resource "kubernetes_namespace" "demo" {
  metadata {
    name = "quantum-ai-local"
  }
}

resource "kubernetes_deployment" "web" {
  metadata {
    name      = "quantum-ai-showcase"
    namespace = kubernetes_namespace.demo.metadata[0].name
  }
  spec {
    replicas = 1
    selector {
      match_labels = { app = "quantum-ai-showcase" }
    }
    template {
      metadata {
        labels = { app = "quantum-ai-showcase" }
      }
      spec {
        container {
          name              = "web"
          image             = "quantum-ai-showcase:ci"
          image_pull_policy = "Never"
          port {
            container_port = 3000
          }
          env {
            name  = "NITRO_HOST"
            value = "0.0.0.0"
          }
          env {
            name  = "NITRO_PORT"
            value = "3000"
          }
        }
      }
    }
  }
}
