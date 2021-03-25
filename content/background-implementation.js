const { utils: Cu, classes: Cc, interfaces: Ci } = Components;
const { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
const { ExtensionSupport } = ChromeUtils.import("resource:///modules/ExtensionSupport.jsm");
const { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

var ep_display = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    return {
      ep_display: {
        async init() {
          try {
            enhancedPriorityDisplayIcons(context.extension);
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
};

function enhancedPriorityDisplayIcons(extension) {

  var { DefaultPreferencesLoader } = ChromeUtils.import(
    extension.rootURI.resolve("content/defaultPreferencesLoader.js")
  );
  var loader = new DefaultPreferencesLoader();
  loader.parseUri(extension.rootURI.resolve("prefs.jsm"));

  function gCP(pref) {
    pref = `extensions.EnhancedPriorityDisplay.${pref}`;
    return Services.prefs.getCharPref(pref);
  }

  function gBP(pref) {
    pref = `extensions.EnhancedPriorityDisplay.${pref}`;
    return Services.prefs.getBoolPref(pref);
  }

  function priorityIconsOnLoad() {
    Services.obs.addObserver(createDbObserver, "MsgCreateDBView", false);
    // console.log("called from priorityIconsOnLoad");
  }

  function createGenericHandler(colId, oldHandler) {
    if (window.gDBView) {
      var tree = window.document.getElementById("threadTree");
      var columnHandler = {
        old: oldHandler,

        getCellText: function (row, col) {
          if (columnHandler.old) return columnHandler.old.getCellText(row, col);
          return window.gDBView.cellTextForColumn(row, colId);
        },

        getSortStringForRow: function (hdr) {
          if (columnHandler.old)
            return columnHandler.old.getSortStringForRow(hdr);
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

          console.log(properties);
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
      console.log("called from observe");
      if (window.gDBView) {
        console.log("window.gDBView-------------true");
        var tree = window.document.getElementById("threadTree");
        var columnHandler = {
          getCellText: function (row, col) {
            if (gBP("Iconify")) return "";
            return window.gDBView.cellTextForColumn(row, "priorityCol");
          },

          getSortStringForRow: function (hdr) {
            if (columnHandler.old)
              return columnHandler.old.getSortStringForRow(hdr);
            return null;
          },

          isString: function () {
            return !gBP("Iconify");
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
                hasAtoms = false;
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
            console.log("called from getExtensionProperties");
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
            console.log("called from getExtensionProperties");
            if (!gBP("Iconify")) return null;
            try {
              var hdr = window.gDBView.getMsgHdrAt(row);
            } catch (ex) {
              return null;
            }
            var priority = hdr.getStringProperty("priority");
            switch (priority) {
              case "6":
                return gCP("HighestIcon");
              case "5":
                return gCP("HighIcon");
              case "3":
                return gCP("LowIcon");
              case "2":
                return gCP("LowestIcon");
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
        console.log(threadCols);
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

  ExtensionSupport.registerWindowListener("epdWindowListener", {
    chromeURLs: [
      "chrome://messenger/content/messenger.xhtml",
      "chrome://messenger/content/messenger.xul",
    ],
    onLoadWindow(/*window*/) {
      priorityIconsOnLoad();
    },
  });
}
