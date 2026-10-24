"""Build a Chrome Web Store ZIP from an explicit runtime-file allowlist."""
import json
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

root = Path(__file__).resolve().parent.parent
manifest = json.loads((root / 'manifest.json').read_text())
files = {
    'manifest.json', 'popup.html', 'popup.css', 'popup.js', 'export-core.js',
    'adapters.js', 'lazada-adapter.js', 'lazada-navigation.js', 'content.js',
    'background.js', 'assets/mascot-head.svg',
    *manifest.get('icons', {}).values(),
}
referenced = {
    manifest['background']['service_worker'],
    manifest['action']['default_popup'],
    *manifest['action'].get('default_icon', {}).values(),
}
for content_script in manifest['content_scripts']:
    referenced.update(content_script['js'])
for resource in manifest['web_accessible_resources']:
    referenced.update(resource['resources'])
if referenced - files:
    raise SystemExit(f'Runtime files missing from allowlist: {referenced - files}')
for relative in files:
    if not (root / relative).is_file():
        raise SystemExit(f'Missing release file: {relative}')
output = root / 'release' / f"trako-order-exporter-{manifest['version']}.zip"
output.parent.mkdir(exist_ok=True)
with ZipFile(output, 'w', compression=ZIP_DEFLATED) as package:
    # Use portable archive metadata and make the root manifest the first entry.
    for relative in ['manifest.json', *sorted(files - {'manifest.json'})]:
        entry = ZipInfo(relative)
        entry.create_system = 0
        entry.external_attr = 0x20
        entry.compress_type = ZIP_DEFLATED
        package.writestr(entry, (root / relative).read_bytes())
with ZipFile(output) as package:
    if package.testzip() is not None:
        raise SystemExit('ZIP integrity check failed')
    packaged = json.loads(package.read('manifest.json').decode('utf-8'))
    if packaged['manifest_version'] != 3:
        raise SystemExit('Manifest V3 is required')
    if set(package.namelist()) != files:
        raise SystemExit('Unexpected ZIP contents')
print(output)
print(f'{len(files)} files; {output.stat().st_size:,} bytes')
