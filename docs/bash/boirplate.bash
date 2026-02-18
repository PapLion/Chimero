# 1. Crear directorios base
mkdir chimero-habit-flow
cd chimero-habit-flow
mkdir -p apps/electron/src/main
mkdir -p apps/electron/src/preload
mkdir -p apps/electron/src/renderer/src/components
mkdir -p packages/db/src
mkdir -p packages/ui/src

# 2. Inicializar package.json raíz
npm init -y

# 3. Crear archivo pnpm-workspace.yaml (Crucial para Monorepo)
echo "packages:
  - 'apps/*'
  - 'packages/*'
" > pnpm-workspace.yaml

# 4. Crear turbo.json básico
echo '{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "db:migrate": {
      "cache": false
    }
  }
}' > turbo.json