#!/usr/bin/env python3
"""Exercise the checked-in SQL on disposable SQLite files, never user profiles.
This checks SQL and data preservation, not Electron/Drizzle migration dispatch.
"""
import json
from pathlib import Path
import sqlite3
import tempfile

root = Path(__file__).resolve().parents[1]
migrations = root / 'packages/db/drizzle'
journal = json.loads((migrations / 'meta/_journal.json').read_text())['entries']

with tempfile.TemporaryDirectory(prefix='chimero-migrations-') as temporary:
    for upgrade_from in range(1, len(journal) + 1):
        path = Path(temporary) / f'upgrade-{upgrade_from}.db'
        db = sqlite3.connect(path)
        db.execute('PRAGMA foreign_keys = ON')
        for index, migration in enumerate(journal):
            with db:
                for statement in (migrations / (migration['tag'] + '.sql')).read_text().split('--> statement-breakpoint'):
                    if statement.strip():
                        db.execute(statement)
            if index + 1 == upgrade_from:
                db.execute("INSERT INTO trackers(id, name, type) VALUES (9901, 'Synthetic migration fixture', 'numeric')")
                db.execute("INSERT INTO entries(id, tracker_id, value, note, timestamp, date_str) VALUES (9902, 9901, 72.5, 'preserve me', 1794657600000, '2026-11-14')")
                db.commit()
        assert db.execute('PRAGMA integrity_check').fetchone() == ('ok',)
        assert db.execute('PRAGMA foreign_key_check').fetchall() == []
        db.close()
        db = sqlite3.connect(path)
        assert db.execute('SELECT value, note FROM entries WHERE id=9902').fetchone() == (72.5, 'preserve me')
        db.execute("UPDATE entries SET value=73 WHERE id=9902")
        db.commit()
        db.close()
        db = sqlite3.connect(path)
        assert db.execute('SELECT value FROM entries WHERE id=9902').fetchone() == (73.0,)
        db.execute('PRAGMA foreign_keys = ON')
        db.execute('DELETE FROM trackers WHERE id=9901')
        assert db.execute('SELECT count(*) FROM entries WHERE id=9902').fetchone() == (0,)
        db.close()
        print(f'PASS: upgrade from migration {upgrade_from:02d}, reopen persistence, update, cascade delete, integrity')
print('All 11 disposable SQLite migration paths passed.')
