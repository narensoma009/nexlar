# Edit these before running deploy.ps1
$RESOURCE_GROUP   = "rde-pod6-rg"
$LOCATION         = "eastus2"            # adjust if your RG is elsewhere
$APP_SERVICE_PLAN = "nexlara-plan"
$WEB_APP          = "nexlara-$(($env:USERNAME -replace '[^a-z0-9]','').ToLower())"   # globally unique

# Azure OpenAI — fill in your values
$AZURE_OPENAI_ENDPOINT             = "https://your-resource.openai.azure.com/"
$AZURE_OPENAI_API_KEY              = "your-api-key"
$AZURE_OPENAI_DEPLOYMENT           = "gpt-4o"
$AZURE_OPENAI_EMBEDDING_DEPLOYMENT = "text-embedding-3-small"
$AZURE_OPENAI_API_VERSION          = "2024-10-21"
$EMBEDDING_DIM                     = 1536      # 1536 for text-embedding-3-small / ada-002; 3072 for text-embedding-3-large

# Postgres Flexible Server (with pgvector)
$DB_SERVER   = "nexlara-pg-$(($env:USERNAME -replace '[^a-z0-9]','').ToLower())"   # globally unique
$DB_NAME     = "nexlara"
$DB_USER     = "nexlaraadmin"
$DB_PASSWORD = "ChangeMe_StrongPass123!"        # min 8 chars, upper+lower+number+symbol
