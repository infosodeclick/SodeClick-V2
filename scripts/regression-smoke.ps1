$ErrorActionPreference = 'Stop'

$base = if ($env:BASE_URL) { $env:BASE_URL } else { 'http://127.0.0.1:3000' }

function Check($path) {
  $url = "$base$path"
  $code = (curl.exe -s -o NUL -w "%{http_code}" $url)
  if ($code -ne '200' -and $code -ne '302') {
    Write-Error "[FAIL] $path => $code"
  }
  Write-Output "[OK] $path => $code"
}

Check '/'
Check '/health'
Check '/register'
Check '/login'
Check '/forgot-password'
Check '/admin/login'

Write-Output 'Smoke check completed.'
