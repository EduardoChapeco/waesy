$f = "src/routes/workspace.cms.calendario.tsx"
$fullPath = Join-Path (Get-Location) $f
$content = Get-Content $fullPath -Raw -Encoding UTF8
$old = 'useState<ScheduledPost[]>(initialPosts)'
$new = 'useState<ScheduledPost[]>(Array.isArray(initialPosts) ? initialPosts : [])'
$newContent = $content.Replace($old, $new)
[System.IO.File]::WriteAllText($fullPath, $newContent, [System.Text.UTF8Encoding]::new($false))
Write-Host "Done. Changed: $($content -ne $newContent)"
