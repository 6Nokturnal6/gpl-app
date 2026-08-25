#!/usr/bin/env python3
"""Static integration audit for GPL app (no Node/Docker required)."""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def read(path):
    with open(os.path.join(ROOT, path), encoding='utf-8') as f:
        return f.read()

issues = []
warnings = []
passed = []

def ok(msg):
    passed.append(msg)

def issue(msg):
    issues.append(msg)

def warn(msg):
    warnings.append(msg)

# --- Cultura export pipeline ---
export_js = read('backend/src/routes/export.js')
for table in ['desporto_organizado', 'desporto_participacao', 'cultura_organizada',
              'cultura_participacao', 'grupos_culturais', 'tuna_academica', 'estudantes_atividades']:
    if table not in export_js:
        issue(f'export.js missing query for {table}')
    else:
        ok(f'export.js fetches {table}')

if 'sal_outros' not in export_js.split('finSum')[1].split('}), {}')[0]:
    issue('export.js university finSum missing sal_outros')
else:
    ok('export.js finSum aggregates sal_outros')

# --- Sumário Geral section VI ---
for f, needle in [('backend/src/utils/excelExport.js', "VI. Desporto e Cultura"),
                  ('backend/src/utils/pdfExport.js', "VI. Desporto e Cultura")]:
    if needle in read(f):
        ok(f'{f} has section VI')
    else:
        issue(f'{f} missing section VI')

# --- Cultura detail export sheets ---
if "addWorksheet('Desporto e Cultura')" in read('backend/src/utils/excelExport.js'):
    ok('excelExport has Desporto e Cultura sheet')
else:
    issue('excelExport missing Desporto e Cultura sheet')

if "E. Desporto e Cultura" in read('backend/src/utils/pdfExport.js'):
    ok('pdfExport has Desporto e Cultura section')
else:
    issue('pdfExport missing Desporto e Cultura section')

# --- REQUIRED_LOCKS ---
univ = read('backend/src/routes/universities.js')
if 'REQUIRED_LOCKS = 7' in univ:
    ok('universities REQUIRED_LOCKS is 7')
else:
    issue('universities REQUIRED_LOCKS not updated to 7')

app_cfg = read('frontend/src/utils/appConfig.js')
if 'cultura' in app_cfg and 'REQUIRED_LOCKS' in app_cfg:
    ok('appConfig includes cultura and REQUIRED_LOCKS')
else:
    issue('appConfig missing cultura or REQUIRED_LOCKS')

dash = read('frontend/src/components/Dashboard/Dashboard.jsx')
if 'cultura' in dash and 'LOCKABLE_SECTIONS' in dash:
    ok('Dashboard tracks cultura via appConfig')
else:
    issue('Dashboard missing cultura integration')

if re.search(r'\bcultura\b', read('backend/src/routes/universities.js')) and 'computePrevisao' in read('backend/src/routes/universities.js'):
    ok('universities summary includes cultura')
else:
    issue('universities summary missing cultura')

if 'cultura:' in read('backend/src/routes/admin.js'):
    ok('admin submission detail includes cultura')
else:
    issue('admin submission detail missing cultura')

if read('backend/src/routes/submissions.js').count('async function saveRows') > 1:
    issue('submissions.js still has duplicate saveRows')
else:
    ok('submissions.js has single saveRows definition')

pdf = read('backend/src/utils/pdfExport.js')
if 'Salários – Outros' in pdf and 'sal_outros' in pdf.split('Total despesas')[0]:
    ok('pdfExport finanças includes sal_outros')
else:
    issue('pdfExport finanças missing sal_outros')

# --- Investigadores C.3–C.6 ---
schema = read('backend/src/models/schema.sql')
for table in [
    'investigadores_area_formacao', 'investigadores_conferencias', 'investigadores_producao',
    'investigadores_pubs_pares', 'investigadores_pubs_por_docente', 'investigadores_pubs_tipo',
    'investigadores_orientacoes', 'investigadores_pesquisas', 'investigadores_extensao',
    'investigadores_extensao_nivel',
]:
    if f'CREATE TABLE IF NOT EXISTS {table}' in schema:
        ok(f'schema has {table}')
    else:
        issue(f'schema missing {table}')

subs = read('backend/src/routes/submissions.js')
for route in ['/investigadores/area-formacao', '/investigadores/resultados']:
    if route in subs:
        ok(f'submissions has PUT {route}')
    else:
        issue(f'submissions missing PUT {route}')

if 'investigadoresAreaFormacao' in export_js and 'investigadoresResultados' in export_js:
    ok('export.js returns C.3–C.6 data')
else:
    issue('export.js missing investigadoresAreaFormacao/Resultados')

excel = read('backend/src/utils/excelExport.js')
for needle in ['C.3 —', 'C.4 —', 'C.5 —', 'C.6 —']:
    if needle in excel:
        ok(f'excelExport has {needle.strip()}')
    else:
        issue(f'excelExport missing {needle.strip()}')

for needle in ['C.3 —', 'C.4.1', 'C.5 —', 'C.6.1']:
    if needle in pdf:
        ok(f'pdfExport has {needle}')
    else:
        issue(f'pdfExport missing {needle}')

fe_sec = read('frontend/src/components/FormSections/SectionInvestigadores.jsx')
for needle in ['C.3 —', 'C.4 —', 'C.5 —', 'C.6 —', 'investigadoresAreaFormacao', 'investigadoresResultados']:
    if needle in fe_sec:
        ok(f'SectionInvestigadores has {needle}')
    else:
        issue(f'SectionInvestigadores missing {needle}')

api = read('frontend/src/api/index.js')
if 'saveInvestigadoresAreaFormacao' in api and 'saveInvestigadoresResultados' in api:
    ok('frontend API has C.3–C.6 savers')
else:
    issue('frontend API missing C.3–C.6 savers')

print('=== GPL App Static Audit ===')
print(f'Passed: {len(passed)}')
for p in passed:
    print(f'  OK  {p}')
if warnings:
    print(f'\nWarnings: {len(warnings)}')
    for w in warnings:
        print(f'  WARN {w}')
if issues:
    print(f'\nIssues: {len(issues)}')
    for i in issues:
        print(f'  FAIL {i}')
    sys.exit(1)
print('\nNo critical issues found.')
sys.exit(0)
