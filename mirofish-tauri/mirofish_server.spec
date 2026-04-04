# -*- mode: python ; coding: utf-8 -*-
# PyInstaller spec for MiroFish backend sidecar
# Run from: MiroFish/backend/
#   pyinstaller mirofish_server.spec

import sys
import os
from pathlib import Path

block_cipher = None

# Collect all app source files
a = Analysis(
    ['run.py'],
    pathex=['.'],
    binaries=[],
    datas=[
        # Include locales
        ('../locales', 'locales'),
        # Include any static assets
        ('../static', 'static'),
    ],
    hiddenimports=[
        # Flask internals
        'flask',
        'flask_cors',
        'werkzeug',
        'werkzeug.serving',
        'werkzeug.routing',
        # App modules
        'app',
        'app.api',
        'app.api.graph',
        'app.api.simulation',
        'app.api.report',
        'app.config',
        'app.models',
        'app.models.project',
        'app.models.task',
        'app.services',
        'app.services.graph_builder',
        'app.services.oasis_profile_generator',
        'app.services.ontology_generator',
        'app.services.report_agent',
        'app.services.simulation_config_generator',
        'app.services.simulation_ipc',
        'app.services.simulation_manager',
        'app.services.simulation_runner',
        'app.services.text_processor',
        'app.services.zep_entity_reader',
        'app.services.zep_graph_memory_updater',
        'app.services.zep_tools',
        'app.utils',
        'app.utils.file_parser',
        'app.utils.llm_client',
        'app.utils.locale',
        'app.utils.logger',
        'app.utils.retry',
        'app.utils.zep_paging',
        # Third-party
        'openai',
        'zep_cloud',
        'pydantic',
        'dotenv',
        'fitz',       # PyMuPDF
        'charset_normalizer',
        'chardet',
        'camel',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        'tkinter',
        'matplotlib',
        'numpy',
        'scipy',
        'PIL',
        'cv2',
        'torch',
        'tensorflow',
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='mirofish-server',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,     # Keep true so Tauri can read stdout for health checks
    disable_windowed_traceback=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
