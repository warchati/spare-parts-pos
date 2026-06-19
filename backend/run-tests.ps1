$ErrorActionPreference = "Stop"
$ProjectRoot = "C:\Users\admin\spare-parts-pos\backend"
$SchemaFile = Join-Path $ProjectRoot "prisma\schema.prisma"
$SchemaBak = Join-Path $ProjectRoot "prisma\schema.prisma.bak"
$SchemaSqlite = Join-Path $ProjectRoot "prisma\schema.sqlite.prisma"

Write-Host "=== AutoRepuestos POS - Test Suite ===" -ForegroundColor Cyan
Write-Host ""

# Backup original schema and switch to SQLite
Write-Host "1. Switching to SQLite for testing..." -ForegroundColor Yellow
Copy-Item -LiteralPath $SchemaFile -Destination $SchemaBak -Force
Copy-Item -LiteralPath $SchemaSqlite -Destination $SchemaFile -Force

try {
    # Clean up any previous test artifacts
    $testDb = Join-Path $ProjectRoot "prisma\test.db"
    $testDbJournal = Join-Path $ProjectRoot "prisma\test.db-journal"
    $migrationsDir = Join-Path $ProjectRoot "prisma\migrations"
    if (Test-Path -LiteralPath $testDb) { Remove-Item -LiteralPath $testDb -Force }
    if (Test-Path -LiteralPath $testDbJournal) { Remove-Item -LiteralPath $testDbJournal -Force }
    if (Test-Path -LiteralPath $migrationsDir) { Remove-Item -LiteralPath $migrationsDir -Recurse -Force }

    # Generate Prisma client for SQLite
    Write-Host "2. Generating Prisma client..." -ForegroundColor Yellow
    Push-Location $ProjectRoot
    cmd /c "npx.cmd prisma generate 2>&1" | ForEach-Object { Write-Host "   $_" }
    if ($LASTEXITCODE -ne 0) { throw "Prisma generate failed" }

    # Run migration
    Write-Host "3. Running migration..." -ForegroundColor Yellow
    cmd /c "npx.cmd prisma migrate dev --name test --skip-generate 2>&1" | ForEach-Object { Write-Host "   $_" }
    if ($LASTEXITCODE -ne 0) { throw "Prisma migrate failed" }

    # Build TypeScript
    Write-Host "4. Building TypeScript..." -ForegroundColor Yellow
    cmd /c "npx.cmd tsc 2>&1" | ForEach-Object { Write-Host "   $_" }
    if ($LASTEXITCODE -ne 0) { throw "TypeScript build failed" }

    # Run the test
    Write-Host "5. Running API tests..." -ForegroundColor Yellow
    Write-Host ""
    cmd /c "node test-api.cjs 2>&1" | ForEach-Object { Write-Host $_ }
    $testResult = $LASTEXITCODE

    Pop-Location

    if ($testResult -eq 0) {
        Write-Host ""
        Write-Host "=== All tests passed! ===" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "=== Some tests failed ===" -ForegroundColor Red
    }
}
catch {
    Write-Host "ERROR: $_" -ForegroundColor Red
}
finally {
    # Restore original schema
    Write-Host "6. Cleaning up..." -ForegroundColor Yellow
    if (Test-Path -LiteralPath $SchemaBak) {
        Copy-Item -LiteralPath $SchemaBak -Destination $SchemaFile -Force
        Remove-Item -LiteralPath $SchemaBak -Force
    }

    # Clean up test database
    $testDb = Join-Path $ProjectRoot "prisma\test.db"
    $testDbJournal = Join-Path $ProjectRoot "prisma\test.db-journal"
    $migrationsDir = Join-Path $ProjectRoot "prisma\migrations"
    if (Test-Path -LiteralPath $testDb) { Remove-Item -LiteralPath $testDb -Force }
    if (Test-Path -LiteralPath $testDbJournal) { Remove-Item -LiteralPath $testDbJournal -Force }
    if (Test-Path -LiteralPath $migrationsDir) { Remove-Item -LiteralPath $migrationsDir -Recurse -Force }

    Push-Location $ProjectRoot
    cmd /c "npx.cmd prisma generate 2>&1" | Out-Null
    Pop-Location

    Write-Host "Done!" -ForegroundColor Cyan
}
