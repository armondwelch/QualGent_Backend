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

# Node pool sizing variables
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

# Machine types
variable "default_machine_type" {
  description = "Machine type for default nodes"
  type        = string
  default     = "n1-standard-4"
}

variable "android_machine_type" {
  description = "Machine type for Android emulator nodes"
  type        = string
  default     = "n1-standard-2"
}

variable "macos_machine_type" {
  description = "Machine type for macOS nodes"
  type        = string
  default     = "n1-standard-4"
}
