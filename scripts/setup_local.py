#!/usr/bin/env python3
"""Install the committed UI and strategies without overwriting local credentials."""
import argparse
import json
import os
import secrets
import shutil
from pathlib import Path


def install(root: Path, user_dir: Path, ui_dist: Path):
    if not (ui_dist / 'index.html').is_file():
        raise RuntimeError('Build extensions/frequi first: pnpm install --frozen-lockfile && pnpm build')
    strategy_source = root / 'extensions/strategies'
    # Validate conflicts before changing any existing user files.
    for source in strategy_source.glob('*.py'):
        destination = user_dir / 'strategies' / source.name
        if destination.exists() and destination.read_bytes() != source.read_bytes():
            raise RuntimeError(f'Existing strategy differs; preserve or rename it before installing: {destination}')
    user_dir.mkdir(parents=True, exist_ok=True)
    for name in ['strategies','logs','data','backtest_results','ui-zh']:
        (user_dir / name).mkdir(exist_ok=True)
    config_path = user_dir / 'config.json'
    if not config_path.exists():
        config = json.loads((root / 'config_examples/config_local_dryrun.example.json').read_text())
        for name in ['password','jwt_secret_key','ws_token']:
            config['api_server'][name] = secrets.token_urlsafe(32)
        # Exclusive creation avoids replacing a concurrent or existing local config.
        descriptor = os.open(config_path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(descriptor, 'w') as stream:
            stream.write(json.dumps(config, ensure_ascii=False, indent=2) + '\n')
    for source in strategy_source.glob('*.py'):
        shutil.copy2(source, user_dir / 'strategies' / source.name)
    target = user_dir / 'ui-zh'
    for source in ui_dist.rglob('*'):
        if source.is_file() and source.name != 'index.html':
            destination = target / source.relative_to(ui_dist)
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, destination)
    shutil.copy2(ui_dist / 'index.html', target / 'index.next.html')
    os.replace(target / 'index.next.html', target / 'index.html')
    print(f'Ready. Local credentials remain in {config_path}; no trading process was started.')


def main():
    root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser()
    parser.add_argument('--user-dir', type=Path, default=root / 'user_data')
    parser.add_argument('--ui-dist', type=Path, default=root / 'extensions/frequi/dist')
    args = parser.parse_args()
    install(root, args.user_dir.resolve(), args.ui_dist.resolve())


if __name__ == '__main__':
    main()
