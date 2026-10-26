variable "name_prefix" {
  description = "Prefix for resources created by this module"
  type        = string
}

variable "environment" {
  description = "Environment name (e.g. prod, staging)"
  type        = string
}

variable "allowed_cors_origins" {
  description = "Allowed origins for CORS"
  type        = list(string)
  default     = ["*"]
}

variable "tags" {
  description = "Map of tags to assign to resources"
  type        = map(string)
  default     = {}
}

variable "meal_photo_retention_days" {
  description = "Dias até a expiração automática das fotos de refeição. Princípio da necessidade (LGPD art. 6º, III) e limitação temporal (art. 15): a foto serve à análise da refeição, não ao histórico permanente. Os macronutrientes extraídos ficam no prontuário; a imagem, não."
  type        = number
  default     = 365
}
