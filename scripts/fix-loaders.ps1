$root = "src/routes"
$files = Get-ChildItem -Path $root -Filter "*.tsx" -Recurse

$count = 0
foreach ($f in $files) {
  $content = Get-Content $f.FullName -Raw -Encoding UTF8
  if ($content -match 'return \{\} as any;') {
    $newContent = $content -replace 'return \{\} as any;', 'return null as any;'
    [System.IO.File]::WriteAllText($f.FullName, $newContent, [System.Text.Encoding]::UTF8)
    Write-Host "Fixed: $($f.Name)"
    $count++
  }
}
Write-Host "Total fixed: $count files"
