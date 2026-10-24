#!/usr/bin/env python3
"""Marca uma nova versão do CRM Plus antes de publicar.

Atualiza o número de versão em:
  - index.html  (meta "versao" e o "?v=" de todos os arquivos .js e .css)
  - versao.json (lido pelo sistema para avisar quem está com uma versão antiga aberta)

Uso:  python3 versao.py
"""
import json
import re
from datetime import datetime
from pathlib import Path

RAIZ = Path(__file__).resolve().parent
versao = datetime.now().strftime('%Y.%m.%d-%H%M')

index = RAIZ / 'index.html'
html = index.read_text(encoding='utf-8')
html, n_meta = re.subn(r'<meta name="versao" content="[^"]*">', f'<meta name="versao" content="{versao}">', html)
# js/... e css/... locais (ignora CDNs), com ou sem ?v= anterior
html, n_arquivos = re.subn(r'((?:src|href)="(?:js|css)/[^"?]+\.(?:js|css))(?:\?v=[^"]*)?"', rf'\1?v={versao}"', html)
if not n_meta:
    raise SystemExit('Meta "versao" não encontrada no index.html')
index.write_text(html, encoding='utf-8')

(RAIZ / 'versao.json').write_text(json.dumps({'versao': versao}) + '\n', encoding='utf-8')
print(f'Versão {versao} aplicada em {n_arquivos} arquivo(s).')
