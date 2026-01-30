# Sobrescribir pnpm-workspace.yaml con formato YAML válido
cat > pnpm-workspace.yaml <<EOF
packages:
  - 'apps/*'
  - 'packages/*'
EOF