Add-Type -AssemblyName System.Drawing

function Resize-Image {
    param(
        [string]$sourcePath,
        [string]$targetPath,
        [int]$width,
        [int]$height,
        [bool]$maskable = $false
    )
    $src = [System.Drawing.Bitmap]::FromFile($sourcePath)
    $dest = New-Object System.Drawing.Bitmap($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($dest)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    if ($maskable) {
        $paddingX = [int]($width * 0.1)
        $paddingY = [int]($height * 0.1)
        $destWidth = $width - (2 * $paddingX)
        $destHeight = $height - (2 * $paddingY)
        $graphics.Clear([System.Drawing.Color]::White)
        $graphics.DrawImage($src, $paddingX, $paddingY, $destWidth, $destHeight)
    } else {
        $graphics.Clear([System.Drawing.Color]::Transparent)
        $graphics.DrawImage($src, 0, 0, $width, $height)
    }

    $dest.Save($targetPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose()
    $dest.Dispose()
    $src.Dispose()
    Write-Host "Generated: $targetPath"
}

$srcPath = (Get-Item "public/brand-favicon.png").FullName

Resize-Image -sourcePath $srcPath -targetPath (Get-Item "public/icons/icon-192x192.png").FullName -width 192 -height 192 -maskable $false
Resize-Image -sourcePath $srcPath -targetPath (Get-Item "public/icons/icon-512x512.png").FullName -width 512 -height 512 -maskable $false
Resize-Image -sourcePath $srcPath -targetPath (Get-Item "public/icons/icon-maskable-192x192.png").FullName -width 192 -height 192 -maskable $true
Resize-Image -sourcePath $srcPath -targetPath (Get-Item "public/icons/icon-maskable-512x512.png").FullName -width 512 -height 512 -maskable $true
Resize-Image -sourcePath $srcPath -targetPath (Get-Item "public/icons/apple-touch-icon.png").FullName -width 180 -height 180 -maskable $false
Resize-Image -sourcePath $srcPath -targetPath (Get-Item "public/apple-touch-icon.png").FullName -width 180 -height 180 -maskable $false
