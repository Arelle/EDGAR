# -*- coding: utf-8 -*-
"""
:mod:`EdgarRenderer.Cube`
~~~~~~~~~~~~~~~~~~~
Edgar(tm) Renderer was created by staff of the U.S. Securities and Exchange Commission.
Data and content created by government employees within the scope of their employment
are not subject to domestic copyright protection. 17 U.S.C. 105.

Interface to Arelle.org iXBRLViewerPlugin

Subclasses operation for use as Python Classes (not plugin operation) under EdgarRenderer workflow
"""

import inspect, io, os, sys, zipfile
from arelle.PluginManager import pluginClassMethods
from arelle import PluginManager

_iXBRLViewerPlugin = None
_iXBRLViewer_plugin_info = None

STUB_NAME = "ixbrlviewer.xhtml"
JS_PATH = "ixviewer-arelle/ixbrlviewer.js"


def hasIXBRLViewerPlugin(cntlr):
    global _iXBRLViewerPlugin
    if _iXBRLViewerPlugin is not None:
        return True
    # availability depends on the viewer being installed, not on it being registered in the plugin config
    try:
        from arelle.plugin import iXBRLViewerPlugin as _iXBRLViewerPlugin
    except ImportError:
        try:  # pip-installed ixbrl-viewer package (top-level module)
            import iXBRLViewerPlugin as _iXBRLViewerPlugin
        except ImportError:
            return False
    disableiXBRLViewerPluginInfo(cntlr)
    return True


def generateViewer(cntlr, stubDir):
    stubPath = os.path.join(stubDir, STUB_NAME)
    securityIsActive = securityHasWritten = False
    stubBytes = None
    for pluginMethod in pluginClassMethods("Security.Crypt.IsActive"):
        securityIsActive = pluginMethod(self)  # must be active for the save method to save encrypted files
    _iXBRLViewerPlugin.pluginData(cntlr).builder = _iXBRLViewerPlugin.IXBRLViewerBuilder(cntlr, useStubViewer = True)
    _iXBRLViewerPlugin.processModel(cntlr, cntlr.modelManager.modelXbrl)
    generateKwargs = dict(
                                cntlr=cntlr,
                                viewerURL=JS_PATH,
                                showValidationMessages=False,
                                zipViewerOutput=True,
                                packageDownloadURL=None,
                                copyScript=False)
    # older iXBRLViewerPlugin versions accept features in generateViewer, newer ones (e.g. 1.5.x) do not
    if "features" in inspect.signature(_iXBRLViewerPlugin.generateViewer).parameters:
        generateKwargs["features"] = None
    with io.BytesIO() as fZip:
        _iXBRLViewerPlugin.generateViewer(saveViewerDest=fZip, **generateKwargs)
        fZip.seek(0)
        with zipfile.ZipFile(fZip) as zF:
            stubBytes = zF.read("ixbrlviewer.html")
    if not stubBytes:
        return
    # ixbrlviewer.js >= 1.5.5 adds a non-self-closed viewport <meta> via innerHTML when none exists,
    # which is invalid XML and aborts loading in this XHTML stub; supplying a well-formed one avoids that
    if b'name="viewport"' not in stubBytes:
        stubBytes = stubBytes.replace(b"</head>", b'<meta name="viewport" content="width=device-width, initial-scale=1"/></head>', 1)
    if securityIsActive:
        for pluginMethod in pluginClassMethods("Security.Crypt.Write"):
            securityHasWritten = pluginMethod(self, stubPath, stubBytes)
    if not securityHasWritten:
        with open(stubPath, "wb") as fout:
            fout.write(stubBytes)

def disableiXBRLViewerPluginInfo(cntlr):
    if PluginManager.pluginConfig["modules"].get("ixbrl-viewer", {}).get("status", "disabled") == "enabled":
        PluginManager.pluginConfig["modules"]["ixbrl-viewer"]["status"] = "disabled"
        PluginManager.reset()
        cntlr.addToLog(_("iXBRLViewer plugin disabled for EdgarRenderer. EdgarRenderer manages iXBRLViewer within its workflow."))
