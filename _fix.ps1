Set-Location "c:\Users\kuzya\Documents\GitHub\bananasheroes"
$enc = [System.Text.Encoding]::UTF8

# ====== progression.js ======
$f = "js\core\progression.js"
$c = [System.IO.File]::ReadAllText($f, $enc)

# Fix pendingProgressNotices - use LF detection
$c = $c -replace 'survivalUnlock: false,\s*\n(\s*)gameCompleted: false', "survivalUnlock: false,`n`$1gameCompleted: false,`n`$1mode67Unlock: false"

# Fix isModeUnlockedByProgress
$c = $c.Replace("if (mode === 'survival') return isSurvivalUnlocked();", "if (mode === 'survival') return isSurvivalUnlocked();`r`n    if (mode === 'mode67') return isMode67Unlocked();")

# Add unlock trigger in unlockByCompletedMode for mode '67'
$trigger = "    if (mode === '67') {`r`n        if (!isMode67Unlocked()) {`r`n            setMode67Unlocked();`r`n        }`r`n        if (!readBoolLS(PROGRESS_KEYS.mode67NoticeShown, false)) {`r`n            pendingProgressNotices.mode67Unlock = true;`r`n        }`r`n    }`r`n`r`n    if (mode === 'normal') {"
$c = $c.Replace("    if (mode === 'normal') {", $trigger)

# Add consumePendingMode67Notice function - find after consumePendingGameCompletedNotice
$noticeFunc = "`r`n`r`nfunction consumePendingMode67Notice() {`r`n    if (!pendingProgressNotices.mode67Unlock) return '';`r`n    pendingProgressNotices.mode67Unlock = false;`r`n    writeLS(PROGRESS_KEYS.mode67NoticeShown, '1');`r`n    return 'Открыт новый режим: Режим 67!';`r`n}"
$insertAfter = "pendingProgressNotices.gameCompleted = false;`r`n}"
$c = $c.Replace($insertAfter, $insertAfter + $noticeFunc)

# Add reset for mode67 in resetCampaignProgressState
$c = $c.Replace("    pendingProgressNotices.survivalUnlock = false;`r`n    pendingProgressNotices.gameCompleted = false;", "    pendingProgressNotices.survivalUnlock = false;`r`n    pendingProgressNotices.gameCompleted = false;`r`n    pendingProgressNotices.mode67Unlock = false;`r`n    writeLS(PROGRESS_KEYS.mode67Unlocked, '0');`r`n    writeLS(PROGRESS_KEYS.mode67NoticeShown, '0');")

# Add window exports
$c = $c.Replace("window.consumePendingSurvivalNotice = consumePendingSurvivalNotice;", "window.isMode67Unlocked = isMode67Unlocked;`r`nwindow.consumePendingMode67Notice = consumePendingMode67Notice;`r`nwindow.consumePendingSurvivalNotice = consumePendingSurvivalNotice;")

[System.IO.File]::WriteAllText($f, $c, $enc)
Write-Host "progression.js done"

# ====== state.js - add mode67 init ======
$f2 = "js\core\state.js"
$c2 = [System.IO.File]::ReadAllText($f2, $enc)

$mode67Init = "    if (startMode === 'mode67') {`r`n        setRunBackground('img/forest2.png');`r`n        player.x = 20;`r`n        playerBulletDir = 'right';`r`n        enemy67 = new Enemy67(player.x, player.y);`r`n        enemy67RenderMode = 'sheet';`r`n        return;`r`n    }`r`n`r`n    if (startMode === 'o4ko')"
$c2 = $c2.Replace("    if (startMode === 'o4ko')", $mode67Init)

[System.IO.File]::WriteAllText($f2, $c2, $enc)
Write-Host "state.js done"

# ====== draw.js - add mode67 label ======
$f3 = "js\render\draw.js"
$c3 = [System.IO.File]::ReadAllText($f3, $enc)

$c3 = $c3.Replace(
    "const e67label = (gameMode === 'platforms') ? 'Босс: Телепузик (платформы)' : 'Босс: Телепузик';",
    "const e67label = (gameMode === 'platforms') ? 'Босс: Телепузик (платформы)' : (gameMode === 'mode67' ? 'Босс: Враг 67' : 'Босс: Телепузик');"
)

[System.IO.File]::WriteAllText($f3, $c3, $enc)
Write-Host "draw.js done"

# ====== overlays.js - add mode67 victoryText and modeNames ======
$f4 = "js\ui\overlays.js"
$c4 = [System.IO.File]::ReadAllText($f4, $enc)

$c4 = $c4.Replace("        '67': 'Поздравляю, вы победили телепузика!',", "        '67': 'Поздравляю, вы победили телепузика!',`r`n        'mode67': 'Поздравляю, вы победили врага 67!',")

$c4 = $c4.Replace("'67': 'Телепузик',", "'67': 'Телепузик', 'mode67': 'Режим 67',")

# Add mode67 notice call in the menu button handler (btnMain.onclick)
$c4 = $c4.Replace(
    "const survivalText = (typeof consumePendingSurvivalNotice === 'function')`r`n            ? consumePendingSurvivalNotice()`r`n            : '';`r`n        if (survivalText) {`r`n            await showTransientInfoNotice(survivalText, 2400);`r`n        }`r`n        const completedText",
    "const mode67Text = (typeof consumePendingMode67Notice === 'function') ? consumePendingMode67Notice() : '';`r`n        if (mode67Text) { await showTransientInfoNotice(mode67Text, 2400); }`r`n        const survivalText = (typeof consumePendingSurvivalNotice === 'function')`r`n            ? consumePendingSurvivalNotice()`r`n            : '';`r`n        if (survivalText) {`r`n            await showTransientInfoNotice(survivalText, 2400);`r`n        }`r`n        const completedText"
)

[System.IO.File]::WriteAllText($f4, $c4, $enc)
Write-Host "overlays.js done"

# ====== library.js - fix e67 boss draw ======
$fL = "js\modes\library.js"
$cL = [System.IO.File]::ReadAllText($fL, $enc)

$e67Branch = "    if (b.type === 'e67') {`r`n        if (enemy67Img && enemy67Img.complete && enemy67Img.naturalWidth > 0 && enemy67Img.naturalHeight > 0) {`r`n            const srcW = enemy67Img.naturalWidth;`r`n            const srcH = enemy67Img.naturalHeight;`r`n            if (srcW >= srcH * 1.8) {`r`n                const sw = Math.floor(srcW / 2);`r`n                const sh = srcH;`r`n                const sx = (b.frame % 2) * sw;`r`n                const fit = Math.min(b.w / sw, b.h / sh);`r`n                const dw = sw * fit;`r`n                const dh = sh * fit;`r`n                const dx = b.x + (b.w - dw) * 0.5;`r`n                const dy = b.y + (b.h - dh) * 0.5;`r`n                ctx.save();`r`n                ctx.globalAlpha = renderAlpha;`r`n                ctx.drawImage(enemy67Img, sx, 0, sw, sh, dx, dy, dw, dh);`r`n                ctx.restore();`r`n            } else {`r`n                ctx.save();`r`n                ctx.globalAlpha = renderAlpha;`r`n                drawLibraryContainImage(enemy67Img, b.x, b.y, b.w, b.h);`r`n                ctx.restore();`r`n            }`r`n        } else {`r`n            ctx.save();`r`n            ctx.globalAlpha = renderAlpha;`r`n            ctx.font = Math.round(b.h) + 'px serif';`r`n            ctx.textAlign = 'center';`r`n            ctx.textBaseline = 'middle';`r`n            ctx.fillText('7' + String.fromCharCode(65039) + String.fromCharCode(8419), b.x + b.w * 0.5, b.y + b.h * 0.5);`r`n            ctx.restore();`r`n        }`r`n        return;`r`n    }`r`n`r`n    // tele"
$cL = $cL.Replace("    // tele`r`n    if (Array.isArray(enemy67TpFrames)", $e67Branch + "`r`n    if (Array.isArray(enemy67TpFrames)")

[System.IO.File]::WriteAllText($fL, $cL, $enc)
Write-Host "library.js done"

Write-Host "ALL DONE"
