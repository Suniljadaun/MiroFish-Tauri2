# -*- mode: python ; coding: utf-8 -*-
import os

block_cipher = None

a = Analysis(
    ['../../MiroFish/backend/run.py'],
    pathex=['../../MiroFish/backend'],
    binaries=[],
    datas=[
        ('../../MiroFish/locales', 'locales'),
        ('../../MiroFish/static', 'static'),
    ],
    hiddenimports=[
        'flask', 'flask_cors', 'werkzeug', 'werkzeug.serving', 'werkzeug.routing',
        'app', 'app.api', 'app.api.graph', 'app.api.simulation', 'app.api.report',
        'app.config', 'app.models', 'app.models.project', 'app.models.task',
        'app.services', 'app.services.graph_builder', 'app.services.oasis_profile_generator',
        'app.services.ontology_generator', 'app.services.report_agent',
        'app.services.simulation_config_generator', 'app.services.simulation_ipc',
        'app.services.simulation_manager', 'app.services.simulation_runner',
        'app.services.text_processor', 'app.services.zep_entity_reader',
        'app.services.zep_graph_memory_updater', 'app.services.zep_tools',
        'app.utils', 'app.utils.file_parser', 'app.utils.llm_client',
        'app.utils.locale', 'app.utils.logger', 'app.utils.retry', 'app.utils.zep_paging',
        'openai', 'zep_cloud', 'pydantic', 'dotenv', 'fitz', 'charset_normalizer', 'chardet',
    ],
    hookspath=[],
    runtime_hooks=[],
    excludes=['tkinter', 'matplotlib', 'cv2'],
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz, a.scripts, a.binaries, a.zipfiles, a.datas, [],
    name='mirofish-server',
    debug=False,
    strip=False,
    upx=True,
    console=True,
)
