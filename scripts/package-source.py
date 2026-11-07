"""Build a deterministic source download from an explicit public-file allowlist."""
from pathlib import Path
import zipfile

root = Path(__file__).resolve().parents[1]
names = ['README.md', 'LICENSE', 'package.json', 'pnpm-lock.yaml',
         'tsconfig.json', 'vite.config.ts', 'postcss.config.mjs', '.gitignore', '.nojekyll']
paths = [root / name for name in names]
for folder in ['app', 'lib', 'src', 'tests', 'scripts', 'docs', 'public/ephemeris']:
    paths.extend(p for p in (root / folder).rglob('*')
                 if p.is_file() and '__pycache__' not in p.parts)
paths.append(root / 'public/favicon.svg')
with zipfile.ZipFile(root / 'public/source.zip', 'w', zipfile.ZIP_DEFLATED) as archive:
    for path in sorted(set(paths)):
        entry = zipfile.ZipInfo('natal-atelier/' + str(path.relative_to(root)), (2000, 1, 1, 0, 0, 0))
        entry.compress_type = zipfile.ZIP_DEFLATED
        entry.external_attr = 0o644 << 16
        archive.writestr(entry, path.read_bytes())
print('Source archive rebuilt from the public project files.')
