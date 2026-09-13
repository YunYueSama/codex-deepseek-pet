Add-Type -Path (Join-Path $PSScriptRoot 'window-probe.cs')
while ($true) {
 try {
  $whaleHandle=[WhaleForeground]::GetForegroundWindow()
  $whaleWindow=[WhaleForeground]::Read($whaleHandle)
  $whaleProcess=Get-Process -Id $whaleWindow.pid -ErrorAction Stop
  @{process=$whaleProcess.ProcessName;pid=$whaleWindow.pid;handle=$whaleWindow.handle;x=$whaleWindow.x;y=$whaleWindow.y;width=$whaleWindow.width;height=$whaleWindow.height;windows=@([WhaleForeground]::Visible())} | ConvertTo-Json -Depth 4 -Compress
 } catch { '{"unavailable":true,"windows":[]}' }
 Start-Sleep -Milliseconds 500
}
