# Pipeline local de qualidade do backend (PowerShell).
# Uso:  .\quality.ps1
# Roda: análise estática (prospector) + testes com cobertura (pytest --cov).
# Pré-requisito (uma vez):  .venv\Scripts\python -m pip install -r requirements-dev.txt

$ErrorActionPreference = "Stop"
$py = ".venv\Scripts\python.exe"

Write-Host "==> Prospector (análise estática + bandit)" -ForegroundColor Cyan
& $py -m prospector
if ($LASTEXITCODE -ne 0) { throw "prospector falhou" }

Write-Host "==> Pytest + cobertura" -ForegroundColor Cyan
& $py -m pytest --cov
if ($LASTEXITCODE -ne 0) { throw "pytest falhou" }

Write-Host "==> check-grammar (LanguageTool)" -ForegroundColor Cyan
node ..\scripts\check-grammar.mjs
if ($LASTEXITCODE -ne 0) { throw "check-grammar falhou" }

Write-Host "OK: qualidade do backend verde." -ForegroundColor Green
