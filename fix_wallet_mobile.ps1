$p = (Get-Item 'G:\Outros computadores\Notebook Márcio Augusto\Projetos\GUEPARDO-LOJISTA\components\WalletView.tsx').FullName
$c = [System.IO.File]::ReadAllText($p, [System.Text.Encoding]::UTF8)
$c = $c.Replace('className="text-guepardo-accent w-8 h-8" />', 'className="text-guepardo-accent w-6 h-6 md:w-8 md:h-8" />')
$c = $c.Replace('className="text-6xl font-black tracking-tighter tabular-nums drop-shadow-lg"', 'className="text-4xl md:text-6xl font-black tracking-tighter tabular-nums drop-shadow-lg"')
$c = $c.Replace('className="text-2xl opacity-50 mr-2"', 'className="text-xl md:text-2xl opacity-50 mr-2"')
$c = $c.Replace('className="flex gap-4 mt-8">', 'className="flex flex-col sm:flex-row gap-3 mt-4 md:mt-8">')
$c = $c.Replace('px-10 py-5 rounded-2xl font-black italic text-lg', 'px-6 py-4 rounded-2xl font-black italic text-base')
$c = $c.Replace('RECARREGAR AGORA', 'RECARREGAR')
$c = $c.Replace('size={24} className="group-hover:rotate-90', 'size={20} className="group-hover:rotate-90')
[System.IO.File]::WriteAllText($p, $c, [System.Text.Encoding]::UTF8)
Write-Host "Done!"
