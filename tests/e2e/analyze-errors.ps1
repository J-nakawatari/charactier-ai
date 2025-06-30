@'
  $results = Get-Content test-results.txt

  $errors = @{
      Timeout = @()
      NotFound = @()
      NetworkError = @()
      AssertionFailed = @()
      Other = @()
  }

  foreach ($line in $results) {
      if ($line -match "Timeout") { $errors.Timeout += $line }
      elseif ($line -match "not found|404") { $errors.NotFound += $line }
      elseif ($line -match "ERR_|ECONNREFUSED") { $errors.NetworkError += $line }
      elseif ($line -match "Expected|Received") { $errors.AssertionFailed += $line }
      elseif ($line -match "Error:|✗") { $errors.Other += $line }
  }

  Write-Host "## エラー分析結果"
  foreach ($type in $errors.Keys) {
      if ($errors[$type].Count -gt 0) {
          Write-Host "`n### ${type}: $($errors[$type].Count)件"
          $errors[$type] | Select-Object -First 3 | ForEach-Object { Write-Host $_ }
      }
  }
  '@ | Out-File -FilePath analyze-errors.ps1