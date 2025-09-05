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
    resource_limits {
      resource_type   = "cpu"
      minimum         = 1
      maximum         = 100
    }
    resource_limits {
      resource_type   = "memory"
      minimum         = 1
      maximum         = 1000
    }
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
    machine_type = "e2-standard-4"
    
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
  name       = "android-emulator-pool"
  cluster    = google_container_cluster.emulator_cluster.name
  location   = var.zone
  
  autoscaling {
    min_node_count = 0
    max_node_count = var.android_pool_max_nodes
  }
  
  node_config {
    preemptible  = false
    machine_type = "n1-standard-4"
    
    labels = {
      kvm = "enabled"
    }
    
    metadata = {
      disable-legacy-endpoints = "true"
    }
    
    oauth_scopes = [
      "https://www.googleapis.com/auth/logging.write",
      "https://www.googleapis.com/auth/monitoring",
      "https://www.googleapis.com/auth/devstorage.read_only",
      "https://www.googleapis.com/auth/service.management.readonly",
      "https://www.googleapis.com/auth/servicecontrol",
      "https://www.googleapis.com/auth/trace.append"
    ]
    
    advanced_machine_features {
      enable_nested_virtualization = true
      threads_per_core             = 0
    }
  }
}

# macOS KVM node pool with scale-to-zero
resource "google_container_node_pool" "macos_kvm_pool" {
  name       = "macos-kvm-pool"
  cluster    = google_container_cluster.emulator_cluster.name
  location   = var.zone
  
  autoscaling {
    min_node_count = 0    
    max_node_count = var.macos_pool_max_nodes
  }
  
  node_config {
    preemptible  = true
    machine_type = "n1-standard-8"
    disk_size_gb = 150
    disk_type    = "pd-standard"
    
    labels = {
      workload = "macos"
    }
    
    metadata = {
      disable-legacy-endpoints = "true"
    }
    
    oauth_scopes = [
      "https://www.googleapis.com/auth/logging.write",
      "https://www.googleapis.com/auth/monitoring",
      "https://www.googleapis.com/auth/devstorage.read_only",
      "https://www.googleapis.com/auth/service.management.readonly",
      "https://www.googleapis.com/auth/servicecontrol",
      "https://www.googleapis.com/auth/trace.append"
    ]
    
    advanced_machine_features {
      threads_per_core             = 0
      enable_nested_virtualization = true
    }
  }
}

# Restore macOS disk from backup image
resource "google_compute_disk" "macos_restored" {
  name  = "macos-system-restored"
  size  = 200
  zone  = var.zone
  image = "macos-backup-image"
  type  = "pd-standard"
  labels = {
    "storage-class" = "standard-rwo"
  }
}
