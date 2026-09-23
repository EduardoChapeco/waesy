$importLine = 'import { getDefaultCity } from "@/lib/brand.config";'

function ReplaceInFile($filePath, $oldStr, $newStr) {
  $bytes = [System.IO.File]::ReadAllBytes($filePath)
  $enc = [System.Text.UTF8Encoding]::new($false)
  $text = $enc.GetString($bytes)
  if ($text.Contains($oldStr)) {
    $text = $text.Replace($oldStr, $newStr)
    # Add import if not already present
    if (-not $text.Contains('from "@/lib/brand.config"')) {
      $firstImport = $text.IndexOf("import ")
      if ($firstImport -ge 0) {
        $text = $text.Insert($firstImport, $importLine + "`n")
      }
    }
    [System.IO.File]::WriteAllBytes($filePath, $enc.GetBytes($text))
    Write-Host "FIXED: $filePath"
    return $true
  }
  return $false
}

$base = Get-Location

$jobs = @(
  @{ f = "src/services/affiliates.functions.ts";   o = 'city: s.city || "Chapecó"';  n = 'city: getDefaultCity(s.city)' },
  @{ f = "src/services/social.functions.ts";        o = 'city: s.city || "Chapecó"';  n = 'city: getDefaultCity(s.city)' },
  @{ f = "src/services/company-delivery.functions.ts"; o = 'delivery_city: data.deliveryCity || "Chapecó"'; n = 'delivery_city: getDefaultCity(data.deliveryCity)' },
  @{ f = "src/services/travel-ai-extractor.functions.ts"; o = 'departure_city: extracted.departure_city || "Chapecó"'; n = 'departure_city: getDefaultCity(extracted.departure_city)' },
  @{ f = "src/services/mining/pncp-extractor.ts";   o = 'const query = options.query || "Chapecó"'; n = 'const query = options.query || getDefaultCity()' },
  @{ f = "src/services/mining/editorial-squad.ts";  o = 'const city = params.city || "Chapecó"'; n = 'const city = getDefaultCity(params.city)' }
)

# classifieds has multiple occurrences - handle separately
$classifiedsPath = Join-Path $base "src/services/classifieds.functions.ts"
$cbytes = [System.IO.File]::ReadAllBytes($classifiedsPath)
$cenc = [System.Text.UTF8Encoding]::new($false)
$ctext = $cenc.GetString($cbytes)
$changed = $false
if ($ctext.Contains('city = savedRecord.city || "Chapecó"')) {
  $ctext = $ctext.Replace('city = savedRecord.city || "Chapecó"', 'city = getDefaultCity(savedRecord.city)')
  $changed = $true
}
if ($ctext.Contains('city: classified.location_name || attrs.city || "Chapecó"')) {
  $ctext = $ctext.Replace('city: classified.location_name || attrs.city || "Chapecó"', 'city: getDefaultCity(classified.location_name || attrs.city)')
  $changed = $true
}
if ($changed) {
  if (-not $ctext.Contains('from "@/lib/brand.config"')) {
    $firstImport = $ctext.IndexOf("import ")
    $ctext = $ctext.Insert($firstImport, $importLine + "`n")
  }
  [System.IO.File]::WriteAllBytes($classifiedsPath, $cenc.GetBytes($ctext))
  Write-Host "FIXED: src/services/classifieds.functions.ts"
}

# mining has multiple lines
$miningPath = Join-Path $base "src/services/mining.functions.ts"
$mbytes = [System.IO.File]::ReadAllBytes($miningPath)
$menc = [System.Text.UTF8Encoding]::new($false)
$mtext = $menc.GetString($mbytes)
$mchanged = $false
foreach ($pattern in @('query: data?.query || "Chapecó"', 'city: data?.city || "Chapecó"', 'query: data?.city || "Chapecó"')) {
  $newPat = $pattern -replace '"Chapecó"', 'getDefaultCity()'
  if ($mtext.Contains($pattern)) {
    $mtext = $mtext.Replace($pattern, $newPat)
    $mchanged = $true
  }
}
if ($mchanged) {
  if (-not $mtext.Contains('from "@/lib/brand.config"')) {
    $firstImport = $mtext.IndexOf("import ")
    $mtext = $mtext.Insert($firstImport, $importLine + "`n")
  }
  [System.IO.File]::WriteAllBytes($miningPath, $menc.GetBytes($mtext))
  Write-Host "FIXED: src/services/mining.functions.ts"
}

# Process the simple one-replacement files
foreach ($j in $jobs) {
  $fp = Join-Path $base $j.f
  if (Test-Path $fp) {
    ReplaceInFile $fp $j.o $j.n | Out-Null
  }
}

Write-Host "`nAll done."
