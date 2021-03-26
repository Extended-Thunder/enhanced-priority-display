const { utils: Cu, classes: Cc, interfaces: Ci } = Components;
const { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
const { ExtensionSupport } = ChromeUtils.import("resource:///modules/ExtensionSupport.jsm");
const { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { AddonManager } = ChromeUtils.import("resource://gre/modules/AddonManager.jsm");

var ep_display = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    context.callOnClose(this);

    return {
      ep_display: {
        async init() {
          try {
            ExtensionSupport.registerWindowListener("epdWindowListener", {
              chromeURLs: [
                "chrome://messenger/content/messenger.xhtml",
                "chrome://messenger/content/messenger.xul",
              ],
              onLoadWindow(window) {
                EnhancedPriorityDisplay(context, window);
              },
            });
          } catch (exception) {
            console.error(exception);
          }
        },
        async getLegacyPref(name, dtype, defVal) {
          let prefDefault = defVal;
          let getter;
          Services.prefs.getLegacyPref

          switch (dtype) {
            case "bool": {
              prefDefault = (defVal === "true");
              getter = Services.prefs.getBoolPref;
              break;
            }
            case "int": {
              prefDefault = (Number(defVal) | 0);
              getter = Services.prefs.getIntPref;
              break;
            }
            case "char": {
              getter = Services.prefs.getCharPref;
              break;
            }
            case "string": {
              getter = Services.prefs.getStringPref;
              break;
            }
            default: {
              throw new Error("Unexpected pref type");
            }
          }

          try {
            const prefName = `extensions.EnhancedPriorityDisplay.${name}`;
            return getter(prefName, prefDefault);
          } catch (err) {
            console.error(err);
            return prefDefault;
          }
        }
      },
    };
  }

  close() {
    console.info("ep_display.close: Beginning close function.");
    // Stop listening for new message compose windows.
    try {
      ExtensionSupport.unregisterWindowListener("epdWindowListener");
    } catch (err) {
      console.warn(`Could not deregister listener <epdWindowListener>`,err);
    }

    // Invalidate the cache to ensure we start clean if extension is reloaded.
    Services.obs.notifyObservers(null, "startupcache-invalidate", null);

    console.info("ep_display.close: Extension removed. Goodbye world.");
  }
};

function EnhancedPriorityDisplay(context, window) {

  function createGenericHandler(colId, oldHandler) {
    if (window.gDBView) {
      var tree = window.document.getElementById("threadTree");
      var columnHandler = {
        old: oldHandler,

        getCellText: function (row, col) {
          if (columnHandler.old)
            return columnHandler.old.getCellText(row, col);
          else
            return window.gDBView.cellTextForColumn(row, colId);
        },

        getSortStringForRow: function (hdr) {
          if (columnHandler.old)
            return columnHandler.old.getSortStringForRow(hdr);
          else
            return null;
        },

        isString: function () {
          return true;
        },

        _atoms: {},
        hasAtoms: true,
        _getAtom: function (aName) {
          if (!this.hasAtoms) return null;
          if (!this._atoms[aName]) {
            try {
              var as = Components.classes[
                "@mozilla.org/atom-service;1"
              ].getService(Components.interfaces.nsIAtomService);
            } catch (ex) {
              this.hasAtoms = false;
              return null;
            }
            this._atoms[aName] = as.getAtom(aName);
          }
          return this._atoms[aName];
        },

        setProperty: function (prop, value) {
          if (prop) {
            prop.AppendElement(this._getAtom(value));
            return "";
          } else {
            return " " + value;
          }
        },

        getExtensionProperties: function (row, props, which) {
          var properties = "";
          var hdr = window.gDBView.getMsgHdrAt(row);
          var priority = hdr.getStringProperty("priority");
          var doHigh = gBP(which + "High");
          var doLow = gBP(which + "Low");
          var property;
          switch (priority) {
            case "6":
              if (doHigh) property = "enhanced-priority-display-highest";
              break;
            case "5":
              if (doHigh) property = "enhanced-priority-display-high";
              break;
            case "3":
              if (doLow) property = "enhanced-priority-display-low";
              break;
            case "2":
              if (doLow) property = "enhanced-priority-display-lowest";
              break;
          }
          if (property) properties += this.setProperty(props, property);

          // console.log(which, doHigh, doLow, priority, props, property, properties);
          return properties;
        },

        getCellProperties: function (row, col, props) {
          properties = columnHandler.getExtensionProperties(
            row,
            props,
            "Style"
          );
          if (columnHandler.old)
            properties += columnHandler.old.getCellProperties(row, col, props);
          return properties;
        },

        getRowProperties: function (row, props) {
          if (tree.view.selection.isSelected(row)) {
            return "";
          }
          properties = columnHandler.getExtensionProperties(
            row,
            props,
            "Shade"
          );
          if (columnHandler.old)
            properties += columnHandler.old.getRowProperties(row, props);
          return properties;
        },

        getImageSrc: function (row, col) {
          if (columnHandler.old) return columnHandler.old.getImageSrc(row, col);
          return null;
        },

        getSortLongForRow: function (hdr) {
          if (columnHandler.old)
            return columnHandler.old.getSortLongForRow(hdr);
          return null;
        },
      };

      window.gDBView.addColumnHandler(colId, columnHandler);
    }
  }

  var createDbObserver = {
    // Components.interfaces.nsIObserver
    observe: function (aMsgFolder, aTopic, aData) {
      if (window.gDBView) {
        var tree = window.document.getElementById("threadTree");
        var columnHandler = {
          getCellText: function (row, col) {
            if (gBP("Iconify"))
              return "";
            else
              return window.gDBView.cellTextForColumn(row, "priorityCol");
          },

          getSortStringForRow: function (hdr) {
            if (columnHandler.old)
              return columnHandler.old.getSortStringForRow(hdr);
            else
              return null;
          },

          isString: function () {
            //console.debug("IsString? "+(!gBP("Iconify")) + " Has Atoms? " + this.hasAtoms);
            return !gBP("Iconify");
          },

          _atoms: {},
          hasAtoms: true,
          _getAtom: function (aName) {
            if (!this.hasAtoms)
              return null;
            if (!this._atoms[aName]) {
              try {
                var as = Cc[
                  "@mozilla.org/atom-service;1"
                ].getService(Ci.nsIAtomService);
              } catch (ex) {
                this.hasAtoms = false;
                return null;
              }
              this._atoms[aName] = as.getAtom(aName);
            }
            return this._atoms[aName];
          },

          setProperty: function (prop, value) {
            if (prop) {
              prop.AppendElement(this._getAtom(value));
              return "";
            } else {
              return " " + value;
            }
          },

          getExtensionProperties: function (row, props, which) {
            var properties = "";
            var hdr = window.gDBView.getMsgHdrAt(row);
            var priority = hdr.getStringProperty("priority");
            var doHigh = gBP(which + "High");
            var doLow = gBP(which + "Low");
            var property;
            switch (priority) {
              case "6":
                if (doHigh) property = "enhanced-priority-display-highest";
                break;
              case "5":
                if (doHigh) property = "enhanced-priority-display-high";
                break;
              case "3":
                if (doLow) property = "enhanced-priority-display-low";
                break;
              case "2":
                if (doLow) property = "enhanced-priority-display-lowest";
                break;
            }
            if (property) properties += this.setProperty(props, property);
            return properties;
          },

          getCellProperties: function (row, col, props) {
            properties = columnHandler.getExtensionProperties(
              row,
              props,
              "Style"
            );
            if (columnHandler.old)
              properties += columnHandler.old.getCellProperties(row, props);
            return properties;
          },

          getRowProperties: function (row, props) {
            if (tree.view.selection.isSelected(row)) {
              return "";
            }
            properties = columnHandler.getExtensionProperties(
              row,
              props,
              "Shade"
            );
            if (columnHandler.old)
              properties += columnHandler.old.getRowProperties(row, props);
            return properties;
          },

          getImageSrc: function (row, col) {
            if (!gBP("Iconify"))
              return null;
            try {
              var hdr = window.gDBView.getMsgHdrAt(row);
            } catch (ex) {
              console.warn("Cannot get header",ex);
              return null;
            }
            var priority = hdr.getStringProperty("priority");
            switch (priority) {
              case "6":
                return getPrefURL("HighestIcon");
              case "5":
                return getPrefURL("HighIcon");
              case "4":
              case "3":
                return getPrefURL("LowIcon");
              case "2":
                return getPrefURL("LowestIcon");
              default:
                if (columnHandler.old)
                  return columnHandler.old.getImageSrc(row, col);
                return null;
            }
          },

          getSortLongForRow: function (hdr) {
            if (columnHandler.old)
              return columnHandler.old.getSortLongForRow(hdr);
            return null;
          },
        };

        try {
          columnHandler.old = window.gDBView.getColumnHandler("priorityCol");
        } catch (ex) {}
        window.gDBView.addColumnHandler("priorityCol", columnHandler);
        var threadCols = window.document.getElementById("threadCols");
        if (!threadCols) return;
        var columns = threadCols.getElementsByTagName("treecol");
        if (!columns) return;
        for (var column in columns) {
          var id = columns[column].id;
          if (!id) continue;
          var handler;
          try {
            handler = window.gDBView.getColumnHandler(id);
          } catch (ex) {}
          if (handler && !handler.isString()) continue;
          if (handler && handler.cycleCell) continue;
          if (
            !handler &&
            !id.match(
              /^(subject|sender|recipient|received|date|size|tags|account|unread|total|location|status)Col$/
            )
          )
            continue;
          createGenericHandler(id, handler);
        }
      }
    },
  };

  let preferences = {};

  function gBP(pref) {
    return preferences[pref];
  }

  function getPrefURL(pref) {
    const relPath = preferences[pref];
    return `moz-extension://${context.extension.uuid}/${relPath}`;
  }

  const AddonListener = {
    resetSession(addon, who) {
      if (addon.id === "EnhancedPriorityDisplay@kamens.us") {
        console.debug("AddonListener.resetSession: who - " + who);

        if (window.gDBView) {
          try {
            window.gDBView.removeColumnHandler("priorityCol");
          } catch (ex) {
            console.warn("Unable to remove column handler: " + col, ex);
          }
        }

        try{
          Services.obs.removeObserver(createDbObserver, "MsgCreateDBView");
        } catch (ex) { console.warn("Unable to remove msgcreatedbview observer", ex); }

        try {
          AddonManager.removeAddonListener(this);
        } catch (ex) { console.warn("Unable to remove addon listener", ex); }
      }
    },
    onUninstalling(addon) {
      this.resetSession(addon, "onUninstalling");
    },
    onDisabling(addon) {
      this.resetSession(addon, "onDisabling");
    },
    // The listener is removed so these aren't run; they aren't needed as the
    // addon is installed by the addon system and runs our backgound.js loader.
    onInstalling(addon) {},
    onEnabling(addon) {},
    onOperationCancelled(addon) {},
  };

  async function onLoad(context) {
    const storageAPI = context.apiCan.findAPIPath("storage.local");
    const storage = await storageAPI.callMethodInParentProcess(
        "get", [{ "preferences": {} }]
      );
    preferences = storage.preferences;

    // This doesn't seem to work, but I'm not sure how
    // to add css stylesheets to the root window.
    window.document.appendChild(
      window.MozXULElement.parseXULToFragment(
        '<?xml-stylesheet href="ui/priority-display.css" type="text/css"?>'
        ));

    Services.obs.addObserver(createDbObserver, "MsgCreateDBView", false);
    AddonManager.addAddonListener(AddonListener);
  }

  onLoad(context);

}
