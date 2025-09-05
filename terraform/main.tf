terraform {
  required_version = ">= 1.0"
  
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
  zone    = var.zone
}

# Main GKE Cluster
resource "google_container_cluster" "emulator_cluster" {
  name     = "emulator-cluster"
  location = var.zone
  
  # Remove default node pool immediately
  remove_default_node_pool = true
  initial_node_count       = 1
  
  # Enable required features
  addons_config {
    horizontal_pod_autoscaling {
      disabled = false
    }
    http_load_balancing {
      disabled = false
    }
  }
  
  # Enable cluster autoscaler
  cluster_autoscaling {
    enabled = true
  }
}

# Default node pool (for system pods and general workloads)
resource "google_container_node_pool" "default_pool" {
  name       = "default-pool"
  cluster    = google_container_cluster.emulator_cluster.name
  location   = var.zone
  
  autoscaling {
    min_node_count = var.default_pool_min_nodes
    max_node_count = var.default_pool_max_nodes
  }
  
  node_config {
    preemptible  = true
    machine_type = var.default_machine_type
    
    metadata = {
      disable-legacy-endpoints = "true"
    }
    
    oauth_scopes = [
      "https://www.googleapis.com/auth/logging.write",
      "https://www.googleapis.com/auth/monitoring",
      "https://www.googleapis.com/auth/devstorage.read_only"
    ]
  }
}

# Android emulator node pool
resource "google_container_node_pool" "android_emulator_pool" {
  name       = "android-emulator"
  cluster    = google_container_cluster.emulator_cluster.name
  location   = var.zone
  
  autoscaling {
    min_node_count = 0
    max_node_count = var.android_pool_max_nodes
  }
  
  node_config {
    preemptible  = true
    machine_type = var.android_machine_type
    
    labels = {
      workload = "android"
    }
    
    metadata = {
      disable-legacy-endpoints = "true"
    }
    
    oauth_scopes = [
      "https://www.googleapis.com/auth/logging.write",
      "https://www.googleapis.com/auth/monitoring",
      "https://www.googleapis.com/auth/devstorage.read_only"
    ]
  }
}

# macOS KVM node pool with scale-to-zero
resource "google_container_node_pool" "macos_kvm_pool" {
  name       = "macos-kvm-pool"
  cluster    = google_container_cluster.emulator_cluster.name
  location   = var.zone
  
  # Scale to zero when not needed!
  autoscaling {
    min_node_count = 0    
    max_node_count = var.macos_pool_max_nodes
  }
  
  node_config {
    preemptible  = true
    machine_type = var.macos_machine_type
    
    # Enable nested virtualization for KVM
    advanced_machine_features {
      threads_per_core                 = 2
      enable_nested_virtualization    = true
    }
    
    # Taint so only macOS workloads schedule here
    taint {
      key    = "workload" 
      value  = "macos"
      effect = "NO_SCHEDULE"
    }
    
    labels = {
      workload = "macos"
    }
    
    metadata = {
      disable-legacy-endpoints = "true"
    }
    
    oauth_scopes = [
      "https://www.googleapis.com/auth/logging.write",
      "https://www.googleapis.com/auth/monitoring",
      "https://www.googleapis.com/auth/devstorage.read_only"
    ]
  }
}
