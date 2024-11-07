"""
XULE processor interface for EDGAR validation

This validation module runs DQC and EDGAR-related XULE rules. It uses the Xule rule processor

DOCSKIP
See https://xbrl.us/dqc-license for license information.  
See https://xbrl.us/dqc-patent for patent infringement notice.
Copyright (c) 2017 - present XBRL US, Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

Any and all enhancements to original Xule processor code, created by staff of the U.S. Securities and Exchange Commission.
Data and content created by government employees within the scope of their employment are not subject
to domestic copyright protection. 17 U.S.C. 105.

Implementation of DQC rules invokes https://xbrl.us/dqc-license and https://xbrl.us/dqc-patent

For GUI usage the xule validation is applied when an applicable instance type is being validated
For command line usage in EDGAR/validate workflow do not specify --xule-run, this is inferred by EDGAR workflow

To save constants for this ruleset run
  python arelleCmdLine.py --plugin xule --xule-rule-set {path-to-resources/xule}/dqcrt-us-2024-ruleset.zip  --xule-precalc-constants > {path-to-resources/xule}/dqcrt-us-2024-consts.zip

$Change: 22782 $
DOCSKIP
"""
import optparse, os, json
from arelle import PluginManager
from arelle.PythonUtil import attrdict
from .Util import usgaapYear

""" Xule validator specific variables."""
_short_name = 'DQCRT' # EDGAR uses DQCRT as short_name instead of DQC (in XBRL.US distribution0
_name = 'DQCRT XULE Rules Validator'
_version = 'Check version using Tools->DQC->Version on the GUI or --dqc-version on the command line'
_version_prefix = '3.0.'
_description = 'DQCRT rules validator.'
_license = 'Apache-2'
_author = 'XBRL US Inc.'
_copyright = '(c) 2017-2023'
_xule_resources_dir = os.path.join(os.path.dirname(__file__), "resources", "xule")
_xule_resources_dir_for_json = json.dumps(_xule_resources_dir + os.sep)[1:-1]
_rule_set_map_name = os.path.join(_xule_resources_dir, "edgarRulesetMap.json")
_latest_map_name = 'https://github.com/Arelle/EDGAR/tree/master/validate/resources/xule/edgarRulesetMapOnline.json' 

"""Do not change anything below this line."""
_xule_plugin_info = None
xuleValidateFinally = None

def noop(*args, **kwargs):
    return # do nothing

def init(cntlr):
    global xuleValidateFinally
    if xuleValidateFinally is None:
        xuleValidateFinally = getXuleMethod(cntlr, 'Validate.Finally')
        if xuleValidateFinally is not None: # xule is loaded
            # add EDGAR mapping for resource files to disclosureSystem.mappings
            if cntlr.modelManager.disclosureSystem:
                cntlr.modelManager.disclosureSystem.mappedPaths.append(("/__xule_resources_dir__", _xule_resources_dir))
        
def close(cntlr): # unhook Xule's 'Validate.Finally' from validate/EFM
    global xuleValidateFinally
    '''
    if xuleValidateFinally is not None:
        PluginManager.modulePluginInfos[getXulePlugin(cntlr)["name"]]['Validate.Finally'] = xuleValidateFinally # restore original finally
        PluginManager.reset()
        xuleValidateFinally = None
    '''
        
def xuleValidate(val):
    usgYr = usgaapYear(val.modelXbrl)
    if xuleValidateFinally is not None and usgYr >= "2023":
        # must run without disclosure system blockage of URLs
        validateDisclosureSystem = val.modelXbrl.modelManager.validateDisclosureSystem
        val.modelXbrl.modelManager.validateDisclosureSystem = False
        # if we got here Xule should be active (force it otherwise)
        xuleValidateFinally(val, extra_options={
            "block_Validate.Finally": True,
            "xule_rule_set": f"/__xule_resources_dir__/dqcrt-us-{usgYr}-ruleset.zip",
            "xule_args_file": f"/__xule_resources_dir__/dqcrt-us-{usgYr}-constants.json",
            "xule_time": 1.0,
            # to trace whether contexts are reloaded properly from build process, uncomment
            #"xule_output_constants": "ACCRUAL_ITEMS,TAXONOMY_DEFAULTS"
            # "xule_debug": True # causes trace of  each rule as it runs
            #"xule_crash": True # causes stacktrace on xule exceptions
            })
        val.modelXbrl.modelManager.validateDisclosureSystem = validateDisclosureSystem
        return True
    return False
        

def cmdOptions(parser):
    """Extend command line options for xule validator
    
    This is called by the Arelle controller.
    """
    if isinstance(parser, optparse.OptionParser):
        # This is the normal optparse.OptionsParser object.
        parserGroup = optparse.OptionGroup(parser,
                                           "{} validation plugin (Also see --xule options)".format(_short_name))
        parser.add_option_group(parserGroup)
    else:
        # This is a fake parser object (which does not support option groups). This is sent when arelle is in GUI
        # mode or running as a webserver
        parserGroup = parser

    # Show version of validator
    parserGroup.add_option("--{}-version".format(_short_name).lower(),
                      action="store_true",
                      dest="{}_version".format(_short_name),
                      help=_("Display version number of the {} validation plugin.".format(_short_name)))

    # Display validator rule set map
    parserGroup.add_option("--{}-display-rule-set-map".format(_short_name).lower(),
                           action="store_true",
                           dest="{}_display_rule_set_map".format(_short_name),
                           help=_("Display the rule set map currently used."))   

    # Update validator rule set map
    parserGroup.add_option("--{}-update-rule-set-map".format(_short_name).lower(),
                           action="store",
                           dest="{}_update_rule_set_map".format(_short_name),
                           help=_("Update the rule set map currently used. The supplied file will be merged with the current rule set map."))
    
    # Replace validator rule set map
    parserGroup.add_option("--{}-replace-rule-set-map".format(_short_name).lower(),
                           action="store",
                           dest="{}_replace_rule_set_map".format(_short_name),
                           help=_("Replace the rule set map currently used."))

    # Update validator rule set map with latest
    parserGroup.add_option("--{}-update-rule-set-map-latest".format(_short_name).lower(),
                           action="store_true",
                           dest="{}_update_rule_set_map_latest".format(_short_name),
                           help=_(
                               "Update the rule set map currently used with the latest version."))

    # Replace validator rule set map
    parserGroup.add_option("--{}-replace-rule-set-map-latest".format(_short_name).lower(),
                           action="store_true",
                           dest="{}_replace_rule_set_map_latest".format(_short_name),
                           help=_("Replace the rule set map currently used with the latest version."))


def cntrlrCmdLineUtilityRun(cntlr, options, **kwargs):
    """Validator run utility.
    
    This is invoked by the Arelle controler after Arelle is fully up but before a filing is loaded.
    """
    # Save options in xule
    save_options_method = getXuleMethod(cntlr, 'Xule.CntrlCmdLine.Utility.Run.Init')
    save_options_method(cntlr, options, **kwargs)

    parser = optparse.OptionParser()
    
    # Check that both update an replace rule set map are not used together.
    replace_update_rule_set_map_options = [x.lower().replace('_','-') for x in ('{}_update_rule_set_map'.format(_short_name),
                                                       '{}_replace_rule_set_map'.format(_short_name),
                                                       '{}_update_rule_set_map_latest'.format(_short_name),
                                                       '{}_replace_rule_set_map_latest'.format(_short_name)
                                                       )
                                             if getattr(options, x, False)]
    if len(replace_update_rule_set_map_options) > 1:
        parser.error(_("Cannot use the following options at the same time: --{}".format(', '.join(replace_update_rule_set_map_options))))


    #if len([x for x in (getattr(options, "{}_update_rule_set_map".format(_short_name), False),
    #                   getattr(options, "{}_replace_rule_set_map".format(_short_name), False)) if x]) > 1:
    #    parser.error(_("Cannot use --{short_name}-update-rule-set-map and --{short_name}-replace-rule-set-map the same time.".format(short_name=_short_name)))
    
    # Show validator version
    if getattr(options, '{}_version'.format(_short_name), False):
        version_method = getXuleMethod(cntlr, 'Xule.ValidatorVersion')
        version_method(cntlr, _short_name, _rule_set_map_name, _version_prefix, __file__)

        #cntlr.addToLog("{} validator version: {}".format(_short_name,  _version_prefix + version_method(__file__)), _short_name)
        #cntlr.close()
    
    # Update the rule set map
    if getattr(options, "{}_update_rule_set_map".format(_short_name), False):
        update_method = getXuleMethod(cntlr, 'Xule.RulesetMap.Update')
        update_method(cntlr, getattr(options,"{}_update_rule_set_map".format(_short_name)), _rule_set_map_name)
    
    # Replace the rule set map
    if getattr(options, "{}_replace_rule_set_map".format(_short_name), False):
        update_method = getXuleMethod(cntlr, 'Xule.RulesetMap.Replace')
        update_method(cntlr, getattr(options,"{}_replace_rule_set_map".format(_short_name)), _rule_set_map_name)
    
    # Display the rule set map
    if getattr(options, "{}_display_rule_set_map".format(_short_name), False):
        update_method = getXuleMethod(cntlr, 'Xule.RulesetMap.Display')
        update_method(cntlr, _short_name, _rule_set_map_name)

    # Update the rule set map with the latest
    if getattr(options, "{}_update_rule_set_map_latest".format(_short_name), False):
        update_method = getXuleMethod(cntlr, 'Xule.RulesetMap.Update')
        update_method(cntlr, _latest_map_name, _rule_set_map_name)

    # Replace the rule set map with the latest
    if getattr(options, "{}_replace_rule_set_map_latest".format(_short_name), False):
        update_method = getXuleMethod(cntlr, 'Xule.RulesetMap.Replace')
        update_method(cntlr, _latest_map_name, _rule_set_map_name)

    # Register the xule validator
    registerMethod = getXuleMethod(cntlr, 'Xule.RegisterValidator')
    registerMethod(_short_name, _rule_set_map_name)
    
def getXulePlugin(cntlr):
    """Find the Xule plugin
    
    This will locate the Xule plugin module.
    """
    global _xule_plugin_info
    if _xule_plugin_info is None:
        for plugin_name, plugin_info in PluginManager.modulePluginInfos.items():
            if plugin_info.get('moduleURL') == 'xule':
                _xule_plugin_info = plugin_info
                break
        else:
            cntlr.addToLog(_("Xule plugin is not loaded. Xule plugin is required to run DQC rules. This plugin should be automatically loaded."))
    
    return _xule_plugin_info

def getXuleMethod(cntlr, class_name):
    """Get method from Xule
    
    Get a method/function from the Xule plugin. This is how this validator calls functions in the Xule plugin.
    """
    return getXulePlugin(cntlr).get(class_name)

def menuTools(cntlr, menu):
    """Add validator menu the Tools menu in the Arelle GUI
    
    This is invoked by the Arelle controller
    """
    menu_method = getXuleMethod(cntlr, 'Xule.AddMenuTools')
    version_method = getXuleMethod(cntlr, 'Xule.ValidatorVersion')
    menu_method(cntlr, menu, _short_name, _version_prefix, __file__, _rule_set_map_name, _latest_map_name)

def validateMenuTools(cntlr, validateMenu, *args, **kwargs):
    """Add validator checkbutton to the Arelle Validate menu (under Tools).
    
    This is invoked by the Arelle controller.
    """
    # set validation true for validateDQCRT so it always validates for Filing.py when that validates
    ''' block this function
        it causes xule to register validator with validate variable which causes it to run on validate.finally
        
    cntlr.config["validateDQCRT"] = True
    menu_method = getXuleMethod(cntlr, 'Xule.AddValidationMenuTools')
    menu_method(cntlr, validateMenu, _short_name, _rule_set_map_name)
    '''
    # Register the xule validator
    registerMethod = getXuleMethod(cntlr, 'Xule.RegisterValidator')
    registerMethod(_short_name, _rule_set_map_name)
    cntlr.config['xule_activated'] = False # block xule initialization from Tools menu path
    
''' original plugininfo from DQC.py
    incorporated as validate/EFM/__init__.py 
    
    'name': _name,
    'version': _version,
    'description': _description,
    'license': _license,
    'author': _author,
    'copyright': _copyright,
    'import': 'xule',
    # classes of mount points (required)
    'ModelObjectFactory.ElementSubstitutionClasses': None,
    'CntlrWinMain.Menu.Tools': menuTools,
    'CntlrWinMain.Menu.Validation': validateMenuTools,
    'CntlrCmdLine.Utility.Run': cntrlrCmdLineUtilityRun,
    'CntlrCmdLine.Options': cmdOptions
'''
