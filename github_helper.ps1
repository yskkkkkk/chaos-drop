<#
.SYNOPSIS
  Chaos-Drop GitHub API Automation Helper Script
.DESCRIPTION
  이 스크립트는 로컬 .env 파일에서 GITHUB_TOKEN을 불러와 자동으로 현재 Git 저장소 정보를
  인식하고, Pull Request 생성 등 GitHub API 관련 작업을 안전하게 수행합니다.
.EXAMPLE
  .\github_helper.ps1 -Action CreatePR -Title "refactor: code split" -Body "PR body content"
#>

param (
    [Parameter(Mandatory=$true)]
    [ValidateSet("CreatePR", "GetPRs", "GetIssues")]
    [string]$Action,

    [Parameter(Mandatory=$false)]
    [string]$Title,

    [Parameter(Mandatory=$false)]
    [string]$Body,

    [Parameter(Mandatory=$false)]
    [string]$Head,

    [Parameter(Mandatory=$false)]
    [string]$Base = "main"
)

# 1. .env 파일 로드 및 토큰 추출
$envPath = Join-Path $PSScriptRoot ".env"
if (-not (Test-Path $envPath)) {
    Write-Error ".env 파일이 존재하지 않습니다. GITHUB_TOKEN을 설정해 주세요."
    exit 1
}

$token = ""
Get-Content $envPath | ForEach-Object {
    if ($_ -match "^\s*GITHUB_TOKEN\s*=\s*(.*)$") {
        $token = $Matches[1].Trim()
    }
}

if ([string]::IsNullOrEmpty($token)) {
    Write-Error ".env 파일에서 GITHUB_TOKEN을 찾을 수 없습니다."
    exit 1
}

# 2. Git 원격지 주소 분석하여 Owner/Repo 추출
try {
    $remoteUrl = git remote get-url origin
    if ($remoteUrl -match "github\.com[:/]([^/]+)/([^.]+)(?:\.git)?") {
        $owner = $Matches[1]
        $repo = $Matches[2]
        Write-Host "Detected Repository: $owner/$repo" -ForegroundColor Cyan
    } else {
        Write-Error "GitHub 원격 저장소 URL을 분석할 수 없습니다: $remoteUrl"
        exit 1
    }
} catch {
    Write-Error "Git 원격 정보를 가져오는 데 실패했습니다. Git 저장소인지 확인해 주세요."
    exit 1
}

# 3. HTTP 공통 헤더 설정
$headers = @{
    "Authorization" = "token $token"
    "Accept"        = "application/vnd.github.v3+json"
}

# 4. 액션별 분기 처리
switch ($Action) {
    "CreatePR" {
        if ([string]::IsNullOrEmpty($Title)) {
            Write-Error "CreatePR 액션을 실행하려면 -Title 매개변수가 필요합니다."
            exit 1
        }
        
        # Head 브랜치가 지정되지 않은 경우 현재 Git 브랜치명 자동 확인
        $currentHead = $Head
        if ([string]::IsNullOrEmpty($currentHead)) {
            $currentHead = (git branch --show-current).Trim()
        }

        Write-Host "Creating Pull Request from '$currentHead' to '$Base'..." -ForegroundColor Green
        
        $requestBody = @{
            title = $Title
            head  = $currentHead
            base  = $Base
            body  = $Body
        } | ConvertTo-Json
        
        $utf8Body = [System.Text.Encoding]::UTF8.GetBytes($requestBody)
        $uri = "https://api.github.com/repos/$owner/$repo/pulls"

        try {
            $response = Invoke-RestMethod -Uri $uri -Method Post -Headers $headers -Body $utf8Body -ContentType "application/json; charset=utf-8"
            Write-Host "Successfully Created PR!" -ForegroundColor Green
            Write-Host "PR URL: $($response.html_url)" -ForegroundColor Yellow
        } catch {
            Write-Error "PR 생성 중 오류가 발생했습니다: $_"
        }
    }

    "GetPRs" {
        $uri = "https://api.github.com/repos/$owner/$repo/pulls?state=open"
        try {
            $prs = Invoke-RestMethod -Uri $uri -Method Get -Headers $headers
            if ($prs.Count -eq 0) {
                Write-Host "열려 있는 Pull Request가 없습니다." -ForegroundColor Yellow
            } else {
                Write-Host "=== Open Pull Requests ===" -ForegroundColor Green
                foreach ($pr in $prs) {
                    Write-Host "#$($pr.number) [$($pr.title)] by @$($pr.user.login) ($($pr.html_url))"
                }
            }
        } catch {
            Write-Error "PR 목록을 가져오는 중 오류가 발생했습니다: $_"
        }
    }

    "GetIssues" {
        $uri = "https://api.github.com/repos/$owner/$repo/issues?state=open"
        try {
            $issues = Invoke-RestMethod -Uri $uri -Method Get -Headers $headers
            # GitHub API는 PR도 Issue 목록에 포함하므로 필터링
            $onlyIssues = $issues | Where-Object { -not $_.pull_request }
            if ($onlyIssues.Count -eq 0) {
                Write-Host "열려 있는 이슈가 없습니다." -ForegroundColor Yellow
            } else {
                Write-Host "=== Open Issues ===" -ForegroundColor Green
                foreach ($issue in $onlyIssues) {
                    Write-Host "#$($issue.number) [$($issue.title)] ($($issue.html_url))"
                }
            }
        } catch {
            Write-Error "이슈 목록을 가져오는 중 오류가 발생했습니다: $_"
        }
    }
}
