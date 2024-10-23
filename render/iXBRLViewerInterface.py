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

import io, os, sys, zipfile
from arelle.PluginManager import pluginClassMethods
from arelle import PluginManager

_iXBRLViewerPlugin = None
_iXBRLViewer_plugin_info = None

STUB_NAME = "ixbrlviewer.xhtml"
JS_NAME = "ixbrlviewer.js"


def hasIXBRLViewerPlugin(cntlr):
    global _iXBRLViewerPlugin
    if _iXBRLViewerPlugin is not None:
        return True
    if "ixbrl-viewer" not in PluginManager.pluginConfig["modules"]:
        return False
    try:
        from arelle.plugin import iXBRLViewerPlugin as _iXBRLViewerPlugin
    except ImportError:
        return False
    disableiXBRLViewerPluginInfo(cntlr)
    return True


def generateViewer(cntlr, stubDir):
    stubPath = os.path.join(stubDir, STUB_NAME)
    jsPath = os.path.join(stubDir, JS_NAME)
    securityIsActive = securityHasWritten = False
    stubBytes = None
    for pluginMethod in pluginClassMethods("Security.Crypt.IsActive"):
        securityIsActive = pluginMethod(self)  # must be active for the save method to save encrypted files
    _iXBRLViewerPlugin.pluginData(cntlr).builder = _iXBRLViewerPlugin.IXBRLViewerBuilder(cntlr, useStubViewer = True)
    _iXBRLViewerPlugin.processModel(cntlr, cntlr.modelManager.modelXbrl)
    with io.BytesIO() as fZip:
        _iXBRLViewerPlugin.generateViewer(
                                cntlr=cntlr,
                                saveViewerDest=fZip,
                                viewerURL=None,
                                showValidationMessages=False,
                                zipViewerOutput=True,
                                features=None,
                                packageDownloadURL=None,
                                copyScript=True
            )
        fZip.seek(0)
        with zipfile.ZipFile(fZip) as zF:
            stubBytes = zF.read("ixbrlviewer.html")
            jsBytes = zF.read(JS_NAME)
    if not stubBytes:
        return
    if securityIsActive:
        for pluginMethod in pluginClassMethods("Security.Crypt.Write"):
            securityHasWritten = pluginMethod(self, stubPath, stubBytes)
            _ = pluginMethod(self, jsPath, jsBytes)
    if not securityHasWritten:
        with open(stubPath, "wb") as fout:
            fout.write(stubBytes)
        with open(jsPath, "wb") as fout:
            fout.write(jsBytes)


def disableiXBRLViewerPluginInfo(cntlr):
    if PluginManager.pluginConfig["modules"].get("ixbrl-viewer", {}).get("status", "disabled") == "enabled":
        PluginManager.pluginConfig["modules"]["ixbrl-viewer"]["status"] = "disabled"
        PluginManager.reset()
        cntlr.addToLog(_("iXBRLViewer plugin disabled for EdgarRenderer. EdgarRenderer manages iXBRLViewer within its workflow."))
