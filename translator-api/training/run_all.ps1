# One command for a full training day on a CPU. Run it from translator-api with the training venv active:
#
#   cd translator-api
#   .\.venv-train\Scripts\Activate.ps1
#   powershell -ExecutionPolicy Bypass -File training\run_all.ps1
#
# Order (each step can be stopped with Ctrl+C and re-run; finished steps are skipped):
#   1. data for Kamba + Kalenjin (Kikuyu is already there)        ~10 min
#   2. WAXAL text for Kikuyu, Dholuo, Swahili                       ~5 min
#   3. Kalenjin adapter                                             $Steps steps
#   4. Kamba adapter                                                $Steps steps
#   5. Kikuyu: back-translate WAXAL sentences, then carry on training from yesterday with them
#   6. scores for the pitch (our model vs plain NLLB) and a Kikuyu + Swahili voice sample
#
# On a typical laptop CPU 900 steps is about 1.5-2.5 h, so the whole run fits in roughly 6-7 hours.
# Short on time? Lower it:  -Steps 600
param([int]$Steps = 900, [int]$BtLimit = 1200)

$ErrorActionPreference = "Continue"
# Python output goes through Tee-Object: without this Windows uses cp1252 and crashes on letters like ĩ or ũ
$env:PYTHONIOENCODING = "utf-8"
$env:PYTHONUTF8 = "1"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
New-Item -ItemType Directory -Force training\runs | Out-Null
$log = "training\runs\run_all.log"
function Run([string]$title, [string[]]$cmd) {
    $t = Get-Date -Format "HH:mm"
    Write-Host "`n=== [$t] $title ===" -ForegroundColor Green
    "`n=== [$t] $title ===" | Out-File -Append -Encoding utf8 $log
    & python @cmd 2>&1 | Tee-Object -FilePath $log -Append
    if ($LASTEXITCODE -ne 0) { Write-Host "Step failed: $title (see $log). Carrying on with the next step." -ForegroundColor Yellow }
}
function Done([string]$lang) { return (Test-Path "models\${lang}_lora\adapter_config.json") -and (Test-Path "training\runs\$lang\state.json") -and ((Get-Content "training\runs\$lang\state.json" | ConvertFrom-Json).step -ge $Steps) }

if (-not ((Test-Path training\data\kam\train.jsonl) -and (Test-Path training\data\kln\train.jsonl))) { Run "1/6 Download Kamba + Kalenjin data" @("training/download_data.py", "--langs", "kam", "kln") }
if (-not (Test-Path training\data\waxal\luo\sentences.txt)) { Run "2/6 WAXAL text (Kikuyu, Dholuo, Swahili)" @("training/waxal.py", "--langs", "kik", "luo", "swa") }

if (Done "kln") { Write-Host "Kalenjin already at $Steps steps" } elseif (Test-Path training\runs\kln\state.json) { Run "3/6 Kalenjin (carry on)" @("training/train_lora.py", "--lang", "kln", "--resume", "--steps", "$Steps") } else { Run "3/6 Kalenjin" @("training/train_lora.py", "--lang", "kln", "--steps", "$Steps") }
if (Done "kam") { Write-Host "Kamba already at $Steps steps" } elseif (Test-Path training\runs\kam\state.json) { Run "4/6 Kamba (carry on)" @("training/train_lora.py", "--lang", "kam", "--resume", "--steps", "$Steps") } else { Run "4/6 Kamba" @("training/train_lora.py", "--lang", "kam", "--steps", "$Steps") }

Run "5/6 Kikuyu back-translation (WAXAL)" @("training/backtranslate.py", "--lang", "kik", "--limit", "$BtLimit")
if (Done "kik") { Write-Host "Kikuyu already at $Steps steps" } else { Run "5/6 Kikuyu (carry on from yesterday, with WAXAL)" @("training/train_lora.py", "--lang", "kik", "--resume", "--steps", "$Steps", "--extra", "bt") }

foreach ($l in "kln", "kam", "kik") { Run "6/6 Score $l" @("training/evaluate.py", "--lang", $l, "--n", "100") }
Run "6/6 Kikuyu voice" @("training/voice_demo.py", "--lang", "kik", "--text", "Bas ĩrĩa ĩrathiĩ Nyeri ĩkoragwo kũ?")
Run "6/6 Swahili voice" @("training/voice_demo.py", "--lang", "swa", "--text", "Basi ya kwenda Nyeri iko wapi?")

Write-Host "`nAll done. Adapters are in translator-api\models\, scores in models\<lang>_lora\eval.json, voices in training\voice\, log in $log" -ForegroundColor Green
