# Script de Deploy - MakeUp Manager
# Este script realiza o deploy automatizado para GitHub Pages

Write-Host ">> Iniciando deploy do MakeUp Manager..." -ForegroundColor Green

try {
    # Verificar se estamos na branch developer
    $currentBranch = git branch --show-current
    if ($currentBranch -ne "developer") {
        Write-Host "AVISO: Voce nao esta na branch 'developer'. Branch atual: $currentBranch" -ForegroundColor Yellow
        $continue = Read-Host "Deseja continuar? (s/n)"
        if ($continue -ne "s" -and $continue -ne "S") {
            Write-Host "Deploy cancelado pelo usuario." -ForegroundColor Red
            exit 1
        }
    }

    # Verificar se há mudanças não commitadas
    $status = git status --porcelain
    if ($status) {
        Write-Host "AVISO: Ha mudancas nao commitadas:" -ForegroundColor Yellow
        git status --short
        $continue = Read-Host "Deseja continuar mesmo assim? (s/n)"
        if ($continue -ne "s" -and $continue -ne "S") {
            Write-Host "Deploy cancelado. Faca commit das mudancas primeiro." -ForegroundColor Red
            exit 1
        }
    }

    # Build do projeto
    Write-Host "Construindo o projeto..." -ForegroundColor Cyan
    npm run build
    if ($LASTEXITCODE -ne 0) {
        throw "Erro no build do projeto"
    }

    # Verificar se a pasta dist foi criada
    if (!(Test-Path "dist")) {
        throw "Pasta 'dist' nao foi criada pelo build"
    }

    # Fazer backup da branch atual
    $originalBranch = git branch --show-current
    Write-Host "Branch atual: $originalBranch" -ForegroundColor Blue

    # Mudar para a branch master (ou main)
    Write-Host "Mudando para branch master..." -ForegroundColor Cyan
    git checkout master
    if ($LASTEXITCODE -ne 0) {
        # Tentar branch main se master não existir
        git checkout main
        if ($LASTEXITCODE -ne 0) {
            throw "Nao foi possivel acessar a branch master ou main"
        }
    }

    # Fazer merge das mudanças da developer
    Write-Host "Fazendo merge da branch developer..." -ForegroundColor Cyan
    git merge developer
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Erro no merge. Resolvendo conflitos..." -ForegroundColor Red
        git checkout $originalBranch
        throw "Erro no merge da branch developer. Resolva os conflitos manualmente."
    }

    # Build novamente na branch master (por segurança)
    Write-Host "Build final na branch master..." -ForegroundColor Cyan
    npm run build
    if ($LASTEXITCODE -ne 0) {
        git checkout $originalBranch
        throw "Erro no build final"
    }

    # Deploy usando gh-pages
    Write-Host "Fazendo deploy para GitHub Pages..." -ForegroundColor Cyan
    npx gh-pages -d dist
    if ($LASTEXITCODE -ne 0) {
        git checkout $originalBranch
        throw "Erro no deploy para GitHub Pages"
    }

    # Voltar para a branch original
    Write-Host "Voltando para branch $originalBranch..." -ForegroundColor Cyan
    git checkout $originalBranch

    Write-Host "Deploy realizado com sucesso!" -ForegroundColor Green
    Write-Host "Site disponivel em: https://avanade-josewesley.github.io/MakeupManager/" -ForegroundColor Blue
    
} catch {
    Write-Host "Erro durante o deploy: $_" -ForegroundColor Red
    
    # Tentar voltar para a branch original em caso de erro
    try {
        if ($originalBranch) {
            git checkout $originalBranch
            Write-Host "Voltou para branch $originalBranch" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "Nao foi possivel voltar para a branch original" -ForegroundColor Yellow
    }
    
    exit 1
}

Write-Host "Deploy concluido!" -ForegroundColor Green