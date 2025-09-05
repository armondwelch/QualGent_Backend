variable "project_id" {
  description = "GCP Project ID"
  type        = string
  default     = "queueforge"
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "us-central1"
}

variable "zone" {
  description = "GCP zone"
  type        = string
  default     = "us-central1-a"
}

variable "default_pool_min_nodes" {
  description = "Minimum nodes for default pool"
  type        = number
  default     = 2
}

variable "default_pool_max_nodes" {
  description = "Maximum nodes for default pool"
  type        = number
  default     = 5
}

variable "android_pool_max_nodes" {
  description = "Maximum nodes for Android emulator pool"
  type        = number
  default     = 10
}

variable "macos_pool_max_nodes" {
  description = "Maximum nodes for macOS pool"
  type        = number
  default     = 3
}
