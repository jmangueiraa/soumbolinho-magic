Add-Type -AssemblyName System.Drawing

$sourcePath = "C:\Users\USER\.gemini\antigravity\brain\2062ca2e-76ac-448d-81a6-b5bfa0439549\.user_uploaded\media_1789525047764.png"
if (-not (Test-Path $sourcePath)) {
    Write-Host "Source image not found: $sourcePath"
    exit 0
}

$publicDir = "c:\Users\USER\OneDrive\Documentos\Soumbolinho\public"
if (-not (Test-Path $publicDir)) {
    New-Item -ItemType Directory -Path $publicDir -Force | Out-Null
}

$destPng = Join-Path $publicDir "default-banner.png"
$destJpg = Join-Path $publicDir "default-banner.jpg"
$destAlt = Join-Path $publicDir "banner.png"

$bmp = [System.Drawing.Bitmap]::FromFile($sourcePath)
$w = $bmp.Width
$h = $bmp.Height

$midX = [math]::Floor($w / 2)
$midY = [math]::Floor($h / 2)

# Scan upwards from center for top edge
$top = 0
for ($y = $midY; $y -ge 0; $y--) {
    $c = $bmp.GetPixel($midX, $y)
    if ($c.R -gt 220 -and $c.G -gt 220 -and $c.B -gt 220) {
        $top = $y + 2
        break
    }
}

# Scan downwards from center for bottom edge
$bottom = $h - 1
for ($y = $midY; $y -lt $h; $y++) {
    $c = $bmp.GetPixel($midX, $y)
    if ($c.R -gt 220 -and $c.G -gt 220 -and $c.B -gt 220) {
        $bottom = $y - 2
        break
    }
}

$midBannerY = [math]::Floor(($top + $bottom) / 2)

# Scan leftwards for left edge
$left = 0
for ($x = $midX; $x -ge 0; $x--) {
    $c = $bmp.GetPixel($x, $midBannerY)
    if ($c.R -gt 220 -and $c.G -gt 220 -and $c.B -gt 220) {
        $left = $x + 2
        break
    }
}

# Scan rightwards for right edge
$right = $w - 1
for ($x = $midX; $x -lt $w; $x++) {
    $c = $bmp.GetPixel($x, $midBannerY)
    if ($c.R -gt 220 -and $c.G -gt 220 -and $c.B -gt 220) {
        $right = $x - 2
        break
    }
}

$cropW = $right - $left + 1
$cropH = $bottom - $top + 1

Write-Host "Banner Box: Left=$left, Top=$top, Width=$cropW, Height=$cropH"

if ($cropW -gt 100 -and $cropH -gt 50) {
    $rect = New-Object System.Drawing.Rectangle($left, $top, $cropW, $cropH)
    $cropped = $bmp.Clone($rect, $bmp.PixelFormat)
    $cropped.Save($destPng, [System.Drawing.Imaging.ImageFormat]::Png)
    $cropped.Save($destJpg, [System.Drawing.Imaging.ImageFormat]::Jpeg)
    $cropped.Save($destAlt, [System.Drawing.Imaging.ImageFormat]::Png)
    $cropped.Dispose()
    Write-Host "Cropped successfully to $destPng"
}

$bmp.Dispose()
