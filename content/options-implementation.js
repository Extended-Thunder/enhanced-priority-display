const { utils: Cu, classes: Cc, interfaces: Ci } = Components;
const { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
const { ExtensionSupport } = ChromeUtils.import("resource:///modules/ExtensionSupport.jsm");
const { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

var epd_optAPI = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    return {
      epd_optAPI: {
        async getLegacyPref(name, dtype, defVal) {
          // Prefix for legacy preferences.
          const prefName = `extensions.EnhancedPriorityDisplay.${name}`;

          switch (dtype) {
            case "bool": {
              const prefDefault = defVal === "true";
              try {
                return Services.prefs.getBoolPref(prefName, prefDefault);
              } catch {
                return prefDefault;
              }
            }
            case "int": {
              const prefDefault = Number(defVal) | 0;
              try {
                return Services.prefs.getIntPref(prefName, prefDefault);
              } catch {
                return prefDefault;
              }
            }
            case "char": {
              const prefDefault = defVal;
              try {
                return Services.prefs.getCharPref(prefName, prefDefault);
              } catch (err) {
                return prefDefault;
              }
            }
            case "string": {
              const prefDefault = defVal;
              try {
                return Services.prefs.getStringPref(prefName, prefDefault);
              } catch (err) {
                return prefDefault;
              }
            }
            default: {
              throw new Error("Unexpected pref type");
            }
          }
        },
      },
    };
  }
};
